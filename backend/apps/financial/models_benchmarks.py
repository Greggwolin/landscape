"""
Global Benchmarks Library - Django Models
Phase 1: Growth Rates, Unit Costs, Transaction Costs

These models map to PostgreSQL tables in the landscape schema.
Following the pattern from models_budget_categories.py with managed=False.
"""

from django.db import models
from django.contrib.postgres.fields import JSONField


class UnitCostCategory(models.Model):
    """
    Category hierarchy for unit cost templates.
    Maps to landscape.core_unit_cost_category
    """

    category_id = models.AutoField(primary_key=True)
    parent = models.ForeignKey(
        'self',
        on_delete=models.SET_NULL,
        db_column='parent_id',
        related_name='children',
        null=True,
        blank=True
    )
    category_name = models.CharField(max_length=100)
    cost_scope = models.CharField(max_length=20)
    cost_type = models.CharField(max_length=20)
    development_stage = models.CharField(max_length=50, default='stage3_development')
    sort_order = models.IntegerField(default=0)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        managed = False
        db_table = 'core_unit_cost_category'
        ordering = ['development_stage', 'sort_order', 'category_name']
        verbose_name = 'Unit Cost Category'
        verbose_name_plural = 'Unit Cost Categories'

    def __str__(self):
        return self.category_name


class UnitCostTemplate(models.Model):
    """
    Template library for budget line items.
    Maps to landscape.core_unit_cost_template
    """

    template_id = models.AutoField(primary_key=True)
    category = models.ForeignKey(
        UnitCostCategory,
        on_delete=models.CASCADE,
        db_column='category_id',
        related_name='templates'
    )
    item_name = models.CharField(max_length=200)
    default_uom_code = models.CharField(max_length=10)
    quantity = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    typical_mid_value = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    market_geography = models.CharField(max_length=100, null=True, blank=True)
    source = models.CharField(max_length=200, null=True, blank=True)
    as_of_date = models.DateField(null=True, blank=True)
    project_type_code = models.CharField(max_length=50, default='LAND')
    last_used_date = models.DateField(null=True, blank=True)
    usage_count = models.IntegerField(default=0)
    is_active = models.BooleanField(default=True)
    created_from_project = models.ForeignKey(
        'projects.Project',
        on_delete=models.SET_NULL,
        db_column='created_from_project_id',
        null=True,
        blank=True,
        related_name='created_unit_cost_templates'
    )
    created_from_ai = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        managed = False
        db_table = 'core_unit_cost_template'
        ordering = ['item_name']
        verbose_name = 'Unit Cost Template'
        verbose_name_plural = 'Unit Cost Templates'

    def __str__(self):
        return self.item_name


class GlobalBenchmark(models.Model):
    """
    Minimal representation of core_global_benchmark for linkage metadata.
    """

    benchmark_id = models.AutoField(primary_key=True)
    benchmark_name = models.CharField(max_length=200)
    benchmark_type = models.CharField(max_length=50, null=True, blank=True)
    market_geography = models.CharField(max_length=100, null=True, blank=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        managed = False
        db_table = 'core_global_benchmark'
        ordering = ['benchmark_name']
        verbose_name = 'Global Benchmark'
        verbose_name_plural = 'Global Benchmarks'

    def __str__(self):
        return self.benchmark_name


class TemplateBenchmarkLink(models.Model):
    """
    Link table between unit cost templates and global benchmarks.
    Maps to landscape.core_template_benchmark_link
    """

    link_id = models.AutoField(primary_key=True)
    template = models.ForeignKey(
        UnitCostTemplate,
        on_delete=models.CASCADE,
        db_column='template_id',
        related_name='benchmark_links'
    )
    benchmark = models.ForeignKey(
        GlobalBenchmark,
        on_delete=models.CASCADE,
        db_column='benchmark_id',
        related_name='template_links'
    )
    is_primary = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        managed = False
        db_table = 'core_template_benchmark_link'
        verbose_name = 'Template Benchmark Link'
        verbose_name_plural = 'Template Benchmark Links'

    def __str__(self):
        return f'{self.template_id} → {self.benchmark_id}'


class PlanningStandard(models.Model):
    """
    Global planning defaults used across projects.
    Maps to landscape.core_planning_standards
    """

    standard_id = models.AutoField(primary_key=True)
    standard_name = models.CharField(max_length=100)
    default_planning_efficiency = models.DecimalField(max_digits=5, decimal_places=4, default=0.7500)
    default_street_row_pct = models.DecimalField(max_digits=5, decimal_places=4, null=True, blank=True)
    default_park_dedication_pct = models.DecimalField(max_digits=5, decimal_places=4, null=True, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        managed = False
        db_table = 'core_planning_standards'
        ordering = ['standard_id']
        verbose_name = 'Planning Standard'
        verbose_name_plural = 'Planning Standards'

    def __str__(self):
        return self.standard_name


class GlobalBenchmarkRegistry(models.Model):
    """
    Master registry for all user-defined benchmarks.
    Maps to landscape.tbl_global_benchmark_registry
    """
    benchmark_id = models.BigAutoField(primary_key=True)
    user_id = models.TextField()

    # Categorization
    category = models.CharField(max_length=50)
    subcategory = models.CharField(max_length=100, null=True, blank=True)
    benchmark_name = models.CharField(max_length=200)
    description = models.TextField(null=True, blank=True)

    # Geographic scope
    market_geography = models.CharField(max_length=100, null=True, blank=True)

    # Property type applicability
    property_type = models.CharField(max_length=50, null=True, blank=True)

    # Source tracking
    source_type = models.CharField(max_length=50)
    source_document_id = models.BigIntegerField(null=True, blank=True)
    source_project_id = models.BigIntegerField(null=True, blank=True)
    extraction_date = models.DateField(null=True, blank=True)

    # Quality metrics
    confidence_level = models.CharField(max_length=20, default='medium')
    usage_count = models.IntegerField(default=0)

    # Temporal tracking
    as_of_date = models.DateField(auto_now_add=True)
    cpi_index_value = models.DecimalField(
        max_digits=10, decimal_places=4, null=True, blank=True
    )

    # Context metadata
    context_metadata = models.JSONField(null=True, blank=True)

    # Status
    is_active = models.BooleanField(default=True)
    is_global = models.BooleanField(default=False)

    # Audit
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.TextField(null=True, blank=True)
    updated_by = models.TextField(null=True, blank=True)

    class Meta:
        managed = False
        db_table = 'tbl_global_benchmark_registry'
        verbose_name = 'Global Benchmark'
        verbose_name_plural = 'Global Benchmarks'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.benchmark_name} ({self.category})"

    @property
    def age_days(self):
        """Calculate days since as_of_date"""
        from datetime import date
        if self.as_of_date:
            delta = date.today() - self.as_of_date
            return delta.days
        return 0

    @property
    def is_stale(self):
        """Flag if benchmark is >24 months old"""
        return self.age_days > 730


class BenchmarkUnitCost(models.Model):
    """
    Unit cost benchmarks for construction/development.
    Maps to landscape.tbl_benchmark_unit_cost
    """
    unit_cost_id = models.BigAutoField(primary_key=True)
    benchmark = models.ForeignKey(
        GlobalBenchmarkRegistry,
        on_delete=models.CASCADE,
        db_column='benchmark_id',
        related_name='unit_costs'
    )

    # Value and unit
    value = models.DecimalField(max_digits=12, decimal_places=2)
    uom_code = models.CharField(max_length=20)  # '$/SF', '$/FF', '$/CY', etc.
    uom_alt_code = models.CharField(max_length=20, null=True, blank=True)

    # Range/confidence bounds
    low_value = models.DecimalField(
        max_digits=12, decimal_places=2, null=True, blank=True
    )
    high_value = models.DecimalField(
        max_digits=12, decimal_places=2, null=True, blank=True
    )

    # Applicability filters
    cost_phase = models.CharField(max_length=50, null=True, blank=True)
    work_type = models.CharField(max_length=100, null=True, blank=True)

    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        managed = False
        db_table = 'tbl_benchmark_unit_cost'
        verbose_name = 'Unit Cost Benchmark'
        verbose_name_plural = 'Unit Cost Benchmarks'
        ordering = ['cost_phase', 'work_type']

    def __str__(self):
        return f"{self.benchmark.benchmark_name}: {self.value} {self.uom_code}"


class BenchmarkTransactionCost(models.Model):
    """
    Transaction cost benchmarks (closing, title, legal, etc.).
    Maps to landscape.tbl_benchmark_transaction_cost
    """
    transaction_cost_id = models.BigAutoField(primary_key=True)
    benchmark = models.ForeignKey(
        GlobalBenchmarkRegistry,
        on_delete=models.CASCADE,
        db_column='benchmark_id',
        related_name='transaction_costs'
    )

    # Cost specification
    cost_type = models.CharField(max_length=50)

    # Value basis
    value = models.DecimalField(max_digits=8, decimal_places=4)
    value_type = models.CharField(max_length=20)  # 'percentage', 'flat_fee', 'per_unit'
    basis = models.CharField(max_length=50, null=True, blank=True)

    # Range by deal size
    deal_size_min = models.DecimalField(
        max_digits=12, decimal_places=2, null=True, blank=True
    )
    deal_size_max = models.DecimalField(
        max_digits=12, decimal_places=2, null=True, blank=True
    )

    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        managed = False
        db_table = 'tbl_benchmark_transaction_cost'
        verbose_name = 'Transaction Cost Benchmark'
        verbose_name_plural = 'Transaction Cost Benchmarks'
        ordering = ['cost_type']

    def __str__(self):
        if self.value_type == 'percentage':
            return f"{self.benchmark.benchmark_name}: {self.value}% of {self.basis}"
        return f"{self.benchmark.benchmark_name}: {self.value} {self.value_type}"


class BenchmarkAISuggestion(models.Model):
    """
    Queue of AI-extracted benchmarks pending user review.
    Maps to landscape.tbl_benchmark_ai_suggestions
    """
    suggestion_id = models.BigAutoField(primary_key=True)
    user_id = models.TextField()

    # Source document
    document_id = models.BigIntegerField()
    project_id = models.BigIntegerField(null=True, blank=True)
    extraction_date = models.DateTimeField(auto_now_add=True)

    # Suggested benchmark
    category = models.CharField(max_length=50)
    subcategory = models.CharField(max_length=100, null=True, blank=True)
    suggested_name = models.CharField(max_length=200)
    suggested_value = models.DecimalField(max_digits=12, decimal_places=4)
    suggested_uom = models.CharField(max_length=20, null=True, blank=True)
    market_geography = models.CharField(max_length=100, null=True, blank=True)
    property_type = models.CharField(max_length=50, null=True, blank=True)

    # AI confidence and context
    confidence_score = models.DecimalField(
        max_digits=3, decimal_places=2, null=True, blank=True
    )  # 0.00 to 1.00
    extraction_context = models.JSONField(null=True, blank=True)

    # Comparison to existing benchmarks
    existing_benchmark_id = models.BigIntegerField(null=True, blank=True)
    variance_percentage = models.DecimalField(
        max_digits=6, decimal_places=2, null=True, blank=True
    )
    inflation_adjusted_comparison = models.JSONField(null=True, blank=True)

    # User interaction
    status = models.CharField(max_length=20, default='pending')
    user_response = models.JSONField(null=True, blank=True)
    reviewed_at = models.DateTimeField(null=True, blank=True)
    reviewed_by = models.TextField(null=True, blank=True)

    # Result
    created_benchmark_id = models.BigIntegerField(null=True, blank=True)

    # Audit
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        managed = False
        db_table = 'tbl_benchmark_ai_suggestions'
        verbose_name = 'AI Benchmark Suggestion'
        verbose_name_plural = 'AI Benchmark Suggestions'
        ordering = ['-extraction_date']

    def __str__(self):
        return f"{self.suggested_name}: {self.suggested_value} ({self.status})"

    @property
    def document_name(self):
        """Get document name from core_doc (requires JOIN)"""
        # This would need to be populated via a query with JOIN
        return "Document"

    @property
    def project_name(self):
        """Get project name from tbl_project (requires JOIN)"""
        # This would need to be populated via a query with JOIN
        return "Project" if self.project_id else None
