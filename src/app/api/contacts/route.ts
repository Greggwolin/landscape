import { NextRequest, NextResponse } from 'next/server';
import { sql } from '../../../lib/db';

interface Contact {
  contact_id?: number;
  company_name?: string;
  contact_person: string;
  email?: string;
  phone?: string;
  title?: string;
  type?: string;
}

interface ContactMatchRequest {
  contacts: Array<{
    name: string;
    title?: string;
    company?: string;
    email?: string;
    phone?: string;
    type: string;
  }>;
  project_id?: number;
}

// GET endpoint to search/match contacts
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');
    const name = searchParams.get('name');
    const company = searchParams.get('company');

    if (!email && !name && !company) {
      return NextResponse.json({
        error: 'At least one search parameter (email, name, or company) is required'
      }, { status: 400 });
    }

    // Build search query
    let whereConditions = [];
    let params: any[] = [];
    let paramIndex = 1;

    if (email) {
      whereConditions.push(`email ILIKE $${paramIndex}`);
      params.push(`%${email}%`);
      paramIndex++;
    }

    if (name) {
      whereConditions.push(`contact_person ILIKE $${paramIndex}`);
      params.push(`%${name}%`);
      paramIndex++;
    }

    if (company) {
      whereConditions.push(`company_name ILIKE $${paramIndex}`);
      params.push(`%${company}%`);
      paramIndex++;
    }

    const query = `
      SELECT
        contact_id,
        company_name,
        contact_person,
        email,
        phone,
        created_at
      FROM landscape.tbl_contacts
      WHERE ${whereConditions.join(' OR ')}
      ORDER BY
        CASE
          WHEN email = $1 THEN 1
          WHEN contact_person ILIKE $2 THEN 2
          ELSE 3
        END,
        created_at DESC
      LIMIT 10
    `;

    const contacts = await sql.unsafe(query, params);

    return NextResponse.json({
      contacts: contacts.map(contact => ({
        contact_id: contact.contact_id,
        company_name: contact.company_name,
        contact_person: contact.contact_person,
        email: contact.email,
        phone: contact.phone,
        created_at: contact.created_at
      }))
    });

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Contact search error:', error);

    return NextResponse.json({
      error: 'Failed to search contacts',
      details: message
    }, { status: 500 });
  }
}

// POST endpoint to add or match contacts
export async function POST(request: NextRequest) {
  try {
    const body: ContactMatchRequest = await request.json();
    const { contacts, project_id } = body;

    if (!contacts || !Array.isArray(contacts)) {
      return NextResponse.json({
        error: 'Contacts array is required'
      }, { status: 400 });
    }

    const results = {
      matched: [] as Array<Contact & { matched_contact_id: number }>,
      new: [] as Contact[],
      errors: [] as string[]
    };

    for (const contact of contacts) {
      try {
        // First, try to find existing contact by email
        let existingContact = null;
        if (contact.email) {
          const emailMatches = await sql`
            SELECT contact_id, company_name, contact_person, email, phone
            FROM landscape.tbl_contacts
            WHERE email ILIKE ${contact.email}
            LIMIT 1
          `;
          existingContact = emailMatches[0] || null;
        }

        // If no email match, try name + company match
        if (!existingContact && contact.name && contact.company) {
          const nameMatches = await sql`
            SELECT contact_id, company_name, contact_person, email, phone
            FROM landscape.tbl_contacts
            WHERE contact_person ILIKE ${contact.name}
            AND company_name ILIKE ${contact.company}
            LIMIT 1
          `;
          existingContact = nameMatches[0] || null;
        }

        if (existingContact) {
          // Contact already exists
          results.matched.push({
            contact_id: existingContact.contact_id,
            company_name: existingContact.company_name,
            contact_person: existingContact.contact_person,
            email: existingContact.email,
            phone: existingContact.phone,
            matched_contact_id: existingContact.contact_id,
            title: contact.title,
            type: contact.type
          });
        } else {
          // Create new contact
          const newContactResult = await sql`
            INSERT INTO landscape.tbl_contacts
            (company_name, contact_person, email, phone)
            VALUES (
              ${contact.company || null},
              ${contact.name},
              ${contact.email || null},
              ${contact.phone || null}
            )
            RETURNING contact_id, company_name, contact_person, email, phone
          `;

          const newContact = newContactResult[0];
          results.new.push({
            contact_id: newContact.contact_id,
            company_name: newContact.company_name,
            contact_person: newContact.contact_person,
            email: newContact.email,
            phone: newContact.phone,
            title: contact.title,
            type: contact.type
          });
        }

      } catch (contactError) {
        const errorMsg = contactError instanceof Error ? contactError.message : String(contactError);
        results.errors.push(`Failed to process contact ${contact.name}: ${errorMsg}`);
        console.error('Contact processing error:', contactError);
      }
    }

    return NextResponse.json({
      success: true,
      results,
      summary: {
        total_processed: contacts.length,
        matched_existing: results.matched.length,
        created_new: results.new.length,
        errors: results.errors.length
      }
    });

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Contact processing error:', error);

    return NextResponse.json({
      error: 'Failed to process contacts',
      details: message
    }, { status: 500 });
  }
}