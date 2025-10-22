"""
Custom PostgreSQL database backend that sets search_path after connection.

This is needed for Neon pooled connections which don't support search_path in startup options.
"""

from django.db.backends.postgresql import base


class DatabaseWrapper(base.DatabaseWrapper):
    """
    Custom PostgreSQL wrapper that sets search_path to landscape schema.
    """

    def get_new_connection(self, conn_params):
        """
        Override to set search_path after connection is established.
        """
        connection = super().get_new_connection(conn_params)

        # Set search_path to landscape schema immediately after connection
        # Use autocommit mode to avoid transaction issues
        old_isolation_level = connection.isolation_level
        connection.set_session(autocommit=True)

        with connection.cursor() as cursor:
            cursor.execute("SET search_path TO landscape, public")

        # Restore original isolation level
        connection.set_session(isolation_level=old_isolation_level)

        return connection
