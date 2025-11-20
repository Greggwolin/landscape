import React from 'react';
import type { PropertyData } from '../types';

interface PropertyHeaderProps {
  property: PropertyData;
  saving: boolean;
}

const PropertyHeader: React.FC<PropertyHeaderProps> = ({ property, saving }) => {
  return (
    <div className="property-header">
      <div className="header-content">
        <div className="property-title">
          <h1>{property.name || 'Untitled Property'}</h1>
          <div className="property-meta">
            <span className="property-type">{property.propertyType}</span>
            {property.address && <span className="property-address">{property.address}</span>}
          </div>
        </div>
        {saving && (
          <div className="save-indicator">
            <span className="save-spinner"></span>
            <span className="save-text">Saving...</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default PropertyHeader;
