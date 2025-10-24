"""
Mixins for Financial ViewSets
Feature: SCENARIO-001 - LX9
Created: 2025-10-24

Provides common functionality for scenario-aware ViewSets.
"""


class ScenarioFilterMixin:
    """
    Mixin to add scenario filtering support to ViewSets.

    Automatically filters queryset by scenario_id query parameter.
    Use in any ViewSet that deals with scenario-dependent data.

    Example:
        class MyViewSet(ScenarioFilterMixin, viewsets.ModelViewSet):
            queryset = MyModel.objects.all()
            serializer_class = MySerializer
    """

    def get_queryset(self):
        """
        Filter queryset by project_id and scenario_id if provided.

        Query parameters:
        - project_id: Filter by project (existing pattern)
        - scenario_id: Filter by scenario (NEW)
        """
        queryset = super().get_queryset()

        # Filter by project (preserve existing behavior)
        project_id = self.request.query_params.get('project_id')
        if project_id:
            queryset = queryset.filter(project_id=project_id)

        # Filter by scenario (NEW)
        scenario_id = self.request.query_params.get('scenario_id')
        if scenario_id:
            # Only apply filter if the model has a scenario_id field
            if hasattr(queryset.model, 'scenario_id'):
                queryset = queryset.filter(scenario_id=scenario_id)

        return queryset
