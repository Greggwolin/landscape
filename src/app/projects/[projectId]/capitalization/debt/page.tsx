'use client';

import React, { useState } from 'react';
import { useParams } from 'next/navigation';
import { CButton, CCard, CCardHeader, CCardBody, CRow, CCol } from '@coreui/react';
import CIcon from '@coreui/icons-react';
import { cilPlus } from '@coreui/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import CapitalizationSubNav from '@/components/capitalization/CapitalizationSubNav';
import MetricCard from '@/components/capitalization/MetricCard';
import DebtFacilitiesTable, { type DebtFacility } from '@/components/capitalization/DebtFacilitiesTable';
import DebtFacilityModal from '@/components/capitalization/DebtFacilityModal';
import DrawScheduleTable, { type DrawEvent } from '@/components/capitalization/DrawScheduleTable';
import { useToast } from '@/components/ui/toast';
import { ExportButton } from '@/components/admin';

export default function DebtPage() {
  const params = useParams();
  const projectId = parseInt(params.projectId as string);
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  const [facilityModalVisible, setFacilityModalVisible] = useState(false);
  const [editingFacility, setEditingFacility] = useState<DebtFacility | null>(null);
  const [selectedFacilityId, setSelectedFacilityId] = useState<number | null>(null);

  const { data: facilities = [] } = useQuery<DebtFacility[]>({
    queryKey: ['debt-facilities', projectId],
    queryFn: async () => {
      const response = await fetch(`/api/projects/${projectId}/debt/facilities`);
      if (!response.ok) throw new Error('Failed to fetch facilities');
      const data = await response.json();
      return data.facilities || [];
    },
  });

  const { data: drawEvents = [] } = useQuery<DrawEvent[]>({
    queryKey: ['draw-events', projectId],
    queryFn: async () => {
      const response = await fetch(`/api/projects/${projectId}/debt/draw-events`);
      if (!response.ok) throw new Error('Failed to fetch draw events');
      const data = await response.json();
      return data.drawEvents || [];
    },
  });

  const saveFacilityMutation = useMutation({
    mutationFn: async (data: Partial<DebtFacility>) => {
      const url = data.id
        ? `/api/projects/${projectId}/debt/facilities/${data.id}`
        : `/api/projects/${projectId}/debt/facilities`;

      const response = await fetch(url, {
        method: data.id ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) throw new Error('Failed to save facility');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['debt-facilities', projectId] });
      showToast({
        title: 'Success',
        message: 'Debt facility saved successfully',
        type: 'success',
      });
    },
    onError: () => {
      showToast({
        title: 'Error',
        message: 'Failed to save debt facility',
        type: 'error',
      });
    },
  });

  const deleteFacilityMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/projects/${projectId}/debt/facilities/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete facility');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['debt-facilities', projectId] });
      showToast({
        title: 'Success',
        message: 'Debt facility deleted successfully',
        type: 'success',
      });
    },
  });

  const calculateTotalDebtCapacity = (): number => {
    return facilities.reduce((sum, f) => sum + f.commitmentAmount, 0);
  };

  const calculateOutstandingBalance = (): number => {
    return facilities.reduce((sum, f) => sum + f.outstandingBalance, 0);
  };

  const calculateAvailableToDraw = (): number => {
    return calculateTotalDebtCapacity() - calculateOutstandingBalance();
  };

  const calculateWeightedAvgRate = (): number => {
    const totalBalance = calculateOutstandingBalance();
    if (totalBalance === 0) return 0;

    const weightedSum = facilities.reduce(
      (sum, f) => sum + f.outstandingBalance * f.interestRate,
      0
    );
    return weightedSum / totalBalance;
  };

  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatPercent = (value: number): string => {
    return `${(value * 100).toFixed(2)}%`;
  };

  const handleAddFacility = () => {
    setEditingFacility(null);
    setFacilityModalVisible(true);
  };

  const handleEditFacility = (facility: DebtFacility) => {
    setEditingFacility(facility);
    setFacilityModalVisible(true);
  };

  const handleSaveFacility = async (data: Partial<DebtFacility>) => {
    await saveFacilityMutation.mutateAsync(data);
  };

  const handleDeleteFacility = (id: number) => {
    if (confirm('Are you sure you want to delete this debt facility?')) {
      deleteFacilityMutation.mutate(id);
    }
  };

  return (
    <>
      <CapitalizationSubNav projectId={projectId} />

      <div
        className="p-4 space-y-4 min-h-screen"
        style={{ backgroundColor: 'var(--cui-body-bg)' }}
      >
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h5 className="mb-0">Capitalization</h5>
          <ExportButton tabName="Capitalization" projectId={projectId.toString()} />
        </div>

        <div className="d-flex justify-content-between align-items-center mb-4">
          <h2>Debt Facilities</h2>
          <CButton
            color="primary"
            onClick={handleAddFacility}
            aria-label="Add debt facility"
          >
            <CIcon icon={cilPlus} className="me-1" />
            Add Facility
          </CButton>
        </div>

        <CRow className="g-3 mb-4">
          <CCol xs={12} md={3}>
            <MetricCard
              label="Total Debt Capacity"
              value={formatCurrency(calculateTotalDebtCapacity())}
              status="info"
            />
          </CCol>
          <CCol xs={12} md={3}>
            <MetricCard
              label="Outstanding Balance"
              value={formatCurrency(calculateOutstandingBalance())}
              status="primary"
            />
          </CCol>
          <CCol xs={12} md={3}>
            <MetricCard
              label="Available to Draw"
              value={formatCurrency(calculateAvailableToDraw())}
              status="success"
            />
          </CCol>
          <CCol xs={12} md={3}>
            <MetricCard
              label="Weighted Avg Rate"
              value={formatPercent(calculateWeightedAvgRate())}
              status="info"
            />
          </CCol>
        </CRow>

        <CCard className="mb-4">
          <CCardHeader>
            <h5 className="mb-0">Active Debt Facilities</h5>
          </CCardHeader>
          <CCardBody>
            <DebtFacilitiesTable
              facilities={facilities}
              onSelect={setSelectedFacilityId}
              selectedId={selectedFacilityId}
              onEdit={handleEditFacility}
              onDelete={handleDeleteFacility}
            />
          </CCardBody>
        </CCard>

        <CCard>
          <CCardHeader className="d-flex justify-content-between align-items-center">
            <h5 className="mb-0">Draw Schedule</h5>
            <CButton
              color="outline-secondary"
              size="sm"
              aria-label="Add draw event"
            >
              <CIcon icon={cilPlus} className="me-1" />
              Add Draw Event
            </CButton>
          </CCardHeader>
          <CCardBody>
            <p className="text-muted small mb-3">
              Manually track draw events and timing. Auto-generation from budget timing
              and milestone triggers will be added in the Debt Enhancement phase.
            </p>
            <DrawScheduleTable
              drawEvents={drawEvents}
              onEdit={() => {}}
              onDelete={() => {}}
            />
          </CCardBody>
        </CCard>

        <DebtFacilityModal
          visible={facilityModalVisible}
          facility={editingFacility}
          onClose={() => setFacilityModalVisible(false)}
          onSave={handleSaveFacility}
        />
      </div>
    </>
  );
}
