"""
Scenario S7 — Location Brief Intent Variants

Tests intent resolution for `generate_location_brief` across 45 prompt
variants that phrase the request in different ways (most do NOT use the
literal phrase "location brief"). Exercises 4 positive tiers + 1 negative
tier:

  Tier 1 — Synonyms (10):           "area report", "market overview", etc.
  Tier 2 — Indirect framing (10):   describes the deal, not a doc type
  Tier 3 — Property-type fuzzing:   explicit "location brief", fuzzy PT vocab
  Tier 4 — Location fuzzing (10):   explicit LB + PT, varied location forms
  Negative (5):                     location-adjacent but NOT location brief

Each prompt runs on a fresh unassigned thread (`project_id=None`) to mirror
how users hit this on `/w/chat`. One prompt = one thread = one message.

Scoring rule (from S5 variant review, v3):
  - Pass:    tool fires with correct (city, state, property_type)
  - Partial: tool fires with wrong city/state/PT
  - Miss:    wrong tool fires
  - Fail:    no tool fires / error
  - Tier threshold: ≥8/10 positive tiers, ≥4/5 negative tier

No-PT variants (Tier 1 #5, Tier 2 #4/#8): expect `property_type=None` and
a generic brief branch — these are correct when no PT is asserted.

Calibration mode: Records per-prompt tool calls, extracted params, pass
counts per tier. Test mode: Compares pass rates against calibration manifest.
"""

import logging
from typing import Any, Dict, List, Optional, Tuple

from . import config
from .base_agent import BaseAgent
from .validators import Validator

logger = logging.getLogger('agent_framework.s7')

# Per-tier pass threshold (out of 10, except negative out of 5)
POSITIVE_TIER_THRESHOLD = 8
NEGATIVE_TIER_THRESHOLD = 4

# ── Prompt variants ─────────────────────────────────────────────────────────
#
# Each variant is a dict:
#   prompt:         the user message
#   expected_city:  lowercase-compare against tool_input.city; None = skip
#   expected_state: 2-letter code; None = skip (e.g., ambiguous defaults)
#   expected_pt:    PT code (LAND, MF, OFF, RET, IND, HTL, MXU) or None
#   note:           short classification label for the report
#
# Tier 4 #6 and #10 are "default" variants — expected_state=None means we
# accept whatever Landscaper resolves as long as city + PT are right. This
# mirrors the "defaults to most common / user history" rule.

TIER_1_SYNONYMS: List[Dict[str, Any]] = [
    {'prompt': 'Give me an area report on Queen Creek, AZ for land development',
     'expected_city': 'Queen Creek', 'expected_state': 'AZ', 'expected_pt': 'LAND',
     'note': 'synonym: area report'},
    {'prompt': 'Market overview for Bellflower, CA — small apartments',
     'expected_city': 'Bellflower', 'expected_state': 'CA', 'expected_pt': 'MF',
     'note': 'synonym: market overview'},
    {'prompt': 'Economic brief on Tempe, AZ for office',
     'expected_city': 'Tempe', 'expected_state': 'AZ', 'expected_pt': 'OFF',
     'note': 'synonym: economic brief'},
    {'prompt': 'Neighborhood profile for Mesa, AZ — retail',
     'expected_city': 'Mesa', 'expected_state': 'AZ', 'expected_pt': 'RET',
     'note': 'synonym: neighborhood profile'},
    {'prompt': 'Research Goodyear, AZ',
     'expected_city': 'Goodyear', 'expected_state': 'AZ', 'expected_pt': None,
     'note': 'synonym: research (no PT → generic)'},
    {'prompt': "What's the market intel on Scottsdale, AZ for hotel",
     'expected_city': 'Scottsdale', 'expected_state': 'AZ', 'expected_pt': 'HTL',
     'note': 'synonym: market intel'},
    {'prompt': 'Pull a regional summary for Austin, TX mixed-use',
     'expected_city': 'Austin', 'expected_state': 'TX', 'expected_pt': 'MXU',
     'note': 'synonym: regional summary'},
    {'prompt': 'Area overview — Chandler, AZ, multifamily',
     'expected_city': 'Chandler', 'expected_state': 'AZ', 'expected_pt': 'MF',
     'note': 'synonym: area overview'},
    {'prompt': 'Give me the market snapshot for Gilbert, AZ land',
     'expected_city': 'Gilbert', 'expected_state': 'AZ', 'expected_pt': 'LAND',
     'note': 'synonym: market snapshot'},
    {'prompt': 'Demographic and economic profile of Phoenix, AZ for industrial',
     'expected_city': 'Phoenix', 'expected_state': 'AZ', 'expected_pt': 'IND',
     'note': 'synonym: demographic and economic profile'},
]

TIER_2_INDIRECT: List[Dict[str, Any]] = [
    {'prompt': "I'm underwriting a 40-acre parcel in Queen Creek, AZ — what should I know",
     'expected_city': 'Queen Creek', 'expected_state': 'AZ', 'expected_pt': 'LAND',
     'note': 'indirect: underwriting parcel'},
    {'prompt': 'Looking at Class A office in Tempe, AZ — tell me about the area',
     'expected_city': 'Tempe', 'expected_state': 'AZ', 'expected_pt': 'OFF',
     'note': 'indirect: Class A office'},
    {'prompt': 'Considering a retail strip center acquisition in Mesa, AZ',
     'expected_city': 'Mesa', 'expected_state': 'AZ', 'expected_pt': 'RET',
     'note': 'indirect: strip center acquisition'},
    {'prompt': "What's going on economically in Gilbert, AZ",
     'expected_city': 'Gilbert', 'expected_state': 'AZ', 'expected_pt': None,
     'note': 'indirect: economic (no PT → generic)'},
    {'prompt': 'Background on Scottsdale, AZ for a boutique hotel investment',
     'expected_city': 'Scottsdale', 'expected_state': 'AZ', 'expected_pt': 'HTL',
     'note': 'indirect: boutique hotel'},
    {'prompt': 'Tell me everything about Chandler, AZ for multifamily',
     'expected_city': 'Chandler', 'expected_state': 'AZ', 'expected_pt': 'MF',
     'note': 'indirect: tell me everything'},
    {'prompt': "I'm evaluating an industrial deal in Goodyear, AZ",
     'expected_city': 'Goodyear', 'expected_state': 'AZ', 'expected_pt': 'IND',
     'note': 'indirect: industrial deal'},
    {'prompt': 'Help me understand the Phoenix, AZ market',
     'expected_city': 'Phoenix', 'expected_state': 'AZ', 'expected_pt': None,
     'note': 'indirect: understand market (no PT → generic)'},
    {'prompt': 'Walk me through Austin, TX for a mixed-use project',
     'expected_city': 'Austin', 'expected_state': 'TX', 'expected_pt': 'MXU',
     'note': 'indirect: walk me through'},
    {'prompt': 'Before I dig into this Bellflower CA apartment deal, what should I know',
     'expected_city': 'Bellflower', 'expected_state': 'CA', 'expected_pt': 'MF',
     'note': 'indirect: apartment deal'},
]

TIER_3_PT_FUZZING: List[Dict[str, Any]] = [
    {'prompt': 'Location brief for Queen Creek, AZ — 40-acre entitled parcel',
     'expected_city': 'Queen Creek', 'expected_state': 'AZ', 'expected_pt': 'LAND',
     'note': 'PT: entitled parcel → LAND'},
    {'prompt': 'Location brief for Gilbert, AZ — raw land for a subdivision',
     'expected_city': 'Gilbert', 'expected_state': 'AZ', 'expected_pt': 'LAND',
     'note': 'PT: raw land / subdivision → LAND'},
    {'prompt': 'Location brief for Bellflower, CA — small apartment complex',
     'expected_city': 'Bellflower', 'expected_state': 'CA', 'expected_pt': 'MF',
     'note': 'PT: apartment complex → MF'},
    {'prompt': 'Location brief for Tempe, AZ — Class A office tower',
     'expected_city': 'Tempe', 'expected_state': 'AZ', 'expected_pt': 'OFF',
     'note': 'PT: Class A office tower → OFF'},
    {'prompt': 'Location brief for Chandler, AZ — medical office building',
     'expected_city': 'Chandler', 'expected_state': 'AZ', 'expected_pt': 'OFF',
     'note': 'PT: medical office → OFF'},
    {'prompt': 'Location brief for Mesa, AZ — power center',
     'expected_city': 'Mesa', 'expected_state': 'AZ', 'expected_pt': 'RET',
     'note': 'PT: power center → RET'},
    {'prompt': 'Location brief for Phoenix, AZ — distribution warehouse',
     'expected_city': 'Phoenix', 'expected_state': 'AZ', 'expected_pt': 'IND',
     'note': 'PT: distribution warehouse → IND'},
    {'prompt': 'Location brief for Goodyear, AZ — cold storage facility',
     'expected_city': 'Goodyear', 'expected_state': 'AZ', 'expected_pt': 'IND',
     'note': 'PT: cold storage → IND'},
    {'prompt': 'Location brief for Scottsdale, AZ — boutique hotel',
     'expected_city': 'Scottsdale', 'expected_state': 'AZ', 'expected_pt': 'HTL',
     'note': 'PT: boutique hotel → HTL'},
    {'prompt': 'Location brief for Austin, TX — live-work mixed-use development',
     'expected_city': 'Austin', 'expected_state': 'TX', 'expected_pt': 'MXU',
     'note': 'PT: live-work mixed-use → MXU'},
]

TIER_4_LOCATION_FUZZING: List[Dict[str, Any]] = [
    {'prompt': 'Location brief for Bellflower, California, multifamily',
     'expected_city': 'Bellflower', 'expected_state': 'CA', 'expected_pt': 'MF',
     'note': 'loc: full state name'},
    {'prompt': 'Location brief for Gilbert AZ land dev',
     'expected_city': 'Gilbert', 'expected_state': 'AZ', 'expected_pt': 'LAND',
     'note': 'loc: no comma'},
    {'prompt': 'Location brief for Tempe, Maricopa County, office',
     'expected_city': 'Tempe', 'expected_state': 'AZ', 'expected_pt': 'OFF',
     'note': 'loc: county → AZ'},
    {'prompt': 'Location brief for Queen Creek (Phoenix area) land',
     'expected_city': 'Queen Creek', 'expected_state': 'AZ', 'expected_pt': 'LAND',
     'note': 'loc: parenthetical region'},
    {'prompt': 'Location brief for the city of Scottsdale, Arizona, hotel',
     'expected_city': 'Scottsdale', 'expected_state': 'AZ', 'expected_pt': 'HTL',
     'note': 'loc: city of + full state'},
    {'prompt': 'Location brief for Bellflower — multifamily',
     'expected_city': 'Bellflower', 'expected_state': None, 'expected_pt': 'MF',
     'note': 'loc: no state → default (calibration: most common)'},
    {'prompt': 'Location brief for 85225 retail',
     'expected_city': 'Chandler', 'expected_state': 'AZ', 'expected_pt': 'RET',
     'note': 'loc: ZIP → Chandler, AZ'},
    {'prompt': 'Location brief for Mesa in Phoenix MSA, industrial',
     'expected_city': 'Mesa', 'expected_state': 'AZ', 'expected_pt': 'IND',
     'note': 'loc: MSA reference'},
    {'prompt': 'Location brief for Austin, Central Texas, mixed-use',
     'expected_city': 'Austin', 'expected_state': 'TX', 'expected_pt': 'MXU',
     'note': 'loc: regional name'},
    {'prompt': 'Location brief for Springfield warehouse',
     'expected_city': 'Springfield', 'expected_state': None, 'expected_pt': 'IND',
     'note': 'loc: ambiguous city → default (calibration: most common)'},
]

# Full-state-name → 2-letter code map (for Tier 4 variants passing "California" etc).
_STATE_ABBR = {
    'alabama': 'AL', 'alaska': 'AK', 'arizona': 'AZ', 'arkansas': 'AR',
    'california': 'CA', 'colorado': 'CO', 'connecticut': 'CT', 'delaware': 'DE',
    'florida': 'FL', 'georgia': 'GA', 'hawaii': 'HI', 'idaho': 'ID',
    'illinois': 'IL', 'indiana': 'IN', 'iowa': 'IA', 'kansas': 'KS',
    'kentucky': 'KY', 'louisiana': 'LA', 'maine': 'ME', 'maryland': 'MD',
    'massachusetts': 'MA', 'michigan': 'MI', 'minnesota': 'MN', 'mississippi': 'MS',
    'missouri': 'MO', 'montana': 'MT', 'nebraska': 'NE', 'nevada': 'NV',
    'new hampshire': 'NH', 'new jersey': 'NJ', 'new mexico': 'NM', 'new york': 'NY',
    'north carolina': 'NC', 'north dakota': 'ND', 'ohio': 'OH', 'oklahoma': 'OK',
    'oregon': 'OR', 'pennsylvania': 'PA', 'rhode island': 'RI', 'south carolina': 'SC',
    'south dakota': 'SD', 'tennessee': 'TN', 'texas': 'TX', 'utah': 'UT',
    'vermont': 'VT', 'virginia': 'VA', 'washington': 'WA', 'west virginia': 'WV',
    'wisconsin': 'WI', 'wyoming': 'WY',
}


def _parse_location(raw: str) -> Tuple[str, str]:
    """Parse "City, ST" or "City, State Name" → (city, 2-letter-state)."""
    if not raw or ',' not in raw:
        return raw.strip(), ''
    city, _, state_part = raw.rpartition(',')
    city = city.strip()
    state_part = state_part.strip()
    if len(state_part) == 2:
        return city, state_part.upper()
    return city, _STATE_ABBR.get(state_part.lower(), state_part.upper())


TIER_NEGATIVE: List[Dict[str, Any]] = [
    {'prompt': "What's the cap rate in Bellflower, CA multifamily",
     'note': 'neg: cap rate (market data)'},
    {'prompt': 'Show me land sale comps in Queen Creek, AZ',
     'note': 'neg: sale comps'},
    {'prompt': "What's office vacancy in Tempe, AZ",
     'note': 'neg: vacancy stat'},
    {'prompt': 'Who are the top industrial brokers in Phoenix, AZ',
     'note': 'neg: brokers list'},
    {'prompt': "What's the zoning for retail in Gilbert, AZ",
     'note': 'neg: zoning lookup'},
]


class ScenarioS7(BaseAgent):
    """Intent resolution test for generate_location_brief across 45 variants."""

    def __init__(self):
        super().__init__('s7_location_brief_intent')
        self.validator = Validator('s7_location_brief_intent')

    # ── Per-prompt runner ───────────────────────────────────────────────────

    def _run_positive_variant(self, variant: Dict[str, Any],
                              tier_label: str, idx: int
                              ) -> Tuple[str, Dict[str, Any]]:
        """
        Run a single positive variant. Returns (outcome, details).

        outcome ∈ {'pass', 'partial', 'miss', 'fail'}:
          - pass    : generate_location_brief fires with correct city/state/PT
          - partial : fires with wrong one of the three (or wrong PT where
                      None expected)
          - miss    : a different tool fires
          - fail    : no tool fires / error response
        """
        # Fresh unassigned thread for each prompt (prevents context bleed)
        self.create_thread(project_id=None, page_context='general', force_new=True)

        resp = self.send_message(variant['prompt'], page_context='general')

        # Error path → fail (Django returns 201 Created for new messages)
        if resp.http_status not in (200, 201) or (
            hasattr(resp, 'success') and not resp.success
        ):
            return 'fail', {
                'reason': f'status={resp.http_status}',
                'content_snippet': (resp.assistant_content or '')[:200],
            }

        tools_fired = [tc.tool_name for tc in resp.tool_calls]
        lb_call = resp.find_tool_call('generate_location_brief')

        if lb_call is None:
            # No LB tool fired — miss if some other tool fired, fail if nothing
            if tools_fired:
                return 'miss', {'tools_fired': tools_fired}
            return 'fail', {'reason': 'no tool fired',
                            'content_snippet': (resp.assistant_content or '')[:200]}

        tool_in = lb_call.tool_input or {}
        # Tool schema: location is a single "City, ST" string (not separate fields)
        location_raw = (tool_in.get('location') or '').strip()
        actual_city, actual_state = _parse_location(location_raw)
        actual_pt = tool_in.get('property_type')
        if actual_pt is not None:
            actual_pt = str(actual_pt).strip().upper() or None

        exp_city = variant['expected_city']
        exp_state = variant['expected_state']  # may be None (default branch)
        exp_pt = variant['expected_pt']

        # Compare — case-insensitive for strings, allow None to pass
        city_ok = actual_city.lower() == exp_city.lower() if exp_city else True
        state_ok = (actual_state == exp_state) if exp_state else True
        pt_ok = (actual_pt == exp_pt) if exp_pt is not None else (actual_pt in (None, ''))

        details = {
            'tools_fired': tools_fired,
            'actual_location_raw': location_raw,
            'actual_city': actual_city,
            'actual_state': actual_state,
            'actual_pt': actual_pt,
            'expected_city': exp_city,
            'expected_state': exp_state,
            'expected_pt': exp_pt,
        }

        if city_ok and state_ok and pt_ok:
            return 'pass', details
        return 'partial', details

    def _run_negative_variant(self, variant: Dict[str, Any], idx: int
                              ) -> Tuple[str, Dict[str, Any]]:
        """
        Negative variant runner. Pass = generate_location_brief does NOT fire.
        """
        self.create_thread(project_id=None, page_context='general', force_new=True)

        resp = self.send_message(variant['prompt'], page_context='general')

        if resp.http_status not in (200, 201):
            return 'fail', {'reason': f'status={resp.http_status}'}

        tools_fired = [tc.tool_name for tc in resp.tool_calls]
        lb_fired = 'generate_location_brief' in tools_fired

        if lb_fired:
            return 'fail', {'tools_fired': tools_fired,
                            'reason': 'location brief fired when it should not have'}
        return 'pass', {'tools_fired': tools_fired}

    # ── Tier loops ──────────────────────────────────────────────────────────

    def _run_positive_tier(self, tier_name: str,
                           variants: List[Dict[str, Any]]) -> Dict[str, Any]:
        logger.info(f'--- {tier_name}: {len(variants)} variants ---')
        results: List[Dict[str, Any]] = []
        counts = {'pass': 0, 'partial': 0, 'miss': 0, 'fail': 0}

        for idx, variant in enumerate(variants, start=1):
            try:
                outcome, details = self._run_positive_variant(variant, tier_name, idx)
            except Exception as e:
                logger.error(f'{tier_name} #{idx} raised: {e}')
                outcome, details = 'fail', {'exception': str(e)}

            counts[outcome] += 1
            results.append({
                'idx': idx,
                'prompt': variant['prompt'],
                'note': variant['note'],
                'outcome': outcome,
                **details,
            })
            logger.info(f'  {tier_name} #{idx} → {outcome} ({variant["note"]})')

        self.validator.calibrate(f'{tier_name}_counts', counts)
        self.validator.calibrate(f'{tier_name}_details', results)
        self.validator.assert_field_equals(
            f'{tier_name}_passes_threshold',
            counts['pass'] >= POSITIVE_TIER_THRESHOLD,
            True,
        )
        return {'counts': counts, 'results': results}

    def _run_negative_tier(self, variants: List[Dict[str, Any]]) -> Dict[str, Any]:
        logger.info(f'--- tier_negative: {len(variants)} variants ---')
        results: List[Dict[str, Any]] = []
        counts = {'pass': 0, 'fail': 0}

        for idx, variant in enumerate(variants, start=1):
            try:
                outcome, details = self._run_negative_variant(variant, idx)
            except Exception as e:
                logger.error(f'tier_negative #{idx} raised: {e}')
                outcome, details = 'fail', {'exception': str(e)}

            counts[outcome] += 1
            results.append({
                'idx': idx,
                'prompt': variant['prompt'],
                'note': variant['note'],
                'outcome': outcome,
                **details,
            })
            logger.info(f'  tier_negative #{idx} → {outcome} ({variant["note"]})')

        self.validator.calibrate('tier_negative_counts', counts)
        self.validator.calibrate('tier_negative_details', results)
        self.validator.assert_field_equals(
            'tier_negative_passes_threshold',
            counts['pass'] >= NEGATIVE_TIER_THRESHOLD,
            True,
        )
        return {'counts': counts, 'results': results}

    # ── Main ────────────────────────────────────────────────────────────────

    def run_scenario(self):
        tier_results: Dict[str, Dict[str, Any]] = {}

        tier_results['tier1'] = self._run_positive_tier('tier1_synonyms', TIER_1_SYNONYMS)
        tier_results['tier2'] = self._run_positive_tier('tier2_indirect', TIER_2_INDIRECT)
        tier_results['tier3'] = self._run_positive_tier('tier3_pt_fuzzing', TIER_3_PT_FUZZING)
        tier_results['tier4'] = self._run_positive_tier('tier4_location_fuzzing', TIER_4_LOCATION_FUZZING)
        tier_results['negative'] = self._run_negative_tier(TIER_NEGATIVE)

        # ── Aggregate ────────────────────────────────────────────────────
        total_positive = sum(tier_results[k]['counts']['pass'] for k in ('tier1', 'tier2', 'tier3', 'tier4'))
        total_positive_attempts = 40  # 4 tiers × 10
        positive_pass_rate = total_positive / total_positive_attempts

        total_negative = tier_results['negative']['counts']['pass']
        total_negative_attempts = len(TIER_NEGATIVE)
        negative_pass_rate = total_negative / total_negative_attempts

        self.validator.calibrate('total_positive_pass', total_positive)
        self.validator.calibrate('total_positive_attempts', total_positive_attempts)
        self.validator.calibrate('positive_pass_rate', positive_pass_rate)
        self.validator.calibrate('total_negative_pass', total_negative)
        self.validator.calibrate('negative_pass_rate', negative_pass_rate)

        # Overall 80% threshold (positive + negative combined)
        overall_pass = total_positive + total_negative
        overall_attempts = total_positive_attempts + total_negative_attempts
        overall_rate = overall_pass / overall_attempts
        self.validator.calibrate('overall_pass_rate', overall_rate)
        self.validator.assert_field_equals(
            'overall_passes_80pct',
            overall_rate >= 0.80,
            True,
        )

        # ── Summary ────────────────────────────────────────────────────
        self._log_step('summary', 'Scenario S7 complete', {
            'positive_pass_rate': f'{positive_pass_rate:.0%}',
            'negative_pass_rate': f'{negative_pass_rate:.0%}',
            'overall_pass_rate': f'{overall_rate:.0%}',
            'tier1': tier_results['tier1']['counts'],
            'tier2': tier_results['tier2']['counts'],
            'tier3': tier_results['tier3']['counts'],
            'tier4': tier_results['tier4']['counts'],
            'negative': tier_results['negative']['counts'],
        })
        self._pass_step(
            f'S7 complete: overall {overall_rate:.0%} '
            f'(+{positive_pass_rate:.0%} positive, +{negative_pass_rate:.0%} negative). '
            f'Checks {self.validator.pass_count}/{len(self.validator.results)} passed.'
        )

    def cleanup(self):
        """No cleanup needed — only unassigned threads are created."""
        pass

    def get_results(self) -> Tuple[dict, dict]:
        result = self.run(cleanup=False)
        validation = self.validator.summary()

        if config.CALIBRATION_MODE:
            manifest_path = self.validator.save_manifest()
            logger.info(f'Manifest saved to {manifest_path}')

        return result, validation


def run_s7():
    """Entry point for running S7 standalone."""
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s [%(name)s] %(levelname)s: %(message)s',
    )

    from .report import TestReport

    agent = ScenarioS7()
    result, validation = agent.get_results()

    report = TestReport(suite_name='s7_location_brief_intent')
    report.add_scenario(result, validation)
    report.print_summary()

    path = report.save_json()
    print(f'Report saved to: {path}')

    return report
