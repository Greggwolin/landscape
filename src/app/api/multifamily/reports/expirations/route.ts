import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

/**
 * Convert BIGINT fields to numbers to prevent Neon string serialization issues
 */
function convertBigIntFields(row: any) {
  return {
    ...row,
    lease_id: Number(row.lease_id),
    unit_id: Number(row.unit_id),
    project_id: Number(row.project_id),
    days_until_expiration: Number(row.days_until_expiration),
  };
}

/**
 * GET /api/multifamily/reports/expirations
 * Query vw_multifamily_lease_expirations filtered by project_id (required)
 * Optional months param (default 12) to control how far ahead to look
 * Groups results by expiration_year_month
 */
export async function GET(request: NextRequest) {
  const client = await pool.connect();

  try {
    const searchParams = request.nextUrl.searchParams;
    const projectId = searchParams.get('project_id');
    const months = parseInt(searchParams.get('months') || '12', 10);

    if (!projectId) {
      return NextResponse.json(
        { success: false, error: 'project_id is required' },
        { status: 400 }
      );
    }

    if (months < 1 || months > 24) {
      return NextResponse.json(
        { success: false, error: 'months parameter must be between 1 and 24' },
        { status: 400 }
      );
    }

    // Query the view with dynamic date range
    const query = `
      SELECT
        lease_id,
        unit_id,
        unit_number,
        building_name,
        unit_type,
        project_id,
        project_name,
        resident_name,
        lease_start_date,
        lease_end_date,
        lease_term_months,
        base_rent_monthly,
        effective_rent_monthly,
        lease_status,
        notice_date,
        notice_to_vacate_days,
        is_renewal,
        days_until_expiration,
        expiration_priority,
        market_rent,
        potential_rent_increase,
        renewal_status,
        TO_CHAR(lease_end_date, 'YYYY-MM') as expiration_year_month
      FROM landscape.vw_multifamily_lease_expirations
      WHERE project_id = $1
      AND lease_end_date <= CURRENT_DATE + ($2 || ' months')::INTERVAL
      ORDER BY lease_end_date ASC
    `;

    const result = await client.query(query, [projectId, months]);
    const expirations = result.rows.map(convertBigIntFields);

    // Group by expiration_year_month
    const grouped: Record<string, any[]> = {};
    expirations.forEach((exp) => {
      const yearMonth = exp.expiration_year_month;
      if (!grouped[yearMonth]) {
        grouped[yearMonth] = [];
      }
      grouped[yearMonth].push(exp);
    });

    // Calculate summary statistics
    const summary = {
      total_expirations: expirations.length,
      by_priority: {
        IMMEDIATE: expirations.filter((e) => e.expiration_priority === 'IMMEDIATE').length,
        URGENT: expirations.filter((e) => e.expiration_priority === 'URGENT').length,
        SOON: expirations.filter((e) => e.expiration_priority === 'SOON').length,
        FUTURE: expirations.filter((e) => e.expiration_priority === 'FUTURE').length,
      },
      by_renewal_status: {
        NOTICE_RECEIVED: expirations.filter((e) => e.renewal_status === 'NOTICE_RECEIVED').length,
        RENEWAL_WINDOW: expirations.filter((e) => e.renewal_status === 'RENEWAL_WINDOW').length,
        MONITORING: expirations.filter((e) => e.renewal_status === 'MONITORING').length,
      },
      total_potential_rent_increase: expirations.reduce(
        (sum, exp) => sum + Number(exp.potential_rent_increase || 0),
        0
      ),
      avg_potential_rent_increase:
        expirations.length > 0
          ? Number(
              (
                expirations.reduce((sum, exp) => sum + Number(exp.potential_rent_increase || 0), 0) /
                expirations.length
              ).toFixed(2)
            )
          : 0,
      renewal_leases: expirations.filter((e) => e.is_renewal).length,
      new_leases: expirations.filter((e) => !e.is_renewal).length,
    };

    // Add monthly summaries to grouped data
    const groupedWithSummaries: Record<string, any> = {};
    Object.keys(grouped).forEach((yearMonth) => {
      const monthLeases = grouped[yearMonth];
      groupedWithSummaries[yearMonth] = {
        count: monthLeases.length,
        total_base_rent: monthLeases.reduce((sum, l) => sum + Number(l.base_rent_monthly || 0), 0),
        total_effective_rent: monthLeases.reduce(
          (sum, l) => sum + Number(l.effective_rent_monthly || l.base_rent_monthly || 0),
          0
        ),
        total_potential_increase: monthLeases.reduce(
          (sum, l) => sum + Number(l.potential_rent_increase || 0),
          0
        ),
        notice_received_count: monthLeases.filter((l) => l.renewal_status === 'NOTICE_RECEIVED')
          .length,
        leases: monthLeases,
      };
    });

    if (expirations.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          expirations: [],
          grouped: {},
        },
        summary: {
          ...summary,
          message: `No lease expirations found for the next ${months} months`,
        },
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        expirations,
        grouped: groupedWithSummaries,
      },
      summary,
    });
  } catch (error) {
    console.error('Error fetching lease expirations report:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch lease expirations report' },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}
