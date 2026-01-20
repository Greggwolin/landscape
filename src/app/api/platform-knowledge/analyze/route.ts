import { NextRequest, NextResponse } from 'next/server';
import { UTApi } from 'uploadthing/server';

const utapi = new UTApi();

const DJANGO_API_URL =
  process.env.DJANGO_API_URL || process.env.NEXT_PUBLIC_DJANGO_API_URL || 'http://localhost:8000';

async function generateSha256(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const sha256 = await generateSha256(file);
    const uploadResponse = await utapi.uploadFiles(file);

    if (uploadResponse.error) {
      throw new Error(uploadResponse.error.message);
    }

    const storageUri = uploadResponse.data.url;

    const response = await fetch(`${DJANGO_API_URL}/api/knowledge/platform/analyze/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        storage_uri: storageUri,
        doc_name: file.name,
        mime_type: file.type,
        file_size_bytes: file.size,
        file_hash: sha256
      })
    });

    const data = await response.json();
    if (!response.ok) {
      return NextResponse.json({ error: data.error || 'Analysis failed' }, { status: response.status });
    }

    return NextResponse.json({
      success: true,
      storage_uri: storageUri,
      file_hash: sha256,
      mime_type: file.type,
      file_size_bytes: file.size,
      analysis: data.analysis,
      suggestions: data.suggestions,
      estimated_chunks: data.estimated_chunks
    });
  } catch (error) {
    console.error('Platform knowledge analyze error:', error);
    return NextResponse.json({ error: 'Failed to analyze document' }, { status: 500 });
  }
}
