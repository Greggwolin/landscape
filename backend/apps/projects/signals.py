"""
Project signals for knowledge graph synchronization and demo provisioning.

- Ensures knowledge_entities has a canonical project entity whenever
  a Project is created or updated.
- Provisions demo projects for new alpha testers on first login.
"""

import logging

from django.contrib.auth.signals import user_logged_in
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


@receiver(user_logged_in, dispatch_uid="projects.provision_demo_projects")
def provision_demo_projects_on_login(sender, request, user, **kwargs) -> None:
    """
    Clone demo projects for new alpha testers on first login.

    Triggered by Django's user_logged_in signal. Checks if:
    1. User has role='alpha_tester'
    2. User has demo_projects_provisioned=False

    If both conditions are met, clones the configured demo projects
    and marks the user as provisioned.
    """
    # Only provision for alpha testers who haven't been provisioned yet
    if getattr(user, 'role', None) != 'alpha_tester':
        return

    if getattr(user, 'demo_projects_provisioned', True):
        return

    logger.info(f"Provisioning demo projects for new alpha tester: {user.username}")

    try:
        from .services.project_cloner import ProjectCloner

        cloner = ProjectCloner()
        success = cloner.provision_demo_projects(user)

        if success:
            logger.info(f"Successfully provisioned demo projects for {user.username}")
        else:
            logger.warning(f"Demo project provisioning returned False for {user.username}")

    except Exception as exc:
        logger.error(
            f"Failed to provision demo projects for {user.username}: {exc}",
            exc_info=True
        )
