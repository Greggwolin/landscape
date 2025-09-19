// hooks/useLandUseChoices.ts
// React hook for standardized land use dropdown data

import { useState, useEffect } from 'react';
import {
  FamilyChoice,
  SubtypeChoice,
  ProductChoice,
  LandUseCodeChoice,
  LandUseChoicesParams
} from '../types/landuse';

interface UseLandUseChoicesReturn {
  families: FamilyChoice[];
  subtypes: SubtypeChoice[];
  products: ProductChoice[];
  codes: LandUseCodeChoice[];
  loading: boolean;
  error: string | null;

  // Methods
  loadFamilies: () => Promise<FamilyChoice[]>;
  loadSubtypes: (familyId: number) => Promise<SubtypeChoice[]>;
  loadProducts: () => Promise<ProductChoice[]>;
  loadCodes: (subtypeId?: number) => Promise<LandUseCodeChoice[]>;

  // Convenience methods
  getFamilyName: (familyId: number) => string | undefined;
  getSubtypeName: (subtypeId: number) => string | undefined;
  getProductName: (productId: number) => string | undefined;
}

export function useLandUseChoices(): UseLandUseChoicesReturn {
  const [families, setFamilies] = useState<FamilyChoice[]>([]);
  const [subtypes, setSubtypes] = useState<SubtypeChoice[]>([]);
  const [products, setProducts] = useState<ProductChoice[]>([]);
  const [codes, setCodes] = useState<LandUseCodeChoice[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchChoices = async (params: LandUseChoicesParams) => {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        searchParams.append(key, value.toString());
      }
    });

    const response = await fetch(`/api/landuse/choices?${searchParams}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch land use choices: ${response.statusText}`);
    }
    return response.json();
  };

  const loadFamilies = async (): Promise<FamilyChoice[]> => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchChoices({ type: 'families' });
      setFamilies(data);
      return data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      console.error('Error loading families:', err);
      return [];
    } finally {
      setLoading(false);
    }
  };

  const loadSubtypes = async (familyId: number): Promise<SubtypeChoice[]> => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchChoices({ type: 'subtypes', family_id: familyId.toString() });
      setSubtypes(data);
      return data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      console.error('Error loading subtypes:', err);
      return [];
    } finally {
      setLoading(false);
    }
  };

  const loadProducts = async (subtypeId?: number): Promise<ProductChoice[]> => {
    try {
      setLoading(true);
      setError(null);
      const params: LandUseChoicesParams = { type: 'products' };
      if (subtypeId) {
        params.subtype_id = subtypeId.toString();
      }
      const data = await fetchChoices(params);
      setProducts(data);
      return data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      console.error('Error loading products:', err);
      return [];
    } finally {
      setLoading(false);
    }
  };

  const loadCodes = async (subtypeId?: number): Promise<LandUseCodeChoice[]> => {
    try {
      setLoading(true);
      setError(null);
      const params: LandUseChoicesParams = { type: 'codes' };
      if (subtypeId) {
        params.subtype_id = subtypeId.toString();
      }
      const data = await fetchChoices(params);
      setCodes(data);
      return data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      console.error('Error loading codes:', err);
      return [];
    } finally {
      setLoading(false);
    }
  };

  // Convenience lookup methods
  const getFamilyName = (familyId: number): string | undefined => {
    return families.find(f => f.family_id === familyId)?.family_name;
  };

  const getSubtypeName = (subtypeId: number): string | undefined => {
    return subtypes.find(s => s.subtype_id === subtypeId)?.subtype_name;
  };

  const getProductName = (productId: number): string | undefined => {
    return products.find(p => p.product_id === productId)?.product_name;
  };

  // Auto-load families on mount (products loaded on-demand by subtype)
  useEffect(() => {
    loadFamilies();
  }, []);

  return {
    families,
    subtypes,
    products,
    codes,
    loading,
    error,
    loadFamilies,
    loadSubtypes,
    loadProducts,
    loadCodes,
    getFamilyName,
    getSubtypeName,
    getProductName
  };
}