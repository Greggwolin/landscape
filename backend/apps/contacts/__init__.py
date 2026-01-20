"""
Contacts app for managing cabinet-scoped contacts, relationships, and project associations.

This app provides:
- Cabinet: Security/tenancy boundary for all data
- Contact: People and entities that can be associated with multiple projects
- ContactRole: Configurable roles for project-contact associations
- ContactRelationship: Relationships between contacts (e.g., employee → company)
- ProjectContact: Junction table linking contacts to projects with roles
"""

default_app_config = 'apps.contacts.apps.ContactsConfig'
