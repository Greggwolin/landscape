"""
Calculation period models for time-based financial scheduling.

Maps to landscape.tbl_calculation_period.
"""

from django.db import models


class CalculationPeriod(models.Model):
    """Minimal calculation period model (managed externally via SQL)."""

    period_id = models.BigAutoField(primary_key=True)
    project = models.ForeignKey(
        'projects.Project',
        on_delete=models.CASCADE,
        db_column='project_id',
        related_name='calculation_periods'
    )
    period_start_date = models.DateField()
    period_end_date = models.DateField()
    period_number = models.IntegerField(db_column='period_sequence')

    class Meta:
        managed = False
        db_table = 'tbl_calculation_period'

    def __str__(self):
        return f"Period {self.period_number}: {self.period_start_date} - {self.period_end_date}"
