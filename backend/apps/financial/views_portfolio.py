"""
Portfolio views for fund-level analysis.

Provides CRUD for portfolios, members, waterfall tiers, and cached results.
The heavy computation (cloning, aggregation, waterfall) lives in services —
these views handle REST operations and Landscaper tool responses.

Scope: Underwriting mode only.
"""

import logging
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.shortcuts import get_object_or_404

from .models_portfolio import (
    Portfolio,
    PortfolioMember,
    PortfolioWaterfallTier,
    PortfolioResult,
)
from apps.projects.permissions import filter_qs_by_owner_or_staff
from .serializers_portfolio import (
    PortfolioSerializer,
    PortfolioListSerializer,
    PortfolioMemberSerializer,
    PortfolioWaterfallTierSerializer,
    PortfolioResultSerializer,
    PortfolioResultDetailSerializer,
)

logger = logging.getLogger(__name__)


class PortfolioViewSet(viewsets.ModelViewSet):
    """
    CRUD for portfolios with nested member and waterfall tier management.

    LIST:   GET    /api/portfolios/
    CREATE: POST   /api/portfolios/
    READ:   GET    /api/portfolios/{id}/
    UPDATE: PATCH  /api/portfolios/{id}/
    DELETE: DELETE /api/portfolios/{id}/

    Custom actions:
      GET    /api/portfolios/{id}/members/
      POST   /api/portfolios/{id}/members/
      GET    /api/portfolios/{id}/waterfall-tiers/
      POST   /api/portfolios/{id}/waterfall-tiers/
      PUT    /api/portfolios/{id}/waterfall-tiers/     (bulk replace)
      GET    /api/portfolios/{id}/results/
      GET    /api/portfolios/{id}/results/latest/
    """

    queryset = Portfolio.objects.filter(is_active=True)

    def get_serializer_class(self):
        if self.action == 'list':
            return PortfolioListSerializer
        return PortfolioSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        # Prefetch for performance on detail views
        if self.action in ('retrieve', 'list'):
            qs = qs.prefetch_related(
                'members__project',
                'waterfall_tiers',
            )
        return filter_qs_by_owner_or_staff(qs, self.request, 'created_by')

    def perform_destroy(self, instance):
        """Soft delete — set is_active=False instead of hard delete."""
        instance.is_active = False
        instance.save(update_fields=['is_active'])

    # ── Members ──────────────────────────────────────────────────────────

    @action(detail=True, methods=['get', 'post'], url_path='members')
    def members(self, request, pk=None):
        """List or add portfolio members."""
        portfolio = self.get_object()

        if request.method == 'GET':
            members = portfolio.members.select_related('project').all()
            serializer = PortfolioMemberSerializer(members, many=True)
            return Response(serializer.data)

        # POST — add a member
        serializer = PortfolioMemberSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(portfolio=portfolio)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(
        detail=True,
        methods=['delete'],
        url_path='members/(?P<member_id>[0-9]+)'
    )
    def remove_member(self, request, pk=None, member_id=None):
        """Remove a member from the portfolio."""
        portfolio = self.get_object()
        member = get_object_or_404(
            PortfolioMember, member_id=member_id, portfolio=portfolio
        )
        # Don't allow removing the template
        if member.is_template:
            return Response(
                {'error': 'Cannot remove template project from portfolio.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        member.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    # ── Waterfall Tiers ──────────────────────────────────────────────────

    @action(detail=True, methods=['get', 'post', 'put'], url_path='waterfall-tiers')
    def waterfall_tiers(self, request, pk=None):
        """
        List, add, or bulk-replace waterfall tiers.

        GET  — list current tiers
        POST — add a single tier
        PUT  — bulk replace all tiers (delete existing, insert new)
        """
        portfolio = self.get_object()

        if request.method == 'GET':
            tiers = portfolio.waterfall_tiers.all()
            serializer = PortfolioWaterfallTierSerializer(tiers, many=True)
            return Response(serializer.data)

        if request.method == 'PUT':
            # Bulk replace: delete all existing tiers, insert new ones
            tiers_data = request.data if isinstance(request.data, list) else [request.data]
            portfolio.waterfall_tiers.all().delete()

            created = []
            for tier_data in tiers_data:
                serializer = PortfolioWaterfallTierSerializer(data=tier_data)
                serializer.is_valid(raise_exception=True)
                tier = serializer.save(portfolio=portfolio)
                created.append(tier)

            result_serializer = PortfolioWaterfallTierSerializer(created, many=True)
            return Response(result_serializer.data, status=status.HTTP_200_OK)

        # POST — add single tier
        serializer = PortfolioWaterfallTierSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(portfolio=portfolio)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    # ── Results ──────────────────────────────────────────────────────────

    @action(detail=True, methods=['get'], url_path='results')
    def results(self, request, pk=None):
        """
        List all calculation results for this portfolio.

        Returns scalar metrics only (no result_json) to minimize payload.
        """
        portfolio = self.get_object()
        results = portfolio.results.all()
        serializer = PortfolioResultSerializer(results, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['get'], url_path='results/latest')
    def latest_result(self, request, pk=None):
        """
        Get the most recent calculation result with full detail.

        Supports optional period slicing via query params:
          ?from_period=0&to_period=24

        This is the primary endpoint for Landscaper's get_portfolio_cashflow_detail tool.
        """
        portfolio = self.get_object()
        result = portfolio.results.first()  # Ordered by -run_date

        if not result:
            return Response(
                {'error': 'No calculation results yet. Run calculate_portfolio_cashflow first.'},
                status=status.HTTP_404_NOT_FOUND,
            )

        serializer = PortfolioResultDetailSerializer(result)
        data = serializer.data

        # Optional period slicing for token economy
        from_period = request.query_params.get('from_period')
        to_period = request.query_params.get('to_period')

        if from_period is not None and to_period is not None and data.get('result_json'):
            try:
                fp = int(from_period)
                tp = int(to_period)
                rj = data['result_json']
                # Slice period arrays within result_json
                if isinstance(rj, dict) and 'periods' in rj:
                    rj['periods'] = rj['periods'][fp:tp + 1]
                    # Slice per-property cash flow arrays
                    if 'property_cashflows' in rj:
                        for prop_cf in rj['property_cashflows']:
                            if 'values' in prop_cf:
                                prop_cf['values'] = prop_cf['values'][fp:tp + 1]
                    data['result_json'] = rj
            except (ValueError, TypeError, KeyError):
                pass  # Return unsliced on bad params

        return Response(data)


class PortfolioResultViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Read-only access to portfolio results.

    Primarily used by Landscaper tools for fetching specific runs by run_id.
    """

    queryset = PortfolioResult.objects.all()
    serializer_class = PortfolioResultSerializer
    lookup_field = 'run_id'

    def get_serializer_class(self):
        if self.action == 'retrieve':
            return PortfolioResultDetailSerializer
        return PortfolioResultSerializer
