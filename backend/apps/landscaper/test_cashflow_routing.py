"""
Regression coverage for `_fetch_cashflow_schedule` in tool_executor.

The function previously hardcoded LandDevCashFlowService for every project,
so MF projects (e.g. Chadron Terrace, project_id=17) returned Land-Dev
shaped output and Landscaper falsely told users the engine was configured
for land development. The fix routes by tbl_project.project_type_code,
mirroring apps/calculations/services.py:_fetch_cashflows_from_django_service.

These tests pin the routing rule. They mock both the DB lookup and both
service classes; no real cashflow math runs.
"""

from unittest import mock

from django.test import SimpleTestCase

from apps.landscaper import tool_executor


SCHEDULE_FIXTURE = {
    'projectId': 0,
    'periodType': 'month',
    'startDate': '2026-01-01',
    'endDate': '2030-12-01',
    'totalPeriods': 60,
    'periods': [],
    'sections': [],
    'summary': {'irr': 0.12, 'netCashFlow': 1000000},
    'generatedAt': '2026-04-28',
}


def _mock_cursor_returning(project_type_code):
    """Build a context-manager mock matching `connection.cursor()` usage."""
    cursor = mock.MagicMock()
    cursor.fetchone.return_value = (project_type_code,) if project_type_code is not None else None
    cursor_ctx = mock.MagicMock()
    cursor_ctx.__enter__.return_value = cursor
    cursor_ctx.__exit__.return_value = False
    return cursor_ctx, cursor


class FetchCashflowScheduleRoutingTests(SimpleTestCase):
    """LAND, MF, and unknown project types must route correctly."""

    def test_land_project_routes_to_land_dev_service(self):
        cursor_ctx, _ = _mock_cursor_returning('LAND')

        mock_connection = mock.MagicMock()
        mock_connection.cursor.return_value = cursor_ctx

        with mock.patch.object(
            tool_executor, 'connection', mock_connection
        ), mock.patch(
            'apps.financial.services.land_dev_cashflow_service.LandDevCashFlowService'
        ) as mock_landdev, mock.patch(
            'apps.financial.services.income_property_cashflow_service.IncomePropertyCashFlowService'
        ) as mock_income:
            mock_landdev.return_value.calculate.return_value = SCHEDULE_FIXTURE

            result = tool_executor._fetch_cashflow_schedule(42)

        mock_landdev.assert_called_once_with(42)
        mock_income.assert_not_called()
        self.assertEqual(result, SCHEDULE_FIXTURE)

    def test_mf_project_routes_to_income_property_service(self):
        cursor_ctx, _ = _mock_cursor_returning('MF')

        mock_connection = mock.MagicMock()
        mock_connection.cursor.return_value = cursor_ctx

        with mock.patch.object(
            tool_executor, 'connection', mock_connection
        ), mock.patch(
            'apps.financial.services.land_dev_cashflow_service.LandDevCashFlowService'
        ) as mock_landdev, mock.patch(
            'apps.financial.services.income_property_cashflow_service.IncomePropertyCashFlowService'
        ) as mock_income:
            mock_income.return_value.calculate.return_value = SCHEDULE_FIXTURE

            result = tool_executor._fetch_cashflow_schedule(17)

        mock_income.assert_called_once_with(17)
        mock_landdev.assert_not_called()
        self.assertEqual(result, SCHEDULE_FIXTURE)

    def test_unknown_project_type_returns_empty_and_warns(self):
        cursor_ctx, _ = _mock_cursor_returning('XYZ')

        mock_connection = mock.MagicMock()
        mock_connection.cursor.return_value = cursor_ctx

        with mock.patch.object(
            tool_executor, 'connection', mock_connection
        ), mock.patch(
            'apps.financial.services.land_dev_cashflow_service.LandDevCashFlowService'
        ) as mock_landdev, mock.patch(
            'apps.financial.services.income_property_cashflow_service.IncomePropertyCashFlowService'
        ) as mock_income, self.assertLogs(
            tool_executor.logger, level='WARNING'
        ) as log_capture:
            result = tool_executor._fetch_cashflow_schedule(999)

        mock_landdev.assert_not_called()
        mock_income.assert_not_called()

        self.assertEqual(result['projectId'], 999)
        self.assertEqual(result['summary'], {})
        self.assertEqual(result['periods'], [])
        self.assertEqual(result['totalPeriods'], 0)

        self.assertTrue(
            any("Unrecognized project_type_code='XYZ'" in msg for msg in log_capture.output),
            f"Expected warning about XYZ, got: {log_capture.output}"
        )

    def test_missing_project_returns_empty_and_warns(self):
        """project_id not in tbl_project → cursor.fetchone() is None."""
        cursor_ctx, _ = _mock_cursor_returning(None)

        mock_connection = mock.MagicMock()
        mock_connection.cursor.return_value = cursor_ctx

        with mock.patch.object(
            tool_executor, 'connection', mock_connection
        ), mock.patch(
            'apps.financial.services.land_dev_cashflow_service.LandDevCashFlowService'
        ) as mock_landdev, mock.patch(
            'apps.financial.services.income_property_cashflow_service.IncomePropertyCashFlowService'
        ) as mock_income, self.assertLogs(
            tool_executor.logger, level='WARNING'
        ):
            result = tool_executor._fetch_cashflow_schedule(99999)

        mock_landdev.assert_not_called()
        mock_income.assert_not_called()
        self.assertEqual(result['projectId'], 99999)
        self.assertEqual(result['summary'], {})
