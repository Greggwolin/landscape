"""
Dynamic Columns API Views
"""

from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from django.db import transaction
from decimal import Decimal

from .models import DynamicColumnDefinition, DynamicColumnValue
from .serializers import (
    DynamicColumnDefinitionSerializer,
    DynamicColumnValueSerializer,
    AcceptColumnSerializer,
)


class DynamicColumnViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing dynamic column definitions.

    Endpoints:
    - GET /projects/{project_id}/dynamic/columns/ - List columns
    - GET /projects/{project_id}/dynamic/columns/{id}/ - Get column
    - POST /projects/{project_id}/dynamic/columns/ - Create column
    - PUT /projects/{project_id}/dynamic/columns/{id}/ - Update column
    - DELETE /projects/{project_id}/dynamic/columns/{id}/ - Delete column
    - GET /projects/{project_id}/dynamic/columns/with_values/ - Get columns with values
    - POST /projects/{project_id}/dynamic/columns/{id}/accept/ - Accept proposed column
    - POST /projects/{project_id}/dynamic/columns/{id}/reject/ - Reject proposed column
    """

    serializer_class = DynamicColumnDefinitionSerializer
    permission_classes = [AllowAny]  # TODO: Change to IsAuthenticated in production

    def get_queryset(self):
        project_id = self.kwargs.get('project_id')
        queryset = DynamicColumnDefinition.objects.filter(
            project_id=project_id,
            is_active=True
        )

        # Filter by table if specified
        table_name = self.request.query_params.get('table_name') or self.request.query_params.get('table')
        if table_name:
            queryset = queryset.filter(table_name=table_name)

        # Filter by proposed status
        proposed = self.request.query_params.get('proposed')
        if proposed is not None:
            queryset = queryset.filter(is_proposed=proposed.lower() == 'true')

        return queryset.order_by('display_order', 'created_at')

    def perform_create(self, serializer):
        project_id = self.kwargs.get('project_id')
        serializer.save(
            project_id=project_id,
            created_by=self.request.user if self.request.user.is_authenticated else None
        )

    @action(detail=False, methods=['get'])
    def with_values(self, request, project_id=None):
        """
        Get columns with their values for specified rows.

        Query params:
        - table: Required. Table name (e.g., 'multifamily_unit')
        - row_ids: Optional. List of row IDs to get values for
        """
        table_name = request.query_params.get('table_name') or request.query_params.get('table')
        row_ids = request.query_params.getlist('row_ids')

        if not table_name:
            return Response(
                {'error': 'table parameter required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Get column definitions (only active, non-proposed columns)
        columns = self.get_queryset().filter(
            table_name=table_name,
            is_proposed=False
        )

        # Get values
        values_qs = DynamicColumnValue.objects.filter(
            column_definition__in=columns
        )
        if row_ids:
            values_qs = values_qs.filter(row_id__in=row_ids)

        # Build values dict: {row_id: {column_key: value}}
        values_dict = {}
        for val in values_qs.select_related('column_definition'):
            row_id = str(val.row_id)
            if row_id not in values_dict:
                values_dict[row_id] = {}
            # Convert Decimal to float for JSON serialization
            raw_value = val.value
            if isinstance(raw_value, Decimal):
                raw_value = float(raw_value)
            values_dict[row_id][val.column_definition.column_key] = raw_value

        return Response({
            'columns': DynamicColumnDefinitionSerializer(columns, many=True).data,
            'values': values_dict
        })

    @action(detail=True, methods=['post'])
    def accept(self, request, project_id=None, pk=None):
        """
        Accept a proposed column (make it active).

        Optional body:
        - display_label: New display label
        - data_type: Data type override
        """
        column = self.get_object()
        if not column.is_proposed:
            return Response(
                {'error': 'Column is not proposed'},
                status=status.HTTP_400_BAD_REQUEST
            )

        serializer = AcceptColumnSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        # Apply any overrides
        if 'display_label' in serializer.validated_data:
            column.display_label = serializer.validated_data['display_label']
        if 'data_type' in serializer.validated_data:
            column.data_type = serializer.validated_data['data_type']

        column.is_proposed = False
        column.save()

        return Response(DynamicColumnDefinitionSerializer(column).data)

    @action(detail=True, methods=['post'])
    def reject(self, request, project_id=None, pk=None):
        """Reject a proposed column (delete it and its values)."""
        column = self.get_object()

        with transaction.atomic():
            # Delete values
            DynamicColumnValue.objects.filter(column_definition=column).delete()
            # Delete definition
            column.delete()

        return Response(status=status.HTTP_204_NO_CONTENT)


class DynamicColumnValueViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing dynamic column values.

    Endpoints:
    - GET /projects/{project_id}/dynamic/values/ - List values
    - POST /projects/{project_id}/dynamic/values/ - Create value
    - POST /projects/{project_id}/dynamic/values/bulk_update/ - Bulk update values
    """

    serializer_class = DynamicColumnValueSerializer
    permission_classes = [AllowAny]  # TODO: Change to IsAuthenticated in production

    def get_queryset(self):
        project_id = self.kwargs.get('project_id')
        return DynamicColumnValue.objects.filter(
            column_definition__project_id=project_id
        )

    @action(detail=False, methods=['post'])
    def bulk_update(self, request, project_id=None):
        """
        Bulk update values for multiple rows/columns.

        Expected format: {column_key: {row_id: value}}
        """
        data = request.data

        with transaction.atomic():
            for column_key, row_values in data.items():
                try:
                    column_def = DynamicColumnDefinition.objects.get(
                        project_id=project_id,
                        column_key=column_key
                    )
                except DynamicColumnDefinition.DoesNotExist:
                    continue

                for row_id, value in row_values.items():
                    # Determine which value field to use based on data type
                    value_fields = self._get_value_fields(value, column_def.data_type)

                    DynamicColumnValue.objects.update_or_create(
                        column_definition=column_def,
                        row_id=int(row_id),
                        defaults=value_fields
                    )

        return Response({'success': True})

    def _get_value_fields(self, value, data_type: str) -> dict:
        """Convert value to appropriate model field dict."""
        # Reset all value fields
        fields = {
            'value_text': None,
            'value_number': None,
            'value_boolean': None,
            'value_date': None,
        }

        if value is None:
            return fields

        if data_type == 'boolean':
            if isinstance(value, bool):
                fields['value_boolean'] = value
            else:
                fields['value_boolean'] = str(value).lower() in ('true', 'yes', '1')
        elif data_type in ('number', 'currency', 'percent'):
            try:
                fields['value_number'] = Decimal(str(value))
            except (ValueError, TypeError):
                fields['value_text'] = str(value)
        elif data_type == 'date':
            fields['value_date'] = value
        else:
            fields['value_text'] = str(value) if value else None

        return fields
