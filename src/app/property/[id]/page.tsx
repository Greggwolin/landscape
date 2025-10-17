'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';

import '@/styles/property.css';

import Header from '@/app/components/Header';
import { ProjectProvider } from '@/app/components/ProjectProvider';
import PropertyHeader from '../components/PropertyHeader';
import PropertySidebar from '../components/PropertySidebar';
import PropertyDetails from '../components/PropertyDetails';
import Market from '../components/Market';
import Financial from '../components/Financial';
import Operations from '../components/Operations';
import Assumptions from '../components/Assumptions';
import TaxLegal from '../components/TaxLegal';
import Results from '../components/Results';
import Documents from '../components/Documents';
import Reports from '../components/Reports';
import type { PropertyData, PropertyValidationErrors } from '../types';
import { getTabsForGranularity, getEnabledTabs } from '../utils/validation';

const PropertyPage = () => {
  const params = useParams();
  const propertyId = params?.id as string;
  const [activeTab, setActiveTab] = useState('property-details');
  const [propertyData, setPropertyData] = useState<PropertyData | null>(null);
  const [errors, setErrors] = useState<PropertyValidationErrors>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadPropertyData = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/property/${propertyId}`);
      if (!response.ok) {
        throw new Error('Failed to load property');
      }
      const result = await response.json() as { ok: boolean; data: PropertyData };
      if (!result.ok || !result.data) {
        throw new Error('Invalid API response');
      }
      setPropertyData(result.data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [propertyId]);

  useEffect(() => {
    if (propertyId) {
      loadPropertyData();
    }
  }, [propertyId, loadPropertyData]);

  const handleUpdate = useCallback(
    async (section: keyof PropertyData, field: string, value: unknown) => {
      if (!propertyData) {
        return;
      }

      const nextValue = Array.isArray(propertyData[section])
        ? (value as PropertyData[typeof section])
        : {
            ...(propertyData[section] as Record<string, unknown>),
            [field]: value
          };

      const updated = {
        ...propertyData,
        [section]: nextValue
      } as PropertyData;

      setPropertyData(updated);

      setSaving(true);
      try {
        const response = await fetch(`/api/property/${propertyId}/${section}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: Array.isArray(nextValue)
            ? JSON.stringify(nextValue)
            : JSON.stringify({ field, value })
        });
        if (!response.ok) {
          throw new Error('Save failed');
        }
      } catch (error) {
        console.error(error);
      } finally {
        setSaving(false);
      }
    },
    [propertyData, propertyId]
  );

  // Determine which tabs to show based on granularity
  const visibleTabs = useMemo(() => {
    return getTabsForGranularity(propertyData?.granularityLevel || 'basic');
  }, [propertyData?.granularityLevel]);

  // Determine which tabs are enabled
  const enabledTabs = useMemo(() => {
    return getEnabledTabs(propertyData);
  }, [propertyData]);

  const tabContent = useMemo(() => {
    if (!propertyData) {
      return null;
    }

    switch (activeTab) {
      case 'property-details':
        return (
          <PropertyDetails
            data={propertyData}
            errors={errors}
            onUpdate={handleUpdate}
          />
        );
      case 'market':
        return <Market data={propertyData} onUpdate={handleUpdate} />;
      case 'financial':
        return <Financial data={propertyData} onUpdate={handleUpdate} />;
      case 'operations':
        return <Operations data={propertyData} onUpdate={handleUpdate} />;
      case 'assumptions':
        return <Assumptions data={propertyData} onUpdate={handleUpdate} />;
      case 'tax-legal':
        return <TaxLegal data={propertyData} onUpdate={handleUpdate} />;
      case 'results':
        return <Results data={propertyData} />;
      case 'documents':
        return <Documents data={propertyData} onUpdate={handleUpdate} />;
      case 'reports':
        return <Reports data={propertyData} />;
      default:
        return null;
    }
  }, [activeTab, errors, handleUpdate, propertyData]);

  if (loading || !propertyData) {
    return (
      <div className="property-app">
        <div className="property-wrapper">
          <div className="loading-spinner">Loading property…</div>
        </div>
      </div>
    );
  }

  return (
    <ProjectProvider>
      <Header />
      <div className="property-app">
        <div className="property-wrapper">
          <PropertyHeader property={propertyData} saving={saving} />
          <div className="property-layout">
            <PropertySidebar
              activeTab={activeTab}
              visibleTabs={visibleTabs}
              enabledTabs={enabledTabs}
              propertyData={propertyData}
              onTabChange={setActiveTab}
            />

            <section className="property-card">
              <div className="tab-panel">{tabContent}</div>
            </section>
          </div>
        </div>
      </div>
    </ProjectProvider>
  );
};

export default PropertyPage;
