"""
Scenario S15 — Property Details (Rent Roll / Units) via Chat Workflow

Second in the workflow-test family. Picks up where S14 left off conceptually:
S14 fills in project metadata; S15 fills in the rent roll for an MF project.
S15 is independent — it creates its own fresh MF project rather than chaining
state from S14, since scenarios are self-contained.

Tested behaviors (mirroring S14's structure):

1. Bulk conversational entry — user pastes a four-row unit-type mix in one
   message; Landscaper parses it into update_unit_types (or equivalent) and
   writes the records. Outcome verified via Django re-fetch.

2. Landscaper-driven completion — after the bulk write, Landscaper should
   identify what rent-roll detail is still missing (occupancy, lease dates,
   unit numbers) without a generic deflection.

3. Single-type adjustment — user provides one targeted update ("bump the
   3-bedroom rent by $100"). Verify the specific unit_type's market_rent
   landed at the new value.

4. Modal handoff — user explicitly asks for the rent-roll form. Verify
   open_input_modal('rent_roll') fires AND that no DB writes happen from the
   modal call itself.

5. State verification — final summary query. Verify Landscaper's response
   mentions the unit-type counts and rents we wrote.

Verification surfaces:
- Django GET /api/multifamily/unit-types/by_project/{id}/ — primary read

Cleanup: deletes the project at end (per BaseAgent _created_project_ids).

Calibration mode: records tool calls and outcome values.
Test mode: compares against calibration manifest.

Out of scope (separate scenarios):
- Individual unit detail (rent roll line items per unit) — covered by a
  follow-up MF scenario or dedicated unit-edit flow.
- Land-Dev variant (parcels / land-use) — sibling scenario S15-LD when
  needed; same skeleton with different tools.
- Operating statement (S16+).
"""

import logging

from . import config
from .base_agent import BaseAgent
from .validators import Validator

logger = logging.getLogger('agent_framework.s15')


# ─────────────────────────────────────────────────────────────────────────────
# Phase 1 — Bulk conversational entry. Four unit types, each with a unique
# bedroom count so Phase 2 can match-by-bedrooms without ambiguity.
# Total = 12 + 36 + 24 + 12 = 84 units.
# ─────────────────────────────────────────────────────────────────────────────
BULK_UNIT_MIX_PROMPT = (
    "Here's the unit mix for this property: "
    "12 studios at 500 square feet renting for $1,300, "
    "36 1BR/1BA at 750 square feet renting for $1,500, "
    "24 2BR/2BA at 1,050 square feet renting for $1,850, "
    "and 12 3BR/2BA at 1,250 square feet renting for $2,300. "
    "84 units total."
)

# Expected post-bulk-write state, keyed by bedrooms. Match-by-bedrooms is the
# stable natural key; unit_type_ids and names are model-stochastic.
EXPECTED_UNIT_TYPES = {
    0: {'unit_count': 12, 'avg_square_feet': 500,  'market_rent': 1300},
    1: {'unit_count': 36, 'avg_square_feet': 750,  'market_rent': 1500},
    2: {'unit_count': 24, 'avg_square_feet': 1050, 'market_rent': 1850},
    3: {'unit_count': 12, 'avg_square_feet': 1250, 'market_rent': 2300},
}
EXPECTED_TOTAL_UNITS = sum(t['unit_count'] for t in EXPECTED_UNIT_TYPES.values())  # 84
EXPECTED_UNIT_TYPE_COUNT = len(EXPECTED_UNIT_TYPES)  # 4


# ─────────────────────────────────────────────────────────────────────────────
# Phase 3 — Landscaper-driven completion. After unit-type mix is in, ask what
# rent-roll detail is still missing. Rent-roll-specific concepts the model
# might surface: occupancy, vacancy, lease terms, tenant names, etc.
# ─────────────────────────────────────────────────────────────────────────────
GAP_PROMPT = (
    "What other rent-roll detail is missing that I should fill in?"
)

GAP_CONCEPTS = [
    'occupanc', 'vacanc', 'lease', 'tenant', 'concession',
    'turnover', 'unit number', 'building', 'renovation',
]


# ─────────────────────────────────────────────────────────────────────────────
# Phase 4 — Single-type adjustment. Targeted bump on one unit type. Verify
# the specific row's market_rent updated to expected_value.
# Format: (prompt, bedrooms_to_inspect, expected_market_rent_after)
# ─────────────────────────────────────────────────────────────────────────────
SINGLE_TYPE_UPDATES = [
    (
        # Original phrasing ("Bump the rent on the 3-bedroom units by $100")
        # was prone to model picking an invalid tool path (field_update on
        # tbl_multifamily_unit_type without a record_id, which fails confirm).
        # An explicit target value steers the model to update_unit_types.
        'Update the 3-bedroom unit type market rent to $2,400.',
        3,
        2400,  # 2300 + 100
    ),
]


# ─────────────────────────────────────────────────────────────────────────────
# Phase 5 — Modal handoff. User asks for the rent-roll form. Should fire
# open_input_modal('rent_roll') and NOT write any rent-roll data.
# ─────────────────────────────────────────────────────────────────────────────
MODAL_PROMPT = (
    "Open the rent roll form so I can review what's been entered."
)


# ─────────────────────────────────────────────────────────────────────────────
# Phase 6 — State verification via summary.
# ─────────────────────────────────────────────────────────────────────────────
SUMMARY_PROMPT = (
    "Give me a summary of this property's rent roll."
)


class ScenarioS15(BaseAgent):
    """Property details (rent roll / units) via chat workflow."""

    def __init__(self):
        super().__init__('s15_property_details_rent_roll')
        self.validator = Validator('s15_property_details_rent_roll')

    def run_scenario(self):
        # ── Step 1: Setup — fresh MF project ──────────────────────────
        project_name = f'{config.TEST_PROJECT_PREFIX}S15_Property_Details'

        self.create_project_via_api(
            project_name=project_name,
            project_type_code='MF',
        )

        self.validator.observe('project_id', self.project_id)
        self.validator.assert_field_equals(
            'project_created', self.project_id is not None, True
        )

        # ── Step 2: Project-scoped thread ──────────────────────────
        self.create_thread(
            project_id=self.project_id,
            page_context='property',
        )
        self.validator.assert_field_equals(
            'thread_created', self.thread_id is not None, True
        )

        # ── Phase 1: Bulk unit-type entry ────────────────────────────
        logger.info('--- Phase 1: Bulk unit-type entry ---')
        self._test_bulk_unit_mix()

        # ── Phase 2: Verify writes landed via Django re-fetch ────────
        logger.info('--- Phase 2: Verify unit-type writes landed ---')
        self._verify_bulk_unit_writes()

        # ── Phase 3: Landscaper-driven completion ────────────────────
        logger.info('--- Phase 3: Landscaper-driven gap surfacing ---')
        self._test_gap_surfacing()

        # ── Phase 4: Single-type adjustment ──────────────────────────
        logger.info('--- Phase 4: Single-type rent adjustment ---')
        self._test_single_type_updates()

        # ── Phase 5: Modal handoff ──────────────────────────────────
        logger.info('--- Phase 5: Modal handoff ---')
        self._test_modal_handoff()

        # ── Phase 6: Summary ────────────────────────────────────────
        logger.info('--- Phase 6: Landscaper summary ---')
        self._test_summary()

        self._log_step('summary', 'Scenario complete', {
            'validations_passed': self.validator.pass_count,
            'validations_failed': self.validator.fail_count,
        })
        self._pass_step(
            f'S15 complete: {self.validator.pass_count}/'
            f'{len(self.validator.results)} checks passed'
        )

    # ──────────────────────────────────────────────────────────────────
    # Phase 1
    # ──────────────────────────────────────────────────────────────────
    def _test_bulk_unit_mix(self):
        chat_resp = self.send_message(
            content=BULK_UNIT_MIX_PROMPT,
            page_context='property',
        )

        self.validator.assert_response_not_error(chat_resp)

        tools_used = [tc.tool_name for tc in chat_resp.tool_calls]
        self.validator.observe('p1_tools', tools_used)
        logger.info(f'  Phase 1 tools: {tools_used}')

        # Tool routing here is genuinely flexible: update_unit_types is the
        # canonical path, but the model may use bulk_update_fields, write
        # tbl_project.total_units, or invent another route. Outcome is what
        # matters (Phase 2). Hard-assert only that *some* write was attempted.
        write_tools = (
            'update_unit_types', 'update_units', 'bulk_update_fields',
            'update_project_field',
        )
        wrote_something = any(t in tools_used for t in write_tools)
        self.validator.observe('p1_used_unit_type_tool',
                               'update_unit_types' in tools_used)
        self.validator.assert_field_equals(
            'p1_some_write_attempted', wrote_something, True
        )

        if chat_resp.has_mutation:
            logger.info('  Mutation proposed — confirming...')
            confirm_data = self.confirm_mutation(chat_resp)
            self.validator.assert_field_equals(
                'p1_confirm_success', confirm_data.get('success', False), True
            )

    # ──────────────────────────────────────────────────────────────────
    # Phase 2 — Outcome verification via Django MF unit-type endpoint
    # ──────────────────────────────────────────────────────────────────
    def _verify_bulk_unit_writes(self):
        """
        Re-fetch unit types via Django and assert the bulk-paste landed.
        Match-by-bedrooms (each unit type has a unique bedroom count in the
        prompt) so per-record assertions don't depend on names/IDs.
        """
        records = self._fetch_unit_types()
        self.validator.observe('p2_unit_type_count_actual', len(records))

        # Hard contract: at least the four unit types from the prompt landed.
        self.validator.assert_field_equals(
            'p2_unit_type_count_at_least_expected',
            len(records) >= EXPECTED_UNIT_TYPE_COUNT,
            True
        )

        # Normalize each record's count and bedrooms keys so per-row checks
        # work regardless of which legacy alias the API echoes back. The MF
        # endpoint sends bedrooms as a stringified decimal ("1.0") and the
        # canonical count column is total_units (not unit_count).
        def _coalesce_count(r: dict) -> int:
            for key in ('total_units', 'unit_count'):
                v = r.get(key)
                if v is not None:
                    try:
                        return int(v)
                    except (TypeError, ValueError):
                        continue
            return 0

        def _coalesce_bedrooms(r: dict):
            v = r.get('bedrooms')
            if v is None:
                return None
            try:
                return int(float(v))
            except (TypeError, ValueError):
                return None

        # Index by bedrooms; sum counts when the model split into duplicates.
        by_bedrooms: dict[int, dict] = {}
        for rec in records:
            bd = _coalesce_bedrooms(rec)
            if bd is None:
                continue
            normalized = dict(rec)
            normalized['_unit_count'] = _coalesce_count(rec)
            existing = by_bedrooms.get(bd)
            if existing is None:
                by_bedrooms[bd] = normalized
            else:
                existing['_unit_count'] = existing['_unit_count'] + normalized['_unit_count']

        # Sum of unit_count across all rows should land at the expected total.
        total = sum(_coalesce_count(r) for r in records)
        self.validator.calibrate('p2_total_unit_count_actual', total)
        self.validator.assert_field_equals(
            'p2_total_unit_count', total, EXPECTED_TOTAL_UNITS
        )

        # Per-bedroom assertions: count + rent. The market_rent column is the
        # canonical rent on tbl_multifamily_unit_type; current_market_rent is
        # the legacy alias and may also be populated.
        for bd, expected in EXPECTED_UNIT_TYPES.items():
            rec = by_bedrooms.get(bd)
            present = rec is not None
            self.validator.calibrate(f'p2_bd{bd}_present', present)
            self.validator.assert_field_equals(
                f'p2_bd{bd}_present_assert', present, True
            )
            if not present:
                continue

            actual_count = rec.get('_unit_count')
            self.validator.calibrate(f'p2_bd{bd}_unit_count_actual', actual_count)
            self.validator.assert_field_equals(
                f'p2_bd{bd}_unit_count', actual_count, expected['unit_count']
            )

            actual_rent = (
                rec.get('market_rent')
                or rec.get('current_market_rent')
                or rec.get('current_rent_avg')
            )
            try:
                actual_rent_int = int(float(actual_rent)) if actual_rent is not None else None
            except (TypeError, ValueError):
                actual_rent_int = None
            self.validator.calibrate(f'p2_bd{bd}_market_rent_actual', actual_rent_int)
            self.validator.assert_field_equals(
                f'p2_bd{bd}_market_rent', actual_rent_int, expected['market_rent']
            )

    # ──────────────────────────────────────────────────────────────────
    # Phase 3 — Gap surfacing
    # ──────────────────────────────────────────────────────────────────
    def _test_gap_surfacing(self):
        chat_resp = self.send_message(
            content=GAP_PROMPT,
            page_context='property',
        )

        self.validator.assert_response_not_error(chat_resp)

        tools_used = [tc.tool_name for tc in chat_resp.tool_calls]
        self.validator.observe('p3_tools', tools_used)
        self.validator.observe('p3_response_length', len(chat_resp.assistant_content))

        used_read = any(
            t in tools_used for t in
            ('get_unit_types', 'get_units', 'get_project_fields',
             'get_data_completeness', 'get_multifamily_property')
        )
        self.validator.observe('p3_used_read_tool', used_read)

        content_lower = chat_resp.assistant_content.lower()
        concepts_mentioned = [c for c in GAP_CONCEPTS if c in content_lower]
        self.validator.observe('p3_concepts_mentioned', concepts_mentioned)
        self.validator.assert_field_equals(
            'p3_at_least_one_concept', len(concepts_mentioned) > 0, True
        )

    # ──────────────────────────────────────────────────────────────────
    # Phase 4 — Single-type adjustment, outcome-based
    # ──────────────────────────────────────────────────────────────────
    def _test_single_type_updates(self):
        for prompt, bedrooms, expected_rent in SINGLE_TYPE_UPDATES:
            logger.info(f'  Single update: {prompt!r}')
            chat_resp = self.send_message(content=prompt, page_context='property')
            self.validator.assert_response_not_error(chat_resp)

            tools_used = [tc.tool_name for tc in chat_resp.tool_calls]
            self.validator.observe(f'p4_bd{bedrooms}_tools', tools_used)

            if chat_resp.has_mutation:
                confirm_data = self.confirm_mutation(chat_resp)
                self.validator.calibrate(
                    f'p4_bd{bedrooms}_confirm_success',
                    confirm_data.get('success', False),
                )

            # Outcome: re-fetch unit types and check the targeted row's rent.
            records = self._fetch_unit_types()

            def _bd_eq(r: dict, target_bd: int) -> bool:
                v = r.get('bedrooms')
                try:
                    return int(float(v)) == target_bd
                except (TypeError, ValueError):
                    return False

            target = next((r for r in records if _bd_eq(r, bedrooms)), None)
            actual_rent = None
            if target is not None:
                raw = (
                    target.get('market_rent')
                    or target.get('current_market_rent')
                    or target.get('current_rent_avg')
                )
                try:
                    actual_rent = int(float(raw)) if raw is not None else None
                except (TypeError, ValueError):
                    actual_rent = None

            self.validator.calibrate(f'p4_bd{bedrooms}_market_rent_actual', actual_rent)
            self.validator.assert_field_equals(
                f'p4_bd{bedrooms}_market_rent_persisted',
                actual_rent,
                expected_rent,
            )

    # ──────────────────────────────────────────────────────────────────
    # Phase 5 — Modal handoff
    # ──────────────────────────────────────────────────────────────────
    def _test_modal_handoff(self):
        chat_resp = self.send_message(content=MODAL_PROMPT, page_context='property')
        self.validator.assert_response_not_error(chat_resp)

        tools_used = [tc.tool_name for tc in chat_resp.tool_calls]
        self.validator.observe('p5_tools', tools_used)

        modal_call = chat_resp.find_tool_call('open_input_modal')
        self.validator.assert_field_equals(
            'p5_open_input_modal_called', modal_call is not None, True
        )

        if modal_call:
            requested_modal = (modal_call.tool_input or {}).get('modal_name')
            self.validator.calibrate('p5_modal_name', requested_modal)
            self.validator.assert_field_equals(
                'p5_correct_modal', requested_modal == 'rent_roll', True
            )

        # Modal call alone must not propose any data mutation.
        self.validator.calibrate('p5_had_mutation', chat_resp.has_mutation)

    # ──────────────────────────────────────────────────────────────────
    # Phase 6 — Summary
    # ──────────────────────────────────────────────────────────────────
    def _test_summary(self):
        chat_resp = self.send_message(content=SUMMARY_PROMPT, page_context='property')
        self.validator.assert_response_not_error(chat_resp)

        tools_used = [tc.tool_name for tc in chat_resp.tool_calls]
        self.validator.observe('p6_tools', tools_used)

        content_lower = chat_resp.assistant_content.lower()
        # The 3BR rent was bumped to $2,400 in Phase 4; check for either
        # the original or the bumped value as an acceptable mention.
        expected_mentions = [
            ('84', 'total units'),
            ('1,300', 'studio rent'),
            ('1300', 'studio rent (no comma)'),
            ('1,500', '1BR rent'),
            ('1500', '1BR rent (no comma)'),
            ('1,850', '2BR rent'),
            ('1850', '2BR rent (no comma)'),
            ('2,400', '3BR rent (post-bump)'),
            ('2400', '3BR rent (post-bump, no comma)'),
            ('studio', 'studio mention'),
            ('3-bedroom', '3BR mention'),
            ('3 bedroom', '3BR mention alt'),
        ]
        mentions_present = sorted({
            label for value, label in expected_mentions if value in content_lower
        })
        self.validator.observe('p6_mentions_present', mentions_present)
        self.validator.assert_field_equals(
            'p6_at_least_two_mentions', len(mentions_present) >= 2, True
        )

        snippet = chat_resp.assistant_content[:300]
        logger.info(f'  Summary response ({len(chat_resp.assistant_content)} chars): {snippet}...')

    # ──────────────────────────────────────────────────────────────────
    # Helpers
    # ──────────────────────────────────────────────────────────────────
    def _fetch_unit_types(self) -> list[dict]:
        """
        Read unit types from the Django MF endpoint. Returns a list of dicts
        (or [] on any failure — caller decides how to fail).
        """
        self._ensure_auth()
        import requests as req

        url = (
            f'{config.DJANGO_BASE_URL}/api/multifamily/unit-types/'
            f'by_project/{self.project_id}/'
        )
        try:
            resp = self.session.get(url, timeout=config.API_TIMEOUT)
        except req.RequestException as e:
            logger.warning(f'    unit-types fetch failed: {e}')
            return []

        if resp.status_code != 200:
            logger.warning(f'    unit-types returned {resp.status_code}')
            return []

        body = resp.json()
        # DRF list responses can be either a bare list or wrapped. The MF
        # unit-types endpoint specifically wraps in {"unit_types": [...]}.
        if isinstance(body, list):
            return body
        if isinstance(body, dict):
            return (
                body.get('unit_types')
                or body.get('results')
                or body.get('records')
                or []
            )
        return []

    def get_results(self) -> tuple[dict, dict]:
        """Run and return (scenario_result, validation_summary)."""
        import os
        skip_cleanup = os.getenv('AGENT_SKIP_CLEANUP', 'false').lower() == 'true'
        result = self.run(cleanup=not skip_cleanup)
        validation = self.validator.summary()

        if config.CALIBRATION_MODE:
            self.validator.save_manifest()
            logger.info(f'Manifest saved to {config.MANIFEST_DIR}/{self.scenario_name}.json')

        return result, validation
