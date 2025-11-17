import { NextRequest } from 'next/server';
import { processCategoryUpdate } from '../update-handler';

export async function PUT(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const categoryId =
    searchParams.get('id') ?? searchParams.get('category_id') ?? null;

  return processCategoryUpdate(request, categoryId);
}

// Allow POST for clients that prefer it
export const POST = PUT;
