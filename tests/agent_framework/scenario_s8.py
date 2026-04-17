"""
Scenario S8 — Landscaper Ingestion Tools (Staging Interaction)

Tests Landscaper's 5 ingestion-specific tools by uploading a document,
letting extraction populate staging rows, then asking Landscaper to
read, update, explain, reject, and approve staging fields via chat.

S1 exercises the REST staging endpoints directly. S8 exercises them
through Landscaper's conversational ingestion tools — the path a real
user takes in the Ingestion Workbench.

Flow:
1. Create MF project + upload rent roll PDF → extraction populates staging
2. Phase 1 — Read staging:
   a. Ask Landscaper "what fields were extracted?" on ingestion page
   b. Verify `get_ingestion_staging` tool called
   c. Response mentions field count or field names
3. Phase 2 — Explain extraction:
   a. Ask Landscaper to explain a specific extracted field
   b. Verify `explain_extraction` tool called
   c. Response includes source/confidence info
4. Phase 3 — Update a field:
   a. Ask Landscaper to change property_name to a test value
   b. Verify `update_staging_field` tool called
   c. May trigger mutation confirm (tool is propose_only by default)
5. Phase 4 — Reject a field:
   a. Ask Landscaper to reject the zip code extraction
   b. Verify `reject_staging_field` tool called
6. Phase 5 — Approve fields:
   a. Ask Landscaper to approve all remaining fields
   b. Verify `approve_staging_field` tool called
7. Cleanup (delete project)

Calibration mode: Records tool calls, response patterns, staging states.
Test mode: Compares against calibration manifest.
"""

import logging
import os

from . import config
from .base_agent import BaseAgent
from .validators import Validator

logger = logging.getLogger('agent_framework.s8')

# ── Prompts ─────────────────────────────────────────────────────────────────
READ_STAGING_PROMPT = (
    'What fields were extracted from the uploaded document? '
    'List the field names and their values.'
)

EXPLAIN_EXTRACTION_PROMPT = (
    'Explain the extraction for the property_name field. '
    'Where in the document did that value come from?'
)

UPDATE_FIELD_PROMPT = (
    'The property name extraction is wrong. Please update the property name '
    'staging field to "AGENT_TEST_S8_Corrected_Name".'
)

REJECT_FIELD_PROMPT = (
    'Reject the zip_code extraction — the value looks incorrect. '
    'Use reason: "Agent test — verifying reject tool".'
)

APPROVE_FIELDS_PROMPT = (
    'Approve all the remaining pending extraction fields.'
)


class ScenarioS8(BaseAgent):
    """Ingestion tool interaction: read, explain, update, reject, approve."""

    def __init__(self):
        super().__init__('s8_ingestion_tools')
        self.validator = Validator('s8_ingestion_tools')
        self.doc_id = None
        self.staging_fields = []

    def run_scenario(self):
        # ── Step 1: Create project ──────────────────────────────────────
        project_name = f'{config.TEST_PROJECT_PREFIX}S8_Ingestion_Tools'

        self.create_project_via_api(
            project_name=project_name,
            project_type_code='MF',
            city='Torrance',
            state='CA',
        )

        self.validator.calibrate('project_id', self.project_id)
        self.validator.assert_field_equals(
            'project_created', self.project_id is not None, True
        )

        # ── Step 2: Upload rent roll → extraction ───────────────────────
        pdf_path = os.path.abspath(config.S1_RENT_ROLL_PDF)
        if not os.path.exists(pdf_path):
            self._fail_step(f'Test PDF not found: {pdf_path}')
            raise Exception(f'Missing test document: {pdf_path}')

        upload_result = self.upload_document(
            file_path=pdf_path,
            doc_type='Rent Roll',
            run_full_extraction=True,
        )

        self.doc_id = upload_result.get('doc_id')
        self.validator.assert_field_equals(
            'upload_success', upload_result.get('success', False), True
        )
        self.validator.assert_field_equals(
            'doc_id_returned', self.doc_id is not None, True
        )
        self.validator.calibrate('doc_id', self.doc_id)

        # Poll staging to confirm fields are there before talking to Landscaper
        extraction_info = upload_result.get('extraction', {})
        fields_already = extraction_info.get('fields_staged', 0)

        if fields_already >= config.EXTRACTION_MIN_FIELDS:
            logger.info(f'Upload returned {fields_already} staged fields')
        else:
            self.staging_fields = self.poll_extraction_staging(doc_id=self.doc_id)

        # Fetch staging rows for reference
        self._fetch_staging_snapshot()

        self.validator.assert_field_equals(
            'has_staging_rows', len(self.staging_fields) >= config.EXTRACTION_MIN_FIELDS, True
        )
        self.validator.calibrate('initial_staging_count', len(self.staging_fields))

        # ── Step 3: Create Landscaper thread (ingestion context) ────────
        self.create_thread(
            project_id=self.project_id,
            page_context='ingestion',
        )
        self.validator.assert_field_equals(
            'thread_created', self.thread_id is not None, True
        )

        # ── Phase 1: Read staging via Landscaper ────────────────────────
        logger.info('--- Phase 1: Read staging fields ---')
        self._test_read_staging()

        # ── Phase 2: Explain extraction ─────────────────────────────────
        logger.info('--- Phase 2: Explain extraction ---')
        self._test_explain_extraction()

        # ── Phase 3: Update a field ─────────────────────────────────────
        logger.info('--- Phase 3: Update staging field ---')
        self._test_update_field()

        # ── Phase 4: Reject a field ─────────────────────────────────────
        logger.info('--- Phase 4: Reject staging field ---')
        self._test_reject_field()

        # ── Phase 5: Approve remaining fields ───────────────────────────
        logger.info('--- Phase 5: Approve remaining fields ---')
        self._test_approve_fields()

        # ── Summary ─────────────────────────────────────────────────────
        self._log_step('summary', 'Scenario complete', {
            'validations_passed': self.validator.pass_count,
            'validations_failed': self.validator.fail_count,
        })
        self._pass_step(
            f'S8 complete: {self.validator.pass_count}/'
            f'{len(self.validator.results)} checks passed'
        )

    def _fetch_staging_snapshot(self):
        """Fetch current staging rows via REST (not Landscaper) for reference."""
        self._ensure_auth()
        url = config.STAGING_ENDPOINT.format(project_id=self.project_id)
        params = {}
        if self.doc_id:
            params['doc_id'] = self.doc_id

        try:
            resp = self.session.get(url, params=params, timeout=config.API_TIMEOUT)
            if resp.status_code == 200:
                self.staging_fields = resp.json().get('extractions', [])
        except Exception as e:
            logger.warning(f'Failed to fetch staging snapshot: {e}')

    def _test_read_staging(self):
        """Phase 1: Ask Landscaper to list extracted fields."""
        chat_resp = self.send_message(
            content=READ_STAGING_PROMPT,
            page_context='ingestion',
        )

        self.validator.assert_response_not_error(chat_resp)

        tools_used = [tc.tool_name for tc in chat_resp.tool_calls]
        self.validator.calibrate('p1_tools', tools_used)
        logger.info(f'  Phase 1 tools: {tools_used}')

        # Verify get_ingestion_staging was called
        tc = chat_resp.find_tool_call('get_ingestion_staging')
        self.validator.assert_field_equals(
            'p1_get_staging_called', tc is not None, True
        )

        # Response should be substantive and mention fields
        content_len = len(chat_resp.assistant_content)
        self.validator.assert_field_equals(
            'p1_substantive_response', content_len > 100, True
        )
        self.validator.calibrate('p1_response_length', content_len)

        # Should mention at least one field name
        content_lower = chat_resp.assistant_content.lower()
        mentions_fields = any(term in content_lower for term in [
            'property_name', 'property name', 'address', 'zip',
            'unit', 'rent', 'field', 'extracted',
        ])
        self.validator.assert_field_equals(
            'p1_mentions_fields', mentions_fields, True
        )

        snippet = chat_resp.assistant_content[:200]
        logger.info(f'  Response ({content_len} chars): {snippet}...')

    def _test_explain_extraction(self):
        """Phase 2: Ask Landscaper to explain a specific extraction."""
        chat_resp = self.send_message(
            content=EXPLAIN_EXTRACTION_PROMPT,
            page_context='ingestion',
        )

        self.validator.assert_response_not_error(chat_resp)

        tools_used = [tc.tool_name for tc in chat_resp.tool_calls]
        self.validator.calibrate('p2_tools', tools_used)
        logger.info(f'  Phase 2 tools: {tools_used}')

        # Verify explain_extraction was called
        tc = chat_resp.find_tool_call('explain_extraction')
        self.validator.assert_field_equals(
            'p2_explain_called', tc is not None, True
        )

        # Response should mention source or confidence
        content_lower = chat_resp.assistant_content.lower()
        mentions_source = any(term in content_lower for term in [
            'source', 'confidence', 'document', 'page', 'extracted from',
            'snippet', 'text',
        ])
        self.validator.assert_field_equals(
            'p2_mentions_source', mentions_source, True
        )

        self.validator.calibrate('p2_response_length', len(chat_resp.assistant_content))

        snippet = chat_resp.assistant_content[:200]
        logger.info(f'  Response: {snippet}...')

    def _test_update_field(self):
        """Phase 3: Ask Landscaper to update a staging field value."""
        chat_resp = self.send_message(
            content=UPDATE_FIELD_PROMPT,
            page_context='ingestion',
        )

        self.validator.assert_response_not_error(chat_resp)

        tools_used = [tc.tool_name for tc in chat_resp.tool_calls]
        self.validator.calibrate('p3_tools', tools_used)
        logger.info(f'  Phase 3 tools: {tools_used}')

        # Verify update_staging_field was called
        tc = chat_resp.find_tool_call('update_staging_field')
        self.validator.assert_field_equals(
            'p3_update_called', tc is not None, True
        )

        # update_staging_field has propose_only=True by default,
        # so it may trigger a mutation confirmation
        if chat_resp.has_mutation:
            logger.info('  Mutation proposed for staging update — confirming...')
            confirm_data = self.confirm_mutation(chat_resp)
            self.validator.assert_field_equals(
                'p3_confirm_success', confirm_data.get('success', False), True
            )
            self.validator.calibrate('p3_mutation_confirmed', True)
        else:
            self.validator.calibrate('p3_mutation_confirmed', False)
            logger.info('  No mutation confirmation needed')

        # Response should acknowledge the update
        content_lower = chat_resp.assistant_content.lower()
        mentions_update = any(term in content_lower for term in [
            'update', 'changed', 'corrected', 'modified', 'set',
            'agent_test_s8', 'new value',
        ])
        self.validator.assert_field_equals(
            'p3_mentions_update', mentions_update, True
        )

        self.validator.calibrate('p3_response_length', len(chat_resp.assistant_content))
        logger.info(f'  Response: {chat_resp.assistant_content[:200]}...')

    def _test_reject_field(self):
        """Phase 4: Ask Landscaper to reject a staging field."""
        chat_resp = self.send_message(
            content=REJECT_FIELD_PROMPT,
            page_context='ingestion',
        )

        self.validator.assert_response_not_error(chat_resp)

        tools_used = [tc.tool_name for tc in chat_resp.tool_calls]
        self.validator.calibrate('p4_tools', tools_used)
        logger.info(f'  Phase 4 tools: {tools_used}')

        # Verify reject_staging_field was called
        tc = chat_resp.find_tool_call('reject_staging_field')
        self.validator.assert_field_equals(
            'p4_reject_called', tc is not None, True
        )

        # Response should acknowledge rejection
        content_lower = chat_resp.assistant_content.lower()
        mentions_reject = any(term in content_lower for term in [
            'reject', 'removed', 'declined', 'marked', 'zip',
        ])
        self.validator.assert_field_equals(
            'p4_mentions_rejection', mentions_reject, True
        )

        self.validator.calibrate('p4_response_length', len(chat_resp.assistant_content))
        logger.info(f'  Response: {chat_resp.assistant_content[:200]}...')

    def _test_approve_fields(self):
        """Phase 5: Ask Landscaper to approve remaining pending fields."""
        chat_resp = self.send_message(
            content=APPROVE_FIELDS_PROMPT,
            page_context='ingestion',
        )

        self.validator.assert_response_not_error(chat_resp)

        tools_used = [tc.tool_name for tc in chat_resp.tool_calls]
        self.validator.calibrate('p5_tools', tools_used)
        logger.info(f'  Phase 5 tools: {tools_used}')

        # Verify approve_staging_field was called
        tc = chat_resp.find_tool_call('approve_staging_field')
        self.validator.assert_field_equals(
            'p5_approve_called', tc is not None, True
        )

        # Response should acknowledge approval
        content_lower = chat_resp.assistant_content.lower()
        mentions_approve = any(term in content_lower for term in [
            'approv', 'accepted', 'confirmed', 'field',
        ])
        self.validator.assert_field_equals(
            'p5_mentions_approval', mentions_approve, True
        )

        self.validator.calibrate('p5_response_length', len(chat_resp.assistant_content))
        logger.info(f'  Response: {chat_resp.assistant_content[:200]}...')

    def get_results(self) -> tuple[dict, dict]:
        """Run and return (scenario_result, validation_summary)."""
        result = self.run(cleanup=True)
        validation = self.validator.summary()

        if config.CALIBRATION_MODE:
            manifest_path = self.validator.save_manifest()
            logger.info(f'Manifest saved to {manifest_path}')

        return result, validation


def run_s8():
    """Entry point for running S8 standalone."""
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s [%(name)s] %(levelname)s: %(message)s',
    )

    from .report import TestReport

    agent = ScenarioS8()
    result, validation = agent.get_results()

    report = TestReport(suite_name='s8_ingestion_tools')
    report.add_scenario(result, validation)
    report.print_summary()

    path = report.save_json()
    print(f'Report saved to: {path}')

    return report
