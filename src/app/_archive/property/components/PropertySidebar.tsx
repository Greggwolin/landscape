import React from 'react';
import type { Tab, PropertyData } from '../types';
import { getDisabledTabTooltip } from '../utils/validation';

interface PropertySidebarProps {
  activeTab: string;
  visibleTabs: Tab[];
  enabledTabs: string[];
  propertyData: PropertyData | null;
  onTabChange: (tabId: string) => void;
}

const PropertySidebar: React.FC<PropertySidebarProps> = ({
  activeTab,
  visibleTabs,
  enabledTabs,
  propertyData,
  onTabChange
}) => {
  const handleTabClick = (tabId: string) => {
    if (enabledTabs.includes(tabId)) {
      onTabChange(tabId);
    }
  };

  return (
    <div className="property-sidebar">
      {visibleTabs.map((tab) => {
        const isActive = activeTab === tab.id;
        const isEnabled = enabledTabs.includes(tab.id);
        const tooltip = !isEnabled ? getDisabledTabTooltip(tab.id, propertyData) : '';

        return (
          <div
            key={tab.id}
            className={`tab-item ${isActive ? 'active' : ''} ${!isEnabled ? 'disabled' : ''}`}
            onClick={() => handleTabClick(tab.id)}
            data-tooltip={tooltip}
            title={!isEnabled ? tooltip : ''}
          >
            <span className="tab-icon">{tab.icon}</span>
            <span className="tab-label">{tab.label}</span>
          </div>
        );
      })}
    </div>
  );
};

export default PropertySidebar;
