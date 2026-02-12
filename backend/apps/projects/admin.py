"""
Django admin configuration for projects app.
"""

from django.contrib import admin
from django import forms
from .models import Project, AnalysisTypeConfig, ANALYSIS_TYPE_CHOICES
from .lookups import LookupType, LookupSubtype, LookupFamily, PropertyTypeConfig


# US States for jurisdiction dropdown
US_STATES = [
    ('', '---------'),
    ('AL', 'Alabama'), ('AK', 'Alaska'), ('AZ', 'Arizona'), ('AR', 'Arkansas'),
    ('CA', 'California'), ('CO', 'Colorado'), ('CT', 'Connecticut'), ('DE', 'Delaware'),
    ('FL', 'Florida'), ('GA', 'Georgia'), ('HI', 'Hawaii'), ('ID', 'Idaho'),
    ('IL', 'Illinois'), ('IN', 'Indiana'), ('IA', 'Iowa'), ('KS', 'Kansas'),
    ('KY', 'Kentucky'), ('LA', 'Louisiana'), ('ME', 'Maine'), ('MD', 'Maryland'),
    ('MA', 'Massachusetts'), ('MI', 'Michigan'), ('MN', 'Minnesota'), ('MS', 'Mississippi'),
    ('MO', 'Missouri'), ('MT', 'Montana'), ('NE', 'Nebraska'), ('NV', 'Nevada'),
    ('NH', 'New Hampshire'), ('NJ', 'New Jersey'), ('NM', 'New Mexico'), ('NY', 'New York'),
    ('NC', 'North Carolina'), ('ND', 'North Dakota'), ('OH', 'Ohio'), ('OK', 'Oklahoma'),
    ('OR', 'Oregon'), ('PA', 'Pennsylvania'), ('RI', 'Rhode Island'), ('SC', 'South Carolina'),
    ('SD', 'South Dakota'), ('TN', 'Tennessee'), ('TX', 'Texas'), ('UT', 'Utah'),
    ('VT', 'Vermont'), ('VA', 'Virginia'), ('WA', 'Washington'), ('WV', 'West Virginia'),
    ('WI', 'Wisconsin'), ('WY', 'Wyoming'),
]

# Financial Model Types
FINANCIAL_MODEL_TYPES = [
    ('', '---------'),
    ('Development', 'Development'),
    ('Acquisition', 'Acquisition'),
    ('Refinance', 'Refinance'),
    ('Hold', 'Hold/Investment'),
    ('Disposition', 'Disposition'),
]

# Calculation Frequencies
CALCULATION_FREQUENCIES = [
    ('', '---------'),
    ('Monthly', 'Monthly'),
    ('Quarterly', 'Quarterly'),
    ('Annually', 'Annually'),
]


class ProjectAdminForm(forms.ModelForm):
    """Custom form for Project admin with dropdown choices from lookup tables."""

    # Analysis Type (refactored in migration 061)
    analysis_type = forms.ChoiceField(
        required=False,
        label="Analysis Type",
        help_text="What the user is doing: Valuation, Investment, Development, or Feasibility"
    )

    property_subtype = forms.ChoiceField(
        required=False,
        label="Property Subtype",
        help_text="Specific property subtype (e.g., Master Planned Community, Multifamily)"
    )

    property_class = forms.ChoiceField(
        required=False,
        label="Property Class",
        help_text="Property class (for Income Property only)"
    )

    # Project Type dropdown (lu_subtype)
    project_type = forms.ChoiceField(
        required=False,
        label="Project Type",
        help_text="Project classification (from lu_subtype lookup table)"
    )

    # Financial Model Type dropdown
    financial_model_type = forms.ChoiceField(
        required=False,
        choices=FINANCIAL_MODEL_TYPES,
        label="Financial Model Type",
        help_text="Type of financial model/analysis"
    )

    # Calculation Frequency dropdown
    calculation_frequency = forms.ChoiceField(
        required=False,
        choices=CALCULATION_FREQUENCIES,
        label="Calculation Frequency",
        help_text="How often calculations are performed"
    )

    # Jurisdiction State dropdown
    jurisdiction_state = forms.ChoiceField(
        required=False,
        choices=US_STATES,
        label="Jurisdiction State",
        help_text="State where project is located"
    )

    class Meta:
        model = Project
        fields = '__all__'

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)

        # Populate analysis_type choices (new orthogonal taxonomy)
        analysis_type_choices = [('', '---------')] + list(ANALYSIS_TYPE_CHOICES)
        self.fields['analysis_type'].choices = analysis_type_choices

        # Populate property_subtype choices (simplified for admin)
        property_subtype_choices = [
            ('', '---------'),
            ('Master Planned Community', 'Master Planned Community'),
            ('Subdivision', 'Subdivision'),
            ('Multifamily Development', 'Multifamily Development'),
            ('Commercial Development', 'Commercial Development'),
            ('Industrial Development', 'Industrial Development'),
            ('Mixed-Use Development', 'Mixed-Use Development'),
            ('Multifamily', 'Multifamily'),
            ('Office', 'Office'),
            ('Retail', 'Retail'),
            ('Industrial', 'Industrial'),
            ('Hotel', 'Hotel'),
            ('Self-Storage', 'Self-Storage'),
        ]
        self.fields['property_subtype'].choices = property_subtype_choices

        # Populate property_class choices
        property_class_choices = [
            ('', '---------'),
            ('Class A', 'Class A'),
            ('Class B', 'Class B'),
            ('Class C', 'Class C'),
        ]
        self.fields['property_class'].choices = property_class_choices

        # Populate project_type choices from lu_subtype (active subtypes only)
        # These are for more detailed classifications
        subtype_choices = [('', '---------')]
        for subtype in LookupSubtype.objects.filter(active=True).order_by('ord', 'name'):
            subtype_choices.append((subtype.code, f"{subtype.code} - {subtype.name}"))
        self.fields['project_type'].choices = subtype_choices


@admin.register(Project)
class ProjectAdmin(admin.ModelAdmin):
    """Admin interface for Project model with dropdowns for all lookup fields."""

    form = ProjectAdminForm

    list_display = [
        'project_id',
        'project_name',
        'project_type',
        'analysis_type',
        'property_subtype',
        'jurisdiction_city',
        'jurisdiction_state',
        'is_active',
        'created_at',
    ]

    # Make project_name clickable to edit
    list_display_links = ['project_name']

    list_filter = [
        'project_type',
        'analysis_type',
        'property_subtype',
        'property_class',
        'financial_model_type',
        'jurisdiction_state',
        'is_active',
        'created_at',
    ]

    search_fields = [
        'project_name',
        'project_address',
        'jurisdiction_city',
        'county',
        'description',
        'legal_owner',
        'developer_owner',
    ]

    readonly_fields = [
        'project_id',
        'created_at',
        'updated_at',
        'last_calculated_at',
        'ai_last_reviewed',
    ]

    fieldsets = (
        ('Basic Information', {
            'fields': (
                'project_id',
                'project_name',
                'project_type',
                'analysis_type',
                'property_subtype',
                'property_class',
                'financial_model_type',
                'is_active',
            )
        }),
        ('Location', {
            'fields': (
                'project_address',
                'location_description',
                'acres_gross',
                'location_lat',
                'location_lon',
                'jurisdiction_city',
                'jurisdiction_county',
                'jurisdiction_state',
                'county',
            )
        }),
        ('Project Details', {
            'fields': (
                'description',
                'target_units',
                'price_range_low',
                'price_range_high',
            )
        }),
        ('Ownership', {
            'fields': (
                'legal_owner',
                'developer_owner',
                'existing_land_use',
                'assessed_value',
            )
        }),
        ('Taxonomy', {
            'fields': (
                'uses_global_taxonomy',
                'taxonomy_customized',
                'jurisdiction_integrated',
            ),
            'classes': ('collapse',),
        }),
        ('Dates', {
            'fields': (
                'start_date',
                'analysis_start_date',
                'analysis_end_date',
            )
        }),
        ('Financial Configuration', {
            'fields': (
                'discount_rate_pct',
                'cost_of_capital_pct',
                'calculation_frequency',
            )
        }),
        ('GIS & AI', {
            'fields': (
                'gis_metadata',
                'ai_last_reviewed',
            ),
            'classes': ('collapse',),
        }),
        ('Metadata', {
            'fields': (
                'created_at',
                'updated_at',
                'last_calculated_at',
                'schema_version',
                'template_id',
            ),
            'classes': ('collapse',),
        }),
    )

    # Add save confirmation message
    def save_model(self, request, obj, form, change):
        super().save_model(request, obj, form, change)
        if change:
            self.message_user(request, f'Project "{obj.project_name}" was updated successfully.')
        else:
            self.message_user(request, f'Project "{obj.project_name}" was created successfully.')

@admin.register(AnalysisTypeConfig)
class AnalysisTypeConfigAdmin(admin.ModelAdmin):
    """Admin interface for Analysis Type Configuration."""

    list_display = [
        'analysis_type',
        'analysis_perspective',
        'analysis_purpose',
        'tile_valuation',
        'tile_capitalization',
        'tile_returns',
        'tile_development_budget',
        'updated_at',
    ]

    list_filter = ['analysis_type', 'analysis_perspective', 'analysis_purpose']

    readonly_fields = ['config_id', 'created_at', 'updated_at']

    fieldsets = (
        ('Analysis Type', {
            'fields': ('config_id', 'analysis_type', 'analysis_perspective', 'analysis_purpose')
        }),
        ('Tile Visibility', {
            'fields': (
                'tile_valuation',
                'tile_capitalization',
                'tile_returns',
                'tile_development_budget',
            ),
            'description': 'Control which tiles are visible for this analysis type'
        }),
        ('Requirements', {
            'fields': (
                'requires_capital_stack',
                'requires_comparable_sales',
                'requires_income_approach',
                'requires_cost_approach',
            )
        }),
        ('Reports & Landscaper', {
            'fields': (
                'available_reports',
                'landscaper_context',
            )
        }),
        ('Audit', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',),
        }),
    )


# Import auth admin
from .admin_auth import UserAdmin, UserProfileAdmin, APIKeyAdmin, PasswordResetTokenAdmin
