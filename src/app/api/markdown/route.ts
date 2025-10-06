import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { join } from 'path';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const filePath = searchParams.get('path');

    if (!filePath) {
      return NextResponse.json(
        { success: false, error: 'No file path provided' },
        { status: 400 }
      );
    }

    // Remove leading slash if present
    const cleanPath = filePath.startsWith('/') ? filePath.slice(1) : filePath;

    // Get the project root directory
    const projectRoot = process.cwd();
    const fullPath = join(projectRoot, cleanPath);

    // Security check: ensure the path is within the project directory
    if (!fullPath.startsWith(projectRoot)) {
      return NextResponse.json(
        { success: false, error: 'Invalid file path' },
        { status: 403 }
      );
    }

    // Read the file
    const content = await readFile(fullPath, 'utf-8');

    return NextResponse.json({
      success: true,
      content,
      path: cleanPath
    });

  } catch (error) {
    console.error('Error reading markdown file:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to read file'
      },
      { status: 500 }
    );
  }
}
