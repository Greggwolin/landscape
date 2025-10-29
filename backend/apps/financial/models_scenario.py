"""
Scenario Management Models
Feature: SCENARIO-001
Created: 2025-10-24

Models for financial modeling scenarios with sensitivity analysis support.
"""

from django.db import models
from django.conf import settings
from django.core.validators import MinValueValidator, MaxValueValidator
from django.contrib.postgres.fields import ArrayField


class Scenario(models.Model):
    """Financial modeling scenarios for sensitivity analysis"""

    SCENARIO_TYPES = [
        ('base', 'Base Case'),
        ('optimistic', 'Optimistic'),
        ('conservative', 'Conservative'),
        ('stress', 'Stress Test'),
        ('custom', 'Custom'),
    ]

    VARIANCE_METHODS = [
        ('percentage', 'Percentage Adjustment'),
        ('absolute', 'Absolute Value Change'),
        ('mixed', 'Mixed Approach'),
    ]

    scenario_id = models.AutoField(primary_key=True)
    project = models.ForeignKey(
        'projects.Project',
        on_delete=models.CASCADE,
        related_name='scenarios',
        db_column='project_id'
    )
    scenario_name = models.CharField(max_length=100)
    scenario_type = models.CharField(
        max_length=20,
        choices=SCENARIO_TYPES,
        default='custom'
    )
    scenario_code = models.CharField(max_length=50, unique=True)

    is_active = models.BooleanField(default=False)
    is_locked = models.BooleanField(default=False)
    display_order = models.IntegerField(default=0)

    description = models.TextField(blank=True, null=True)
    color_hex = models.CharField(max_length=7, default='#6B7280')

    # Variance tracking
    variance_method = models.CharField(
        max_length=20,
        choices=VARIANCE_METHODS,
        blank=True,
        null=True
    )
    revenue_variance_pct = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        blank=True,
        null=True,
        validators=[MinValueValidator(-100), MaxValueValidator(1000)]
    )
    cost_variance_pct = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        blank=True,
        null=True,
        validators=[MinValueValidator(-100), MaxValueValidator(1000)]
    )
    absorption_variance_pct = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        blank=True,
        null=True,
        validators=[MinValueValidator(-100), MaxValueValidator(1000)]
    )

    # Timing adjustments
    start_date_offset_months = models.IntegerField(default=0)

    # Metadata
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='created_scenarios'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    cloned_from = models.ForeignKey(
        'self',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='clones',
        db_column='cloned_from_scenario_id'
    )

    class Meta:
        db_table = 'tbl_scenario'
        ordering = ['project', 'display_order', 'scenario_name']
        indexes = [
            models.Index(fields=['project', 'is_active']),
            models.Index(fields=['project', 'display_order']),
        ]

    def __str__(self):
        return f"{self.project.project_name} - {self.scenario_name}"

    def get_color_class(self):
        """Return CSS class for chip color based on scenario type"""
        color_map = {
            'base': 'bg-blue-500',
            'optimistic': 'bg-green-500',
            'conservative': 'bg-yellow-500',
            'stress': 'bg-red-500',
            'custom': 'bg-gray-500',
        }
        return color_map.get(self.scenario_type, 'bg-gray-500')


class ScenarioComparison(models.Model):
    """Saved scenario comparison analyses"""

    COMPARISON_TYPES = [
        ('side_by_side', 'Side by Side'),
        ('variance_from_base', 'Variance from Base'),
        ('probability_weighted', 'Probability Weighted'),
    ]

    comparison_id = models.AutoField(primary_key=True)
    project = models.ForeignKey(
        'projects.Project',
        on_delete=models.CASCADE,
        related_name='scenario_comparisons',
        db_column='project_id'
    )
    comparison_name = models.CharField(max_length=100)

    # Store scenario IDs as array
    scenario_ids = ArrayField(
        models.IntegerField(),
        size=5,  # Max 5 scenarios in comparison
    )

    comparison_type = models.CharField(
        max_length=20,
        choices=COMPARISON_TYPES,
        default='side_by_side'
    )

    # Probability weighting for Monte Carlo style
    scenario_probabilities = ArrayField(
        models.DecimalField(max_digits=5, decimal_places=2),
        blank=True,
        null=True
    )

    # Store calculated comparison results
    comparison_results = models.JSONField(blank=True, null=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'tbl_scenario_comparison'
        ordering = ['project', '-created_at']

    def __str__(self):
        return f"{self.project.project_name} - {self.comparison_name}"
