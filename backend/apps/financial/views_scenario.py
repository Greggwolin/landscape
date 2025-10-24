"""
Scenario Management Views
Feature: SCENARIO-001
Created: 2025-10-24

ViewSets for scenario CRUD and operations.
"""

from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db import transaction, connection

from .models_scenario import Scenario, ScenarioComparison
from .serializers_scenario import ScenarioSerializer, ScenarioComparisonSerializer


class ScenarioViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Scenario CRUD and operations

    Endpoints:
    - GET    /api/financial/scenarios/                 - List scenarios
    - POST   /api/financial/scenarios/                 - Create scenario
    - GET    /api/financial/scenarios/{id}/            - Retrieve scenario
    - PUT    /api/financial/scenarios/{id}/            - Update scenario
    - DELETE /api/financial/scenarios/{id}/            - Delete scenario
    - POST   /api/financial/scenarios/{id}/activate/   - Activate scenario
    - POST   /api/financial/scenarios/{id}/clone/      - Clone scenario
    - POST   /api/financial/scenarios/{id}/lock/       - Lock scenario
    - POST   /api/financial/scenarios/{id}/unlock/     - Unlock scenario
    - POST   /api/financial/scenarios/reorder/         - Reorder scenarios
    """
    queryset = Scenario.objects.all()
    serializer_class = ScenarioSerializer

    def get_queryset(self):
        """Filter scenarios by project if provided"""
        queryset = super().get_queryset()
        project_id = self.request.query_params.get('project_id')

        if project_id:
            queryset = queryset.filter(project_id=project_id)

        return queryset

    @action(detail=True, methods=['post'])
    def activate(self, request, pk=None):
        """
        Activate a scenario (deactivates all others for that project)
        POST /api/financial/scenarios/{id}/activate/
        """
        scenario = self.get_object()

        with transaction.atomic():
            # Deactivate all scenarios for this project
            Scenario.objects.filter(project=scenario.project).update(is_active=False)

            # Activate this one
            scenario.is_active = True
            scenario.save()

        serializer = self.get_serializer(scenario)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def clone(self, request, pk=None):
        """
        Clone a scenario with all its assumptions
        POST /api/financial/scenarios/{id}/clone/
        Body: {
            "scenario_name": "New Scenario Name",
            "scenario_type": "custom"  # optional
        }
        """
        source_scenario = self.get_object()

        if source_scenario.is_locked:
            return Response(
                {"error": "Cannot clone locked scenario"},
                status=status.HTTP_400_BAD_REQUEST
            )

        new_name = request.data.get('scenario_name')
        if not new_name:
            return Response(
                {"error": "scenario_name required"},
                status=status.HTTP_400_BAD_REQUEST
            )

        scenario_type = request.data.get('scenario_type', 'custom')

        # Use database function for cloning
        try:
            with transaction.atomic():
                with connection.cursor() as cursor:
                    cursor.execute(
                        "SELECT clone_scenario(%s, %s, %s)",
                        [source_scenario.scenario_id, new_name, scenario_type]
                    )
                    result = cursor.fetchone()
                    if result:
                        new_scenario_id = result[0]
                    else:
                        raise Exception("Clone function returned no result")

            new_scenario = Scenario.objects.get(scenario_id=new_scenario_id)
            serializer = self.get_serializer(new_scenario)

            return Response(serializer.data, status=status.HTTP_201_CREATED)
        except Exception as e:
            return Response(
                {"error": f"Clone failed: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=True, methods=['post'])
    def lock(self, request, pk=None):
        """
        Lock a scenario to prevent further edits
        POST /api/financial/scenarios/{id}/lock/
        """
        scenario = self.get_object()
        scenario.is_locked = True
        scenario.save()

        serializer = self.get_serializer(scenario)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def unlock(self, request, pk=None):
        """
        Unlock a scenario to allow edits
        POST /api/financial/scenarios/{id}/unlock/
        """
        scenario = self.get_object()

        if scenario.scenario_type == 'base':
            return Response(
                {"error": "Cannot unlock base scenario"},
                status=status.HTTP_400_BAD_REQUEST
            )

        scenario.is_locked = False
        scenario.save()

        serializer = self.get_serializer(scenario)
        return Response(serializer.data)

    @action(detail=False, methods=['post'])
    def reorder(self, request):
        """
        Reorder scenarios for display
        POST /api/financial/scenarios/reorder/
        Body: {
            "project_id": 7,
            "scenario_ids": [1, 3, 2, 4]  # New order
        }
        """
        project_id = request.data.get('project_id')
        scenario_ids = request.data.get('scenario_ids', [])

        if not project_id or not scenario_ids:
            return Response(
                {"error": "project_id and scenario_ids required"},
                status=status.HTTP_400_BAD_REQUEST
            )

        with transaction.atomic():
            for order, scenario_id in enumerate(scenario_ids):
                Scenario.objects.filter(
                    scenario_id=scenario_id,
                    project_id=project_id
                ).update(display_order=order)

        scenarios = Scenario.objects.filter(
            project_id=project_id
        ).order_by('display_order')

        serializer = self.get_serializer(scenarios, many=True)
        return Response(serializer.data)

    def destroy(self, request, *args, **kwargs):
        """Override delete to prevent deleting base or locked scenarios"""
        scenario = self.get_object()

        if scenario.is_locked:
            return Response(
                {"error": "Cannot delete locked scenario"},
                status=status.HTTP_400_BAD_REQUEST
            )

        if scenario.scenario_type == 'base':
            return Response(
                {"error": "Cannot delete base scenario"},
                status=status.HTTP_400_BAD_REQUEST
            )

        if scenario.is_active:
            return Response(
                {"error": "Cannot delete active scenario. Activate another scenario first."},
                status=status.HTTP_400_BAD_REQUEST
            )

        return super().destroy(request, *args, **kwargs)


class ScenarioComparisonViewSet(viewsets.ModelViewSet):
    """
    ViewSet for scenario comparison operations

    Endpoints:
    - GET  /api/financial/scenario-comparisons/               - List comparisons
    - POST /api/financial/scenario-comparisons/               - Create comparison
    - GET  /api/financial/scenario-comparisons/{id}/          - Retrieve comparison
    - PUT  /api/financial/scenario-comparisons/{id}/          - Update comparison
    - DELETE /api/financial/scenario-comparisons/{id}/        - Delete comparison
    - POST /api/financial/scenario-comparisons/{id}/calculate/ - Calculate comparison
    """
    queryset = ScenarioComparison.objects.all()
    serializer_class = ScenarioComparisonSerializer

    def get_queryset(self):
        """Filter comparisons by project if provided"""
        queryset = super().get_queryset()
        project_id = self.request.query_params.get('project_id')

        if project_id:
            queryset = queryset.filter(project_id=project_id)

        return queryset

    @action(detail=True, methods=['post'])
    def calculate(self, request, pk=None):
        """
        Run comparison calculations and store results
        POST /api/financial/scenario-comparisons/{id}/calculate/
        """
        comparison = self.get_object()

        # TODO: Implement comparison calculation logic
        # This would:
        # 1. Load all scenarios in comparison
        # 2. Run financial calculations for each
        # 3. Generate delta analysis
        # 4. Store results in comparison_results JSONB

        # Placeholder response
        from django.utils import timezone
        results = {
            "calculated_at": timezone.now().isoformat(),
            "metrics": {
                "irr_comparison": {},
                "npv_comparison": {},
                "cash_flow_variance": {}
            },
            "message": "Calculation engine not yet implemented"
        }

        comparison.comparison_results = results
        comparison.save()

        serializer = self.get_serializer(comparison)
        return Response(serializer.data)
