import { NextRequest } from 'next/server';
import { GET } from '@/app/api/projects/[projectId]/sf-comps/route';
import { fetchRedfinComps } from '@/lib/redfinClient';

jest.mock('@/lib/redfinClient');

const mockedRedfin = fetchRedfinComps as jest.MockedFunction<typeof fetchRedfinComps>;

describe('GET /api/projects/[projectId]/sf-comps', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    global.fetch = jest.fn() as jest.MockedFunction<typeof fetch>;
    mockedRedfin.mockReset();
  });

  afterEach(() => {
    (global.fetch as jest.MockedFunction<typeof fetch>).mockReset?.();
    global.fetch = originalFetch;
  });

  it('returns normalized comps and stats for happy path', async () => {
    const projectId = 7;

    (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue(
      new Response(
        JSON.stringify({
          project_id: projectId,
          location_lat: 33.5,
          location_lon: -112.1
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    );

    mockedRedfin.mockResolvedValue([
      {
        mlsId: 'mls-1',
        address: '123 Main St',
        city: 'Phoenix',
        state: 'AZ',
        zip: '85001',
        latitude: 33.51,
        longitude: -112.05,
        yearBuilt: 2020,
        beds: 4,
        baths: 3,
        sqft: 2000,
        lotSize: 6500,
        price: 400000,
        pricePerSqft: 200,
        soldDate: '2024-05-10T00:00:00.000Z',
        distanceMiles: 1.2,
        url: 'https://redfin.com/1'
      },
      {
        mlsId: 'mls-2',
        address: '456 Pine St',
        city: 'Phoenix',
        state: 'AZ',
        zip: '85002',
        latitude: 33.52,
        longitude: -112.07,
        yearBuilt: 2021,
        beds: 3,
        baths: 2,
        sqft: 2500,
        lotSize: 7000,
        price: 500000,
        pricePerSqft: 200,
        soldDate: '2024-04-15T00:00:00.000Z',
        distanceMiles: 1.5,
        url: 'https://redfin.com/2'
      },
      {
        mlsId: 'mls-3',
        address: '789 Oak St',
        city: 'Phoenix',
        state: 'AZ',
        zip: '85003',
        latitude: 33.53,
        longitude: -112.08,
        yearBuilt: 2022,
        beds: 3,
        baths: 2,
        sqft: 1500,
        lotSize: 6000,
        price: 300000,
        pricePerSqft: 200,
        soldDate: '2024-03-20T00:00:00.000Z',
        distanceMiles: 2.0,
        url: 'https://redfin.com/3'
      },
      {
        mlsId: 'mls-4',
        address: '101 Pine St',
        city: 'Phoenix',
        state: 'AZ',
        zip: '85005',
        latitude: 33.55,
        longitude: -112.02,
        yearBuilt: null,
        beds: 3,
        baths: 2,
        sqft: 1800,
        lotSize: 6200,
        price: 450000,
        pricePerSqft: 250,
        soldDate: '2024-02-01T00:00:00.000Z',
        distanceMiles: 2.5,
        url: 'https://redfin.com/4'
      }
    ]);

    const request = new NextRequest(`http://localhost/api/projects/${projectId}/sf-comps`);
    const response = await GET(request, { params: { projectId: String(projectId) } });
    const body = (await response.json()) as Record<string, unknown>;

    expect(response.status).toBe(200);
    expect(body.projectId).toBe(projectId);
    expect(body.searchRadiusMiles).toBe(3);
    expect(body.soldWithinDays).toBe(180);

    const comps = body.comps as Array<Record<string, unknown>>;
    expect(comps).toHaveLength(4);
    expect(comps.every((comp) => typeof comp.salePrice === 'number')).toBe(true);
    expect(comps.every((comp) => typeof comp.saleDate === 'string')).toBe(true);
    expect(comps.every((comp) => typeof comp.distanceMiles === 'number')).toBe(true);

    const stats = body.stats as Record<string, unknown>;
    expect(stats?.count).toBe(4);
    expect(stats?.medianPrice).toBe(425000);
    expect(stats?.p25Price).toBe(375000);
    expect(stats?.p75Price).toBe(462500);
    expect(stats?.medianPricePerSqft).toBe(200);
    expect(stats?.avgYearBuilt).toBe(2021); // Average of 2020, 2021, 2022 (null excluded)
    expect(stats?.priceRange).toEqual({ min: 300000, max: 500000 });
    expect(stats?.sqftRange).toEqual({ min: 1500, max: 2500 });
  });

  it('returns 400 when project location is missing', async () => {
    (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue(
      new Response(
        JSON.stringify({
          project_id: 8,
          location_lat: null,
          location_lon: null
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    );

    const request = new NextRequest('http://localhost/api/projects/8/sf-comps');
    const response = await GET(request, { params: { projectId: '8' } });
    const body = (await response.json()) as Record<string, unknown>;

    expect(response.status).toBe(400);
    expect(body.error).toMatch(/location/i);
    expect(mockedRedfin).not.toHaveBeenCalled();
  });

  it('returns empty comps gracefully when Redfin returns no data', async () => {
    (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue(
      new Response(
        JSON.stringify({
          project_id: 9,
          location_lat: 34,
          location_lon: -112
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    );

    mockedRedfin.mockResolvedValue([]);

    const request = new NextRequest('http://localhost/api/projects/9/sf-comps');
    const response = await GET(request, { params: { projectId: '9' } });
    const body = (await response.json()) as Record<string, unknown>;

    expect(response.status).toBe(200);
    expect((body.comps as unknown[]).length).toBe(0);
    expect((body.stats as Record<string, unknown>).count).toBe(0);
    expect((body.stats as Record<string, unknown>).medianPrice).toBeNull();
  });

  it('passes query parameters to Redfin client', async () => {
    (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue(
      new Response(
        JSON.stringify({
          project_id: 10,
          location_lat: 33.5,
          location_lon: -112.1
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    );

    mockedRedfin.mockResolvedValue([]);

    const request = new NextRequest(
      'http://localhost/api/projects/10/sf-comps?radius=5&days=90&minYear=2018&maxYear=2023'
    );
    const response = await GET(request, { params: { projectId: '10' } });
    const body = (await response.json()) as Record<string, unknown>;

    expect(response.status).toBe(200);
    expect(body.searchRadiusMiles).toBe(5);
    expect(body.soldWithinDays).toBe(90);
    expect(body.minYearBuilt).toBe(2018);
    expect(body.maxYearBuilt).toBe(2023);

    expect(mockedRedfin).toHaveBeenCalledWith({
      latitude: 33.5,
      longitude: -112.1,
      radiusMiles: 5,
      soldWithinDays: 90,
      minYearBuilt: 2018,
      maxYearBuilt: 2023,
      propertyType: 'house'
    });
  });

  it('returns 400 for invalid radius parameter', async () => {
    const request = new NextRequest('http://localhost/api/projects/11/sf-comps?radius=invalid');
    const response = await GET(request, { params: { projectId: '11' } });
    const body = (await response.json()) as Record<string, unknown>;

    expect(response.status).toBe(400);
    expect(body.error).toMatch(/radius/i);
  });

  it('returns 400 for invalid projectId', async () => {
    const request = new NextRequest('http://localhost/api/projects/abc/sf-comps');
    const response = await GET(request, { params: { projectId: 'abc' } });
    const body = (await response.json()) as Record<string, unknown>;

    expect(response.status).toBe(400);
    expect(body.error).toMatch(/projectId/i);
  });
});
