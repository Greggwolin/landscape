"""
Base test agent — handles auth, threads, message send, tool result parsing,
mutation confirmation, and project lifecycle.

Subclass this and implement run_scenario() for each test scenario.
"""

import json
import logging
import time
import re
from datetime import datetime, timezone
from typing import Optional

import requests

from . import config

logger = logging.getLogger('agent_framework')


class AgentError(Exception):
    """Raised when an agent step fails in a non-recoverable way."""
    pass


class ToolCallResult:
    """Parsed tool call from an assistant message."""

    def __init__(self, raw: dict):
        self.raw = raw
        self.tool_name: str = raw.get('tool_name') or raw.get('tool') or raw.get('name') or ''
        self.tool_input: dict = raw.get('tool_input') or raw.get('input') or {}
        self.result: dict = raw.get('result') or {}

    @property
    def success(self) -> bool:
        if isinstance(self.result, dict):
            return self.result.get('success', False)
        return False

    @property
    def error(self) -> Optional[str]:
        if isinstance(self.result, dict):
            return self.result.get('error')
        return None

    def __repr__(self):
        return f'ToolCallResult(tool={self.tool_name}, success={self.success})'


class ChatResponse:
    """Parsed response from a message send."""

    def __init__(self, raw: dict, http_status: int):
        self.raw = raw
        self.http_status = http_status
        self.success: bool = raw.get('success', False)

        user_msg = raw.get('user_message', {})
        self.user_message_id: str = user_msg.get('messageId', '')
        self.user_content: str = user_msg.get('content', '')

        asst_msg = raw.get('assistant_message', {})
        self.assistant_message_id: str = asst_msg.get('messageId', '')
        self.assistant_content: str = asst_msg.get('content', '')
        self.assistant_metadata: dict = asst_msg.get('metadata') or {}

        self.thread_title: Optional[str] = raw.get('thread_title')
        self.field_updates: list = raw.get('field_updates', [])

    @property
    def tool_calls(self) -> list[ToolCallResult]:
        """Parse tool_calls from assistant metadata, merging results from tool_executions by tool_use_id."""
        raw_calls = self.assistant_metadata.get('tool_calls', [])
        executions = self.assistant_metadata.get('tool_executions', [])
        result_map = {e.get('tool_use_id'): e.get('result', {}) for e in executions if e.get('tool_use_id')}
        merged = []
        for tc in raw_calls:
            merged_tc = dict(tc)
            use_id = tc.get('tool_use_id')
            if use_id and use_id in result_map and 'result' not in merged_tc:
                merged_tc['result'] = result_map[use_id]
            merged.append(merged_tc)
        return [ToolCallResult(tc) for tc in merged]

    def find_tool_call(self, tool_name: str) -> Optional[ToolCallResult]:
        """Find first tool call matching the given name."""
        for tc in self.tool_calls:
            if tc.tool_name == tool_name:
                return tc
        return None

    def has_tool_call(self, tool_name: str) -> bool:
        return self.find_tool_call(tool_name) is not None

    @property
    def has_mutation(self) -> bool:
        """Check if any tool call returned a mutation proposal."""
        for tc in self.tool_calls:
            r = tc.result
            if isinstance(r, dict) and any(
                k in r for k in ('mutation_id', 'batch_id', 'proposal_id')
            ):
                return True
        return bool(self.field_updates)

    def get_mutation_ids(self) -> dict:
        """Extract mutation_id and/or batch_id from tool call results."""
        ids = {}
        for tc in self.tool_calls:
            r = tc.result
            if isinstance(r, dict):
                for key in ('mutation_id', 'batch_id', 'proposal_id'):
                    if key in r:
                        ids[key] = r[key]
        return ids

    def __repr__(self):
        tools = ', '.join(tc.tool_name for tc in self.tool_calls)
        return f'ChatResponse(success={self.success}, tools=[{tools}])'


class BaseAgent:
    """
    Base class for all test agents.

    Handles:
    - JWT authentication (auto-refresh on expiry)
    - Thread creation (project-scoped or unassigned)
    - Message send with timeout handling
    - Tool result parsing
    - Mutation confirmation (propose → confirm flow)
    - Project creation and cleanup
    - Step logging for reports
    """

    def __init__(self, scenario_name: str):
        self.scenario_name = scenario_name
        self.session = requests.Session()

        # Auth state
        self._access_token: Optional[str] = None
        self._refresh_token: Optional[str] = None
        self._token_expiry: float = 0

        # Thread state
        self.thread_id: Optional[str] = None
        self.project_id: Optional[int] = None

        # Step log — every action recorded for reporting
        self.steps: list[dict] = []
        self._step_counter = 0

        # Projects created by this agent (for cleanup)
        self._created_project_ids: list[int] = []

    # ── Authentication ───────────────────────────────────────────────────

    def authenticate(self):
        """Obtain JWT tokens. Raises AgentError on failure."""
        self._log_step('auth', 'Authenticating', {
            'username': config.AUTH_USERNAME,
            'endpoint': config.TOKEN_ENDPOINT,
        })

        try:
            resp = self.session.post(
                config.TOKEN_ENDPOINT,
                json={
                    'username': config.AUTH_USERNAME,
                    'password': config.AUTH_PASSWORD,
                },
                timeout=config.AUTH_TIMEOUT,
            )
        except requests.RequestException as e:
            self._fail_step(f'Auth request failed: {e}')
            raise AgentError(f'Cannot reach auth endpoint: {e}')

        if resp.status_code != 200:
            self._fail_step(f'Auth returned {resp.status_code}: {resp.text[:200]}')
            raise AgentError(f'Auth failed with status {resp.status_code}')

        data = resp.json()
        self._access_token = data.get('access')
        self._refresh_token = data.get('refresh')
        # SimpleJWT default is 1 hour; refresh 5 min early
        self._token_expiry = time.time() + 3300

        if not self._access_token:
            self._fail_step('No access token in auth response')
            raise AgentError('Auth response missing access token')

        self.session.headers['Authorization'] = f'Bearer {self._access_token}'
        self._pass_step('Authenticated successfully')

    def _ensure_auth(self):
        """Re-authenticate if token is expired or missing."""
        if not self._access_token or time.time() > self._token_expiry:
            self.authenticate()

    # ── Thread Management ────────────────────────────────────────────────

    def create_thread(self, project_id: Optional[int] = None,
                      page_context: str = 'general',
                      force_new: bool = False) -> str:
        """Create a new Landscaper thread. Returns thread UUID.

        The default POST /threads/ is idempotent — it returns the existing
        active thread for (project_id, page_context) if one exists. Pass
        force_new=True to route through POST /threads/new/ which closes any
        existing active thread first and creates a fresh one (needed for
        intent-resolution tests that require no prior-message context bleed).
        """
        self._ensure_auth()

        body: dict = {'page_context': page_context}
        if project_id is not None:
            body['project_id'] = project_id

        endpoint = f'{config.THREADS_ENDPOINT}new/' if force_new else config.THREADS_ENDPOINT
        self._log_step('create_thread', 'Creating thread', {**body, 'force_new': force_new})

        try:
            resp = self.session.post(
                endpoint,
                json=body,
                timeout=config.API_TIMEOUT,
            )
        except requests.RequestException as e:
            self._fail_step(f'Thread creation failed: {e}')
            raise AgentError(f'Thread creation request failed: {e}')

        if resp.status_code not in (200, 201):
            self._fail_step(f'Thread creation returned {resp.status_code}: {resp.text[:300]}')
            raise AgentError(f'Thread creation failed: {resp.status_code}')

        data = resp.json()
        thread = data.get('thread', {})
        self.thread_id = thread.get('threadId')

        if not self.thread_id:
            self._fail_step('No threadId in response')
            raise AgentError('Thread creation response missing threadId')

        self._pass_step(f'Thread created: {self.thread_id}', {
            'thread_id': self.thread_id,
            'project_id': thread.get('projectId'),
            'created': data.get('created'),
        })

        return self.thread_id

    # ── Message Send ─────────────────────────────────────────────────────

    def send_message(self, content: str, page_context: Optional[str] = None,
                     thread_id: Optional[str] = None) -> ChatResponse:
        """
        Send a message to Landscaper and wait for the synchronous response.

        This blocks for up to CHAT_TIMEOUT seconds (default 120s).
        """
        self._ensure_auth()
        tid = thread_id or self.thread_id
        if not tid:
            raise AgentError('No active thread — call create_thread() first')

        url = config.THREAD_MESSAGES_ENDPOINT.format(thread_id=tid)
        body: dict = {'content': content}
        if page_context:
            body['page_context'] = page_context

        # Truncate long messages in log
        display_content = content[:120] + '...' if len(content) > 120 else content
        self._log_step('send_message', f'Sending: "{display_content}"', {
            'thread_id': tid,
            'page_context': page_context,
        })

        start = time.time()
        try:
            resp = self.session.post(url, json=body, timeout=config.CHAT_TIMEOUT)
        except requests.Timeout:
            elapsed = time.time() - start
            self._fail_step(f'Chat timed out after {elapsed:.1f}s')
            raise AgentError(f'Chat message timed out after {elapsed:.1f}s')
        except requests.RequestException as e:
            self._fail_step(f'Chat request failed: {e}')
            raise AgentError(f'Chat request failed: {e}')

        elapsed = time.time() - start
        chat_resp = ChatResponse(resp.json(), resp.status_code)

        if not chat_resp.success:
            self._fail_step(
                f'Chat returned success=false ({resp.status_code}) in {elapsed:.1f}s',
                {'response_snippet': chat_resp.assistant_content[:300]},
            )
            raise AgentError(f'Chat message failed: {chat_resp.assistant_content[:200]}')

        tool_names = [tc.tool_name for tc in chat_resp.tool_calls]
        self._pass_step(
            f'Response received in {elapsed:.1f}s',
            {
                'elapsed_s': round(elapsed, 1),
                'tools_called': tool_names,
                'has_mutation': chat_resp.has_mutation,
                'assistant_content_length': len(chat_resp.assistant_content),
            },
        )

        return chat_resp

    # ── Mutation Confirmation ────────────────────────────────────────────

    def confirm_mutation(self, chat_response: ChatResponse) -> dict:
        """
        Confirm a mutation proposal from a ChatResponse.

        Handles both single mutation_id and batch_id confirmation.
        Returns the confirmation response data.
        """
        self._ensure_auth()
        ids = chat_response.get_mutation_ids()

        if not ids:
            self._log_step('confirm_mutation', 'No mutation IDs found — skipping', {})
            return {}

        self._log_step('confirm_mutation', 'Confirming mutation', ids)

        # Prefer batch_id if present, else mutation_id
        if 'batch_id' in ids:
            url = config.BATCH_CONFIRM_ENDPOINT.format(batch_id=ids['batch_id'])
        elif 'mutation_id' in ids:
            url = config.MUTATION_CONFIRM_ENDPOINT.format(mutation_id=ids['mutation_id'])
        else:
            self._fail_step(f'Unknown mutation ID type: {ids}')
            raise AgentError(f'Cannot confirm mutation — unknown ID keys: {list(ids.keys())}')

        try:
            resp = self.session.post(url, json={}, timeout=config.API_TIMEOUT)
        except requests.RequestException as e:
            self._fail_step(f'Mutation confirm request failed: {e}')
            raise AgentError(f'Mutation confirmation failed: {e}')

        data = resp.json()
        if resp.status_code != 200 or not data.get('success', False):
            self._fail_step(f'Mutation confirm returned {resp.status_code}: {json.dumps(data)[:300]}')
            raise AgentError(f'Mutation confirmation failed: {resp.status_code}')

        self._pass_step('Mutation confirmed', data)
        return data

    # ── Project Creation ─────────────────────────────────────────────────

    def create_project_via_api(self, project_name: str,
                               project_type_code: str = None,
                               city: str = None,
                               state: str = None,
                               **extra_fields) -> int:
        """
        Create a project via the Next.js minimal endpoint (bypasses Landscaper).
        Returns the new project_id.
        """
        self._ensure_auth()

        body = {
            'project_name': project_name,
            'project_type_code': project_type_code or config.DEFAULT_PROJECT_TYPE,
            'analysis_purpose': config.DEFAULT_ANALYSIS_PURPOSE,
            'analysis_perspective': config.DEFAULT_ANALYSIS_PERSPECTIVE,
        }
        if city:
            body['city'] = city
        if state:
            body['state'] = state
        body.update(extra_fields)

        self._log_step('create_project', f'Creating project: {project_name}', body)

        try:
            resp = self.session.post(
                config.PROJECT_MINIMAL_ENDPOINT,
                json=body,
                timeout=config.API_TIMEOUT,
            )
        except requests.RequestException as e:
            self._fail_step(f'Project creation request failed: {e}')
            raise AgentError(f'Project creation failed: {e}')

        if resp.status_code not in (200, 201):
            self._fail_step(f'Project creation returned {resp.status_code}: {resp.text[:300]}')
            raise AgentError(f'Project creation failed: {resp.status_code}')

        data = resp.json()
        project = data.get('project', data)
        pid = project.get('project_id')

        if not pid:
            self._fail_step('No project_id in creation response')
            raise AgentError('Project creation response missing project_id')

        self.project_id = pid
        self._created_project_ids.append(pid)
        self._pass_step(f'Project created: id={pid}', project)

        return pid

    def create_project_via_django(self, project_name: str,
                                   project_type_code: str = None,
                                   jurisdiction_city: str = None,
                                   jurisdiction_state: str = None,
                                   location_lat: float = None,
                                   location_lon: float = None,
                                   **extra_fields) -> int:
        """
        Create a project via the Django REST endpoint.

        Unlike create_project_via_api (which uses Next.js), this endpoint
        supports Django model field names directly — including location_lat,
        location_lon, jurisdiction_city, jurisdiction_state.
        """
        self._ensure_auth()

        body = {
            'project_name': project_name,
            'project_type_code': project_type_code or config.DEFAULT_PROJECT_TYPE,
            'analysis_purpose': config.DEFAULT_ANALYSIS_PURPOSE,
            'analysis_perspective': config.DEFAULT_ANALYSIS_PERSPECTIVE,
        }
        if jurisdiction_city:
            body['jurisdiction_city'] = jurisdiction_city
        if jurisdiction_state:
            body['jurisdiction_state'] = jurisdiction_state
        if location_lat is not None:
            body['location_lat'] = location_lat
        if location_lon is not None:
            body['location_lon'] = location_lon
        body.update(extra_fields)

        self._log_step('create_project_django', f'Creating project (Django): {project_name}', body)

        try:
            resp = self.session.post(
                config.DJANGO_PROJECT_ENDPOINT,
                json=body,
                timeout=config.API_TIMEOUT,
            )
        except requests.RequestException as e:
            self._fail_step(f'Project creation request failed: {e}')
            raise AgentError(f'Project creation failed: {e}')

        if resp.status_code not in (200, 201):
            self._fail_step(f'Project creation returned {resp.status_code}: {resp.text[:300]}')
            raise AgentError(f'Project creation failed: {resp.status_code}')

        data = resp.json()
        pid = data.get('project_id')

        if not pid:
            self._fail_step('No project_id in creation response')
            raise AgentError('Project creation response missing project_id')

        self.project_id = pid
        self._created_project_ids.append(pid)
        self._pass_step(f'Project created (Django): id={pid}', data)

        return pid

    def create_project_via_landscaper(self, project_name: str,
                                      project_type_code: str = None,
                                      city: str = None,
                                      state: str = None) -> int:
        """
        Create a project by asking Landscaper in an unassigned thread.
        Handles the propose → confirm flow.
        Returns the new project_id.
        """
        # Ensure we have an unassigned thread
        if not self.thread_id:
            self.create_thread()

        type_code = project_type_code or config.DEFAULT_PROJECT_TYPE
        type_label = {
            'MF': 'multifamily', 'LAND': 'land development',
            'OFF': 'office', 'RET': 'retail', 'IND': 'industrial',
        }.get(type_code, type_code)

        prompt = f'Please create a new {type_label} project called {project_name}'
        if city and state:
            prompt += f' in {city}, {state}'

        self._log_step('create_project_landscaper', f'Asking Landscaper to create project', {
            'prompt': prompt,
        })

        chat_resp = self.send_message(prompt)

        # Check if create_project tool was called
        tc = chat_resp.find_tool_call('create_project')
        if not tc:
            self._fail_step('Landscaper did not call create_project tool', {
                'tools_called': [t.tool_name for t in chat_resp.tool_calls],
                'assistant_content': chat_resp.assistant_content[:300],
            })
            raise AgentError('Landscaper did not invoke create_project tool')

        # Handle mutation confirmation if needed
        if chat_resp.has_mutation:
            confirm_data = self.confirm_mutation(chat_resp)
            # After confirmation, project_id may be in the confirm response
            pid = confirm_data.get('project_id')
            if not pid:
                # Try extracting from the tool call result
                pid = tc.result.get('project_id')
        else:
            # Tool executed directly (no proposal gate)
            pid = tc.result.get('project_id')

        if not pid:
            self._fail_step('Could not extract project_id after create_project', {
                'tool_result': tc.result,
            })
            raise AgentError('create_project did not return a project_id')

        self.project_id = pid
        self._created_project_ids.append(pid)
        self._pass_step(f'Project created via Landscaper: id={pid}')

        return pid

    # ── Modal Interaction ────────────────────────────────────────────────

    def request_modal(self, modal_name: str, page_context: str = 'general',
                      thread_id: Optional[str] = None) -> ChatResponse:
        """
        Ask Landscaper to open a specific modal.
        Returns the ChatResponse so the caller can inspect the tool result.
        """
        # Map modal names to natural-language requests
        modal_prompts = {
            'property_details': 'Please open the property details panel for editing',
            'rent_roll': 'Please open the rent roll for editing',
            'operating_statement': 'Please open the operating statement for editing',
            'income_approach': 'Please open the income approach panel',
            'sales_comps': 'Please open the sales comparison panel',
            'cost_approach': 'Please open the cost approach panel',
            'reconciliation': 'Please open the reconciliation panel',
            'budget': 'Please open the budget panel',
            'loan_inputs': 'Please open the loan inputs panel',
            'equity_structure': 'Please open the equity structure panel',
            'acquisition': 'Please open the acquisition assumptions panel',
            'contacts': 'Please open the contacts panel',
            'project_details': 'Please open the project details panel',
            'land_use': 'Please open the land use panel',
            'parcels': 'Please open the parcels panel',
            'sales_absorption': 'Please open the sales absorption panel',
            'renovation': 'Please open the renovation panel',
        }

        prompt = modal_prompts.get(modal_name,
                                   f'Please open the {modal_name.replace("_", " ")} panel for editing')

        self._log_step('request_modal', f'Requesting modal: {modal_name}', {
            'modal_name': modal_name,
            'page_context': page_context,
        })

        chat_resp = self.send_message(prompt, page_context=page_context,
                                      thread_id=thread_id)

        # Verify the tool was called
        tc = chat_resp.find_tool_call('open_input_modal')
        if tc:
            if tc.success and tc.result.get('action') == 'open_modal':
                actual_modal = tc.result.get('modal_name')
                self._pass_step(f'Modal opened: {actual_modal}', tc.result)
            else:
                self._fail_step(f'open_input_modal failed: {tc.error or tc.result}')
        else:
            self._fail_step('Landscaper did not call open_input_modal', {
                'tools_called': [t.tool_name for t in chat_resp.tool_calls],
            })

        return chat_resp

    # ── Document Upload & Extraction ────────────────────────────────────

    def upload_document(self, file_path: str, doc_type: str = 'Rent Roll',
                        run_full_extraction: bool = True) -> dict:
        """
        Upload a document via the Next.js DMS endpoint.

        Args:
            file_path: Absolute path to the file on disk.
            doc_type: Document type label (default: 'Rent Roll').
            run_full_extraction: If True, triggers text extraction + field
                extraction + auto-approve of high-confidence fields.

        Returns:
            Full response dict from the upload endpoint.
        """
        self._ensure_auth()

        if not self.project_id:
            raise AgentError('No active project — call create_project first')

        import os
        if not os.path.exists(file_path):
            raise AgentError(f'Test document not found: {file_path}')

        filename = os.path.basename(file_path)
        self._log_step('upload_document', f'Uploading: {filename}', {
            'file_path': file_path,
            'doc_type': doc_type,
            'run_full_extraction': run_full_extraction,
        })

        with open(file_path, 'rb') as f:
            files = {'file': (filename, f, 'application/pdf')}
            data = {
                'project_id': str(self.project_id),
                'doc_type': doc_type,
                'workspace_id': '1',
                'run_full_extraction': str(run_full_extraction).lower(),
            }

            try:
                resp = self.session.post(
                    config.DMS_UPLOAD_ENDPOINT,
                    files=files,
                    data=data,
                    timeout=config.CHAT_TIMEOUT,  # extraction can be slow
                )
            except requests.RequestException as e:
                self._fail_step(f'Upload request failed: {e}')
                raise AgentError(f'Document upload failed: {e}')

        if resp.status_code not in (200, 201):
            self._fail_step(f'Upload returned {resp.status_code}: {resp.text[:300]}')
            raise AgentError(f'Document upload failed: {resp.status_code}')

        result = resp.json()
        doc_id = result.get('doc_id')

        if not doc_id:
            self._fail_step('No doc_id in upload response')
            raise AgentError('Upload response missing doc_id')

        extraction = result.get('extraction', {})
        self._pass_step(f'Uploaded doc_id={doc_id}', {
            'doc_id': doc_id,
            'fields_staged': extraction.get('fields_staged', 0),
            'auto_approved': extraction.get('auto_approved', 0),
            'duplicate': result.get('duplicate', False),
        })

        return result

    def poll_extraction_staging(self, doc_id: int = None) -> list:
        """
        Poll extraction staging until fields appear or timeout.

        Returns list of extraction rows from staging.
        """
        self._ensure_auth()

        if not self.project_id:
            raise AgentError('No active project')

        url = config.STAGING_ENDPOINT.format(project_id=self.project_id)
        params = {}
        if doc_id:
            params['doc_id'] = doc_id

        self._log_step('poll_staging', 'Polling extraction staging', {
            'project_id': self.project_id,
            'doc_id': doc_id,
            'timeout': config.EXTRACTION_POLL_TIMEOUT,
        })

        start = time.time()
        extractions = []

        while time.time() - start < config.EXTRACTION_POLL_TIMEOUT:
            try:
                resp = self.session.get(url, params=params, timeout=config.API_TIMEOUT)
                if resp.status_code == 200:
                    data = resp.json()
                    extractions = data.get('extractions', [])
                    if len(extractions) >= config.EXTRACTION_MIN_FIELDS:
                        elapsed = time.time() - start
                        self._pass_step(
                            f'Staging has {len(extractions)} fields after {elapsed:.1f}s',
                            {
                                'field_count': len(extractions),
                                'status_counts': data.get('status_counts', {}),
                                'scope_counts': data.get('scope_counts', {}),
                            },
                        )
                        return extractions
            except requests.RequestException:
                pass  # Retry on transient errors

            time.sleep(config.EXTRACTION_POLL_INTERVAL)

        elapsed = time.time() - start
        self._fail_step(
            f'Staging timed out after {elapsed:.1f}s with {len(extractions)} fields '
            f'(need >= {config.EXTRACTION_MIN_FIELDS})',
        )
        return extractions

    def accept_all_staging(self) -> dict:
        """
        Bulk-accept all pending extraction staging rows for the project.
        Must be called before commit — commit only writes 'accepted' rows.
        """
        self._ensure_auth()

        if not self.project_id:
            raise AgentError('No active project')

        url = config.STAGING_ACCEPT_ALL_ENDPOINT.format(project_id=self.project_id)

        self._log_step('accept_staging', 'Accepting all pending staging rows', {
            'project_id': self.project_id,
        })

        try:
            resp = self.session.post(url, json={}, timeout=config.API_TIMEOUT)
        except requests.RequestException as e:
            self._fail_step(f'Accept-all request failed: {e}')
            raise AgentError(f'Staging accept-all failed: {e}')

        if resp.status_code != 200:
            self._fail_step(f'Accept-all returned {resp.status_code}: {resp.text[:300]}')
            raise AgentError(f'Staging accept-all failed: {resp.status_code}')

        data = resp.json()
        accepted = data.get('accepted', 0)
        self._pass_step(f'Accepted {accepted} staging rows', data)
        return data

    def commit_staging(self, commit_all: bool = True,
                       extraction_ids: list = None) -> dict:
        """
        Commit extraction staging rows to production tables.
        """
        self._ensure_auth()

        if not self.project_id:
            raise AgentError('No active project')

        url = config.STAGING_COMMIT_ENDPOINT.format(project_id=self.project_id)

        if commit_all:
            body = {'commit_all_accepted': True}
        elif extraction_ids:
            body = {'extraction_ids': extraction_ids}
        else:
            body = {'commit_all_accepted': True}

        self._log_step('commit_staging', 'Committing staging rows', body)

        try:
            resp = self.session.post(url, json=body, timeout=config.API_TIMEOUT)
        except requests.RequestException as e:
            self._fail_step(f'Commit request failed: {e}')
            raise AgentError(f'Staging commit failed: {e}')

        if resp.status_code != 200:
            self._fail_step(f'Commit returned {resp.status_code}: {resp.text[:300]}')
            raise AgentError(f'Staging commit failed: {resp.status_code}')

        data = resp.json()
        self._pass_step(f'Committed {data.get("committed", 0)} fields', data)
        return data

    # ── Cleanup ──────────────────────────────────────────────────────────

    def cleanup(self):
        """
        Delete all projects created by this agent.
        Called automatically at the end of run(), but can be called manually.

        Strategy:
        1. Try Django DELETE /api/projects/{id}/
        2. If 500 (FK constraint), log the IDs and the management command to run.

        The management command handles the FK chain that the ORM CASCADE misses
        for raw-SQL tables (ai_extraction_staging, dms_project_doc_types, etc.).
        """
        if not self._created_project_ids:
            return

        self._ensure_auth()
        self._log_step('cleanup', f'Cleaning up {len(self._created_project_ids)} test project(s)', {
            'project_ids': list(self._created_project_ids),
        })

        failed_ids = []
        for pid in self._created_project_ids:
            try:
                resp = self.session.delete(
                    f'{config.DJANGO_BASE_URL}/api/projects/{pid}/',
                    timeout=config.API_TIMEOUT,
                )
                if resp.status_code in (200, 204):
                    logger.info(f'Deleted project {pid} via API')
                else:
                    logger.warning(f'Project delete returned {resp.status_code} for pid={pid}')
                    failed_ids.append(pid)
            except requests.RequestException as e:
                logger.warning(f'Failed to delete project {pid}: {e}')
                failed_ids.append(pid)

        if failed_ids:
            # Use --ids (not name prefix) because extraction can rename the
            # project away from the AGENT_TEST_ prefix.
            ids_str = ' '.join(str(p) for p in failed_ids)
            cmd = f'cd backend && ./venv/bin/python manage.py cleanup_test_projects --ids {ids_str} --confirm'
            logger.warning(
                f'API delete failed for project(s) {failed_ids}. '
                f'Run manually:\n  {cmd}'
            )
            self._fail_step(
                f'API cleanup failed for {len(failed_ids)} project(s). '
                f'Manual cleanup needed: {cmd}',
                {'failed_project_ids': failed_ids},
            )
        else:
            self._pass_step('Cleanup complete')

        self._created_project_ids.clear()

    # ── Scenario Execution ───────────────────────────────────────────────

    def run(self, cleanup: bool = True) -> dict:
        """
        Execute the scenario end-to-end.

        1. Authenticate
        2. Run scenario steps (implemented by subclass)
        3. Cleanup test data
        4. Return results dict

        Args:
            cleanup: If True (default), delete test projects after run.
                     Set False to inspect data after a failed run.
        """
        start_time = datetime.now(timezone.utc)
        error = None

        try:
            self.authenticate()
            self.run_scenario()
        except AgentError as e:
            error = str(e)
            logger.error(f'Scenario {self.scenario_name} failed: {e}')
        except Exception as e:
            error = f'Unexpected error: {type(e).__name__}: {e}'
            logger.exception(f'Scenario {self.scenario_name} crashed')
        finally:
            if cleanup:
                try:
                    self.cleanup()
                except Exception as e:
                    logger.warning(f'Cleanup failed: {e}')

        end_time = datetime.now(timezone.utc)
        elapsed = (end_time - start_time).total_seconds()

        passed = sum(1 for s in self.steps if s['status'] == 'pass')
        failed = sum(1 for s in self.steps if s['status'] == 'fail')

        result = {
            'scenario': self.scenario_name,
            'status': 'fail' if error or failed > 0 else 'pass',
            'error': error,
            'started_at': start_time.isoformat(),
            'ended_at': end_time.isoformat(),
            'elapsed_s': round(elapsed, 1),
            'steps_passed': passed,
            'steps_failed': failed,
            'steps_total': len(self.steps),
            'steps': self.steps,
            'project_id': self.project_id,
            'thread_id': self.thread_id,
            'calibration_mode': config.CALIBRATION_MODE,
        }

        return result

    def run_scenario(self):
        """
        Override in subclass. Implement the actual test steps here.

        Available helpers:
        - self.create_thread(project_id, page_context)
        - self.send_message(content, page_context)
        - self.request_modal(modal_name, page_context)
        - self.create_project_via_api(name, type, city, state)
        - self.create_project_via_landscaper(name, type, city, state)
        - self.confirm_mutation(chat_response)
        - self._log_step / self._pass_step / self._fail_step
        """
        raise NotImplementedError('Subclass must implement run_scenario()')

    # ── Step Logging ─────────────────────────────────────────────────────

    def _log_step(self, step_type: str, description: str, details: dict = None):
        """Start a new step in the log."""
        self._step_counter += 1
        step = {
            'step_num': self._step_counter,
            'type': step_type,
            'description': description,
            'details': details or {},
            'status': 'running',
            'timestamp': datetime.now(timezone.utc).isoformat(),
        }
        self.steps.append(step)
        logger.info(f'[{self.scenario_name}] Step {self._step_counter}: {description}')
        return step

    def _pass_step(self, message: str = '', extra: dict = None):
        """Mark the current (last) step as passed."""
        if self.steps:
            self.steps[-1]['status'] = 'pass'
            if message:
                self.steps[-1]['result'] = message
            if extra:
                self.steps[-1]['details'].update(extra)
            logger.info(f'[{self.scenario_name}] ✓ {message}')

    def _fail_step(self, message: str, extra: dict = None):
        """Mark the current (last) step as failed."""
        if self.steps:
            self.steps[-1]['status'] = 'fail'
            self.steps[-1]['error'] = message
            if extra:
                self.steps[-1]['details'].update(extra)
            logger.warning(f'[{self.scenario_name}] ✗ {message}')
