"""
Views for User Preference management.

Provides REST API endpoints for CRUD operations on user preferences.
"""

from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.utils import timezone

from .models_user import UserPreference
from .serializers import (
    UserPreferenceSerializer,
    UserPreferenceListSerializer,
    UserPreferenceBulkSerializer
)


class UserPreferenceViewSet(viewsets.ModelViewSet):
    """
    ViewSet for user preferences.

    Provides standard CRUD operations plus bulk actions.

    Endpoints:
    - GET /api/user-preferences/ - List all preferences for current user
    - GET /api/user-preferences/{id}/ - Get specific preference
    - POST /api/user-preferences/ - Create new preference
    - PUT /api/user-preferences/{id}/ - Update preference
    - PATCH /api/user-preferences/{id}/ - Partial update
    - DELETE /api/user-preferences/{id}/ - Delete preference
    - POST /api/user-preferences/bulk_set/ - Set multiple preferences
    - GET /api/user-preferences/by_key/ - Get preference by key and scope
    """

    permission_classes = [IsAuthenticated]
    serializer_class = UserPreferenceSerializer
    http_method_names = ['get', 'post', 'put', 'patch', 'delete']

    def get_queryset(self):
        """Return preferences only for the current user."""
        return UserPreference.objects.filter(user=self.request.user)

    def get_serializer_class(self):
        """Use lightweight serializer for list actions."""
        if self.action == 'list':
            return UserPreferenceListSerializer
        if self.action == 'bulk_set':
            return UserPreferenceBulkSerializer
        return UserPreferenceSerializer

    def perform_create(self, serializer):
        """Automatically set the current user when creating."""
        serializer.save(user=self.request.user)

    def list(self, request, *args, **kwargs):
        """
        List user preferences with optional filtering.

        Query params:
        - scope_type: Filter by scope type (global, project, organization)
        - scope_id: Filter by scope ID
        - preference_key: Filter by preference key (supports partial match)
        """
        queryset = self.get_queryset()

        # Apply filters
        scope_type = request.query_params.get('scope_type')
        if scope_type:
            queryset = queryset.filter(scope_type=scope_type)

        scope_id = request.query_params.get('scope_id')
        if scope_id:
            queryset = queryset.filter(scope_id=scope_id)

        preference_key = request.query_params.get('preference_key')
        if preference_key:
            queryset = queryset.filter(preference_key__icontains=preference_key)

        serializer = self.get_serializer(queryset, many=True)
        return Response({
            'success': True,
            'count': len(serializer.data),
            'preferences': serializer.data
        })

    @action(detail=False, methods=['get'])
    def by_key(self, request):
        """
        Get a preference by key and scope.

        Query params:
        - key: Preference key (required)
        - scope_type: Scope type (default: global)
        - scope_id: Scope ID (required if scope_type != global)
        - default: Default value if not found (optional, JSON string)
        """
        key = request.query_params.get('key')
        if not key:
            return Response(
                {'success': False, 'error': 'key parameter is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        scope_type = request.query_params.get('scope_type', UserPreference.SCOPE_GLOBAL)
        scope_id = request.query_params.get('scope_id')
        default_value = request.query_params.get('default')

        # Convert scope_id to int if provided
        if scope_id:
            try:
                scope_id = int(scope_id)
            except ValueError:
                return Response(
                    {'success': False, 'error': 'scope_id must be an integer'},
                    status=status.HTTP_400_BAD_REQUEST
                )

        # Get preference using model helper
        pref_value = UserPreference.get_preference(
            user=request.user,
            key=key,
            scope_type=scope_type,
            scope_id=scope_id,
            default=default_value
        )

        if pref_value is None and default_value is None:
            return Response(
                {'success': False, 'error': 'Preference not found'},
                status=status.HTTP_404_NOT_FOUND
            )

        return Response({
            'success': True,
            'preference_key': key,
            'preference_value': pref_value,
            'scope_type': scope_type,
            'scope_id': scope_id
        })

    @action(detail=False, methods=['post'])
    def set_preference(self, request):
        """
        Set a single preference (upsert operation).

        Body:
        - preference_key: Key for the preference (required)
        - preference_value: Value (JSON) (required)
        - scope_type: Scope type (default: global)
        - scope_id: Scope ID (required if scope_type != global)
        """
        key = request.data.get('preference_key')
        value = request.data.get('preference_value')

        if not key:
            return Response(
                {'success': False, 'error': 'preference_key is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if value is None:
            return Response(
                {'success': False, 'error': 'preference_value is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        scope_type = request.data.get('scope_type', UserPreference.SCOPE_GLOBAL)
        scope_id = request.data.get('scope_id')

        # Validation
        if scope_type != UserPreference.SCOPE_GLOBAL and not scope_id:
            return Response(
                {'success': False, 'error': f'scope_id is required when scope_type is {scope_type}'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Set preference using model helper
        pref = UserPreference.set_preference(
            user=request.user,
            key=key,
            value=value,
            scope_type=scope_type,
            scope_id=scope_id
        )

        serializer = UserPreferenceSerializer(pref)
        return Response({
            'success': True,
            'preference': serializer.data
        }, status=status.HTTP_200_OK)

    @action(detail=False, methods=['post'])
    def bulk_set(self, request):
        """
        Set multiple preferences at once.

        Body:
        - preferences: Array of preference objects, each with:
          - preference_key (required)
          - preference_value (required)
          - scope_type (optional, default: global)
          - scope_id (optional)
        """
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        preferences_data = serializer.validated_data['preferences']
        results = []

        for pref_data in preferences_data:
            key = pref_data['preference_key']
            value = pref_data['preference_value']
            scope_type = pref_data.get('scope_type', UserPreference.SCOPE_GLOBAL)
            scope_id = pref_data.get('scope_id')

            pref = UserPreference.set_preference(
                user=request.user,
                key=key,
                value=value,
                scope_type=scope_type,
                scope_id=scope_id
            )

            results.append({
                'preference_key': key,
                'success': True,
                'id': pref.id
            })

        return Response({
            'success': True,
            'count': len(results),
            'results': results
        }, status=status.HTTP_200_OK)

    @action(detail=False, methods=['get'])
    def all_for_scope(self, request):
        """
        Get all preferences for a specific scope.

        Query params:
        - scope_type: Scope type (default: global)
        - scope_id: Scope ID (required if scope_type != global)

        Returns a flat dictionary of key-value pairs.
        """
        scope_type = request.query_params.get('scope_type', UserPreference.SCOPE_GLOBAL)
        scope_id = request.query_params.get('scope_id')

        if scope_id:
            try:
                scope_id = int(scope_id)
            except ValueError:
                return Response(
                    {'success': False, 'error': 'scope_id must be an integer'},
                    status=status.HTTP_400_BAD_REQUEST
                )

        prefs = UserPreference.get_all_for_user(
            user=request.user,
            scope_type=scope_type,
            scope_id=scope_id
        )

        return Response({
            'success': True,
            'scope_type': scope_type,
            'scope_id': scope_id,
            'preferences': prefs,
            'count': len(prefs)
        })

    @action(detail=False, methods=['delete'])
    def clear_scope(self, request):
        """
        Delete all preferences for a specific scope.

        Query params:
        - scope_type: Scope type (required)
        - scope_id: Scope ID (required if scope_type != global)
        """
        scope_type = request.query_params.get('scope_type')
        if not scope_type:
            return Response(
                {'success': False, 'error': 'scope_type is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        scope_id = request.query_params.get('scope_id')
        if scope_id:
            try:
                scope_id = int(scope_id)
            except ValueError:
                return Response(
                    {'success': False, 'error': 'scope_id must be an integer'},
                    status=status.HTTP_400_BAD_REQUEST
                )

        queryset = UserPreference.objects.filter(
            user=request.user,
            scope_type=scope_type
        )

        if scope_id is not None:
            queryset = queryset.filter(scope_id=scope_id)

        count = queryset.count()
        queryset.delete()

        return Response({
            'success': True,
            'deleted_count': count,
            'scope_type': scope_type,
            'scope_id': scope_id
        })
