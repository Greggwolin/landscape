from django.apps import AppConfig


class ProjectsConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.projects'
    verbose_name = 'Projects'

    def ready(self) -> None:
        # Ensure project entity sync hooks are registered.
        from . import signals  # noqa: F401
