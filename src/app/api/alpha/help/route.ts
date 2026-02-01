import { NextRequest, NextResponse } from 'next/server';

const DJANGO_API_URL = process.env.NEXT_PUBLIC_DJANGO_API_URL || 'http://localhost:8000';

const PAGE_TITLES: Record<string, string> = {
  mf_home: 'Project Home',
  mf_property: 'Property',
  mf_operations: 'Operations',
  mf_valuation: 'Valuation',
  mf_capitalization: 'Capitalization',
  land_home: 'Project Home',
  land_planning: 'Planning',
  land_budget: 'Budget',
  land_schedule: 'Schedule',
  land_valuation: 'Valuation',
  land_capitalization: 'Capitalization',
  documents: 'Documents',
  map: 'Map',
  reports: 'Reports',
  alpha_assistant: 'Alpha Assistant',
};

export async function GET(request: NextRequest) {
  const pageContext = request.nextUrl.searchParams.get('page_context') || 'home';
  const pageTitle = PAGE_TITLES[pageContext] || 'Help';

  try {
    const response = await fetch(
      `${DJANGO_API_URL}/api/knowledge/platform/alpha-help/?page_context=${encodeURIComponent(
        pageContext
      )}`
    );

    if (!response.ok) {
      throw new Error('Backend help request failed');
    }

    const data = await response.json();

    return NextResponse.json({
      page_name: pageContext,
      page_title: pageTitle,
      ...data,
    });
  } catch (error) {
    console.error('Error fetching alpha help content:', error);
    return NextResponse.json({
      page_name: pageContext,
      page_title: pageTitle,
      what_you_can_do: ['Explore the interface', 'Ask Landscaper for guidance'],
      coming_soon: ['More help content will be added soon'],
      tips: ['Describe your question clearly and reference the current page'],
    });
  }
}
