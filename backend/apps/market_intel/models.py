"""Django models for Market Intelligence application."""

from django.db import models


class AIIngestionHistory(models.Model):
    """AI document ingestion history. Maps to landscape.ai_ingestion_history"""
    
    ingestion_id = models.AutoField(primary_key=True)
    doc_id = models.BigIntegerField()
    ingestion_date = models.DateTimeField(auto_now_add=True)
    model_used = models.CharField(max_length=100)
    confidence_score = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    extracted_data = models.JSONField(default=dict)
    validation_status = models.CharField(max_length=50)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        managed = False
        db_table = 'ai_ingestion_history'
        ordering = ['-ingestion_date']
    
    def __str__(self):
        return f"Ingestion {self.ingestion_id} - Doc {self.doc_id}"


class MarketData(models.Model):
    """
    Generic market data model.
    This is a placeholder - actual market data tables may vary.
    """
    
    class Meta:
        managed = False
        abstract = True
