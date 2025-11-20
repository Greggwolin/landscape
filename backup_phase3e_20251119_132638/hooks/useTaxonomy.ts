// hooks/useTaxonomy.ts
// Custom hooks for the new land use taxonomy system

import { useState, useEffect } from 'react';
import {
  FamilyChoice,
  TypeChoice,
  ProductChoice,
  DensityClassification,
  TaxonomySelection
} from '../types/landuse';

// Hook for loading land use families
export const useLandUseFamilies = () => {
  const [families, setFamilies] = useState<FamilyChoice[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadFamilies = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/landuse/choices?type=families');
      if (!response.ok) {
        throw new Error(`Failed to load families: ${response.statusText}`);
      }
      const data = await response.json();
      setFamilies(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFamilies();
  }, []);

  return { families, loading, error, reload: loadFamilies };
};

// Hook for loading density classifications
export const useDensityClassifications = (activeOnly: boolean = true) => {
  const [densityClassifications, setDensityClassifications] = useState<DensityClassification[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadDensityClassifications = async () => {
    setLoading(true);
    setError(null);
    try {
      const url = activeOnly
        ? '/api/density-classifications?active=true'
        : '/api/density-classifications';
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to load density classifications: ${response.statusText}`);
      }
      const data = await response.json();
      setDensityClassifications(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDensityClassifications();
  }, [activeOnly]);

  return { densityClassifications, loading, error, reload: loadDensityClassifications };
};

// Hook for loading land use types by family
export const useLandUseTypes = (familyId?: string | number) => {
  const [types, setTypes] = useState<TypeChoice[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadTypes = async (fId?: string | number) => {
    if (!fId) {
      setTypes([]);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/landuse/choices?type=types&family_id=${fId}`);
      if (!response.ok) {
        throw new Error(`Failed to load types: ${response.statusText}`);
      }
      const data = await response.json();
      setTypes(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTypes(familyId);
  }, [familyId]);

  return { types, loading, error, reload: () => loadTypes(familyId) };
};

// Hook for loading product types by type_id
export const useProductTypes = (typeId?: string | number) => {
  const [products, setProducts] = useState<ProductChoice[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadProducts = async (tId?: string | number) => {
    if (!tId) {
      setProducts([]);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/landuse/choices?type=products&type_id=${tId}`);
      if (!response.ok) {
        throw new Error(`Failed to load products: ${response.statusText}`);
      }
      const data = await response.json();
      setProducts(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProducts(typeId);
  }, [typeId]);

  return { products, loading, error, reload: () => loadProducts(typeId) };
};

// Hook for taxonomy mapping and validation
export const useTaxonomyMapping = () => {
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  const validateTaxonomy = (taxonomy: TaxonomySelection): boolean => {
    const errors: string[] = [];

    // Business rule validation
    if (taxonomy.type_code && !taxonomy.family_name) {
      errors.push('Family must be selected when type is specified');
    }

    if (taxonomy.product_code && !taxonomy.type_code) {
      errors.push('Type must be selected when product is specified');
    }

    setValidationErrors(errors);
    return errors.length === 0;
  };

  const generateTaxonomyCode = (taxonomy: TaxonomySelection): string => {
    const parts: string[] = [];

    if (taxonomy.family_name) {
      // Use first 3 characters of family name as prefix
      parts.push(taxonomy.family_name.substring(0, 3).toUpperCase());
    }

    if (taxonomy.density_code) {
      parts.push(taxonomy.density_code);
    }

    if (taxonomy.type_code) {
      parts.push(taxonomy.type_code);
    }

    if (taxonomy.product_code) {
      parts.push(taxonomy.product_code);
    }

    return parts.join('-') || 'UNCLASSIFIED';
  };

  const mapLegacyToTaxonomy = (legacyCode: string): Partial<TaxonomySelection> => {
    // Map legacy land use codes to new taxonomy structure
    const mappings: Record<string, Partial<TaxonomySelection>> = {
      'LDR': { family_name: 'Residential', density_code: 'LDR' },
      'MDR': { family_name: 'Residential', density_code: 'MDR' },
      'HDR': { family_name: 'Residential', density_code: 'HDR' },
      'MHDR': { family_name: 'Residential', density_code: 'VHDR' },
      'C': { family_name: 'Commercial' },
      'MU': { family_name: 'Mixed Use' },
      'OS': { family_name: 'Open Space' }
    };

    return mappings[legacyCode] || {};
  };

  return {
    validateTaxonomy,
    generateTaxonomyCode,
    mapLegacyToTaxonomy,
    validationErrors
  };
};

// Combined hook for full taxonomy selector functionality
export const useTaxonomySelector = (initialValue?: TaxonomySelection) => {
  const [selection, setSelection] = useState<TaxonomySelection>(initialValue || {});
  const { families, loading: loadingFamilies } = useLandUseFamilies();
  const { densityClassifications, loading: loadingDensity } = useDensityClassifications();
  const { validateTaxonomy, generateTaxonomyCode, validationErrors } = useTaxonomyMapping();

  // Get family_id from family_name
  const selectedFamily = families.find(f => f.family_name === selection.family_name);
  const { types, loading: loadingTypes } = useLandUseTypes(selectedFamily?.family_id);

  // Get type_id from type_code
  const selectedType = types.find(t => t.type_code === selection.type_code);
  const { products, loading: loadingProducts } = useProductTypes(selectedType?.type_id);

  const updateSelection = (newSelection: TaxonomySelection) => {
    setSelection(newSelection);
  };

  const clearSelection = () => {
    setSelection({});
  };

  const isValid = validateTaxonomy(selection);
  const taxonomyCode = generateTaxonomyCode(selection);
  const isLoading = loadingFamilies || loadingDensity || loadingTypes || loadingProducts;

  return {
    selection,
    updateSelection,
    clearSelection,
    families,
    densityClassifications,
    types,
    products,
    isValid,
    validationErrors,
    taxonomyCode,
    isLoading
  };
};