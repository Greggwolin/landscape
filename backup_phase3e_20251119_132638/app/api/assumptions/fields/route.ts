import { NextRequest, NextResponse } from 'next/server';
import { allBaskets, getFieldsForTier, getGroupsForTier } from '@/config/assumptions';

// GET /api/assumptions/fields?basket=1&tier=mid
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const basketId = parseInt(searchParams.get('basket') || '1');
    const tier = searchParams.get('tier') as 'napkin' | 'mid' | 'pro' || 'napkin';

    const basket = allBaskets.find(b => b.basketId === basketId);

    if (!basket) {
      return NextResponse.json(
        { error: 'Basket not found' },
        { status: 404 }
      );
    }

    const visibleFields = getFieldsForTier(basketId, tier);
    const visibleGroups = getGroupsForTier(basketId, tier);

    return NextResponse.json({
      basket: {
        id: basket.basketId,
        name: basket.basketName,
        description: basket.basketDescription,
        icon: basket.icon,
        tableName: basket.tableName
      },
      tier,
      groups: visibleGroups,
      fields: visibleFields,
      fieldCount: {
        napkin: getFieldsForTier(basketId, 'napkin').length,
        mid: getFieldsForTier(basketId, 'mid').length,
        pro: getFieldsForTier(basketId, 'pro').length
      }
    });
  } catch (error) {
    console.error('Error fetching field definitions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch field definitions' },
      { status: 500 }
    );
  }
}
