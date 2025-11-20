/**
 * Property Taxonomy API Tests
 *
 * Test cases for the property taxonomy endpoint.
 * Run with: npm test -- route.test.ts
 */

import { describe, it, expect } from '@jest/globals';
import { GET } from './route';
import { NextRequest } from 'next/server';

describe('Property Taxonomy API', () => {
  describe('GET /api/config/property-taxonomy', () => {
    it('should return full taxonomy structure without query params', async () => {
      const request = new NextRequest('http://localhost:3000/api/config/property-taxonomy');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty('analysis_types');
      expect(data).toHaveProperty('subtypes');
      expect(data).toHaveProperty('property_classes');
      expect(data.analysis_types).toContain('Land Development');
      expect(data.analysis_types).toContain('Income Property');
    });

    it('should return Land Development subtypes when filtered', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/config/property-taxonomy?analysis_type=Land Development'
      );
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.analysis_type).toBe('Land Development');
      expect(data.subtypes).toContain('Master Planned Community');
      expect(data.subtypes).toContain('Subdivision');
      expect(data.groups).toBeNull();
    });

    it('should return Income Property subtypes with groups when filtered', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/config/property-taxonomy?analysis_type=Income Property'
      );
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.analysis_type).toBe('Income Property');
      expect(data.subtypes).toContain('Garden Multifamily');
      expect(data.subtypes).toContain('Class A Office');
      expect(data.groups).toBeTruthy();
      expect(Array.isArray(data.groups)).toBe(true);
    });

    it('should return 400 for invalid analysis_type', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/config/property-taxonomy?analysis_type=Invalid'
      );
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toHaveProperty('error');
      expect(data).toHaveProperty('valid_values');
    });
  });
});
