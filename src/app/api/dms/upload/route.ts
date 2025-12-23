/**
 * POST /api/dms/upload
 * Simple file upload endpoint for the onboarding modal
 * Uploads files to UploadThing and returns storage_uri
 */

import { NextRequest, NextResponse } from 'next/server';
import { UTApi } from 'uploadthing/server';

const utapi = new UTApi();

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate file type
    const allowedTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ];

    if (!allowedTypes.includes(file.type) && !file.type.startsWith('image/')) {
      return NextResponse.json(
        { error: `Unsupported file type: ${file.type}` },
        { status: 400 }
      );
    }

    // Upload to UploadThing
    const response = await utapi.uploadFiles(file);

    if (response.error) {
      console.error('UploadThing error:', response.error);
      throw new Error(response.error.message);
    }

    console.log(`✅ Uploaded file: ${file.name} → ${response.data.url}`);

    return NextResponse.json({
      success: true,
      storage_uri: response.data.url,
      file_name: file.name,
      file_size: file.size,
      mime_type: file.type,
    });
  } catch (error) {
    console.error('❌ Upload error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Upload failed' },
      { status: 500 }
    );
  }
}
