"""
Test report generator.

Collects results from one or more scenario runs and produces:
- JSON report (machine-readable, for CI or archiving)
- Console summary (human-readable)
"""

import json
import os
from datetime import datetime, timezone
from typing import Optional

from . import config


class TestReport:
    """Aggregates scenario results into a unified report."""

    def __init__(self, suite_name: str = 'agent_test_suite'):
        self.suite_name = suite_name
        self.started_at = datetime.now(timezone.utc)
        self.scenario_results: list[dict] = []
        self.validation_summaries: list[dict] = []

    def add_scenario(self, result: dict, validation_summary: Optional[dict] = None):
        """
        Add a scenario result (from BaseAgent.run()) and optional
        validation summary (from Validator.summary()).
        """
        self.scenario_results.append(result)
        if validation_summary:
            self.validation_summaries.append(validation_summary)

    def finalize(self) -> dict:
        """Build the final report dict."""
        ended_at = datetime.now(timezone.utc)
        elapsed = (ended_at - self.started_at).total_seconds()

        total_scenarios = len(self.scenario_results)
        passed_scenarios = sum(
            1 for r in self.scenario_results if r.get('status') == 'pass'
        )
        failed_scenarios = total_scenarios - passed_scenarios

        total_validations = sum(
            v.get('total', 0) for v in self.validation_summaries
        )
        passed_validations = sum(
            v.get('passed', 0) for v in self.validation_summaries
        )
        failed_validations = total_validations - passed_validations

        return {
            'suite': self.suite_name,
            'mode': 'calibration' if config.CALIBRATION_MODE else 'test',
            'started_at': self.started_at.isoformat(),
            'ended_at': ended_at.isoformat(),
            'elapsed_s': round(elapsed, 1),
            'summary': {
                'scenarios_total': total_scenarios,
                'scenarios_passed': passed_scenarios,
                'scenarios_failed': failed_scenarios,
                'validations_total': total_validations,
                'validations_passed': passed_validations,
                'validations_failed': failed_validations,
            },
            'scenarios': self.scenario_results,
            'validations': self.validation_summaries,
        }

    def save_json(self, filename: Optional[str] = None) -> str:
        """Save report as JSON. Returns the file path."""
        os.makedirs(config.REPORT_DIR, exist_ok=True)

        if not filename:
            ts = datetime.now().strftime('%Y%m%d_%H%M%S')
            mode = 'cal' if config.CALIBRATION_MODE else 'test'
            filename = f'report_{mode}_{ts}.json'

        path = os.path.join(config.REPORT_DIR, filename)
        report = self.finalize()

        with open(path, 'w') as f:
            json.dump(report, f, indent=2, default=str)

        return path

    def print_summary(self):
        """Print a human-readable summary to console."""
        report = self.finalize()
        s = report['summary']
        mode = report['mode'].upper()

        print()
        print('=' * 60)
        print(f'  LANDSCAPE TEST AGENT REPORT — {mode} MODE')
        print('=' * 60)
        print(f'  Suite:      {self.suite_name}')
        print(f'  Duration:   {report["elapsed_s"]}s')
        print(f'  Scenarios:  {s["scenarios_passed"]}/{s["scenarios_total"]} passed')
        print(f'  Checks:     {s["validations_passed"]}/{s["validations_total"]} passed')
        print('-' * 60)

        for scenario in report['scenarios']:
            status = '✓' if scenario['status'] == 'pass' else '✗'
            print(f'  {status} {scenario["scenario"]}  ({scenario["elapsed_s"]}s)')

            # Show failed steps
            if scenario['status'] == 'fail':
                for step in scenario.get('steps', []):
                    if step.get('status') == 'fail':
                        print(f'      FAIL: {step.get("error", step.get("description", ""))}')

        # Show failed validations
        for vs in report['validations']:
            if vs.get('failed', 0) > 0:
                print()
                print(f'  Failed checks in {vs["scenario"]}:')
                for r in vs.get('results', []):
                    if not r.get('passed'):
                        print(f'    ✗ {r["name"]}: {r.get("message", "")}')
                        if r.get('expected'):
                            print(f'      expected: {r["expected"]}')
                            print(f'      actual:   {r["actual"]}')

        print()
        overall = 'PASS' if s['scenarios_failed'] == 0 else 'FAIL'
        print(f'  Overall: {overall}')
        print('=' * 60)
        print()
