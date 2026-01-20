"""
Project signals for knowledge graph synchronization.

Ensures knowledge_entities has a canonical project entity whenever
a Project is created or updated.
"""

import logging

from django.db.models.signals import post_save
from django.dispatch import receiver

from .models import Project

logger = logging.getLogger(__name__)


@receiver(post_save, sender=Project, dispatch_uid="projects.ensure_project_entity")
def ensure_project_entity(sender, instance: Project, **kwargs) -> None:
    """Keep knowledge_entities in sync with Project records."""
    try:
        from apps.knowledge.services.entity_sync_service import EntitySyncService

        EntitySyncService().ensure_project_entity(instance)
    except Exception as exc:
        logger.warning("Project entity sync failed (non-fatal): %s", exc)
