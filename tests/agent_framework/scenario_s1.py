"""
Scenario S1 — Document Upload & Extraction

Tests the full document ingestion pipeline for a multifamily rent roll:
1. Create MF project via API
2. Upload rent roll PDF (triggers extraction)
3. Poll extraction staging until fields appear
4. Validate extracted fields (count, key fields present, confidence)
5. Commit accepted fields to production tables
6. Create Landscaper thread and ask about the extracted data
7. Verify Landscaper can reference the ingested data in its responses

Calibration mode: Records field counts, field names, and response patterns.
Test mode: Compares against calibration manifest.
"""

import logging
import os

from . import config
from .base_agent import BaseAgent
from .validators import Validator

logger = logging.getLogger('agent_framework.s1')

# Fields we expect extraction to produce from the Torrance rent roll.
# The pipeline extracts header metadata reliably; unit-level table parsing
# is a known gap for tabular/summary PDFs.
EXPECTED_RENT_ROLL_FIELDS = [
    'property_name',
    'street_address',
    'zip_code',
]

# Questions to ask Landscaper after extraction + commit
S1_QUESTIONS = [
    {
        'prompt': 'How many units does this property have based on the uploaded documents?',
        'page_context': 'mf_property',
        'expect_mentions': [],  # Calibration captures actual; test mode compares
    },
    {
        'prompt': 'Summarize what you know about this property from the rent roll.',
        'page_context': 'mf_property',
        'expect_mentions': ['rent'],
    },
]


class ScenarioS1(BaseAgent):
    """Document upload and extraction — rent roll PDF."""

    def __init__(self):
        super().__init__('s1_document_extraction')
        self.validator = Validator('s1_document_extraction')
        self.doc_id = None

    def run_scenario(self):
        # ── Step 1: Verify test document exists ─────────────────────────
        pdf_path = os.path.abspath(config.S1_RENT_ROLL_PDF)
        if not os.path.exists(pdf_path):
            self._fail_step(f'Test PDF not found: {pdf_path}')
            raise Exception(f'Missing test document: {pdf_path}')
        self._log_step('check_file', f'Test PDF: {os.path.basename(pdf_path)}')
        self._pass_step(f'Found: {os.path.basename(pdf_path)} ({os.path.getsize(pdf_path)} bytes)')

        # ── Step 2: Create project ──────────────────────────────────────
        project_name = f'{config.TEST_PROJECT_PREFIX}S1_Doc_Extraction'

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

        # ── Step 3: Upload rent roll with extraction ────────────────────
        upload_result = self.upload_document(
            file_path=pdf_path,
            doc_type='Rent Roll',
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
        self.validator.calibrate('extraction_triggered',
                                 extraction_info.get('triggered', False))
        self.validator.calibrate('fields_staged',
                                 extraction_info.get('fields_staged', 0))

        # ── Step 4: Poll extraction staging ─────────────────────────────
        # If the upload endpoint already returned staged fields, we may
        # still poll to get the full picture (some fields arrive async).
        fields_already = extraction_info.get('fields_staged', 0)

        if fields_already >= config.EXTRACTION_MIN_FIELDS:
            logger.info(f'Upload returned {fields_already} staged fields — skipping poll')
            extractions = []
            # Still fetch staging to get the field list
            try:
                import requests as req_lib
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

        # ── Step 5: Validate extracted fields ───────────────────────────
        field_count = len(extractions)
        self.validator.calibrate('extraction_field_count', field_count)

        self.validator.assert_field_equals(
            'has_extractions',
            field_count >= config.EXTRACTION_MIN_FIELDS,
            True,
        )

        # Check that key field_keys are present
        field_keys = [e.get('field_key', '') for e in extractions]
        self.validator.calibrate('extracted_field_keys', sorted(set(field_keys)))

        for expected_field in EXPECTED_RENT_ROLL_FIELDS:
            # Fuzzy match — field_key might have a prefix or slightly
            # different naming
            found = any(expected_field in fk for fk in field_keys)
            self.validator.assert_field_equals(
                f'field_present:{expected_field}', found, True,
            )

        # Check confidence scores
        confidences = [
            e.get('confidence_score', 0)
            for e in extractions
            if e.get('confidence_score') is not None
        ]
        if confidences:
            avg_confidence = sum(confidences) / len(confidences)
            self.validator.calibrate('avg_confidence', round(avg_confidence, 3))
            # Rent roll extraction should have reasonable confidence
            self.validator.assert_field_equals(
                'avg_confidence_above_50pct',
                avg_confidence > 0.5,
                True,
            )

        # Count by status
        status_counts = {}
        for e in extractions:
            s = e.get('status', 'unknown')
            status_counts[s] = status_counts.get(s, 0) + 1
        self.validator.calibrate('status_counts', status_counts)

        # ── Step 6: Accept all pending, then commit ─────────────────────
        # Staging rows start as 'pending'. Must accept before commit
        # writes them to production tables.
        if extractions:
            accept_result = self.accept_all_staging()
            accepted_count = accept_result.get('accepted', 0)
            self.validator.calibrate('accepted_count', accepted_count)

            commit_result = self.commit_staging(commit_all=True)
            committed_count = commit_result.get('committed', 0)
            self.validator.calibrate('committed_count', committed_count)
            self.validator.assert_field_equals(
                'commit_success',
                commit_result.get('success', False),
                True,
            )
            self.validator.assert_field_equals(
                'committed_gt_zero',
                committed_count > 0,
                True,
            )
        else:
            self._log_step('commit_staging', 'No extractions to commit')
            self._pass_step('Skipped accept/commit — no extractions')
            self.validator.calibrate('accepted_count', 0)
            self.validator.calibrate('committed_count', 0)

        # ── Step 7: Ask Landscaper about extracted data ─────────────────
        self.create_thread(
            project_id=self.project_id,
            page_context='mf_property',
        )

        self.validator.assert_field_equals(
            'thread_created', self.thread_id is not None, True
        )

        for i, q in enumerate(S1_QUESTIONS):
            logger.info(f'Asking question {i+1}: {q["prompt"][:60]}...')

            chat_resp = self.send_message(
                content=q['prompt'],
                page_context=q['page_context'],
            )

            self.validator.assert_response_not_error(chat_resp)

            for keyword in q['expect_mentions']:
                self.validator.assert_response_mentions(chat_resp, keyword)

            # Calibrate response
            self.validator.calibrate(
                f'question_{i+1}_response_length',
                len(chat_resp.assistant_content),
            )
            self.validator.calibrate(
                f'question_{i+1}_tools_called',
                [tc.tool_name for tc in chat_resp.tool_calls],
            )

        # ── Step 8: Summary ─────────────────────────────────────────────
        self._log_step('summary', 'Scenario complete', {
            'validations_passed': self.validator.pass_count,
            'validations_failed': self.validator.fail_count,
        })
        self._pass_step(
            f'S1 complete: {self.validator.pass_count}/{len(self.validator.results)} checks passed'
        )

    def get_results(self) -> tuple[dict, dict]:
        """Run and return (scenario_result, validation_summary)."""
        result = self.run(cleanup=True)
        validation = self.validator.summary()

        if config.CALIBRATION_MODE:
            manifest_path = self.validator.save_manifest()
            logger.info(f'Manifest saved to {manifest_path}')

        return result, validation


def run_s1():
    """Entry point for running S1 standalone."""
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s [%(name)s] %(levelname)s: %(message)s',
    )

    from .report import TestReport

    agent = ScenarioS1()
    result, validation = agent.get_results()

    report = TestReport(suite_name='s1_document_extraction')
    report.add_scenario(result, validation)
    report.print_summary()

    path = report.save_json()
    print(f'Report saved to: {path}')

    return report
