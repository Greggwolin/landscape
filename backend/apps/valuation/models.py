"""
Valuation Models

Models for narrative versioning, comments, and track changes.
Supports the TipTap rich text editor with collaborative editing features.
"""

from django.db import models
from django.utils import timezone

from apps.projects.models import Project
# NOTE: Container FK disabled until tbl_container exists
# from apps.containers.models import Container


class NarrativeVersion(models.Model):
    """
    Stores versions of narrative content for valuation approaches.
    Each save creates a new version, enabling version history and diff comparison.
    """

    APPROACH_CHOICES = [
        ('sales_comparison', 'Sales Comparison'),
        ('cost', 'Cost Approach'),
        ('income', 'Income Approach'),
        ('reconciliation', 'Reconciliation'),
    ]

    STATUS_CHOICES = [
        ('draft', 'Draft'),
        ('under_review', 'Under Review'),
        ('final', 'Final'),
    ]

    project_id = models.IntegerField(db_column='project_id')
    approach_type = models.CharField(max_length=50, choices=APPROACH_CHOICES)
    version_number = models.IntegerField()
    content = models.JSONField(help_text='TipTap JSON document')
    content_html = models.TextField(blank=True, null=True, help_text='Rendered HTML for display/export')
    content_plain = models.TextField(blank=True, null=True, help_text='Plain text for search/export')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft')
    # TODO: Add user FK once auth is fully implemented
    created_by = models.IntegerField(blank=True, null=True, help_text='User ID (future FK)')
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'tbl_narrative_version'
        managed = True
        unique_together = ['project_id', 'approach_type', 'version_number']
        ordering = ['-version_number']

    def __str__(self):
        return f"Project {self.project_id} - {self.approach_type} v{self.version_number}"


class NarrativeComment(models.Model):
    """
    Stores inline comments/questions within the narrative.
    Comments ending with ? are treated as questions for Landscaper to answer.
    """

    version = models.ForeignKey(
        NarrativeVersion,
        on_delete=models.CASCADE,
        related_name='comments',
        db_column='version_id'
    )
    comment_text = models.TextField()
    position_start = models.IntegerField(help_text='Character position start in document')
    position_end = models.IntegerField(help_text='Character position end in document')
    is_question = models.BooleanField(default=False, help_text='True if ends with ?')
    is_resolved = models.BooleanField(default=False)
    # TODO: Add user FK once auth is fully implemented
    resolved_by = models.IntegerField(blank=True, null=True, help_text='User ID (future FK)')
    resolved_at = models.DateTimeField(blank=True, null=True)
    landscaper_response = models.TextField(blank=True, null=True, help_text='AI response to question')
    created_by = models.IntegerField(blank=True, null=True, help_text='User ID (future FK)')
    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        db_table = 'tbl_narrative_comment'
        managed = True
        ordering = ['position_start']

    def __str__(self):
        return f"Comment on version {self.version_id}: {self.comment_text[:50]}..."


class NarrativeChange(models.Model):
    """
    Stores individual text changes for track changes visualization.
    Can be used to show additions/deletions in the document.
    """

    CHANGE_TYPE_CHOICES = [
        ('addition', 'Addition'),
        ('deletion', 'Deletion'),
    ]

    version = models.ForeignKey(
        NarrativeVersion,
        on_delete=models.CASCADE,
        related_name='changes',
        db_column='version_id'
    )
    change_type = models.CharField(max_length=20, choices=CHANGE_TYPE_CHOICES)
    original_text = models.TextField(blank=True, null=True, help_text='Original text (for deletions)')
    new_text = models.TextField(blank=True, null=True, help_text='New text (for additions)')
    position_start = models.IntegerField()
    position_end = models.IntegerField()
    is_accepted = models.BooleanField(default=False)
    accepted_at = models.DateTimeField(blank=True, null=True)
    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        db_table = 'tbl_narrative_change'
        managed = True
        ordering = ['position_start']

    def __str__(self):
        return f"{self.change_type} at {self.position_start}-{self.position_end}"


class LandComparable(models.Model):
    """Land sales comparables used in the Cost Approach land value analysis."""

    ADJUSTMENT_TYPES = [
        ('location', 'Location'),
        ('size', 'Size'),
        ('condition', 'Condition'),
        ('zoning', 'Zoning'),
        ('other', 'Other'),
    ]

    land_comparable_id = models.AutoField(primary_key=True)
    project = models.ForeignKey(
        Project,
        on_delete=models.CASCADE,
        db_column='project_id',
        related_name='land_comparables'
    )
    comp_number = models.IntegerField(null=True, blank=True)
    address = models.CharField(max_length=255, null=True, blank=True)
    city = models.CharField(max_length=100, null=True, blank=True)
    state = models.CharField(max_length=2, null=True, blank=True)
    zip = models.CharField(max_length=10, null=True, blank=True)
    sale_date = models.DateField(null=True, blank=True)
    sale_price = models.DecimalField(max_digits=15, decimal_places=2, null=True, blank=True)
    land_area_sf = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    land_area_acres = models.DecimalField(max_digits=10, decimal_places=4, null=True, blank=True)
    price_per_sf = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    price_per_acre = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    zoning = models.CharField(max_length=100, null=True, blank=True)
    source = models.CharField(max_length=100, null=True, blank=True)
    latitude = models.DecimalField(max_digits=10, decimal_places=7, null=True, blank=True)
    longitude = models.DecimalField(max_digits=10, decimal_places=7, null=True, blank=True)
    notes = models.TextField(null=True, blank=True)
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'tbl_land_comparables'
        ordering = ['project', 'comp_number']

    def __str__(self):
        return f"Comp {self.comp_number or self.land_comparable_id}: {self.address or 'Land Comparable'}"


class LandCompAdjustment(models.Model):
    """Adjustments associated with a land comparable."""

    AdjustmentTypeChoices = [
        ('location', 'Location'),
        ('size', 'Size'),
        ('condition', 'Condition'),
        ('zoning', 'Zoning'),
        ('other', 'Other'),
    ]

    adjustment_id = models.AutoField(primary_key=True)
    land_comparable = models.ForeignKey(
        LandComparable,
        on_delete=models.CASCADE,
        db_column='land_comparable_id',
        related_name='adjustments'
    )
    adjustment_type = models.CharField(max_length=50, choices=AdjustmentTypeChoices)
    adjustment_pct = models.DecimalField(max_digits=6, decimal_places=3, null=True, blank=True)
    adjustment_amount = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    justification = models.TextField(null=True, blank=True)
    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        db_table = 'tbl_land_comp_adjustments'
        ordering = ['land_comparable', 'adjustment_type']

    def __str__(self):
        return f"{self.get_adjustment_type_display()} adjustment for comp {self.land_comparable_id}"


class ContainerCostMetadata(models.Model):
    """
    Marshall & Swift / appraisal metadata linked to each building container.

    NOTE: This model is currently disabled (managed=False) because tbl_container
    doesn't exist yet. When the container system is fully implemented, update this
    model to use a proper ForeignKey to Container.
    """

    cost_metadata_id = models.AutoField(primary_key=True)
    # Using IntegerField until tbl_container exists
    container_id = models.IntegerField(unique=True)
    cost_source = models.CharField(max_length=100, null=True, blank=True)
    source_section = models.CharField(max_length=50, null=True, blank=True)
    source_page = models.CharField(max_length=50, null=True, blank=True)
    cost_date = models.DateField(null=True, blank=True)
    construction_class = models.CharField(max_length=10, null=True, blank=True)
    quality = models.CharField(max_length=50, null=True, blank=True)
    num_stories = models.IntegerField(default=1)
    base_cost_per_sf = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    height_per_story_factor = models.DecimalField(max_digits=6, decimal_places=4, default=1.0)
    perimeter_factor = models.DecimalField(max_digits=6, decimal_places=4, default=1.0)
    current_cost_multiplier = models.DecimalField(max_digits=6, decimal_places=4, default=1.0)
    local_area_multiplier = models.DecimalField(max_digits=6, decimal_places=4, default=1.0)
    indirect_cost_pct = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    entrepreneurial_profit_pct = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        managed = False  # Disabled until tbl_container exists
        db_table = 'tbl_container_cost_metadata'

    def __str__(self):
        return f"M&S metadata for container {self.container_id}"


class CostApproachDepreciation(models.Model):
    """Project-level depreciation entries used by the Cost Approach summary."""

    DEPRECIATION_METHODS = [
        ('age-life', 'Age-Life'),
        ('breakdown', 'Breakdown'),
        ('market_extraction', 'Market Extraction'),
        ('other', 'Other'),
    ]

    depreciation_id = models.AutoField(primary_key=True)
    project = models.OneToOneField(
        Project,
        on_delete=models.CASCADE,
        db_column='project_id',
        related_name='cost_approach_depreciation'
    )
    physical_curable = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    physical_incurable_short = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    physical_incurable_long = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    functional_curable = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    functional_incurable = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    external_obsolescence = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    effective_age_years = models.IntegerField(null=True, blank=True)
    remaining_life_years = models.IntegerField(null=True, blank=True)
    depreciation_method = models.CharField(max_length=50, choices=DEPRECIATION_METHODS, null=True, blank=True)
    notes = models.TextField(null=True, blank=True)
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'tbl_cost_approach_depreciation'

    def __str__(self):
        return f"Depreciation for project {self.project_id}"
