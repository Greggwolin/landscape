"""
Validation helpers for test agents.

Two modes:
- CALIBRATION: Extract actual values, return them for manifest creation.
- TEST: Compare actual values against manifest, report pass/fail.

All validators return a ValidationResult that can be collected into reports.
"""

import json
import os
import re
from dataclasses import dataclass, field
from typing import Any, Optional

from . import config


@dataclass
class ValidationResult:
    """Result of a single validation check."""
    name: str
    passed: bool
    expected: Any = None
    actual: Any = None
    message: str = ''
    calibration_value: Any = None  # Set in calibration mode

    def to_dict(self) -> dict:
        d = {
            'name': self.name,
            'passed': self.passed,
            'message': self.message,
        }
        if self.expected is not None:
            d['expected'] = self.expected
        if self.actual is not None:
            d['actual'] = self.actual
        if self.calibration_value is not None:
            d['calibration_value'] = self.calibration_value
        return d


class Validator:
    """
    Collects validation results for a scenario.

    In calibration mode, validators extract values without asserting.
    In test mode, validators compare against manifest values.
    """

    def __init__(self, scenario_name: str):
        self.scenario_name = scenario_name
        self.results: list[ValidationResult] = []
        self._manifest: dict = {}

        # Load manifest if in test mode
        if not config.CALIBRATION_MODE:
            self._load_manifest()

    def _load_manifest(self):
        """Load the calibration manifest for this scenario."""
        path = os.path.join(config.MANIFEST_DIR, f'{self.scenario_name}.json')
        if os.path.exists(path):
            with open(path) as f:
                self._manifest = json.load(f)
        else:
            raise FileNotFoundError(
                f'No manifest found at {path}. '
                f'Run in calibration mode first (AGENT_CALIBRATION=true).'
            )

    def save_manifest(self):
        """Save calibration values as a manifest for future test runs."""
        os.makedirs(config.MANIFEST_DIR, exist_ok=True)
        path = os.path.join(config.MANIFEST_DIR, f'{self.scenario_name}.json')

        manifest = {}
        for r in self.results:
            if r.calibration_value is not None:
                manifest[r.name] = r.calibration_value

        with open(path, 'w') as f:
            json.dump(manifest, f, indent=2, default=str)

        return path

    # ── Tool Call Validators ─────────────────────────────────────────────

    def assert_tool_called(self, chat_response, tool_name: str) -> ValidationResult:
        """Verify that a specific tool was invoked in the response."""
        tc = chat_response.find_tool_call(tool_name)
        found = tc is not None

        result = ValidationResult(
            name=f'tool_called:{tool_name}',
            passed=found,
            expected=tool_name,
            actual=[t.tool_name for t in chat_response.tool_calls] if not found else tool_name,
            message=f'Tool {tool_name} {"was" if found else "was NOT"} called',
        )
        self.results.append(result)
        return result

    def assert_tool_success(self, chat_response, tool_name: str) -> ValidationResult:
        """Verify that a tool was called AND returned success=true."""
        tc = chat_response.find_tool_call(tool_name)

        if tc is None:
            result = ValidationResult(
                name=f'tool_success:{tool_name}',
                passed=False,
                expected=f'{tool_name} with success=true',
                actual='tool not called',
                message=f'Tool {tool_name} was not called',
            )
        elif not tc.success:
            result = ValidationResult(
                name=f'tool_success:{tool_name}',
                passed=False,
                expected='success=true',
                actual=f'success=false, error={tc.error}',
                message=f'Tool {tool_name} failed: {tc.error}',
            )
        else:
            result = ValidationResult(
                name=f'tool_success:{tool_name}',
                passed=True,
                message=f'Tool {tool_name} succeeded',
            )

        self.results.append(result)
        return result

    def assert_modal_opened(self, chat_response, expected_modal: str) -> ValidationResult:
        """Verify open_input_modal returned the correct modal_name."""
        tc = chat_response.find_tool_call('open_input_modal')

        if tc is None:
            result = ValidationResult(
                name=f'modal_opened:{expected_modal}',
                passed=False,
                expected=expected_modal,
                actual='open_input_modal not called',
                message='open_input_modal was not invoked',
            )
        else:
            actual_modal = tc.result.get('modal_name', '')
            action = tc.result.get('action', '')
            passed = (action == 'open_modal' and actual_modal == expected_modal)

            result = ValidationResult(
                name=f'modal_opened:{expected_modal}',
                passed=passed,
                expected=expected_modal,
                actual=actual_modal,
                message=f'Modal {actual_modal}: action={action}',
            )

        self.results.append(result)
        return result

    # ── Response Content Validators ──────────────────────────────────────

    def assert_response_mentions(self, chat_response, keyword: str,
                                 case_sensitive: bool = False) -> ValidationResult:
        """Check that the assistant response mentions a keyword."""
        content = chat_response.assistant_content
        if case_sensitive:
            found = keyword in content
        else:
            found = keyword.lower() in content.lower()

        result = ValidationResult(
            name=f'response_mentions:{keyword}',
            passed=found,
            expected=f'Response contains "{keyword}"',
            actual=f'{"Found" if found else "Not found"} in {len(content)}-char response',
            message=f'Keyword "{keyword}" {"found" if found else "not found"} in response',
        )
        self.results.append(result)
        return result

    def assert_response_not_error(self, chat_response) -> ValidationResult:
        """Check that the response doesn't contain common error indicators."""
        content = chat_response.assistant_content.lower()
        error_patterns = [
            'error:', 'traceback', 'exception', 'failed to',
            'cannot access', 'unboundlocalerror', 'typeerror',
            'i apologize, but i\'m currently unable',
        ]

        found_errors = [p for p in error_patterns if p in content]

        result = ValidationResult(
            name='response_no_error',
            passed=len(found_errors) == 0,
            actual=found_errors if found_errors else 'clean',
            message=f'{"Error patterns found: " + ", ".join(found_errors) if found_errors else "No error patterns"}',
        )
        self.results.append(result)
        return result

    # ── Field Value Validators ───────────────────────────────────────────

    def assert_field_equals(self, name: str, actual: Any, expected: Any) -> ValidationResult:
        """Assert exact equality between expected and actual values."""
        passed = actual == expected

        result = ValidationResult(
            name=f'field_equals:{name}',
            passed=passed,
            expected=expected,
            actual=actual,
            message=f'{name}: {"match" if passed else f"expected {expected!r}, got {actual!r}"}',
            calibration_value=actual if config.CALIBRATION_MODE else None,
        )
        self.results.append(result)
        return result

    def assert_field_in_range(self, name: str, actual: float,
                              low: float, high: float) -> ValidationResult:
        """Assert a numeric value falls within a range."""
        passed = low <= actual <= high

        result = ValidationResult(
            name=f'field_in_range:{name}',
            passed=passed,
            expected=f'{low} <= x <= {high}',
            actual=actual,
            message=f'{name}={actual}: {"in range" if passed else "OUT OF RANGE"}',
            calibration_value=actual if config.CALIBRATION_MODE else None,
        )
        self.results.append(result)
        return result

    def assert_field_close_to(self, name: str, actual: float,
                              expected: float, tolerance_pct: float = 1.0) -> ValidationResult:
        """Assert a numeric value is within tolerance_pct of expected."""
        if expected == 0:
            passed = abs(actual) < 0.01
            diff_pct = 0 if passed else 100
        else:
            diff_pct = abs((actual - expected) / expected) * 100
            passed = diff_pct <= tolerance_pct

        result = ValidationResult(
            name=f'field_close_to:{name}',
            passed=passed,
            expected=f'{expected} ±{tolerance_pct}%',
            actual=f'{actual} (diff={diff_pct:.2f}%)',
            message=f'{name}: {"within" if passed else "OUTSIDE"} {tolerance_pct}% tolerance',
            calibration_value=actual if config.CALIBRATION_MODE else None,
        )
        self.results.append(result)
        return result

    def calibrate(self, name: str, actual: Any) -> ValidationResult:
        """
        Record a value for calibration without asserting.
        In test mode, compares against the manifest.
        """
        if config.CALIBRATION_MODE:
            result = ValidationResult(
                name=f'calibrate:{name}',
                passed=True,
                actual=actual,
                message=f'Calibration: {name} = {actual!r}',
                calibration_value=actual,
            )
        else:
            expected = self._manifest.get(f'calibrate:{name}')
            if expected is None:
                result = ValidationResult(
                    name=f'calibrate:{name}',
                    passed=False,
                    actual=actual,
                    message=f'No manifest value for {name}',
                )
            else:
                passed = actual == expected
                result = ValidationResult(
                    name=f'calibrate:{name}',
                    passed=passed,
                    expected=expected,
                    actual=actual,
                    message=f'{name}: {"match" if passed else "MISMATCH"}',
                )

        self.results.append(result)
        return result

    # ── Summary ──────────────────────────────────────────────────────────

    @property
    def all_passed(self) -> bool:
        return all(r.passed for r in self.results)

    @property
    def pass_count(self) -> int:
        return sum(1 for r in self.results if r.passed)

    @property
    def fail_count(self) -> int:
        return sum(1 for r in self.results if not r.passed)

    def summary(self) -> dict:
        return {
            'scenario': self.scenario_name,
            'total': len(self.results),
            'passed': self.pass_count,
            'failed': self.fail_count,
            'all_passed': self.all_passed,
            'results': [r.to_dict() for r in self.results],
        }
