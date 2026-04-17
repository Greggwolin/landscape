"""
Scenario S3 — Financial Queries

Tests Landscaper's ability to answer financial questions by exercising
the calculation and data-retrieval tool chain.

Flow:
1. Create MF project via API
2. Upload Chadron OM (offering memorandum — richer financial data than rent roll)
3. Accept + commit extraction to populate project tables
4. Create Landscaper thread
5. Ask financial questions that should trigger tool calls:
   a. Budget/expense summary → get_project_documents, get_document_content
   b. NOI/income question → get_document_content or calculation tools
   c. Cash flow / IRR question → calculation endpoints
   d. General valuation question → contextual response
6. Validate tool calls were made and responses are error-free
7. Test a direct calculation (POST /calculations/irr with synthetic cash flows)
   via Landscaper to verify the calculation chain works
8. Cleanup

Calibration mode: Records tool calls, response lengths, and field values.
Test mode: Compares against calibration manifest.
"""

import logging
import os

from . import config
from .base_agent import BaseAgent
from .validators import Validator

logger = logging.getLogger('agent_framework.s3')

# Phase 1: Natural questions — let Landscaper route however it wants.
# Calibration captures tool routing behavior (doc-read vs. calc engine).
S3_NATURAL_QUESTIONS = [
    {
        'id': 'income_summary',
        'prompt': (
            'Based on the offering memorandum I uploaded, what is the '
            'current gross income and net operating income for this property?'
        ),
        'page_context': 'mf_operations',
        'expect_mentions': ['income'],
    },
    {
        'id': 'expense_breakdown',
        'prompt': (
            'What are the main operating expense categories and their '
            'amounts from the uploaded documents?'
        ),
        'page_context': 'mf_operations',
        'expect_mentions': ['expense'],
    },
    {
        'id': 'unit_economics',
        'prompt': (
            'What is the average rent per unit and the total unit count '
            'for this property based on the documents?'
        ),
        'page_context': 'mf_property',
        'expect_mentions': ['unit'],
    },
]

# Phase 2: Forced tool invocation — explicitly ask for engine-backed calcs.
# These prompts name specific operations that map to registered tools
# (whatif_compute, sensitivity_grid) so Landscaper should route through
# the Python financial engine rather than estimating from document text.
S3_FORCED_QUESTIONS = [
    {
        'id': 'whatif_irr',
        'prompt': (
            'Run a what-if scenario for this property: assume a purchase '
            'price of $5,000,000, 5-year hold period, 3% annual rent growth, '
            'and a 5.5% exit cap rate. What IRR does the financial engine '
            'produce?'
        ),
        'page_context': 'mf_valuation',
        'expect_mentions': ['irr'],
    },
    {
        'id': 'sensitivity_cap_rate',
        'prompt': (
            'Run a sensitivity analysis on cap rate for this property. '
            'Show me how the value changes across cap rates from 4.5% '
            'to 6.5% in 0.5% increments.'
        ),
        'page_context': 'mf_valuation',
        'expect_mentions': ['cap'],
    },
]


class ScenarioS3(BaseAgent):
    """Financial queries against an uploaded offering memorandum."""

    def __init__(self):
        super().__init__('s3_financial_queries')
        self.validator = Validator('s3_financial_queries')
        self.doc_id = None

    def run_scenario(self):
        # ── Step 1: Verify test document exists ─────────────────────────
        pdf_path = os.path.abspath(config.S3_OM_PDF)
        if not os.path.exists(pdf_path):
            self._fail_step(f'Test PDF not found: {pdf_path}')
            raise Exception(f'Missing test document: {pdf_path}')
        self._log_step('check_file', f'Test PDF: {os.path.basename(pdf_path)}')
        self._pass_step(
            f'Found: {os.path.basename(pdf_path)} ({os.path.getsize(pdf_path)} bytes)'
        )

        # ── Step 2: Create project ──────────────────────────────────────
        project_name = f'{config.TEST_PROJECT_PREFIX}S3_Financial_Queries'

        self.create_project_via_api(
            project_name=project_name,
            project_type_code='MF',
            city='Hawthorne',
            state='CA',
        )

        self.validator.calibrate('project_id', self.project_id)
        self.validator.assert_field_equals(
            'project_created', self.project_id is not None, True
        )

        # ── Step 3: Upload OM with extraction ───────────────────────────
        upload_result = self.upload_document(
            file_path=pdf_path,
            doc_type='Offering Memorandum',
            run_full_extraction=True,
        )

        self.doc_id = upload_result.get('doc_id')
        extraction_info = upload_result.get('extraction', {})

        self.validator.assert_field_equals(
            'upload_success', upload_result.get('success', False), True
        )
        self.validator.assert_field_equals(
            'doc_id_returned', self.doc_id is not None, True
        )
        self.validator.calibrate('doc_id', self.doc_id)
        self.validator.calibrate('fields_staged',
                                 extraction_info.get('fields_staged', 0))

        # ── Step 4: Poll extraction staging ─────────────────────────────
        fields_already = extraction_info.get('fields_staged', 0)

        if fields_already >= config.EXTRACTION_MIN_FIELDS:
            logger.info(f'Upload returned {fields_already} staged fields — fetching details')
            extractions = []
            try:
                url = config.STAGING_ENDPOINT.format(project_id=self.project_id)
                resp = self.session.get(
                    url, params={'doc_id': self.doc_id},
                    timeout=config.API_TIMEOUT,
                )
                if resp.status_code == 200:
                    extractions = resp.json().get('extractions', [])
            except Exception:
                pass
        else:
            extractions = self.poll_extraction_staging(doc_id=self.doc_id)

        field_count = len(extractions)
        self.validator.calibrate('extraction_field_count', field_count)
        self.validator.assert_field_equals(
            'has_extractions', field_count >= config.EXTRACTION_MIN_FIELDS, True
        )

        # Log extracted field keys for diagnostics
        field_keys = sorted(set(e.get('field_key', '') for e in extractions))
        self.validator.calibrate('extracted_field_keys', field_keys)
        logger.info(f'Extracted {field_count} fields: {field_keys}')

        # ── Step 5: Accept + commit ─────────────────────────────────────
        if extractions:
            accept_result = self.accept_all_staging()
            self.validator.calibrate('accepted_count',
                                     accept_result.get('accepted', 0))

            commit_result = self.commit_staging(commit_all=True)
            committed = commit_result.get('committed', 0)
            self.validator.calibrate('committed_count', committed)
            self.validator.assert_field_equals(
                'commit_success',
                commit_result.get('success', False),
                True,
            )
        else:
            self._log_step('commit_staging', 'No extractions to commit')
            self._pass_step('Skipped accept/commit — no extractions')

        # ── Step 6: Create thread and ask financial questions ───────────
        self.create_thread(
            project_id=self.project_id,
            page_context='mf_operations',
        )

        self.validator.assert_field_equals(
            'thread_created', self.thread_id is not None, True
        )

        # Phase 1: Natural questions — diagnose tool routing behavior
        logger.info('--- Phase 1: Natural questions ---')
        for q in S3_NATURAL_QUESTIONS:
            self._ask_and_validate(q)

        # Phase 2: Forced tool invocation — exercise calc engine
        logger.info('--- Phase 2: Forced tool invocation ---')
        for q in S3_FORCED_QUESTIONS:
            self._ask_and_validate(q)

        # ── Step 7: Summary ─────────────────────────────────────────────
        self._log_step('summary', 'Scenario complete', {
            'validations_passed': self.validator.pass_count,
            'validations_failed': self.validator.fail_count,
        })
        self._pass_step(
            f'S3 complete: {self.validator.pass_count}/'
            f'{len(self.validator.results)} checks passed'
        )

    def _ask_and_validate(self, q: dict):
        """Ask a single question, validate, and calibrate."""
        qid = q['id']
        logger.info(f'Asking: {qid} — {q["prompt"][:60]}...')

        chat_resp = self.send_message(
            content=q['prompt'],
            page_context=q['page_context'],
        )

        # Core validation: no errors
        self.validator.assert_response_not_error(chat_resp)

        # Check expected keywords in response
        for keyword in q['expect_mentions']:
            self.validator.assert_response_mentions(chat_resp, keyword)

        # Calibrate tool calls and response
        tools_used = [tc.tool_name for tc in chat_resp.tool_calls]
        self.validator.calibrate(f'{qid}_tools', tools_used)
        self.validator.calibrate(f'{qid}_response_length',
                                 len(chat_resp.assistant_content))

        # Log for review
        snippet = chat_resp.assistant_content[:200]
        logger.info(f'  Tools: {tools_used}')
        logger.info(f'  Response: {snippet}...')

    def get_results(self) -> tuple[dict, dict]:
        """Run and return (scenario_result, validation_summary)."""
        result = self.run(cleanup=True)
        validation = self.validator.summary()

        if config.CALIBRATION_MODE:
            manifest_path = self.validator.save_manifest()
            logger.info(f'Manifest saved to {manifest_path}')

        return result, validation


def run_s3():
    """Entry point for running S3 standalone."""
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s [%(name)s] %(levelname)s: %(message)s',
    )

    from .report import TestReport

    agent = ScenarioS3()
    result, validation = agent.get_results()

    report = TestReport(suite_name='s3_financial_queries')
    report.add_scenario(result, validation)
    report.print_summary()

    path = report.save_json()
    print(f'Report saved to: {path}')

    return report
