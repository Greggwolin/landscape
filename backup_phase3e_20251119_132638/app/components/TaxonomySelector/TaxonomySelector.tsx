'use client'

import React, { useState, useEffect, useCallback } from 'react'
import {
  FamilyChoice,
  DensityChoice,
  TypeChoice,
  ProductChoice,
  TaxonomySelection
} from '@/types/landuse'

interface TaxonomySelectorProps {
  value?: TaxonomySelection
  onChange: (selection: TaxonomySelection) => void
  disabled?: boolean
  showProduct?: boolean
  className?: string
  compact?: boolean
}

const TaxonomySelector: React.FC<TaxonomySelectorProps> = ({
  value,
  onChange,
  disabled = false,
  showProduct = true,
  className = '',
  compact = false
}) => {
  const [families, setFamilies] = useState<FamilyChoice[]>([])
  const [densities, setDensities] = useState<DensityChoice[]>([])
  const [types, setTypes] = useState<TypeChoice[]>([])
  const [products, setProducts] = useState<ProductChoice[]>([])
  const [loading, setLoading] = useState(false)

  // Load families on component mount
  useEffect(() => {
    const loadFamilies = async () => {
      setLoading(true)
      try {
        const response = await fetch('/api/landuse/choices?type=families')
        if (response.ok) {
          const data = await response.json()
          setFamilies(data)
        }
      } catch (error) {
        console.error('Failed to load families:', error)
      } finally {
        setLoading(false)
      }
    }
    loadFamilies()
  }, [])

  // Load densities when family changes
  useEffect(() => {
    const loadDensities = async () => {
      if (!value?.family) {
        setDensities([])
        return
      }

      setLoading(true)
      try {
        const response = await fetch(`/api/landuse/choices?type=densities&family_id=${value.family.family_id}`)
        if (response.ok) {
          const data = await response.json()
          setDensities(data)
        }
      } catch (error) {
        console.error('Failed to load densities:', error)
      } finally {
        setLoading(false)
      }
    }
    loadDensities()
  }, [value?.family])

  // Load types when density changes
  useEffect(() => {
    const loadTypes = async () => {
      if (!value?.family || !value?.density) {
        setTypes([])
        return
      }

      setLoading(true)
      try {
        const response = await fetch(
          `/api/landuse/choices?type=types&family_id=${value.family.family_id}&density_id=${value.density.density_id}`
        )
        if (response.ok) {
          const data = await response.json()
          setTypes(data)
        }
      } catch (error) {
        console.error('Failed to load types:', error)
      } finally {
        setLoading(false)
      }
    }
    loadTypes()
  }, [value?.family, value?.density])

  // Load products when type changes
  useEffect(() => {
    const loadProducts = async () => {
      if (!showProduct || !value?.family || !value?.type) {
        setProducts([])
        return
      }

      setLoading(true)
      try {
        const response = await fetch(
          `/api/landuse/choices?type=products&family_id=${value.family.family_id}&type_id=${value.type.type_id}`
        )
        if (response.ok) {
          const data = await response.json()
          setProducts(data)
        }
      } catch (error) {
        console.error('Failed to load products:', error)
      } finally {
        setLoading(false)
      }
    }
    loadProducts()
  }, [value?.family, value?.type, showProduct])

  const handleFamilyChange = useCallback((familyId: string) => {
    const family = families.find(f => f.family_id === parseInt(familyId))
    onChange({
      family,
      density: undefined,
      type: undefined,
      product: undefined
    })
  }, [families, onChange])

  const handleDensityChange = useCallback((densityId: string) => {
    const density = densities.find(d => d.density_id === parseInt(densityId))
    onChange({
      ...value,
      density,
      type: undefined,
      product: undefined
    })
  }, [densities, value, onChange])

  const handleTypeChange = useCallback((typeId: string) => {
    const type = types.find(t => t.type_id === parseInt(typeId))
    onChange({
      ...value,
      type,
      product: undefined
    })
  }, [types, value, onChange])

  const handleProductChange = useCallback((productId: string) => {
    const product = products.find(p => p.product_id === parseInt(productId))
    onChange({
      ...value,
      product
    })
  }, [products, value, onChange])

  const selectClass = compact
    ? "text-xs px-1 py-0.5 border border-gray-300 rounded bg-white text-gray-900"
    : "px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"

  const containerClass = compact
    ? "flex gap-1 items-center"
    : "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"

  return (
    <div className={`${containerClass} ${className}`}>
      {/* Family Selector */}
      <div className={compact ? '' : 'space-y-1'}>
        {!compact && <label className="block text-sm font-medium text-gray-700">Family</label>}
        <select
          value={value?.family?.family_id || ''}
          onChange={(e) => handleFamilyChange(e.target.value)}
          disabled={disabled || loading}
          className={selectClass}
        >
          <option value="">Select Family</option>
          {families.map(family => (
            <option key={family.family_id} value={family.family_id}>
              {compact ? family.family_code : `${family.family_code} - ${family.family_name}`}
            </option>
          ))}
        </select>
      </div>

      {/* Density Selector */}
      <div className={compact ? '' : 'space-y-1'}>
        {!compact && <label className="block text-sm font-medium text-gray-700">Density</label>}
        <select
          value={value?.density?.density_id || ''}
          onChange={(e) => handleDensityChange(e.target.value)}
          disabled={disabled || loading || !value?.family}
          className={selectClass}
        >
          <option value="">Select Density</option>
          {densities.map(density => (
            <option key={density.density_id} value={density.density_id}>
              {compact ? density.density_code : `${density.density_code} - ${density.density_name}`}
            </option>
          ))}
        </select>
      </div>

      {/* Type Selector */}
      <div className={compact ? '' : 'space-y-1'}>
        {!compact && <label className="block text-sm font-medium text-gray-700">Type</label>}
        <select
          value={value?.type?.type_id || ''}
          onChange={(e) => handleTypeChange(e.target.value)}
          disabled={disabled || loading || !value?.density}
          className={selectClass}
        >
          <option value="">Select Type</option>
          {types.map(type => (
            <option key={type.type_id} value={type.type_id}>
              {compact ? type.type_code : `${type.type_code} - ${type.type_name}`}
            </option>
          ))}
        </select>
      </div>

      {/* Product Selector */}
      {showProduct && (
        <div className={compact ? '' : 'space-y-1'}>
          {!compact && <label className="block text-sm font-medium text-gray-700">Product</label>}
          <select
            value={value?.product?.product_id || ''}
            onChange={(e) => handleProductChange(e.target.value)}
            disabled={disabled || loading || !value?.type}
            className={selectClass}
          >
            <option value="">Select Product</option>
            {products.map(product => (
              <option key={product.product_id} value={product.product_id}>
                {compact ? product.product_code : product.product_name}
              </option>
            ))}
          </select>
        </div>
      )}

      {loading && (
        <div className="text-sm text-gray-500">
          Loading...
        </div>
      )}
    </div>
  )
}

export default TaxonomySelector