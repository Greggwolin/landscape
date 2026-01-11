from django.apps import AppConfig
from django.db.models.signals import post_migrate

from .signals import export_schema_after_migrate


class LandscaperConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.landscaper'
    verbose_name = 'Landscaper AI'

    def ready(self):
        post_migrate.connect(
            export_schema_after_migrate,
            sender=self,
            dispatch_uid="landscaper_export_schema_after_migrate",
        )
