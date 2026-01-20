"""
ViewSets for the contacts app.

Provides REST API endpoints for Cabinet, Contact, ContactRole,
ContactRelationship, and ProjectContact operations.
"""

from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from django.db.models import Q, Count
from django.db import connection

from .models import Cabinet, Contact, ContactRole, ContactRelationship, ProjectContact
from .serializers import (
    CabinetSerializer,
    CabinetStatsSerializer,
    ContactSerializer,
    ContactListSerializer,
    ContactDetailSerializer,
    ContactTypeaheadSerializer,
    ContactRoleSerializer,
    ContactRoleListSerializer,
    ContactRelationshipSerializer,
    ContactRelationshipCreateSerializer,
    ProjectContactSerializer,
    ProjectContactCreateSerializer,
    ProjectContactUpdateSerializer,
)


# =============================================================================
# CABINET VIEWSET
# =============================================================================

class CabinetViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Cabinet operations.

    Endpoints:
    - GET /api/cabinet/ - List user's cabinets
    - GET /api/cabinet/:id/ - Get cabinet details
    - PATCH /api/cabinet/:id/ - Update cabinet settings
    - GET /api/cabinet/:id/stats/ - Get cabinet statistics
    """
    queryset = Cabinet.objects.filter(is_active=True)
    serializer_class = CabinetSerializer
    permission_classes = [AllowAny]  # TODO: Change to IsAuthenticated

    def get_queryset(self):
        """Filter to user's cabinets (when auth is implemented)."""
        # TODO: Filter by current user's owner_user_id
        return Cabinet.objects.filter(is_active=True)

    @action(detail=True, methods=['get'])
    def stats(self, request, pk=None):
        """
        GET /api/cabinet/:id/stats/

        Returns statistics for the cabinet.
        """
        cabinet = self.get_object()

        # Use raw SQL for cross-table counts
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT
                    (SELECT COUNT(*) FROM landscape.tbl_project WHERE cabinet_id = %s AND is_active = TRUE) as project_count,
                    (SELECT COUNT(*) FROM landscape.tbl_contact WHERE cabinet_id = %s AND is_active = TRUE) as contact_count,
                    (SELECT COUNT(*) FROM landscape.core_doc WHERE cabinet_id = %s AND deleted_at IS NULL) as document_count
            """, [cabinet.cabinet_id, cabinet.cabinet_id, cabinet.cabinet_id])
            row = cursor.fetchone()

        return Response({
            'cabinet_id': cabinet.cabinet_id,
            'cabinet_name': cabinet.cabinet_name,
            'project_count': row[0] or 0,
            'contact_count': row[1] or 0,
            'document_count': row[2] or 0,
        })


# =============================================================================
# CONTACT ROLE VIEWSET
# =============================================================================

class ContactRoleViewSet(viewsets.ModelViewSet):
    """
    ViewSet for ContactRole operations.

    Endpoints:
    - GET /api/contact-roles/ - List all roles (system + cabinet-specific)
    - GET /api/contact-roles/?category=Financing - Filter by category
    - POST /api/contact-roles/ - Create custom role
    - PATCH /api/contact-roles/:id/ - Update custom role
    - DELETE /api/contact-roles/:id/ - Delete custom role
    - PATCH /api/contact-roles/:id/visibility/ - Toggle visibility
    """
    queryset = ContactRole.objects.all()
    permission_classes = [AllowAny]  # TODO: Change to IsAuthenticated

    def get_serializer_class(self):
        if self.action == 'list':
            return ContactRoleListSerializer
        return ContactRoleSerializer

    def get_queryset(self):
        """
        Returns system roles + cabinet-specific roles.
        Filters by category if provided.
        """
        # TODO: Get cabinet_id from authenticated user
        cabinet_id = self.request.query_params.get('cabinet_id', 1)

        queryset = ContactRole.objects.filter(
            Q(cabinet_id__isnull=True) |  # System roles
            Q(cabinet_id=cabinet_id)       # Cabinet-specific roles
        ).filter(is_active=True)

        # Filter by category if provided
        category = self.request.query_params.get('category')
        if category:
            queryset = queryset.filter(role_category=category)

        return queryset.order_by('display_order', 'role_label')

    def perform_create(self, serializer):
        """Set cabinet_id on create (custom roles)."""
        # TODO: Get cabinet_id from authenticated user
        cabinet_id = self.request.data.get('cabinet_id', 1)
        cabinet = Cabinet.objects.get(cabinet_id=cabinet_id)
        serializer.save(cabinet=cabinet, is_system=False)

    def destroy(self, request, *args, **kwargs):
        """Prevent deletion of system roles."""
        instance = self.get_object()
        if instance.is_system:
            return Response(
                {'error': 'System roles cannot be deleted.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        return super().destroy(request, *args, **kwargs)

    @action(detail=True, methods=['patch'])
    def visibility(self, request, pk=None):
        """
        PATCH /api/contact-roles/:id/visibility/

        Toggle visibility of a role for this cabinet.
        """
        role = self.get_object()
        is_active = request.data.get('is_active', not role.is_active)
        role.is_active = is_active
        role.save(update_fields=['is_active', 'updated_at'])
        return Response(ContactRoleSerializer(role).data)


# =============================================================================
# CONTACT VIEWSET
# =============================================================================

class ContactViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Contact operations.

    Endpoints:
    - GET /api/contacts/ - List all contacts in cabinet
    - GET /api/contacts/?type=Person - Filter by contact type
    - GET /api/contacts/?search=acme - Search by name/company/email
    - GET /api/contacts/:id/ - Get single contact with relationships and projects
    - POST /api/contacts/ - Create contact
    - PATCH /api/contacts/:id/ - Update contact
    - DELETE /api/contacts/:id/ - Soft delete contact
    - GET /api/contacts/:id/relationships/ - Get contact's relationships
    - POST /api/contacts/:id/relationships/ - Add relationship
    - DELETE /api/contacts/:id/relationships/:relId/ - Remove relationship
    - GET /api/contacts/:id/projects/ - Get projects this contact is on
    - GET /api/contacts/typeahead/ - Typeahead search
    """
    queryset = Contact.objects.filter(is_active=True)
    permission_classes = [AllowAny]  # TODO: Change to IsAuthenticated

    def get_serializer_class(self):
        if self.action == 'list':
            return ContactListSerializer
        if self.action == 'retrieve':
            return ContactDetailSerializer
        if self.action == 'typeahead':
            return ContactTypeaheadSerializer
        return ContactSerializer

    def get_queryset(self):
        """Filter contacts by cabinet and apply search/filters."""
        # TODO: Get cabinet_id from authenticated user
        cabinet_id = self.request.query_params.get('cabinet_id', 1)

        queryset = Contact.objects.filter(
            cabinet_id=cabinet_id,
            is_active=True
        )

        # Filter by contact type
        contact_type = self.request.query_params.get('type')
        if contact_type:
            queryset = queryset.filter(contact_type=contact_type)

        # Search by name, company, or email
        search = self.request.query_params.get('search')
        if search:
            queryset = queryset.filter(
                Q(name__icontains=search) |
                Q(company_name__icontains=search) |
                Q(email__icontains=search)
            )

        # Filter by tags
        tags = self.request.query_params.getlist('tag')
        if tags:
            for tag in tags:
                queryset = queryset.filter(tags__contains=[tag])

        return queryset.order_by('name')

    def perform_create(self, serializer):
        """Set cabinet on create."""
        # TODO: Get cabinet_id from authenticated user
        cabinet_id = self.request.data.get('cabinet_id', 1)
        cabinet = Cabinet.objects.get(cabinet_id=cabinet_id)
        serializer.save(cabinet=cabinet)

    def perform_destroy(self, instance):
        """Soft delete instead of hard delete."""
        instance.is_active = False
        instance.save(update_fields=['is_active', 'updated_at'])

    @action(detail=False, methods=['get'])
    def typeahead(self, request):
        """
        GET /api/contacts/typeahead/?q=search_term

        Fast typeahead search for contact selection.
        """
        q = request.query_params.get('q', '')
        if len(q) < 2:
            return Response([])

        # TODO: Get cabinet_id from authenticated user
        cabinet_id = request.query_params.get('cabinet_id', 1)

        # Filter by contact type if specified
        contact_type = request.query_params.get('type')

        queryset = Contact.objects.filter(
            cabinet_id=cabinet_id,
            is_active=True
        ).filter(
            Q(name__icontains=q) |
            Q(company_name__icontains=q) |
            Q(email__icontains=q)
        )

        if contact_type:
            # Support comma-separated types
            types = [t.strip() for t in contact_type.split(',')]
            queryset = queryset.filter(contact_type__in=types)

        queryset = queryset[:10]  # Limit to 10 results
        serializer = ContactTypeaheadSerializer(queryset, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['get', 'post'])
    def relationships(self, request, pk=None):
        """
        GET /api/contacts/:id/relationships/ - List relationships
        POST /api/contacts/:id/relationships/ - Create relationship
        """
        contact = self.get_object()

        if request.method == 'GET':
            # Get all relationships (both directions)
            from_rels = ContactRelationship.objects.filter(
                contact=contact
            ).select_related('related_to')

            to_rels = ContactRelationship.objects.filter(
                related_to=contact
            ).select_related('contact')

            from_data = ContactRelationshipSerializer(from_rels, many=True).data
            to_data = ContactRelationshipSerializer(to_rels, many=True).data

            return Response({
                'outgoing': from_data,
                'incoming': to_data,
            })

        elif request.method == 'POST':
            serializer = ContactRelationshipCreateSerializer(data=request.data)
            serializer.is_valid(raise_exception=True)

            # Validate contacts exist and belong to same cabinet
            try:
                related_to = Contact.objects.get(
                    contact_id=serializer.validated_data['related_to_id'],
                    cabinet_id=contact.cabinet_id,
                    is_active=True
                )
            except Contact.DoesNotExist:
                return Response(
                    {'error': 'Related contact not found in this cabinet.'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            relationship = ContactRelationship.objects.create(
                cabinet=contact.cabinet,
                contact=contact,
                related_to=related_to,
                relationship_type=serializer.validated_data['relationship_type'],
                role_title=serializer.validated_data.get('role_title'),
                start_date=serializer.validated_data.get('start_date'),
                end_date=serializer.validated_data.get('end_date'),
                notes=serializer.validated_data.get('notes'),
            )

            return Response(
                ContactRelationshipSerializer(relationship).data,
                status=status.HTTP_201_CREATED
            )

    @action(detail=True, methods=['delete'], url_path='relationships/(?P<rel_id>[^/.]+)')
    def delete_relationship(self, request, pk=None, rel_id=None):
        """
        DELETE /api/contacts/:id/relationships/:rel_id/

        Delete a relationship.
        """
        contact = self.get_object()

        try:
            relationship = ContactRelationship.objects.get(
                relationship_id=rel_id,
                cabinet=contact.cabinet
            )
            # Verify the contact is part of this relationship
            if relationship.contact_id != contact.contact_id and relationship.related_to_id != contact.contact_id:
                return Response(
                    {'error': 'Relationship does not belong to this contact.'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            relationship.delete()
            return Response(status=status.HTTP_204_NO_CONTENT)
        except ContactRelationship.DoesNotExist:
            return Response(
                {'error': 'Relationship not found.'},
                status=status.HTTP_404_NOT_FOUND
            )

    @action(detail=True, methods=['get'])
    def projects(self, request, pk=None):
        """
        GET /api/contacts/:id/projects/

        Get all projects this contact is involved in.
        """
        contact = self.get_object()

        assignments = ProjectContact.objects.filter(
            contact=contact
        ).select_related('project', 'role')

        data = [
            {
                'project_contact_id': a.project_contact_id,
                'project_id': a.project.project_id,
                'project_name': a.project.project_name,
                'project_type_code': a.project.project_type_code,
                'role': a.role.role_label,
                'role_category': a.role.role_category,
                'is_primary': a.is_primary,
                'assigned_at': a.created_at,
            }
            for a in assignments
        ]

        return Response(data)


# =============================================================================
# PROJECT CONTACT VIEWSET
# =============================================================================

class ProjectContactViewSet(viewsets.ModelViewSet):
    """
    ViewSet for ProjectContact (junction table) operations.

    Endpoints:
    - GET /api/projects/:projectId/contacts/ - List contacts on project
    - POST /api/projects/:projectId/contacts/ - Add contact to project
    - PATCH /api/projects/:projectId/contacts/:id/ - Update role/flags
    - DELETE /api/projects/:projectId/contacts/:id/ - Remove contact from project
    """
    queryset = ProjectContact.objects.all()
    serializer_class = ProjectContactSerializer
    permission_classes = [AllowAny]  # TODO: Change to IsAuthenticated

    def get_queryset(self):
        """Filter to specific project."""
        project_pk = self.kwargs.get('project_pk')
        if project_pk:
            return ProjectContact.objects.filter(
                project_id=project_pk,
                contact__is_active=True
            ).select_related('contact', 'role').order_by(
                'role__display_order', 'contact__name'
            )
        return ProjectContact.objects.none()

    def create(self, request, *args, **kwargs):
        """Add a contact to the project."""
        project_pk = self.kwargs.get('project_pk')

        serializer = ProjectContactCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        # Validate contact and role exist
        try:
            contact = Contact.objects.get(
                contact_id=serializer.validated_data['contact_id'],
                is_active=True
            )
        except Contact.DoesNotExist:
            return Response(
                {'error': 'Contact not found.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            role = ContactRole.objects.get(
                role_id=serializer.validated_data['role_id'],
                is_active=True
            )
        except ContactRole.DoesNotExist:
            return Response(
                {'error': 'Role not found.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Check for duplicate
        if ProjectContact.objects.filter(
            project_id=project_pk,
            contact=contact,
            role=role
        ).exists():
            return Response(
                {'error': 'Contact already has this role on this project.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Create the assignment
        from apps.projects.models import Project
        project = Project.objects.get(project_id=project_pk)

        project_contact = ProjectContact.objects.create(
            project=project,
            contact=contact,
            role=role,
            is_primary=serializer.validated_data.get('is_primary', False),
            is_billing_contact=serializer.validated_data.get('is_billing_contact', False),
            notes=serializer.validated_data.get('notes'),
        )

        return Response(
            ProjectContactSerializer(project_contact).data,
            status=status.HTTP_201_CREATED
        )

    def partial_update(self, request, *args, **kwargs):
        """Update role or flags on a project contact."""
        instance = self.get_object()

        serializer = ProjectContactUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        # Update fields if provided
        if 'role_id' in serializer.validated_data:
            try:
                role = ContactRole.objects.get(
                    role_id=serializer.validated_data['role_id'],
                    is_active=True
                )
                instance.role = role
            except ContactRole.DoesNotExist:
                return Response(
                    {'error': 'Role not found.'},
                    status=status.HTTP_400_BAD_REQUEST
                )

        if 'is_primary' in serializer.validated_data:
            instance.is_primary = serializer.validated_data['is_primary']

        if 'is_billing_contact' in serializer.validated_data:
            instance.is_billing_contact = serializer.validated_data['is_billing_contact']

        if 'notes' in serializer.validated_data:
            instance.notes = serializer.validated_data['notes']

        instance.save()

        return Response(ProjectContactSerializer(instance).data)

    def destroy(self, request, *args, **kwargs):
        """Remove contact from project (does not delete the contact)."""
        return super().destroy(request, *args, **kwargs)

    @action(detail=False, methods=['get'])
    def by_category(self, request, project_pk=None):
        """
        GET /api/projects/:projectId/contacts/by_category/

        Returns contacts grouped by role category.
        """
        queryset = self.get_queryset()

        grouped = {}
        for pc in queryset:
            category = pc.role.role_category
            if category not in grouped:
                grouped[category] = []
            grouped[category].append(ProjectContactSerializer(pc).data)

        return Response(grouped)
