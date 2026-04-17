"""
Scenario S5 — Map Artifact Generation

Tests Landscaper's `generate_map_artifact` tool in three modes:
- Display mode: project has coordinates → subject marker + aerial view
- Input mode: project missing coordinates → pin-placement UI, geocoded center
- Comp overlay: project with coordinates, request comps → subject + comp markers

Flow:
1. Create MF project A WITH coordinates (Santa Monica, 34.0195, -118.4912)
2. Create MF project B WITHOUT coordinates (Boise, Idaho)
3. Phase 1 — Display mode:
   a. Thread on project A → "show me an aerial map"
   b. Verify: action=show_map_artifact, center near Santa Monica, subject marker
4. Phase 2 — Input mode:
   a. Thread on project B → "show me a map of the project location"
   b. Verify: mode=input, project_id set, center geocoded near Boise
5. Phase 3 — Comp overlay (optional):
   a. Same thread A → "show map with comparable properties"
   b. Verify: subject marker present, comp markers if any exist
6. Cleanup both projects

Calibration mode: Records map configs, tool calls, marker counts.
Test mode: Compares against calibration manifest.
"""

import logging

from . import config
from .base_agent import BaseAgent
from .validators import Validator

logger = logging.getLogger('agent_framework.s5')

# Project A — has coordinates (Santa Monica)
PROJECT_A_NAME_SUFFIX = 'S5_Marina_Vista'
PROJECT_A_CITY = 'Santa Monica'
PROJECT_A_STATE = 'California'
PROJECT_A_LAT = 34.0195
PROJECT_A_LON = -118.4912

# Project B — no coordinates (Boise)
PROJECT_B_NAME_SUFFIX = 'S5_Boise_Gardens'
PROJECT_B_CITY = 'Boise'
PROJECT_B_STATE = 'Idaho'

# Prompts — explicit tool references to ensure invocation in a 147-tool context.
# Without "generate_map_artifact" or "artifact", the model defaults to get_project_fields.
DISPLAY_MAP_PROMPT = (
    'Use the generate_map_artifact tool to show me an interactive '
    'aerial map of the project location.'
)
INPUT_MAP_PROMPT = (
    'Use the generate_map_artifact tool to show me a map of the '
    'project location in the artifacts panel.'
)
COMP_OVERLAY_PROMPT = (
    'Use the generate_map_artifact tool with include_comps=true to '
    'show me a map with comparable properties overlaid.'
)


class ScenarioS5(BaseAgent):
    """Map artifact generation: display mode, input mode, comp overlay."""

    def __init__(self):
        super().__init__('s5_map_artifact')
        self.validator = Validator('s5_map_artifact')
        self.project_a_id = None
        self.project_b_id = None
        self.thread_a_id = None
        self.thread_b_id = None

    def run_scenario(self):
        # ── Step 1: Create project A (with coordinates) ─────────────
        project_a_name = f'{config.TEST_PROJECT_PREFIX}{PROJECT_A_NAME_SUFFIX}'

        self.create_project_via_django(
            project_name=project_a_name,
            project_type_code='MF',
            jurisdiction_city=PROJECT_A_CITY,
            jurisdiction_state=PROJECT_A_STATE,
            location_lat=PROJECT_A_LAT,
            location_lon=PROJECT_A_LON,
        )
        self.project_a_id = self.project_id
        self.validator.calibrate('project_a_id', self.project_a_id)
        self.validator.assert_field_equals(
            'project_a_created', self.project_a_id is not None, True
        )

        # ── Step 2: Create project B (no coordinates) ───────────────
        project_b_name = f'{config.TEST_PROJECT_PREFIX}{PROJECT_B_NAME_SUFFIX}'

        self.create_project_via_django(
            project_name=project_b_name,
            project_type_code='MF',
            jurisdiction_city=PROJECT_B_CITY,
            jurisdiction_state=PROJECT_B_STATE,
            # No location_lat/location_lon — intentionally omitted
        )
        self.project_b_id = self.project_id
        self.validator.calibrate('project_b_id', self.project_b_id)
        self.validator.assert_field_equals(
            'project_b_created', self.project_b_id is not None, True
        )

        # ── Phase 1: Display mode (project A — has coordinates) ─────
        logger.info('--- Phase 1: Display mode ---')
        self.project_id = self.project_a_id
        self.thread_id = None  # Reset for new thread
        self.create_thread(
            project_id=self.project_a_id,
            page_context='home',
        )
        self.thread_a_id = self.thread_id
        self._test_display_mode()

        # ── Phase 2: Input mode (project B — no coordinates) ────────
        logger.info('--- Phase 2: Input mode ---')
        self.project_id = self.project_b_id
        self.thread_id = None
        self.create_thread(
            project_id=self.project_b_id,
            page_context='home',
        )
        self.thread_b_id = self.thread_id
        self._test_input_mode()

        # ── Phase 3: Comp overlay (project A) ───────────────────────
        logger.info('--- Phase 3: Comp overlay ---')
        self.project_id = self.project_a_id
        self.thread_id = self.thread_a_id
        self._test_comp_overlay()

        # ── Summary ─────────────────────────────────────────────────
        self._log_step('summary', 'Scenario complete', {
            'validations_passed': self.validator.pass_count,
            'validations_failed': self.validator.fail_count,
        })
        self._pass_step(
            f'S5 complete: {self.validator.pass_count}/'
            f'{len(self.validator.results)} checks passed'
        )

    def _test_display_mode(self):
        """Phase 1: Project with coords → expect display map with subject marker."""
        chat_resp = self.send_message(
            content=DISPLAY_MAP_PROMPT,
            page_context='home',
        )

        self.validator.assert_response_not_error(chat_resp)

        tools_used = [tc.tool_name for tc in chat_resp.tool_calls]
        self.validator.calibrate('p1_tools', tools_used)
        logger.info(f'  Phase 1 tools: {tools_used}')

        # Check generate_map_artifact was called
        tc = chat_resp.find_tool_call('generate_map_artifact')
        self.validator.assert_field_equals(
            'p1_tool_called', tc is not None, True
        )

        if not tc:
            logger.warning('  generate_map_artifact not called — skipping config checks')
            return

        result = tc.result
        self.validator.assert_field_equals(
            'p1_action', result.get('action'), 'show_map_artifact'
        )

        map_config = result.get('map_config', {})
        self.validator.calibrate('p1_map_config_keys', sorted(map_config.keys()))

        # Center should be near Santa Monica [-118.49, 34.02]
        center = map_config.get('center', [0, 0])
        self.validator.calibrate('p1_center', center)

        near_santa_monica = (
            isinstance(center, list) and len(center) == 2
            and -119 < center[0] < -118
            and 33.5 < center[1] < 34.5
        )
        self.validator.assert_field_equals(
            'p1_center_near_santa_monica', near_santa_monica, True
        )

        # Should have subject marker
        markers = map_config.get('markers', [])
        self.validator.calibrate('p1_marker_count', len(markers))

        has_subject = any(m.get('id') == 'subject' for m in markers)
        self.validator.assert_field_equals(
            'p1_has_subject_marker', has_subject, True
        )

        # Should NOT be input mode
        mode = map_config.get('mode')
        self.validator.assert_field_equals(
            'p1_not_input_mode', mode is None or mode != 'input', True
        )

        logger.info(f'  Center: {center}')
        logger.info(f'  Markers: {len(markers)} (subject: {has_subject})')
        logger.info(f'  Zoom: {map_config.get("zoom")}')

    def _test_input_mode(self):
        """Phase 2: Project without coords → expect input mode with geocoded center."""
        chat_resp = self.send_message(
            content=INPUT_MAP_PROMPT,
            page_context='home',
        )

        self.validator.assert_response_not_error(chat_resp)

        tools_used = [tc.tool_name for tc in chat_resp.tool_calls]
        self.validator.calibrate('p2_tools', tools_used)
        logger.info(f'  Phase 2 tools: {tools_used}')

        tc = chat_resp.find_tool_call('generate_map_artifact')
        self.validator.assert_field_equals(
            'p2_tool_called', tc is not None, True
        )

        if not tc:
            logger.warning('  generate_map_artifact not called — skipping config checks')
            return

        result = tc.result
        self.validator.assert_field_equals(
            'p2_action', result.get('action'), 'show_map_artifact'
        )

        map_config = result.get('map_config', {})
        self.validator.calibrate('p2_map_config_keys', sorted(map_config.keys()))

        # Should be input mode
        mode = map_config.get('mode')
        self.validator.assert_field_equals(
            'p2_mode_is_input', mode, 'input'
        )

        # project_id should be set for save-back
        cfg_project_id = map_config.get('project_id')
        self.validator.assert_field_equals(
            'p2_has_project_id', cfg_project_id is not None, True
        )
        self.validator.assert_field_equals(
            'p2_project_id_matches', cfg_project_id, self.project_b_id
        )

        # Center should be near Boise [-116.2, 43.6] via Nominatim geocode
        center = map_config.get('center', [0, 0])
        self.validator.calibrate('p2_center', center)

        near_boise = (
            isinstance(center, list) and len(center) == 2
            and -117 < center[0] < -115
            and 43 < center[1] < 44.5
        )
        self.validator.assert_field_equals(
            'p2_center_near_boise', near_boise, True
        )

        # Should have 0 markers (no coords to place subject)
        markers = map_config.get('markers', [])
        self.validator.calibrate('p2_marker_count', len(markers))
        self.validator.assert_field_equals(
            'p2_no_markers', len(markers), 0
        )

        # Zoom should be city-level (~12), not satellite (~15)
        zoom = map_config.get('zoom', 0)
        self.validator.calibrate('p2_zoom', zoom)
        self.validator.assert_field_equals(
            'p2_zoom_city_level', zoom <= 13, True
        )

        logger.info(f'  Mode: {mode}')
        logger.info(f'  Center: {center}')
        logger.info(f'  Markers: {len(markers)}')
        logger.info(f'  Zoom: {zoom}')
        logger.info(f'  project_id in config: {cfg_project_id}')

    def _test_comp_overlay(self):
        """Phase 3: Request map with comps on project A."""
        chat_resp = self.send_message(
            content=COMP_OVERLAY_PROMPT,
            page_context='home',
        )

        self.validator.assert_response_not_error(chat_resp)

        tools_used = [tc.tool_name for tc in chat_resp.tool_calls]
        self.validator.calibrate('p3_tools', tools_used)
        logger.info(f'  Phase 3 tools: {tools_used}')

        tc = chat_resp.find_tool_call('generate_map_artifact')
        self.validator.assert_field_equals(
            'p3_tool_called', tc is not None, True
        )

        if not tc:
            logger.warning('  generate_map_artifact not called — skipping config checks')
            return

        result = tc.result
        map_config = result.get('map_config', {})
        markers = map_config.get('markers', [])

        # Subject marker should always be present
        has_subject = any(m.get('id') == 'subject' for m in markers)
        self.validator.assert_field_equals(
            'p3_has_subject_marker', has_subject, True
        )

        # Comp markers — may or may not exist depending on project data
        comp_markers = [m for m in markers if m.get('id', '').startswith('comp_')]
        self.validator.calibrate('p3_comp_marker_count', len(comp_markers))
        self.validator.calibrate('p3_total_marker_count', len(markers))

        # Verify include_comps was passed to the tool
        tool_input = tc.tool_input
        include_comps = tool_input.get('include_comps', False)
        self.validator.calibrate('p3_include_comps_param', include_comps)

        logger.info(f'  Markers: {len(markers)} total ({len(comp_markers)} comps)')
        logger.info(f'  Subject marker: {has_subject}')
        logger.info(f'  include_comps param: {include_comps}')

    def cleanup(self):
        """Override cleanup to handle two projects."""
        # Ensure both project IDs are in the cleanup list
        for pid in [self.project_a_id, self.project_b_id]:
            if pid and pid not in self._created_project_ids:
                self._created_project_ids.append(pid)

        super().cleanup()

    def get_results(self) -> tuple[dict, dict]:
        """Run and return (scenario_result, validation_summary)."""
        result = self.run(cleanup=True)
        validation = self.validator.summary()

        if config.CALIBRATION_MODE:
            manifest_path = self.validator.save_manifest()
            logger.info(f'Manifest saved to {manifest_path}')

        return result, validation


def run_s5():
    """Entry point for running S5 standalone."""
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s [%(name)s] %(levelname)s: %(message)s',
    )

    from .report import TestReport

    agent = ScenarioS5()
    result, validation = agent.get_results()

    report = TestReport(suite_name='s5_map_artifact')
    report.add_scenario(result, validation)
    report.print_summary()

    path = report.save_json()
    print(f'Report saved to: {path}')

    return report
