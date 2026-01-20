"""
Contact Tools for Landscaper AI

Provides AI tools for managing contacts using the new cabinet-based contact architecture.
These tools interact with tbl_contact, tbl_contact_role, and tbl_project_contact tables.
"""

import logging
from typing import Dict, List, Any, Optional
from django.db import connection

logger = logging.getLogger(__name__)


# =============================================================================
# Contact Tool Definitions (for LANDSCAPER_TOOLS)
# =============================================================================

CONTACT_TOOLS = [
    {
        "name": "search_cabinet_contacts",
        "description": """Search for existing contacts in the cabinet.
Use this to find contacts before adding them to a project or to check for duplicates.

Searches by name, company name, or email across all contacts in the cabinet.
Returns contact_id, name, contact_type, company_name, email, phone.

Example: "Search for contacts named John at CBRE"
""",
        "input_schema": {
            "type": "object",
            "properties": {
                "query": {
                    "type": "string",
                    "description": "Search query - matches name, company, or email"
                },
                "contact_type": {
                    "type": "string",
                    "enum": ["Person", "Company", "Entity", "Fund", "Government", "Other"],
                    "description": "Filter by contact type"
                },
                "limit": {
                    "type": "integer",
                    "description": "Max results to return (default 10)"
                }
            },
            "required": ["query"]
        }
    },
    {
        "name": "get_project_contacts_v2",
        "description": """Get all contacts assigned to this project with their roles.
Returns contacts grouped by role category (Client, Transaction Party, Internal Team, Vendor, Other).

Each contact includes:
- contact_id, contact_name, contact_type, company_name
- email, phone
- role_label, role_category
- is_primary, is_billing_contact

Use this to see who is involved in the project before adding or modifying contacts.
""",
        "input_schema": {
            "type": "object",
            "properties": {},
            "required": []
        }
    },
    {
        "name": "get_contact_roles",
        "description": """Get available contact roles that can be assigned to project contacts.
Returns role_id, role_code, role_label, role_category for all active roles.

Role categories:
- Client: client, investor, asset_manager
- Transaction Party: seller, buyer, listing_broker, buyer_broker, lender, title_company
- Internal Team: project_manager, analyst, underwriter
- Vendor: property_manager, appraiser, inspector, surveyor, attorney, accountant
- Other: consultant, other

Use this to find the correct role_id when assigning contacts to projects.
""",
        "input_schema": {
            "type": "object",
            "properties": {
                "category": {
                    "type": "string",
                    "enum": ["Client", "Transaction Party", "Internal Team", "Vendor", "Other"],
                    "description": "Filter by role category"
                }
            },
            "required": []
        }
    },
    {
        "name": "create_cabinet_contact",
        "description": """Create a new contact in the cabinet.
Use this when you need to add a contact that doesn't exist yet.
The contact will be available for all projects in the cabinet.

Required fields:
- name: Full name (person) or organization name (company/entity)
- contact_type: Person, Company, Entity, Fund, Government, or Other

Recommended fields:
- display_name: How the contact should be displayed (optional, defaults to name)
- company_name: Company/firm name (for Person contacts)
- job_title: Job title (for Person contacts)
- email: Primary email address
- phone: Primary phone number

Optional address fields:
- address_line1, address_line2, city, state, postal_code, country

Returns the created contact_id.

Example: "Create a contact for John Smith at CBRE as a listing broker"
""",
        "input_schema": {
            "type": "object",
            "properties": {
                "name": {
                    "type": "string",
                    "description": "Full name or organization name"
                },
                "contact_type": {
                    "type": "string",
                    "enum": ["Person", "Company", "Entity", "Fund", "Government", "Other"],
                    "description": "Type of contact"
                },
                "display_name": {
                    "type": "string",
                    "description": "Display name (defaults to name)"
                },
                "company_name": {
                    "type": "string",
                    "description": "Company or firm name"
                },
                "job_title": {
                    "type": "string",
                    "description": "Job title or position"
                },
                "email": {
                    "type": "string",
                    "description": "Primary email address"
                },
                "phone": {
                    "type": "string",
                    "description": "Primary phone number"
                },
                "mobile_phone": {
                    "type": "string",
                    "description": "Mobile phone number"
                },
                "address_line1": {
                    "type": "string",
                    "description": "Street address"
                },
                "city": {
                    "type": "string",
                    "description": "City"
                },
                "state": {
                    "type": "string",
                    "description": "State"
                },
                "postal_code": {
                    "type": "string",
                    "description": "Postal/ZIP code"
                },
                "notes": {
                    "type": "string",
                    "description": "Notes about this contact"
                }
            },
            "required": ["name", "contact_type"]
        }
    },
    {
        "name": "assign_contact_to_project",
        "description": """Assign an existing contact to this project with a specific role.
Use this after finding or creating a contact to link them to the project.

Required:
- contact_id: ID of the contact (get from search_cabinet_contacts or create_cabinet_contact)
- role_id: ID of the role (get from get_contact_roles)

Optional:
- is_primary: Set to true if this is the primary contact for this role
- is_billing_contact: Set to true if this is the billing contact
- notes: Notes specific to this contact's involvement in this project

Example: "Assign contact 42 to this project as the listing broker (role_id 5)"
""",
        "input_schema": {
            "type": "object",
            "properties": {
                "contact_id": {
                    "type": "integer",
                    "description": "Contact ID to assign"
                },
                "role_id": {
                    "type": "integer",
                    "description": "Role ID for this assignment"
                },
                "is_primary": {
                    "type": "boolean",
                    "description": "Whether this is the primary contact for this role"
                },
                "is_billing_contact": {
                    "type": "boolean",
                    "description": "Whether this is the billing contact"
                },
                "notes": {
                    "type": "string",
                    "description": "Notes about this contact's role on this project"
                }
            },
            "required": ["contact_id", "role_id"]
        }
    },
    {
        "name": "remove_contact_from_project",
        "description": """Remove a contact from this project.
This removes the contact's role assignment, not the contact itself.
The contact remains in the cabinet for use on other projects.

Requires project_contact_id from get_project_contacts_v2.
""",
        "input_schema": {
            "type": "object",
            "properties": {
                "project_contact_id": {
                    "type": "integer",
                    "description": "The project-contact assignment ID to remove"
                }
            },
            "required": ["project_contact_id"]
        }
    },
    {
        "name": "extract_and_save_contacts",
        "description": """Extract contacts from document content and save them to the cabinet and project.
Use this as a convenience method to create contacts and assign them to the project in one step.

For each contact, provide:
- name: Full name (required)
- contact_type: Person, Company, etc. (defaults to "Person")
- role_code: Role code like "listing_broker", "buyer", "lender" (required)
- Plus optional fields: company_name, job_title, email, phone, etc.

The tool will:
1. Check if a similar contact exists (by name and email)
2. Create new contacts if needed
3. Assign contacts to this project with the specified role

Example: "Extract the broker contacts from the OM and add them to this project"
""",
        "input_schema": {
            "type": "object",
            "properties": {
                "contacts": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "name": {"type": "string", "description": "Full name"},
                            "contact_type": {
                                "type": "string",
                                "enum": ["Person", "Company", "Entity", "Fund", "Government", "Other"],
                                "description": "Type (default: Person)"
                            },
                            "role_code": {
                                "type": "string",
                                "description": "Role code: listing_broker, buyer_broker, seller, buyer, lender, title_company, escrow, attorney, property_manager, appraiser, etc."
                            },
                            "company_name": {"type": "string"},
                            "job_title": {"type": "string"},
                            "email": {"type": "string"},
                            "phone": {"type": "string"},
                            "license_number": {"type": "string"},
                            "is_primary": {"type": "boolean"},
                            "notes": {"type": "string"}
                        },
                        "required": ["name", "role_code"]
                    },
                    "description": "List of contacts to extract and save"
                },
                "source_document": {
                    "type": "string",
                    "description": "Document name where contacts were extracted from"
                }
            },
            "required": ["contacts"]
        }
    }
]


# =============================================================================
# Tool Handler Functions
# =============================================================================

def handle_search_cabinet_contacts(
    tool_input: Dict[str, Any],
    project_id: int,
    **kwargs
) -> Dict[str, Any]:
    """Search for contacts in the cabinet."""
    query = tool_input.get('query', '')
    contact_type = tool_input.get('contact_type')
    limit = tool_input.get('limit', 10)

    if not query or len(query) < 2:
        return {'success': False, 'error': 'Query must be at least 2 characters'}

    try:
        with connection.cursor() as cursor:
            # Get cabinet_id from project
            cursor.execute("""
                SELECT cabinet_id FROM landscape.tbl_project WHERE project_id = %s
            """, [project_id])
            row = cursor.fetchone()
            cabinet_id = row[0] if row else None

            # Search contacts
            sql = """
                SELECT
                    contact_id,
                    name,
                    display_name,
                    contact_type,
                    company_name,
                    email,
                    phone
                FROM landscape.tbl_contact
                WHERE is_active = true
            """
            params = []

            if cabinet_id:
                sql += " AND cabinet_id = %s"
                params.append(cabinet_id)

            # Search in name, display_name, company_name, email
            sql += """
                AND (
                    name ILIKE %s
                    OR display_name ILIKE %s
                    OR company_name ILIKE %s
                    OR email ILIKE %s
                )
            """
            search_pattern = f'%{query}%'
            params.extend([search_pattern, search_pattern, search_pattern, search_pattern])

            if contact_type:
                sql += " AND contact_type = %s"
                params.append(contact_type)

            sql += " ORDER BY name LIMIT %s"
            params.append(limit)

            cursor.execute(sql, params)
            columns = [col[0] for col in cursor.description]
            contacts = [dict(zip(columns, row)) for row in cursor.fetchall()]

        return {
            'success': True,
            'count': len(contacts),
            'contacts': contacts
        }
    except Exception as e:
        logger.error(f"Error searching contacts: {e}")
        return {'success': False, 'error': str(e)}


def handle_get_project_contacts_v2(
    tool_input: Dict[str, Any],
    project_id: int,
    **kwargs
) -> Dict[str, Any]:
    """Get contacts assigned to this project."""
    try:
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT
                    pc.project_contact_id,
                    c.contact_id,
                    c.name AS contact_name,
                    c.display_name,
                    c.contact_type,
                    c.company_name,
                    c.email,
                    c.phone,
                    r.role_id,
                    r.role_code,
                    r.role_label,
                    r.role_category,
                    pc.is_primary,
                    pc.is_billing_contact,
                    pc.notes
                FROM landscape.tbl_project_contact pc
                JOIN landscape.tbl_contact c ON c.contact_id = pc.contact_id
                JOIN landscape.tbl_contact_role r ON r.role_id = pc.role_id
                WHERE pc.project_id = %s
                ORDER BY r.role_category, r.display_order, c.name
            """, [project_id])
            columns = [col[0] for col in cursor.description]
            contacts = [dict(zip(columns, row)) for row in cursor.fetchall()]

        # Group by category
        by_category = {}
        for contact in contacts:
            cat = contact['role_category']
            if cat not in by_category:
                by_category[cat] = []
            by_category[cat].append(contact)

        return {
            'success': True,
            'count': len(contacts),
            'by_category': by_category,
            'contacts': contacts
        }
    except Exception as e:
        logger.error(f"Error getting project contacts: {e}")
        return {'success': False, 'error': str(e)}


def handle_get_contact_roles(
    tool_input: Dict[str, Any],
    project_id: int,
    **kwargs
) -> Dict[str, Any]:
    """Get available contact roles."""
    category = tool_input.get('category')

    try:
        with connection.cursor() as cursor:
            sql = """
                SELECT
                    role_id,
                    role_code,
                    role_label,
                    role_category,
                    description
                FROM landscape.tbl_contact_role
                WHERE is_active = true
            """
            params = []

            if category:
                sql += " AND role_category = %s"
                params.append(category)

            sql += " ORDER BY role_category, display_order"

            cursor.execute(sql, params)
            columns = [col[0] for col in cursor.description]
            roles = [dict(zip(columns, row)) for row in cursor.fetchall()]

        return {
            'success': True,
            'count': len(roles),
            'roles': roles
        }
    except Exception as e:
        logger.error(f"Error getting contact roles: {e}")
        return {'success': False, 'error': str(e)}


def handle_create_cabinet_contact(
    tool_input: Dict[str, Any],
    project_id: int,
    **kwargs
) -> Dict[str, Any]:
    """Create a new contact in the cabinet."""
    name = tool_input.get('name', '').strip()
    contact_type = tool_input.get('contact_type', 'Person')

    if not name:
        return {'success': False, 'error': 'Name is required'}

    try:
        with connection.cursor() as cursor:
            # Get cabinet_id from project
            cursor.execute("""
                SELECT cabinet_id FROM landscape.tbl_project WHERE project_id = %s
            """, [project_id])
            row = cursor.fetchone()
            cabinet_id = row[0] if row else None

            # Check for duplicate
            cursor.execute("""
                SELECT contact_id FROM landscape.tbl_contact
                WHERE cabinet_id = %s AND name ILIKE %s AND is_active = true
                LIMIT 1
            """, [cabinet_id, name])
            existing = cursor.fetchone()
            if existing:
                return {
                    'success': True,
                    'contact_id': existing[0],
                    'message': f'Contact "{name}" already exists',
                    'already_exists': True
                }

            # Create contact
            cursor.execute("""
                INSERT INTO landscape.tbl_contact (
                    cabinet_id, name, display_name, contact_type,
                    company_name, job_title, email, phone, mobile_phone,
                    address_line1, city, state, postal_code, notes
                ) VALUES (
                    %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s
                )
                RETURNING contact_id
            """, [
                cabinet_id,
                name,
                tool_input.get('display_name') or name,
                contact_type,
                tool_input.get('company_name'),
                tool_input.get('job_title'),
                tool_input.get('email'),
                tool_input.get('phone'),
                tool_input.get('mobile_phone'),
                tool_input.get('address_line1'),
                tool_input.get('city'),
                tool_input.get('state'),
                tool_input.get('postal_code'),
                tool_input.get('notes')
            ])
            contact_id = cursor.fetchone()[0]

        return {
            'success': True,
            'contact_id': contact_id,
            'message': f'Created contact "{name}" (ID: {contact_id})'
        }
    except Exception as e:
        logger.error(f"Error creating contact: {e}")
        return {'success': False, 'error': str(e)}


def handle_assign_contact_to_project(
    tool_input: Dict[str, Any],
    project_id: int,
    **kwargs
) -> Dict[str, Any]:
    """Assign a contact to this project with a role."""
    contact_id = tool_input.get('contact_id')
    role_id = tool_input.get('role_id')

    if not contact_id or not role_id:
        return {'success': False, 'error': 'contact_id and role_id are required'}

    try:
        with connection.cursor() as cursor:
            # Check if already assigned with same role
            cursor.execute("""
                SELECT project_contact_id FROM landscape.tbl_project_contact
                WHERE project_id = %s AND contact_id = %s AND role_id = %s
            """, [project_id, contact_id, role_id])
            existing = cursor.fetchone()
            if existing:
                return {
                    'success': True,
                    'project_contact_id': existing[0],
                    'message': 'Contact already assigned with this role',
                    'already_exists': True
                }

            # Create assignment
            cursor.execute("""
                INSERT INTO landscape.tbl_project_contact (
                    project_id, contact_id, role_id,
                    is_primary, is_billing_contact, notes
                ) VALUES (%s, %s, %s, %s, %s, %s)
                RETURNING project_contact_id
            """, [
                project_id,
                contact_id,
                role_id,
                tool_input.get('is_primary', False),
                tool_input.get('is_billing_contact', False),
                tool_input.get('notes')
            ])
            project_contact_id = cursor.fetchone()[0]

            # Get contact and role names for message
            cursor.execute("""
                SELECT c.name, r.role_label
                FROM landscape.tbl_contact c, landscape.tbl_contact_role r
                WHERE c.contact_id = %s AND r.role_id = %s
            """, [contact_id, role_id])
            names = cursor.fetchone()
            contact_name = names[0] if names else 'Unknown'
            role_label = names[1] if names else 'Unknown'

        return {
            'success': True,
            'project_contact_id': project_contact_id,
            'message': f'Assigned "{contact_name}" as {role_label}'
        }
    except Exception as e:
        logger.error(f"Error assigning contact: {e}")
        return {'success': False, 'error': str(e)}


def handle_remove_contact_from_project(
    tool_input: Dict[str, Any],
    project_id: int,
    **kwargs
) -> Dict[str, Any]:
    """Remove a contact from this project."""
    project_contact_id = tool_input.get('project_contact_id')

    if not project_contact_id:
        return {'success': False, 'error': 'project_contact_id is required'}

    try:
        with connection.cursor() as cursor:
            # Verify it belongs to this project and get info
            cursor.execute("""
                SELECT c.name, r.role_label
                FROM landscape.tbl_project_contact pc
                JOIN landscape.tbl_contact c ON c.contact_id = pc.contact_id
                JOIN landscape.tbl_contact_role r ON r.role_id = pc.role_id
                WHERE pc.project_contact_id = %s AND pc.project_id = %s
            """, [project_contact_id, project_id])
            row = cursor.fetchone()
            if not row:
                return {'success': False, 'error': 'Project contact not found'}

            contact_name, role_label = row

            # Delete assignment
            cursor.execute("""
                DELETE FROM landscape.tbl_project_contact
                WHERE project_contact_id = %s AND project_id = %s
            """, [project_contact_id, project_id])

        return {
            'success': True,
            'message': f'Removed "{contact_name}" ({role_label}) from project'
        }
    except Exception as e:
        logger.error(f"Error removing contact: {e}")
        return {'success': False, 'error': str(e)}


def handle_extract_and_save_contacts(
    tool_input: Dict[str, Any],
    project_id: int,
    **kwargs
) -> Dict[str, Any]:
    """Extract contacts and save them to cabinet and project."""
    contacts = tool_input.get('contacts', [])
    source_document = tool_input.get('source_document')

    if not contacts:
        return {'success': False, 'error': 'contacts list is required'}

    results = []
    created_count = 0
    assigned_count = 0
    error_count = 0

    try:
        with connection.cursor() as cursor:
            # Get cabinet_id from project
            cursor.execute("""
                SELECT cabinet_id FROM landscape.tbl_project WHERE project_id = %s
            """, [project_id])
            row = cursor.fetchone()
            cabinet_id = row[0] if row else None

            # Get role mapping
            cursor.execute("""
                SELECT role_code, role_id FROM landscape.tbl_contact_role WHERE is_active = true
            """)
            role_map = {row[0]: row[1] for row in cursor.fetchall()}

            for contact in contacts:
                contact_name = contact.get('name', '').strip()
                role_code = contact.get('role_code', '').strip()

                if not contact_name:
                    results.append({'success': False, 'error': 'Missing name'})
                    error_count += 1
                    continue

                if not role_code or role_code not in role_map:
                    results.append({
                        'success': False,
                        'contact_name': contact_name,
                        'error': f'Invalid role_code: {role_code}'
                    })
                    error_count += 1
                    continue

                role_id = role_map[role_code]

                try:
                    # Check for existing contact (by name and email or just name)
                    email = contact.get('email')
                    if email:
                        cursor.execute("""
                            SELECT contact_id FROM landscape.tbl_contact
                            WHERE cabinet_id = %s AND (email = %s OR name ILIKE %s)
                            AND is_active = true
                            LIMIT 1
                        """, [cabinet_id, email, contact_name])
                    else:
                        cursor.execute("""
                            SELECT contact_id FROM landscape.tbl_contact
                            WHERE cabinet_id = %s AND name ILIKE %s AND is_active = true
                            LIMIT 1
                        """, [cabinet_id, contact_name])

                    existing = cursor.fetchone()

                    if existing:
                        contact_id = existing[0]
                    else:
                        # Create contact
                        cursor.execute("""
                            INSERT INTO landscape.tbl_contact (
                                cabinet_id, name, display_name, contact_type,
                                company_name, job_title, email, phone, notes
                            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                            RETURNING contact_id
                        """, [
                            cabinet_id,
                            contact_name,
                            contact_name,
                            contact.get('contact_type', 'Person'),
                            contact.get('company_name'),
                            contact.get('job_title'),
                            email,
                            contact.get('phone'),
                            contact.get('notes')
                        ])
                        contact_id = cursor.fetchone()[0]
                        created_count += 1

                    # Check if already assigned with this role
                    cursor.execute("""
                        SELECT project_contact_id FROM landscape.tbl_project_contact
                        WHERE project_id = %s AND contact_id = %s AND role_id = %s
                    """, [project_id, contact_id, role_id])
                    already_assigned = cursor.fetchone()

                    if not already_assigned:
                        # Assign to project
                        cursor.execute("""
                            INSERT INTO landscape.tbl_project_contact (
                                project_id, contact_id, role_id, is_primary, notes
                            ) VALUES (%s, %s, %s, %s, %s)
                            RETURNING project_contact_id
                        """, [
                            project_id,
                            contact_id,
                            role_id,
                            contact.get('is_primary', False),
                            f"Extracted from {source_document}" if source_document else None
                        ])
                        assigned_count += 1

                    results.append({
                        'success': True,
                        'contact_name': contact_name,
                        'contact_id': contact_id,
                        'role': role_code
                    })

                except Exception as e:
                    logger.error(f"Error processing contact {contact_name}: {e}")
                    results.append({
                        'success': False,
                        'contact_name': contact_name,
                        'error': str(e)
                    })
                    error_count += 1

        return {
            'success': error_count == 0,
            'created': created_count,
            'assigned': assigned_count,
            'errors': error_count,
            'results': results,
            'summary': f"Created {created_count} contacts, assigned {assigned_count} to project"
        }

    except Exception as e:
        logger.error(f"Error in extract_and_save_contacts: {e}")
        return {'success': False, 'error': str(e)}


# =============================================================================
# Tool Registry
# =============================================================================

CONTACT_TOOL_HANDLERS = {
    'search_cabinet_contacts': handle_search_cabinet_contacts,
    'get_project_contacts_v2': handle_get_project_contacts_v2,
    'get_contact_roles': handle_get_contact_roles,
    'create_cabinet_contact': handle_create_cabinet_contact,
    'assign_contact_to_project': handle_assign_contact_to_project,
    'remove_contact_from_project': handle_remove_contact_from_project,
    'extract_and_save_contacts': handle_extract_and_save_contacts,
}
