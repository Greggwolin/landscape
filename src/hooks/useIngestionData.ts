import { useState, useEffect, useCallback } from 'react';
import type {
  IngestionDocument,
  PropertySummary,
  UnitMixItem,
  MilestoneItem,
} from '@/components/ingestion/types';

interface IngestionProject {
  id: number;
  name: string;
  propertyType: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
}

interface IngestionApiResponse {
  project: IngestionProject;
  summary: {
    totalUnits: number;
    occupiedUnits: number;
    vacantUnits: number;
    occupancy: number;
    avgRent: number;
    avgMarketRent: number;
    totalMonthlyRent: number;
    noi: number | null;
    capRate: number | null;
    pricePerUnit: number | null;
  };
  unitMix: Array<{
    id: number;
    type: string;
    name: string;
    count: number;
    avgRent: number;
    marketRent: number;
    sqft: number;
    color: string;
    percentage: number;
  }>;
  documents: IngestionDocument[];
  milestones: {
    hasRentRoll: boolean;
    hasT12: boolean;
    hasOM: boolean;
    hasMarketData: boolean;
  };
}

interface UseIngestionDataReturn {
  project: IngestionProject | null;
  summary: PropertySummary;
  documents: IngestionDocument[];
  milestones: MilestoneItem[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  addDocument: (doc: IngestionDocument) => void;
  updateDocument: (docId: number, updates: Partial<IngestionDocument>) => void;
  updateSummary: (updates: Partial<PropertySummary>) => void;
}

const emptySummary: PropertySummary = {
  totalUnits: null,
  averageRent: null,
  occupancy: null,
  noi: null,
  capRate: null,
  pricePerUnit: null,
  unitMix: [],
};

export function useIngestionData(projectId: number | null): UseIngestionDataReturn {
  const [project, setProject] = useState<IngestionProject | null>(null);
  const [summary, setSummary] = useState<PropertySummary>(emptySummary);
  const [documents, setDocuments] = useState<IngestionDocument[]>([]);
  const [milestones, setMilestones] = useState<MilestoneItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!projectId) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/ingestion/${projectId}`);

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to fetch data');
      }

      const data: IngestionApiResponse = await response.json();

      setProject(data.project);

      // Transform to PropertySummary format
      const unitMix: UnitMixItem[] = data.unitMix.map(um => ({
        type: um.type,
        count: um.count,
        avgRent: um.avgRent,
        color: um.color,
        percentage: um.percentage,
      }));

      setSummary({
        totalUnits: data.summary.totalUnits,
        averageRent: data.summary.avgRent,
        occupancy: data.summary.occupancy,
        noi: data.summary.noi,
        capRate: data.summary.capRate,
        pricePerUnit: data.summary.pricePerUnit,
        unitMix,
      });

      setDocuments(data.documents);

      // Build milestones array
      const milestonesArray: MilestoneItem[] = [
        {
          id: 'rent_roll',
          label: 'Rent Roll',
          status: data.milestones.hasRentRoll ? 'complete' : 'missing',
        },
        {
          id: 't12',
          label: 'T12',
          status: data.milestones.hasT12 ? 'complete' : 'missing',
        },
        {
          id: 'market_data',
          label: 'Market Data',
          status: data.milestones.hasMarketData ? 'complete' : 'missing',
        },
        {
          id: 'om',
          label: 'Offering Memo',
          status: data.milestones.hasOM ? 'complete' : 'missing',
        },
      ];

      setMilestones(milestonesArray);
    } catch (err) {
      console.error('Error fetching ingestion data:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const addDocument = useCallback((doc: IngestionDocument) => {
    setDocuments(prev => [...prev, doc]);
  }, []);

  const updateDocument = useCallback((docId: number, updates: Partial<IngestionDocument>) => {
    setDocuments(prev =>
      prev.map(d => (d.doc_id === docId ? { ...d, ...updates } : d))
    );
  }, []);

  const updateSummary = useCallback((updates: Partial<PropertySummary>) => {
    setSummary(prev => ({ ...prev, ...updates }));
  }, []);

  return {
    project,
    summary,
    documents,
    milestones,
    isLoading,
    error,
    refetch: fetchData,
    addDocument,
    updateDocument,
    updateSummary,
  };
}

export default useIngestionData;
