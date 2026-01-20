"""
Serializers for the contacts app.

Provides JSON serialization/deserialization for Cabinet, Contact, ContactRole,
ContactRelationship, and ProjectContact models.
"""

from rest_framework import serializers
from .models import Cabinet, Contact, ContactRole, ContactRelationship, ProjectContact


# =============================================================================
# CABINET SERIALIZERS
# =============================================================================

class CabinetSerializer(serializers.ModelSerializer):
    """Full serializer for Cabinet model."""

    class Meta:
        model = Cabinet
        fields = [
            'cabinet_id',
            'cabinet_name',
            'owner_user_id',
            'cabinet_type',
            'settings',
            'created_at',
            'updated_at',
            'is_active',
        ]
        read_only_fields = ['cabinet_id', 'created_at', 'updated_at']


class CabinetStatsSerializer(serializers.Serializer):
    """Serializer for cabinet statistics."""
    cabinet_id = serializers.IntegerField()
    cabinet_name = serializers.CharField()
    project_count = serializers.IntegerField()
    contact_count = serializers.IntegerField()
    document_count = serializers.IntegerField()


# =============================================================================
# CONTACT ROLE SERIALIZERS
# =============================================================================

class ContactRoleSerializer(serializers.ModelSerializer):
    """Full serializer for ContactRole model."""

    class Meta:
        model = ContactRole
        fields = [
            'role_id',
            'cabinet_id',
            'role_code',
            'role_label',
            'role_category',
            'typical_contact_types',
            'description',
            'display_order',
            'is_system',
            'is_active',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['role_id', 'is_system', 'created_at', 'updated_at']

    cabinet_id = serializers.IntegerField(source='cabinet.cabinet_id', allow_null=True, read_only=True)

    def validate_role_code(self, value):
        """Ensure role_code is lowercase and uses underscores."""
        return value.lower().replace(' ', '_').replace('-', '_')

    def validate(self, data):
        """Prevent modification of system roles."""
        if self.instance and self.instance.is_system:
            # Only allow toggling is_active on system roles
            allowed_fields = {'is_active'}
            changed_fields = set(data.keys()) - allowed_fields
            if changed_fields:
                raise serializers.ValidationError(
                    f"System roles cannot be modified. Only 'is_active' can be changed."
                )
        return data


class ContactRoleListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for listing roles."""

    class Meta:
        model = ContactRole
        fields = [
            'role_id',
            'role_code',
            'role_label',
            'role_category',
            'typical_contact_types',
            'display_order',
            'is_system',
            'is_active',
        ]


# =============================================================================
# CONTACT SERIALIZERS
# =============================================================================

class ContactSerializer(serializers.ModelSerializer):
    """Full serializer for Contact model."""

    cabinet_id = serializers.IntegerField(source='cabinet.cabinet_id', read_only=True)

    class Meta:
        model = Contact
        fields = [
            'contact_id',
            'cabinet_id',
            'contact_type',
            'name',
            'display_name',
            'first_name',
            'last_name',
            'title',
            'company_name',
            'entity_type',
            'email',
            'phone',
            'phone_mobile',
            'address_line1',
            'address_line2',
            'city',
            'state',
            'postal_code',
            'country',
            'notes',
            'tags',
            'custom_fields',
            'created_at',
            'updated_at',
            'created_by',
            'is_active',
        ]
        read_only_fields = ['contact_id', 'cabinet_id', 'created_at', 'updated_at']

    def validate_email(self, value):
        """Normalize email to lowercase."""
        if value:
            return value.lower().strip()
        return value

    def validate(self, data):
        """Validate contact data based on contact_type."""
        contact_type = data.get('contact_type', getattr(self.instance, 'contact_type', None))

        if contact_type == 'Person':
            # Persons should have first_name and last_name
            if not data.get('first_name') and not data.get('last_name'):
                # Try to extract from name
                name = data.get('name', '')
                if ' ' in name:
                    parts = name.split(' ', 1)
                    data['first_name'] = parts[0]
                    data['last_name'] = parts[1]

        return data


class ContactListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for listing contacts."""

    class Meta:
        model = Contact
        fields = [
            'contact_id',
            'contact_type',
            'name',
            'display_name',
            'company_name',
            'email',
            'phone',
            'city',
            'state',
            'is_active',
        ]


class ContactDetailSerializer(ContactSerializer):
    """Extended serializer with relationships and projects."""

    relationships = serializers.SerializerMethodField()
    projects = serializers.SerializerMethodField()

    class Meta(ContactSerializer.Meta):
        fields = ContactSerializer.Meta.fields + ['relationships', 'projects']

    def get_relationships(self, obj):
        """Get all relationships for this contact."""
        # Relationships where this contact is the source
        from_rels = obj.relationships_from.filter(
            contact__is_active=True,
            related_to__is_active=True
        ).select_related('related_to')

        # Relationships where this contact is the target
        to_rels = obj.relationships_to.filter(
            contact__is_active=True,
            related_to__is_active=True
        ).select_related('contact')

        relationships = []

        for rel in from_rels:
            relationships.append({
                'relationship_id': rel.relationship_id,
                'direction': 'outgoing',
                'related_contact': {
                    'contact_id': rel.related_to.contact_id,
                    'name': rel.related_to.name,
                    'contact_type': rel.related_to.contact_type,
                },
                'relationship_type': rel.relationship_type,
                'role_title': rel.role_title,
                'is_current': rel.is_current,
            })

        for rel in to_rels:
            relationships.append({
                'relationship_id': rel.relationship_id,
                'direction': 'incoming',
                'related_contact': {
                    'contact_id': rel.contact.contact_id,
                    'name': rel.contact.name,
                    'contact_type': rel.contact.contact_type,
                },
                'relationship_type': rel.relationship_type,
                'role_title': rel.role_title,
                'is_current': rel.is_current,
            })

        return relationships

    def get_projects(self, obj):
        """Get all projects this contact is associated with."""
        assignments = obj.project_assignments.filter(
            project__is_active=True
        ).select_related('project', 'role')

        return [
            {
                'project_id': a.project.project_id,
                'project_name': a.project.project_name,
                'role': a.role.role_label,
                'role_category': a.role.role_category,
                'is_primary': a.is_primary,
            }
            for a in assignments
        ]


# =============================================================================
# CONTACT RELATIONSHIP SERIALIZERS
# =============================================================================

class ContactRelationshipSerializer(serializers.ModelSerializer):
    """Full serializer for ContactRelationship model."""

    contact_name = serializers.CharField(source='contact.name', read_only=True)
    contact_type = serializers.CharField(source='contact.contact_type', read_only=True)
    related_to_name = serializers.CharField(source='related_to.name', read_only=True)
    related_to_type = serializers.CharField(source='related_to.contact_type', read_only=True)
    is_current = serializers.BooleanField(read_only=True)

    class Meta:
        model = ContactRelationship
        fields = [
            'relationship_id',
            'cabinet_id',
            'contact_id',
            'contact_name',
            'contact_type',
            'related_to_id',
            'related_to_name',
            'related_to_type',
            'relationship_type',
            'role_title',
            'start_date',
            'end_date',
            'is_current',
            'notes',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['relationship_id', 'created_at', 'updated_at']

    cabinet_id = serializers.IntegerField(source='cabinet.cabinet_id', read_only=True)
    contact_id = serializers.IntegerField(source='contact.contact_id')
    related_to_id = serializers.IntegerField(source='related_to.contact_id')

    def validate(self, data):
        """Ensure contact and related_to are different."""
        contact_id = data.get('contact', {}).get('contact_id')
        related_to_id = data.get('related_to', {}).get('contact_id')

        if contact_id and related_to_id and contact_id == related_to_id:
            raise serializers.ValidationError(
                "A contact cannot have a relationship with itself."
            )
        return data


class ContactRelationshipCreateSerializer(serializers.Serializer):
    """Serializer for creating a new relationship."""
    contact_id = serializers.IntegerField()
    related_to_id = serializers.IntegerField()
    relationship_type = serializers.ChoiceField(choices=ContactRelationship.RELATIONSHIP_TYPES)
    role_title = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    start_date = serializers.DateField(required=False, allow_null=True)
    end_date = serializers.DateField(required=False, allow_null=True)
    notes = serializers.CharField(required=False, allow_blank=True, allow_null=True)

    def validate(self, data):
        if data['contact_id'] == data['related_to_id']:
            raise serializers.ValidationError(
                "A contact cannot have a relationship with itself."
            )
        return data


# =============================================================================
# PROJECT CONTACT SERIALIZERS
# =============================================================================

class ProjectContactSerializer(serializers.ModelSerializer):
    """Full serializer for ProjectContact junction."""

    # Nested contact details
    contact_name = serializers.CharField(source='contact.name', read_only=True)
    contact_type = serializers.CharField(source='contact.contact_type', read_only=True)
    contact_email = serializers.CharField(source='contact.email', read_only=True)
    contact_phone = serializers.CharField(source='contact.phone', read_only=True)
    company_name = serializers.CharField(source='contact.company_name', read_only=True)

    # Role details
    role_code = serializers.CharField(source='role.role_code', read_only=True)
    role_label = serializers.CharField(source='role.role_label', read_only=True)
    role_category = serializers.CharField(source='role.role_category', read_only=True)

    class Meta:
        model = ProjectContact
        fields = [
            'project_contact_id',
            'project_id',
            'contact_id',
            'contact_name',
            'contact_type',
            'contact_email',
            'contact_phone',
            'company_name',
            'role_id',
            'role_code',
            'role_label',
            'role_category',
            'is_primary',
            'is_billing_contact',
            'notes',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['project_contact_id', 'created_at', 'updated_at']

    project_id = serializers.IntegerField(source='project.project_id', read_only=True)
    contact_id = serializers.IntegerField(source='contact.contact_id', read_only=True)
    role_id = serializers.IntegerField(source='role.role_id', read_only=True)


class ProjectContactCreateSerializer(serializers.Serializer):
    """Serializer for adding a contact to a project."""
    contact_id = serializers.IntegerField()
    role_id = serializers.IntegerField()
    is_primary = serializers.BooleanField(default=False)
    is_billing_contact = serializers.BooleanField(default=False)
    notes = serializers.CharField(required=False, allow_blank=True, allow_null=True)


class ProjectContactUpdateSerializer(serializers.Serializer):
    """Serializer for updating a project contact assignment."""
    role_id = serializers.IntegerField(required=False)
    is_primary = serializers.BooleanField(required=False)
    is_billing_contact = serializers.BooleanField(required=False)
    notes = serializers.CharField(required=False, allow_blank=True, allow_null=True)


# =============================================================================
# SEARCH/TYPEAHEAD SERIALIZERS
# =============================================================================

class ContactTypeaheadSerializer(serializers.ModelSerializer):
    """Minimal serializer for typeahead/autocomplete."""

    label = serializers.SerializerMethodField()

    class Meta:
        model = Contact
        fields = ['contact_id', 'name', 'company_name', 'contact_type', 'label']

    def get_label(self, obj):
        """Generate display label for typeahead."""
        if obj.company_name and obj.contact_type == 'Person':
            return f"{obj.name} @ {obj.company_name}"
        elif obj.contact_type in ('Company', 'Entity', 'Fund'):
            return f"{obj.name} ({obj.contact_type})"
        return obj.name
