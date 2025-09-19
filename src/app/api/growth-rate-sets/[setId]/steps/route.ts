// API: Growth Rate Steps - GET/PUT steps for a specific growth rate set
import { NextResponse } from 'next/server'
import { sql } from '../../../../../lib/db'

interface RouteParams {
  params: {
    setId: string
  }
}

export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { setId } = await params

    if (!setId) {
      return NextResponse.json({ error: 'Missing setId' }, { status: 400 })
    }

    const rows = await sql`
      SELECT step_id, set_id, step_number, from_period, periods, rate, thru_period,
             created_at
      FROM landscape.core_fin_growth_rate_steps
      WHERE set_id = ${setId}::integer
      ORDER BY step_number ASC
    `

    return NextResponse.json(rows)
  } catch (error) {
    console.error('Error fetching growth rate steps:', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: 'Failed to fetch growth rate steps', details: message }, { status: 500 })
  }
}

export async function PUT(request: Request, { params }: RouteParams) {
  try {
    const { setId } = await params
    const body = await request.json()
    const { steps } = body

    if (!setId || !Array.isArray(steps)) {
      return NextResponse.json({ error: 'Missing setId or invalid steps array' }, { status: 400 })
    }

    // Begin transaction
    await sql`BEGIN`

    try {
      // Delete existing steps for this set
      await sql`
        DELETE FROM landscape.core_fin_growth_rate_steps
        WHERE set_id = ${setId}::integer
      `

      // Insert new steps
      for (const step of steps) {
        const { step_number, from_period, periods, rate } = step

        if (step_number == null || from_period == null || rate == null) {
          throw new Error(`Invalid step data: step_number=${step_number}, from_period=${from_period}, rate=${rate}`)
        }

        // Calculate thru_period
        const thru_period = periods ? from_period + periods - 1 : null

        await sql`
          INSERT INTO landscape.core_fin_growth_rate_steps
          (set_id, step_number, from_period, periods, rate, thru_period)
          VALUES (${setId}::integer, ${step_number}, ${from_period}, ${periods}, ${rate}, ${thru_period})
        `
      }

      // Commit transaction
      await sql`COMMIT`

      // Return updated steps
      const updatedSteps = await sql`
        SELECT step_id, set_id, step_number, from_period, periods, rate, thru_period,
               created_at
        FROM landscape.core_fin_growth_rate_steps
        WHERE set_id = ${setId}::integer
        ORDER BY step_number ASC
      `

      return NextResponse.json({ message: 'Steps updated successfully', steps: updatedSteps })
    } catch (error) {
      // Rollback transaction on error
      await sql`ROLLBACK`
      throw error
    }
  } catch (error) {
    console.error('Error updating growth rate steps:', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: 'Failed to update growth rate steps', details: message }, { status: 500 })
  }
}