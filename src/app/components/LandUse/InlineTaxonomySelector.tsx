'use client';

import React, { useState, useEffect } from 'react';

interface InlineTaxonomySelectorProps {
  value: {
    family_name?: string;
    density_code?: string;
    type_code?: string;
    product_code?: string;
  };
  onChange: (values: {
    family_name?: string;
    density_code?: string;
    type_code?: string;
    product_code?: string;
  }) => void;
  disabled?: boolean;
}

interface Family {
  family_id: number;
  family_name: string;
  family_code: string;
}

interface Type {
  type_id: number;
  type_name: string;
  type_code: string;
}

interface Product {
  product_id: number;
  product_name: string;
  code: string;
  lot_width?: number;
  lot_depth?: number;
}

const InlineTaxonomySelector: React.FC<InlineTaxonomySelectorProps> = ({
  value,
  onChange,
  disabled = false
}) => {
  const [families, setFamilies] = useState<Family[]>([]);
  const [types, setTypes] = useState<Type[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  // Load families on mount
  useEffect(() => {
    loadFamilies();
  }, []);

  // Load types when family changes
  useEffect(() => {
    if (value.family_name && value.family_name.trim() && families.length > 0) {
      loadTypes(value.family_name);
    } else if (!value.family_name || !value.family_name.trim()) {
      setTypes([]);
    }
  }, [value.family_name, families]);

  // Load types immediately when families are first loaded if we have a family_name
  useEffect(() => {
    if (families.length > 0 && value.family_name && value.family_name.trim() && types.length === 0) {
      loadTypes(value.family_name);
    }
  }, [families.length, value.family_name, types.length]);

  // Load products when type changes
  useEffect(() => {
    if (value.type_code && value.type_code.trim() && types.length > 0) {
      loadProducts(value.type_code);
    } else if (!value.type_code || !value.type_code.trim()) {
      setProducts([]);
    }
  }, [value.type_code, types]);

  // Load products immediately when types are first loaded if we have a type_code
  useEffect(() => {
    if (types.length > 0 && value.type_code && value.type_code.trim() && products.length === 0) {
      loadProducts(value.type_code);
    }
  }, [types.length, value.type_code, products.length]);

  const loadFamilies = async () => {
    try {
      const response = await fetch('/api/landuse/families?active=true');
      if (response.ok) {
        const data = await response.json();
        setFamilies(data);
      }
    } catch (error) {
      console.error('Failed to load families:', error);
    }
  };

  const loadTypes = async (familyName: string) => {
    try {
      const family = families.find(f => f.family_name === familyName);
      if (family) {
        const response = await fetch(`/api/landuse/types/${family.family_id}`);
        if (response.ok) {
          const data = await response.json();
          setTypes(data);
        }
      }
    } catch (error) {
      console.error('Failed to load types:', error);
    }
  };

  const loadProducts = async (typeCode: string) => {
    try {
      // For residential lot products, use the specific endpoint
      if (typeCode === 'SFD' || typeCode === 'SFA') {
        const response = await fetch('/api/landuse/res-lot-products');
        if (response.ok) {
          const data = await response.json();
          // Remove duplicates by product_code and ensure unique products
          const uniqueProducts = data.reduce((acc: Product[], product: any) => {
            const exists = acc.find(p => p.code === product.product_code);
            if (!exists) {
              acc.push({
                product_id: product.product_id,
                product_name: product.product_code, // Just use the code, no dimensions
                code: product.product_code,
                lot_width: product.lot_width,
                lot_depth: product.lot_depth,
              });
            }
            return acc;
          }, []);
          setProducts(uniqueProducts);
        }
      } else {
        // For other types, find the type_id and use the generic products endpoint
        let type = types.find(t => t.type_code === typeCode);
        if (!type && typeCode.length >= 3) {
          type = types.find(t => t.type_code.startsWith(typeCode));
        }
        if (type) {
          const response = await fetch(`/api/landuse/products/${type.type_id}`);
          if (response.ok) {
            const data = await response.json();
            setProducts(data);
          }
        }
      }
    } catch (error) {
      console.error('Failed to load products:', error);
    }
  };

  const handleFamilyChange = (familyName: string) => {
    onChange({
      family_name: familyName || undefined,
      density_code: undefined,
      type_code: undefined,
      product_code: undefined
    });
  };

  const handleTypeChange = (typeCode: string) => {
    onChange({
      ...value,
      type_code: typeCode || undefined,
      product_code: undefined
    });
  };

  const handleProductChange = (productCode: string) => {
    onChange({
      ...value,
      product_code: productCode || undefined
    });
  };

  return (
    <table className="w-full text-xs">
      <tbody>
        {/* Family Selector */}
        <tr>
          <td className="opacity-90 align-top pr-1 w-12">Family:</td>
          <td className="font-medium w-16">
            <select
              value={value.family_name || ''}
              onChange={(e) => handleFamilyChange(e.target.value)}
              disabled={disabled}
              className="w-full bg-gray-700 border border-gray-600 rounded px-1 py-0.5 text-xs text-white"
            >
              <option value="">Select...</option>
              {families.map((family) => (
                <option key={family.family_id} value={family.family_name}>
                  {family.family_name}
                </option>
              ))}
            </select>
          </td>
        </tr>

        {/* Type Selector */}
        {value.family_name && (
          <tr>
            <td className="opacity-90 align-top pr-1">Type:</td>
            <td className="font-medium">
              <select
                value={value.type_code || ''}
                onChange={(e) => handleTypeChange(e.target.value)}
                disabled={disabled || !value.family_name}
                className="w-full bg-gray-700 border border-gray-600 rounded px-1 py-0.5 text-xs text-white"
              >
                <option value="">Select...</option>
                {types.map((type) => (
                  <option key={type.type_id} value={type.type_code}>
                    {type.type_name}
                  </option>
                ))}
              </select>
            </td>
          </tr>
        )}

        {/* Product Selector */}
        {value.type_code && (
          <tr>
            <td className="opacity-90 align-top pr-1">Product:</td>
            <td className="font-medium">
              <select
                value={value.product_code || ''}
                onChange={(e) => handleProductChange(e.target.value)}
                disabled={disabled || !value.type_code}
                className="w-full bg-gray-700 border border-gray-600 rounded px-1 py-0.5 text-xs text-white"
              >
                <option value="">Select...</option>
                {products.map((product) => (
                  <option key={product.product_id} value={product.code}>
                    {product.product_name}
                  </option>
                ))}
              </select>
            </td>
          </tr>
        )}
      </tbody>
    </table>
  );
};

export default InlineTaxonomySelector;