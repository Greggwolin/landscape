"""
Scenario S7 — Location Brief Intent Variants (v2)

Tests whether Landscaper correctly distinguishes EXPLICIT asks for a location
brief from softer or contextual phrasing. Per the "ask, don't infer" principle:

  - Explicit ask  → tool fires with correct params
  - Soft ask      → tool does NOT fire; response offers to generate a brief
  - Context only  → tool does NOT fire (no autonomous artifact generation)
  - Off-domain    → tool does NOT fire (different intent entirely)

Each prompt runs on a fresh unassigned thread (`project_id=None`) to mirror
how users hit this on `/w/chat`. One prompt = one thread = one message.

Categories:
  A — Explicit ask (10):  literal output-type noun in prompt — brief, report,
                          overview, profile, snapshot, summary
  B — Soft ask (10):      open-ended question about a market or location, no
                          output-type word
  C — Context only (10):  user states a deal/property context without an ask
  D — Off-domain (5):     different intent entirely — cap rates, comps,
                          vacancy, brokers, zoning

Scoring rule:
  A: pass    = generate_location_brief fires + city/state/PT match
     partial = LB fires + at least one param off
     miss    = a different tool fires
     fail    = no tool fires
  B: pass    = LB does NOT fire AND response offers to generate brief
     partial = LB does NOT fire, no offer language in response
     miss    = a different (non-LB) tool fires
     fail    = LB fires (over-fire — the regression we are catching)
  C: pass    = LB does NOT fire
     fail    = LB fires
  D: pass    = LB does NOT fire
     fail    = LB fires

Per-category thresholds: ≥7/10 (A, B, C), ≥4/5 (D). Overall ≥75%.

Calibration mode: records per-prompt outcomes + extracted params + response
snippets. Test mode: compares pass rates against the calibration manifest.
"""

import logging
import re
from typing import Any, Dict, List, Tuple

from . import config
from .base_agent import BaseAgent
from .validators import Validator

logger = logging.getLogger('agent_framework.s7')

# Per-category pass thresholds
EXPLICIT_THRESHOLD = 7      # out of 10
SOFT_ASK_THRESHOLD = 7      # out of 10
CONTEXT_ONLY_THRESHOLD = 7  # out of 10
OFF_DOMAIN_THRESHOLD = 4    # out of 5
OVERALL_THRESHOLD = 0.75    # 75% of all 35

# ── Detection helpers ──────────────────────────────────────────────────────

# Phrases Landscaper should use when offering to generate a brief.
# Detection is OR across this list — any one is enough.
_OFFER_PHRASES = [
    'would you like',
    'want me to',
    'shall i',
    'should i',
    'let me know if',
    'happy to',
    'i can pull',
    'i can generate',
    'i can prepare',
    'i can put together',
    'i could pull',
    'i could generate',
    'i could prepare',
    'i could put together',
    'i can run',
    'i could run',
]

# Output-type nouns Landscaper might use when offering.
# Pass requires offer phrase AND at least one output-type noun.
_OUTPUT_NOUNS = [
    'brief',
    'overview',
    'report',
    'profile',
    'snapshot',
    'summary',
]


def _has_offer_pattern(text: str) -> bool:
    """True if response contains an offer phrase paired with an output-type noun."""
    if not text:
        return False
    lower = text.lower()
    has_offer = any(p in lower for p in _OFFER_PHRASES)
    has_noun = any(n in lower for n in _OUTPUT_NOUNS)
    return has_offer and has_noun


def _has_question(text: str) -> bool:
    """True if response contains a question mark (used as soft signal in details)."""
    return '?' in (text or '')


# ── Prompt variants ─────────────────────────────────────────────────────────

# Category A — Explicit ask: prompt contains a literal output-type noun.
CATEGORY_A_EXPLICIT: List[Dict[str, Any]] = [
    {'prompt': 'Give me an area report on Queen Creek, AZ for land development',
     'expected_city': 'Queen Creek', 'expected_state': 'AZ', 'expected_pt': 'LAND',
     'note': 'explicit: area report'},
    {'prompt': 'Market overview for Bellflower, CA — small apartments',
     'expected_city': 'Bellflower', 'expected_state': 'CA', 'expected_pt': 'MF',
     'note': 'explicit: market overview'},
    {'prompt': 'Economic brief on Tempe, AZ for office',
     'expected_city': 'Tempe', 'expected_state': 'AZ', 'expected_pt': 'OFF',
     'note': 'explicit: economic brief'},
    {'prompt': 'Neighborhood profile for Mesa, AZ — retail',
     'expected_city': 'Mesa', 'expected_state': 'AZ', 'expected_pt': 'RET',
     'note': 'explicit: neighborhood profile'},
    {'prompt': 'Pull a regional summary for Austin, TX mixed-use',
     'expected_city': 'Austin', 'expected_state': 'TX', 'expected_pt': 'MXU',
     'note': 'explicit: regional summary'},
    {'prompt': 'Give me the market snapshot for Gilbert, AZ land',
     'expected_city': 'Gilbert', 'expected_state': 'AZ', 'expected_pt': 'LAND',
     'note': 'explicit: market snapshot'},
    {'prompt': 'Demographic and economic profile of Phoenix, AZ for industrial',
     'expected_city': 'Phoenix', 'expected_state': 'AZ', 'expected_pt': 'IND',
     'note': 'explicit: demographic profile'},
    {'prompt': 'Location brief for Scottsdale, AZ — boutique hotel',
     'expected_city': 'Scottsdale', 'expected_state': 'AZ', 'expected_pt': 'HTL',
     'note': 'explicit: location brief + boutique hotel → HTL'},
    {'prompt': 'Location brief for 85225 retail',
     'expected_city': 'Chandler', 'expected_state': 'AZ', 'expected_pt': 'RET',
     'note': 'explicit: ZIP → Chandler, AZ'},
    {'prompt': 'Location brief for Bellflower, California, multifamily',
     'expected_city': 'Bellflower', 'expected_state': 'CA', 'expected_pt': 'MF',
     'note': 'explicit: full state name'},
]

# Category B — Soft ask: open question about a market or location, no
# output-type noun. Tool should NOT fire; response should offer a brief.
CATEGORY_B_SOFT_ASK: List[Dict[str, Any]] = [
    {'prompt': "What's going on economically in Gilbert, AZ?",
     'note': 'soft: economic question'},
    {'prompt': 'Help me understand the Phoenix, AZ market',
     'note': 'soft: help me understand'},
    {'prompt': "How's the multifamily market in Tempe, AZ?",
     'note': 'soft: how is the market'},
    {'prompt': "What's driving Scottsdale, AZ right now?",
     'note': 'soft: what is driving'},
    {'prompt': 'Is the retail market healthy in Chandler, AZ?',
     'note': 'soft: is the market healthy'},
    {'prompt': 'Tell me about Mesa, AZ',
     'note': 'soft: tell me about'},
    {'prompt': 'What should I know about Goodyear, AZ for industrial?',
     'note': 'soft: what should I know'},
    {'prompt': 'How is Queen Creek, AZ doing these days?',
     'note': 'soft: how is X doing'},
    {'prompt': "What's the office market like in Tempe, AZ?",
     'note': 'soft: what is the market like'},
    {'prompt': 'Why is everyone talking about Austin, TX?',
     'note': 'soft: why is everyone talking'},
]

# Category C — Context only: pure context statement, no ask. Tool must NOT fire.
CATEGORY_C_CONTEXT_ONLY: List[Dict[str, Any]] = [
    {'prompt': "I'm evaluating an industrial deal in Goodyear, AZ",
     'note': 'context: evaluating deal'},
    {'prompt': 'Considering a retail strip center acquisition in Mesa, AZ',
     'note': 'context: considering acquisition'},
    {'prompt': "I'm underwriting a 40-acre parcel in Queen Creek, AZ",
     'note': 'context: underwriting parcel'},
    {'prompt': 'Looking at Class A office in Tempe, AZ',
     'note': 'context: looking at office'},
    {'prompt': 'Got a multifamily deal under contract in Bellflower, CA',
     'note': 'context: under contract'},
    {'prompt': 'Just toured a warehouse in Phoenix, AZ',
     'note': 'context: just toured'},
    {'prompt': 'Closing on a hotel in Scottsdale, AZ next month',
     'note': 'context: closing next month'},
    {'prompt': 'My partner wants me to buy an apartment building in Gilbert, AZ',
     'note': 'context: partner pushing'},
    {'prompt': 'Working on a mixed-use project in Austin, TX',
     'note': 'context: working on project'},
    {'prompt': 'Reviewing a medical office in Chandler, AZ',
     'note': 'context: reviewing'},
]

# Category D — Off-domain: clearly different intent. Tool must NOT fire.
CATEGORY_D_OFF_DOMAIN: List[Dict[str, Any]] = [
    {'prompt': "What's the cap rate in Bellflower, CA multifamily",
     'note': 'off-domain: cap rate'},
    {'prompt': 'Show me land sale comps in Queen Creek, AZ',
     'note': 'off-domain: sale comps'},
    {'prompt': "What's office vacancy in Tempe, AZ",
     'note': 'off-domain: vacancy stat'},
    {'prompt': 'Who are the top industrial brokers in Phoenix, AZ',
     'note': 'off-domain: brokers list'},
    {'prompt': "What's the zoning for retail in Gilbert, AZ",
     'note': 'off-domain: zoning lookup'},
]


# Full-state-name → 2-letter code map (Category A may pass full state names).
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
    """Parse "City, ST" or "City, State Name" → (city, 2-letter state)."""
    if not raw or ',' not in raw:
        return raw.strip(), ''
    city, _, state_part = raw.rpartition(',')
    city = city.strip()
    state_part = state_part.strip()
    if len(state_part) == 2:
        return city, state_part.upper()
    return city, _STATE_ABBR.get(state_part.lower(), state_part.upper())


class ScenarioS7(BaseAgent):
    """Intent resolution test for generate_location_brief (v2 — explicit-only)."""

    def __init__(self):
        super().__init__('s7_location_brief_intent')
        self.validator = Validator('s7_location_brief_intent')

    # ── Per-prompt runners ─────────────────────────────────────────────────

    def _run_explicit_variant(self, variant: Dict[str, Any], idx: int
                              ) -> Tuple[str, Dict[str, Any]]:
        """
        Category A runner. Pass = LB fires + city/state/PT match.

        outcome ∈ {'pass', 'partial', 'miss', 'fail'}:
          - pass    : generate_location_brief fires with correct city/state/PT
          - partial : fires with at least one param off
          - miss    : a different tool fires
          - fail    : no tool fires / error
        """
        self.create_thread(project_id=None, page_context='general', force_new=True)
        resp = self.send_message(variant['prompt'], page_context='general')

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
            if tools_fired:
                return 'miss', {'tools_fired': tools_fired,
                                'content_snippet': (resp.assistant_content or '')[:200]}
            return 'fail', {'reason': 'no tool fired',
                            'content_snippet': (resp.assistant_content or '')[:200]}

        tool_in = lb_call.tool_input or {}
        location_raw = (tool_in.get('location') or '').strip()
        actual_city, actual_state = _parse_location(location_raw)
        actual_pt = tool_in.get('property_type')
        if actual_pt is not None:
            actual_pt = str(actual_pt).strip().upper() or None

        exp_city = variant['expected_city']
        exp_state = variant['expected_state']
        exp_pt = variant['expected_pt']

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

    def _run_soft_ask_variant(self, variant: Dict[str, Any], idx: int
                              ) -> Tuple[str, Dict[str, Any]]:
        """
        Category B runner. Pass = LB does NOT fire AND response offers a brief.

        outcome ∈ {'pass', 'partial', 'miss', 'fail'}:
          - pass    : LB does NOT fire AND response contains an offer to
                      generate a brief/overview/report
          - partial : LB does NOT fire but no offer language in response
          - miss    : a non-LB tool fires
          - fail    : LB fires (over-fire — the regression we are catching)
        """
        self.create_thread(project_id=None, page_context='general', force_new=True)
        resp = self.send_message(variant['prompt'], page_context='general')

        if resp.http_status not in (200, 201):
            return 'fail', {'reason': f'status={resp.http_status}'}

        tools_fired = [tc.tool_name for tc in resp.tool_calls]
        content = resp.assistant_content or ''

        if 'generate_location_brief' in tools_fired:
            return 'fail', {
                'tools_fired': tools_fired,
                'reason': 'LB fired on soft ask (should have offered, not generated)',
                'content_snippet': content[:300],
            }

        if tools_fired:
            return 'miss', {
                'tools_fired': tools_fired,
                'content_snippet': content[:300],
            }

        details = {
            'tools_fired': tools_fired,
            'has_offer': _has_offer_pattern(content),
            'has_question': _has_question(content),
            'content_snippet': content[:400],
        }

        if _has_offer_pattern(content):
            return 'pass', details
        return 'partial', details

    def _run_no_fire_variant(self, variant: Dict[str, Any], idx: int,
                             category_label: str
                             ) -> Tuple[str, Dict[str, Any]]:
        """
        Category C and D runner. Pass = LB does NOT fire (period).

        outcome ∈ {'pass', 'fail'}:
          - pass : LB does NOT fire (whatever else happens is fine)
          - fail : LB fires (autonomous artifact generation = anti-pattern)
        """
        self.create_thread(project_id=None, page_context='general', force_new=True)
        resp = self.send_message(variant['prompt'], page_context='general')

        if resp.http_status not in (200, 201):
            return 'fail', {'reason': f'status={resp.http_status}'}

        tools_fired = [tc.tool_name for tc in resp.tool_calls]
        content = resp.assistant_content or ''

        if 'generate_location_brief' in tools_fired:
            return 'fail', {
                'tools_fired': tools_fired,
                'reason': f'LB fired on {category_label} prompt (should not fire)',
                'content_snippet': content[:300],
            }

        return 'pass', {
            'tools_fired': tools_fired,
            'has_question': _has_question(content),
            'has_offer': _has_offer_pattern(content),
            'content_snippet': content[:300],
        }

    # ── Category loops ─────────────────────────────────────────────────────

    def _run_explicit_category(self) -> Dict[str, Any]:
        label = 'category_a_explicit'
        logger.info(f'--- {label}: {len(CATEGORY_A_EXPLICIT)} variants ---')
        results: List[Dict[str, Any]] = []
        counts = {'pass': 0, 'partial': 0, 'miss': 0, 'fail': 0}

        for idx, variant in enumerate(CATEGORY_A_EXPLICIT, start=1):
            try:
                outcome, details = self._run_explicit_variant(variant, idx)
            except Exception as e:
                logger.error(f'{label} #{idx} raised: {e}')
                outcome, details = 'fail', {'exception': str(e)}

            counts[outcome] += 1
            results.append({
                'idx': idx, 'prompt': variant['prompt'],
                'note': variant['note'], 'outcome': outcome, **details,
            })
            logger.info(f'  {label} #{idx} → {outcome} ({variant["note"]})')

        self.validator.calibrate(f'{label}_counts', counts)
        self.validator.calibrate(f'{label}_details', results)
        self.validator.assert_field_equals(
            f'{label}_passes_threshold',
            counts['pass'] >= EXPLICIT_THRESHOLD, True,
        )
        return {'counts': counts, 'results': results}

    def _run_soft_ask_category(self) -> Dict[str, Any]:
        label = 'category_b_soft_ask'
        logger.info(f'--- {label}: {len(CATEGORY_B_SOFT_ASK)} variants ---')
        results: List[Dict[str, Any]] = []
        counts = {'pass': 0, 'partial': 0, 'miss': 0, 'fail': 0}

        for idx, variant in enumerate(CATEGORY_B_SOFT_ASK, start=1):
            try:
                outcome, details = self._run_soft_ask_variant(variant, idx)
            except Exception as e:
                logger.error(f'{label} #{idx} raised: {e}')
                outcome, details = 'fail', {'exception': str(e)}

            counts[outcome] += 1
            results.append({
                'idx': idx, 'prompt': variant['prompt'],
                'note': variant['note'], 'outcome': outcome, **details,
            })
            logger.info(f'  {label} #{idx} → {outcome} ({variant["note"]})')

        self.validator.calibrate(f'{label}_counts', counts)
        self.validator.calibrate(f'{label}_details', results)
        self.validator.assert_field_equals(
            f'{label}_passes_threshold',
            counts['pass'] >= SOFT_ASK_THRESHOLD, True,
        )
        return {'counts': counts, 'results': results}

    def _run_context_only_category(self) -> Dict[str, Any]:
        label = 'category_c_context_only'
        logger.info(f'--- {label}: {len(CATEGORY_C_CONTEXT_ONLY)} variants ---')
        results: List[Dict[str, Any]] = []
        counts = {'pass': 0, 'fail': 0}

        for idx, variant in enumerate(CATEGORY_C_CONTEXT_ONLY, start=1):
            try:
                outcome, details = self._run_no_fire_variant(variant, idx, 'context-only')
            except Exception as e:
                logger.error(f'{label} #{idx} raised: {e}')
                outcome, details = 'fail', {'exception': str(e)}

            counts[outcome] += 1
            results.append({
                'idx': idx, 'prompt': variant['prompt'],
                'note': variant['note'], 'outcome': outcome, **details,
            })
            logger.info(f'  {label} #{idx} → {outcome} ({variant["note"]})')

        self.validator.calibrate(f'{label}_counts', counts)
        self.validator.calibrate(f'{label}_details', results)
        self.validator.assert_field_equals(
            f'{label}_passes_threshold',
            counts['pass'] >= CONTEXT_ONLY_THRESHOLD, True,
        )
        return {'counts': counts, 'results': results}

    def _run_off_domain_category(self) -> Dict[str, Any]:
        label = 'category_d_off_domain'
        logger.info(f'--- {label}: {len(CATEGORY_D_OFF_DOMAIN)} variants ---')
        results: List[Dict[str, Any]] = []
        counts = {'pass': 0, 'fail': 0}

        for idx, variant in enumerate(CATEGORY_D_OFF_DOMAIN, start=1):
            try:
                outcome, details = self._run_no_fire_variant(variant, idx, 'off-domain')
            except Exception as e:
                logger.error(f'{label} #{idx} raised: {e}')
                outcome, details = 'fail', {'exception': str(e)}

            counts[outcome] += 1
            results.append({
                'idx': idx, 'prompt': variant['prompt'],
                'note': variant['note'], 'outcome': outcome, **details,
            })
            logger.info(f'  {label} #{idx} → {outcome} ({variant["note"]})')

        self.validator.calibrate(f'{label}_counts', counts)
        self.validator.calibrate(f'{label}_details', results)
        self.validator.assert_field_equals(
            f'{label}_passes_threshold',
            counts['pass'] >= OFF_DOMAIN_THRESHOLD, True,
        )
        return {'counts': counts, 'results': results}

    # ── Main ───────────────────────────────────────────────────────────────

    def run_scenario(self):
        results: Dict[str, Dict[str, Any]] = {}
        results['a'] = self._run_explicit_category()
        results['b'] = self._run_soft_ask_category()
        results['c'] = self._run_context_only_category()
        results['d'] = self._run_off_domain_category()

        a_pass = results['a']['counts']['pass']
        b_pass = results['b']['counts']['pass']
        c_pass = results['c']['counts']['pass']
        d_pass = results['d']['counts']['pass']

        a_total = len(CATEGORY_A_EXPLICIT)
        b_total = len(CATEGORY_B_SOFT_ASK)
        c_total = len(CATEGORY_C_CONTEXT_ONLY)
        d_total = len(CATEGORY_D_OFF_DOMAIN)

        overall_pass = a_pass + b_pass + c_pass + d_pass
        overall_total = a_total + b_total + c_total + d_total
        overall_rate = overall_pass / overall_total if overall_total else 0.0

        self.validator.calibrate('total_pass', overall_pass)
        self.validator.calibrate('total_attempts', overall_total)
        self.validator.calibrate('overall_pass_rate', overall_rate)
        self.validator.assert_field_equals(
            'overall_passes_threshold',
            overall_rate >= OVERALL_THRESHOLD, True,
        )

        self._log_step('summary', 'Scenario S7 complete', {
            'overall_pass_rate': f'{overall_rate:.0%}',
            'category_a_explicit': results['a']['counts'],
            'category_b_soft_ask': results['b']['counts'],
            'category_c_context_only': results['c']['counts'],
            'category_d_off_domain': results['d']['counts'],
        })
        self._pass_step(
            f'S7 complete: overall {overall_rate:.0%} '
            f'(A: {a_pass}/{a_total}, B: {b_pass}/{b_total}, '
            f'C: {c_pass}/{c_total}, D: {d_pass}/{d_total}). '
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
