from django.apps import AppConfig


class ArtifactsConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.artifacts'
    label = 'artifacts'
    verbose_name = 'Generative Artifacts'
