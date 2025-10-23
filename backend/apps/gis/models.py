"""Django models for GIS application."""

from django.db import models
from apps.projects.models import Project


class GISMetadata(models.Model):
    """
    GIS metadata stored in project JSONB field.
    This is a proxy model for accessing tbl_project.gis_metadata
    """
    
    class Meta:
        managed = False
        # This is a virtual model - actual data stored in tbl_project.gis_metadata
        abstract = True
