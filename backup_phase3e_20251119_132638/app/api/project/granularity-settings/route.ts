import { NextRequest, NextResponse } from 'next/server';
import { sql } from '../../../../lib/db';

interface GranularitySettings {
  level1Enabled: boolean;
  level1Label: string;
  level2Enabled: boolean;
  level2Label: string;
  level3Enabled: boolean;
  level3Label: string;
  autoNumber: boolean;
}

// GET - Load current granularity settings for a project
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('project_id');

    if (!projectId) {
      return NextResponse.json(
        { error: 'project_id is required' },
        { status: 400 }
      );
    }

    const result = await sql`
      SELECT
        level1_label,
        level2_label,
        level3_label
      FROM landscape.tbl_project_config
      WHERE project_id = ${projectId}
    `;

    if (result.length === 0) {
      // Return defaults if no config exists
      return NextResponse.json({
        level1Enabled: true,
        level1Label: 'Area',
        level2Enabled: true,
        level2Label: 'Phase',
        level3Enabled: true,
        level3Label: 'Parcel',
        autoNumber: false
      });
    }

    const config = result[0];
    return NextResponse.json({
      level1Enabled: true,  // Always enabled for now
      level1Label: config.level1_label ?? 'Area',
      level2Enabled: true,  // Always enabled for now
      level2Label: config.level2_label ?? 'Phase',
      level3Enabled: true,  // Always enabled
      level3Label: config.level3_label ?? 'Parcel',
      autoNumber: false  // Default to false for now
    });
  } catch (error) {
    console.error('Error loading granularity settings:', error);
    return NextResponse.json(
      { error: 'Failed to load settings' },
      { status: 500 }
    );
  }
}

// PUT - Save granularity settings for a project
export async function PUT(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('project_id');

    if (!projectId) {
      return NextResponse.json(
        { error: 'project_id is required' },
        { status: 400 }
      );
    }

    const settings: GranularitySettings = await request.json();

    // Update existing config (only labels for now)
    await sql`
      UPDATE landscape.tbl_project_config
      SET
        level1_label = ${settings.level1Label},
        level2_label = ${settings.level2Label},
        level3_label = ${settings.level3Label},
        updated_at = NOW()
      WHERE project_id = ${projectId}
    `;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error saving granularity settings:', error);
    return NextResponse.json(
      { error: 'Failed to save settings' },
      { status: 500 }
    );
  }
}
