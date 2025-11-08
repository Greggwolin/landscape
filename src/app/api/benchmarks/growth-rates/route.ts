/**
 * Benchmarks Growth Rates API - List/Create Route
 * GET: List all growth rate sets (with benchmark integration)
 * POST: Create new growth rate set
 */

import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import type { GrowthRateSetsResponse, CreateGrowthRateSet, GrowthRateSet } from '@/types/benchmarks';

// GET /api/benchmarks/growth-rates
export async function GET(request: NextRequest) {
  console.log('GET /api/benchmarks/growth-rates - Starting');
  try {
    const { searchParams } = new URL(request.url);
    const geography = searchParams.get('geography');
    console.log('GET /api/benchmarks/growth-rates - Geography filter:', geography);

    // Build WHERE clause
    const whereParts: string[] = [];
    const params: string[] = [];
    if (geography) {
      params.push(geography);
      whereParts.push(`(s.market_geography = $${params.length} OR s.market_geography IS NULL)`);
    }
    // legacy table does not have is_active column; keep list simple

    const whereClause = whereParts.length > 0 ? `WHERE ${whereParts.join(' AND ')}` : '';
    console.log('GET /api/benchmarks/growth-rates - WHERE clause:', whereClause);

    // Use tagged template syntax instead of sql.query()
    // Filter for global benchmarks only (is_global = true)
    const sets = await sql`
      SELECT
        s.set_id,
        s.project_id,
        s.card_type,
        s.set_name,
        s.is_default,
        s.is_global,
        s.market_geography,
        s.benchmark_id,
        s.created_at,
        s.updated_at,
        COUNT(st.step_id) AS step_count,
        -- Determine rate type
        CASE
          WHEN s.set_name = 'CPI Baseline' THEN 'auto_updated'
          WHEN COUNT(st.step_id) > 1 THEN 'stepped'
          ELSE 'flat'
        END AS rate_type,
        -- For flat rates, get the single rate value
        CASE
          WHEN COUNT(st.step_id) = 1 THEN MAX(st.rate)
          ELSE NULL
        END AS current_rate,
        -- Calculate usage count (stub for now)
        0 AS usage_count
      FROM landscape.core_fin_growth_rate_sets s
      LEFT JOIN landscape.core_fin_growth_rate_steps st ON s.set_id = st.set_id
      WHERE s.is_global = true
      GROUP BY s.set_id, s.project_id, s.card_type, s.set_name, s.is_default,
               s.is_global, s.market_geography, s.benchmark_id, s.created_at, s.updated_at
      ORDER BY
        CASE WHEN s.set_name = 'CPI Baseline' THEN 0
             ELSE 1
        END,
        s.created_at DESC
    `;

    console.log('GET /api/benchmarks/growth-rates - Query result:', {
      rowCount: sets?.length ?? 0,
      sets: sets.map(s => ({
        set_id: s.set_id,
        set_name: s.set_name,
        rate_type: s.rate_type,
        current_rate: s.current_rate,
        step_count: s.step_count
      }))
    });

    type RawSetRow = GrowthRateSet & {
      step_count: number;
      current_rate: number | null;
    };
    console.log('GET /api/benchmarks/growth-rates - Parsed sets count:', sets.length);

    // Fetch steps for each set
    const typedSets = sets as unknown as GrowthRateSet[];
    console.log('GET /api/benchmarks/growth-rates - Fetching steps for', typedSets.length, 'sets');
    for (const set of typedSets) {
      const steps = await sql`
        SELECT
          step_id,
          set_id,
          step_number,
          from_period,
          periods,
          rate,
          thru_period,
          created_at
        FROM landscape.core_fin_growth_rate_steps
        WHERE set_id = ${set.set_id}
        ORDER BY step_number ASC
      `;
      console.log(`GET /api/benchmarks/growth-rates - Steps for set ${set.set_id}:`, steps);
      set.steps = steps;

      // Ensure current_rate is a number, not a string
      if (set.current_rate !== null && set.current_rate !== undefined) {
        set.current_rate = typeof set.current_rate === 'string' ? parseFloat(set.current_rate) : set.current_rate;
      }

      // Mark system sets
      set.is_system = set.set_name === 'CPI Baseline' || set.set_name === 'Project Global';
    }

    const response: GrowthRateSetsResponse = {
      sets: typedSets
    };

    console.log('GET /api/benchmarks/growth-rates - Returning response:', {
      setCount: response.sets.length,
      sets: response.sets
    });

    return NextResponse.json(response);

  } catch (error) {
    console.error('Error fetching growth rate sets:', error);
    const details = error instanceof Error ? error.message : 'Failed to fetch growth rate sets';
    return NextResponse.json(
      { error: 'Failed to fetch growth rate sets', details },
      { status: 500 }
    );
  }
}

// POST /api/benchmarks/growth-rates
export async function POST(request: NextRequest) {
  console.log('POST /api/benchmarks/growth-rates - Starting');
  try {
    const body: CreateGrowthRateSet = await request.json();
    console.log('POST /api/benchmarks/growth-rates - Body received:', body);

    const anchorResult = await sql`
      SELECT 0 AS project_id, 'custom' AS card_type
    `;

    const projectId = anchorResult[0]?.project_id ?? 0;
    const cardType = anchorResult[0]?.card_type ?? 'custom';
    console.log('POST /api/benchmarks/growth-rates - Using project_id:', projectId, 'card_type:', cardType);

    // Validate required fields
    if (!body.name || !body.steps || body.steps.length === 0) {
      console.log('POST /api/benchmarks/growth-rates - Validation failed: missing name or steps');
      return NextResponse.json(
        { error: 'name and steps are required' },
        { status: 400 }
      );
    }

    // Validate steps are contiguous
    for (let i = 1; i < body.steps.length; i++) {
      const prevThru = body.steps[i - 1].thru_period;
      const currFrom = body.steps[i].from_period;
      if (prevThru === 'E') {
        return NextResponse.json(
          { error: `Cannot have steps after step ${i} which ends at "E"` },
          { status: 400 }
        );
      }
      if (currFrom !== prevThru + 1) {
        return NextResponse.json(
          { error: `Steps must be contiguous. Gap between step ${i} and ${i + 1}` },
          { status: 400 }
        );
      }
    }

    // Enforce uniqueness on (project_id, card_type, set_name)
    console.log('POST /api/benchmarks/growth-rates - Checking for duplicates');
    const duplicateCheck = await sql`
      SELECT set_id
      FROM landscape.core_fin_growth_rate_sets
      WHERE project_id = ${projectId}
        AND card_type = ${cardType}
        AND set_name = ${body.name}
      LIMIT 1
    `;

    if (duplicateCheck.length > 0) {
      console.log('POST /api/benchmarks/growth-rates - Duplicate found:', duplicateCheck[0]);
      return NextResponse.json(
        { error: 'A growth rate set with this name already exists.' },
        { status: 409 }
      );
    }

    console.log('POST /api/benchmarks/growth-rates - No duplicate, starting transaction');
    await sql`BEGIN`;

    try {
      // Create growth rate set
      console.log('POST /api/benchmarks/growth-rates - Inserting growth rate set');
      const setResult = await sql`
        INSERT INTO landscape.core_fin_growth_rate_sets (
          project_id,
          card_type,
          set_name,
          is_global,
          market_geography,
          created_at,
          updated_at
        ) VALUES (
          ${projectId},
          ${cardType},
          ${body.name},
          true,
          ${body.geography || null},
          NOW(),
          NOW()
        )
        RETURNING set_id
      `;

      const setId = setResult[0].set_id;
      console.log('POST /api/benchmarks/growth-rates - Growth rate set created with set_id:', setId);

      // Insert steps
      console.log('POST /api/benchmarks/growth-rates - Inserting steps:', body.steps);
      for (let i = 0; i < body.steps.length; i++) {
        const step = body.steps[i];
        const rawRate = typeof step.rate === 'number' ? step.rate : Number(step.rate);
        const normalizedRate = Number.isFinite(rawRate) ? rawRate / 100 : 0;

        console.log(`POST /api/benchmarks/growth-rates - Inserting step ${i + 1}:`, {
          from_period: step.from_period,
          periods: step.periods,
          rate: normalizedRate,
          thru_period: step.thru_period
        });

        await sql`
          INSERT INTO landscape.core_fin_growth_rate_steps (
            set_id,
            step_number,
            from_period,
            periods,
            rate,
            thru_period,
            created_at
          ) VALUES (
            ${setId},
            ${i + 1},
            ${step.from_period},
            ${step.periods === 'E' ? null : step.periods},
            ${normalizedRate},
            ${step.thru_period === 'E' ? null : step.thru_period},
            NOW()
          )
        `;
      }
      console.log('POST /api/benchmarks/growth-rates - All steps inserted');

      // Create benchmark registry entry
      console.log('POST /api/benchmarks/growth-rates - Creating benchmark registry entry');
      const benchmarkResult = await sql`
        INSERT INTO landscape.tbl_global_benchmark_registry (
          user_id,
          category,
          benchmark_name,
          description,
          market_geography,
          source_type,
          confidence_level,
          is_global,
          created_by
        ) VALUES (
          '1',
          'growth_rate',
          ${body.name},
          ${body.description || null},
          ${body.geography || null},
          'user_input',
          'high',
          true,
          '1'
        )
        RETURNING benchmark_id
      `;

      const benchmarkId = benchmarkResult[0].benchmark_id;
      console.log('POST /api/benchmarks/growth-rates - Benchmark registry entry created with benchmark_id:', benchmarkId);

      // Link set to benchmark
      console.log('POST /api/benchmarks/growth-rates - Linking set to benchmark');
      await sql`
        UPDATE landscape.core_fin_growth_rate_sets
        SET benchmark_id = ${benchmarkId}
        WHERE set_id = ${setId}
      `;

      console.log('POST /api/benchmarks/growth-rates - Committing transaction');
      await sql`COMMIT`;

      const response = {
        set_id: setId,
        benchmark_id: benchmarkId,
        message: 'Growth rate set created successfully'
      };
      console.log('POST /api/benchmarks/growth-rates - Success! Returning:', response);

      return NextResponse.json(response, { status: 201 });

    } catch (error) {
      console.error('POST /api/benchmarks/growth-rates - Transaction error, rolling back:', error);
      await sql`ROLLBACK`;
      throw error;
    }

  } catch (error) {
    console.error('POST /api/benchmarks/growth-rates - Top-level error:', error);
    const details = error instanceof Error ? error.message : 'Failed to create growth rate set';
    return NextResponse.json(
      { error: 'Failed to create growth rate set', details },
      { status: 500 }
    );
  }
}
