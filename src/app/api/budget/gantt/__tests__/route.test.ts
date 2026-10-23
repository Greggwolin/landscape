import { NextRequest } from 'next/server';
import { GET } from '../route';
import { sql } from '@/lib/db';
import { requireAuth } from '@/lib/api/requireAuth';
import { getPhaseMeasurements } from '@/lib/budget/phaseMeasurements';

jest.mock('@/lib/db', () => ({ sql: jest.fn() }));
jest.mock('@/lib/api/requireAuth', () => ({ requireAuth: jest.fn() }));
jest.mock('@/lib/budget/phaseMeasurements', () => ({ getPhaseMeasurements: jest.fn() }));

it('projects all saved category levels and retains measurements and amounts', async () => {
  (requireAuth as jest.Mock).mockResolvedValue({ userId: 1 });
  (getPhaseMeasurements as jest.Mock).mockResolvedValue(new Map([[11, { total_units: 80, total_acres: 20, total_front_feet: 4000 }]]));
  (sql as unknown as jest.Mock).mockImplementation((strings: TemplateStringsArray) => {
    const query = strings.join('?');
    for (let level = 1; level <= 4; level++) {
      expect(query).toContain(`fb.category_l${level}_id`);
      expect(query).toContain(`category_l${level}_name`);
    }
    return [{ fact_id: 42, division_id: 11, amount: 12345, activity: 'Development', category_l1_id: 8 }];
  });
  const response = await GET({ url: 'http://localhost/api/budget/gantt?projectId=9' } as NextRequest);
  expect(response.status).toBe(200);
  expect(await response.json()).toMatchObject({ items: [{ category_l1_id: 8, activity: 'Development', amount: 12345, phase_units: 80 }], hasFrontFeet: true });
});
