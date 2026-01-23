from django.apps import AppConfig


class DocumentsConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.documents"

    def ready(self):
        try:
            # deferred heavy/native imports go here
            pass
        except ImportError as e:
            print("DOCUMENTS APP IMPORT SKIPPED:", repr(e))
