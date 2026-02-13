'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
 TaxonomySelection,
 FamilyChoice,
 TypeChoice,
 ProductChoice,
 DensityClassification
} from '../../../types/landuse';

interface TaxonomySelectorProps {
 value: TaxonomySelection;
 onChange: (taxonomy: TaxonomySelection) => void;
 disabled?: boolean;
 className?: string;
}

const TaxonomySelector: React.FC<TaxonomySelectorProps> = ({
 value,
 onChange,
 disabled = false,
 className = ''
}) => {
 // State for dropdown options
 const [families, setFamilies] = useState<FamilyChoice[]>([]);
 const [densityClassifications, setDensityClassifications] = useState<DensityClassification[]>([]);
 const [types, setTypes] = useState<TypeChoice[]>([]);
 const [products, setProducts] = useState<ProductChoice[]>([]);

 // State for loading indicators
 const [loadingFamilies, setLoadingFamilies] = useState(false);
 const [loadingDensity, setLoadingDensity] = useState(false);
 const [loadingTypes, setLoadingTypes] = useState(false);
 const [loadingProducts, setLoadingProducts] = useState(false);

 // Current selections
 const [selectedFamily, setSelectedFamily] = useState<string>(value.family_name || '');
 const [selectedDensity, setSelectedDensity] = useState<string>(value.density_code || '');
 const [selectedType, setSelectedType] = useState<string>(value.type_code || '');
 const [selectedProduct, setSelectedProduct] = useState<string>(value.product_code || '');

 // Initialize state from value prop but don't sync on every change to avoid loops

 // Load families on component mount
 useEffect(() => {
 loadFamilies();
 }, []);

 // Load density classifications when family changes
 useEffect(() => {
 loadDensityClassifications();
 }, [selectedFamily, families]);

 // Load types when family changes
 useEffect(() => {
 if (selectedFamily) {
 loadTypes(selectedFamily);
 } else {
 setTypes([]);
 setSelectedType('');
 setSelectedProduct('');
 }
 }, [selectedFamily]);

 // Load products when type changes
 useEffect(() => {
 if (selectedType) {
 loadProducts(selectedType);
 } else {
 setProducts([]);
 setSelectedProduct('');
 }
 }, [selectedType]);

 // Update parent component when selections change (with debouncing to prevent loops)
 const updateParent = useCallback(() => {
 const newSelection: TaxonomySelection = {
 family_name: selectedFamily || '',
 density_code: selectedDensity || '',
 type_code: selectedType || '',
 product_code: selectedProduct || ''
 };
 onChange(newSelection);
 }, [selectedFamily, selectedDensity, selectedType, selectedProduct, onChange]);

 useEffect(() => {
 updateParent();
 }, [updateParent]);

 const loadFamilies = async () => {
 setLoadingFamilies(true);
 try {
 const response = await fetch('/api/landuse/families?active=true');
 if (response.ok) {
 const data = await response.json();
 setFamilies(data);
 }
 } catch (error) {
 console.error('Failed to load families:', error);
 } finally {
 setLoadingFamilies(false);
 }
 };

 const loadDensityClassifications = async () => {
 setLoadingDensity(true);
 try {
 let url = '/api/density-classifications?active=true';

 // Filter by family category if family is selected
 if (selectedFamily && families.length > 0) {
 const family = families.find(f => f.family_name === selectedFamily);
 if (family && family.density_category) {
 url += `&family_category=${family.density_category}`;
 }
 }

 const response = await fetch(url);
 if (response.ok) {
 const data = await response.json();
 setDensityClassifications(data);
 }
 } catch (error) {
 console.error('Failed to load density classifications:', error);
 } finally {
 setLoadingDensity(false);
 }
 };

 const loadTypes = async (familyName: string) => {
 setLoadingTypes(true);
 try {
 // Find family_id from the selected family
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
 } finally {
 setLoadingTypes(false);
 }
 };

 const loadProducts = async (typeCode: string) => {
 setLoadingProducts(true);
 try {
 // Find type_id from the selected type
 const type = types.find(t => t.type_code === typeCode);
 if (type) {
 const response = await fetch(`/api/landuse/products/${type.type_id}`);
 if (response.ok) {
 const data = await response.json();
 setProducts(data);
 }
 }
 } catch (error) {
 console.error('Failed to load products:', error);
 } finally {
 setLoadingProducts(false);
 }
 };

 const handleFamilyChange = (familyName: string) => {
 setSelectedFamily(familyName);
 setSelectedType('');
 setSelectedProduct('');
 setTypes([]);
 setProducts([]);
 };

 const handleDensityChange = (densityCode: string) => {
 setSelectedDensity(densityCode);
 };

 const handleTypeChange = (typeCode: string) => {
 setSelectedType(typeCode);
 setSelectedProduct('');
 setProducts([]);
 };

 const handleProductChange = (productCode: string) => {
 setSelectedProduct(productCode);
 };

 return (
 <div className={`space-y-4 ${className}`}>
 {/* Family Selector */}
 <div>
 <label className="block text-sm font-medium text-body-tertiary mb-1">
 Family
 </label>
 <select
 value={selectedFamily}
 onChange={(e) => handleFamilyChange(e.target.value)}
 disabled={disabled || loadingFamilies}
 className="w-full bg-body border border rounded-md px-3 py-2 text-sm text-body focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
 >
 <option value="">Select Family...</option>
 {families.map((family) => (
 <option key={family.family_id} value={family.family_name}>
 {family.family_name} ({family.family_code})
 </option>
 ))}
 </select>
 {loadingFamilies && (
 <p className="text-xs text-body-tertiary mt-1">Loading families...</p>
 )}
 </div>

 {/* Density Classification Selector */}
 <div>
 <label className="block text-sm font-medium text-body-tertiary mb-1">
 Density Classification
 </label>
 <select
 value={selectedDensity}
 onChange={(e) => handleDensityChange(e.target.value)}
 disabled={disabled || loadingDensity}
 className="w-full bg-body border border rounded-md px-3 py-2 text-sm text-body focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
 >
 <option value="">Select Density...</option>
 {densityClassifications.map((density) => (
 <option key={density.id} value={density.code}>
 {density.name} ({density.code})
 {density.min_density && density.max_density &&
 ` - ${density.min_density}-${density.max_density} ${density.units}`
 }
 </option>
 ))}
 </select>
 {loadingDensity && (
 <p className="text-xs text-body-tertiary mt-1">Loading density classifications...</p>
 )}
 </div>

 {/* Type Selector */}
 <div>
 <label className="block text-sm font-medium text-body-tertiary mb-1">
 Type
 </label>
 <select
 value={selectedType}
 onChange={(e) => handleTypeChange(e.target.value)}
 disabled={disabled || !selectedFamily || loadingTypes}
 className="w-full bg-body border border rounded-md px-3 py-2 text-sm text-body focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
 >
 <option value="">Select Type...</option>
 {types.map((type) => (
 <option key={type.type_id} value={type.type_code}>
 {type.type_name} ({type.type_code})
 </option>
 ))}
 </select>
 {loadingTypes && (
 <p className="text-xs text-body-tertiary mt-1">Loading types...</p>
 )}
 {!selectedFamily && (
 <p className="text-xs text-body-tertiary mt-1">Select a family first</p>
 )}
 </div>

 {/* Product Selector */}
 <div>
 <label className="block text-sm font-medium text-body-tertiary mb-1">
 Product
 </label>
 <select
 value={selectedProduct}
 onChange={(e) => handleProductChange(e.target.value)}
 disabled={disabled || !selectedType || loadingProducts}
 className="w-full bg-body border border rounded-md px-3 py-2 text-sm text-body focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
 >
 <option value="">Select Product...</option>
 {products.map((product) => (
 <option key={product.product_id} value={product.code}>
 {product.product_name}
 {product.lot_width && product.lot_depth &&
 ` (${product.lot_width}'×${product.lot_depth}')`
 }
 </option>
 ))}
 </select>
 {loadingProducts && (
 <p className="text-xs text-body-tertiary mt-1">Loading products...</p>
 )}
 {!selectedType && (
 <p className="text-xs text-body-tertiary mt-1">Select a type first</p>
 )}
 </div>

 {/* Selection Summary */}
 {(selectedFamily || selectedDensity || selectedType || selectedProduct) && (
 <div className="bg-body border border rounded-md p-3 mt-4">
 <h4 className="font-medium text-sm text-body-tertiary mb-2">Current Selection</h4>
 <div className="text-xs text-body-tertiary space-y-1">
 {selectedFamily && <div>Family: {selectedFamily}</div>}
 {selectedDensity && <div>Density: {selectedDensity}</div>}
 {selectedType && <div>Type: {selectedType}</div>}
 {selectedProduct && <div>Product: {selectedProduct}</div>}
 </div>
 </div>
 )}
 </div>
 );
};

export default TaxonomySelector;