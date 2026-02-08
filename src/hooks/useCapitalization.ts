import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Loan } from '@/types/assumptions';

export function useLoans(projectId: string) {
  return useQuery({
    queryKey: ['loans', projectId],
    queryFn: () => fetch(`/api/projects/${projectId}/loans/`).then((r) => r.json()),
    enabled: !!projectId,
  });
}

export const useDebtFacilities = useLoans;

export function useLoanDraws(projectId: string, loanId: number) {
  return useQuery({
    queryKey: ['loan-draws', projectId, loanId],
    queryFn: () =>
      fetch(`/api/projects/${projectId}/loans/${loanId}/draws/`).then((r) => r.json()),
    enabled: !!projectId && !!loanId,
  });
}

export function useLoanBalanceSummary(projectId: string, loanId: number) {
  return useQuery({
    queryKey: ['loan-balance-summary', projectId, loanId],
    queryFn: () =>
      fetch(`/api/projects/${projectId}/loans/${loanId}/balance-summary/`).then((r) => r.json()),
    enabled: !!projectId && !!loanId,
  });
}

export function useCreateLoan(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Loan>) =>
      fetch(`/api/projects/${projectId}/loans/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }).then((r) => {
        if (!r.ok) throw r;
        return r.json();
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loans', projectId] });
    },
  });
}

export function useUpdateLoan(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ loanId, data }: { loanId: number; data: Partial<Loan> }) =>
      fetch(`/api/projects/${projectId}/loans/${loanId}/`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }).then((r) => {
        if (!r.ok) throw r;
        return r.json();
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loans', projectId] });
    },
  });
}

export function useDeleteLoan(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (loanId: number) =>
      fetch(`/api/projects/${projectId}/loans/${loanId}/`, {
        method: 'DELETE',
      }).then((r) => {
        if (!r.ok) throw r;
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loans', projectId] });
    },
  });
}

export function useLoanSchedule(projectId: string, loanId: string | number | null) {
  return useQuery({
    queryKey: ['loan-schedule', projectId, loanId],
    queryFn: () =>
      fetch(`/api/projects/${projectId}/loans/${loanId}/debt-schedule/`).then((r) =>
        r.json()
      ),
    enabled: !!projectId && !!loanId,
  });
}

const DJANGO_API_URL = process.env.NEXT_PUBLIC_DJANGO_API_URL || 'http://localhost:8000';

export function useLeveragedCashFlow(projectId: string, enabled: boolean = true) {
  return useQuery({
    queryKey: ['leveraged-cash-flow', projectId],
    queryFn: () =>
      fetch(`${DJANGO_API_URL}/api/projects/${projectId}/cash-flow/calculate/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ includeFinancing: true }),
      }).then((r) => r.json()),
    enabled: !!projectId && enabled,
  });
}

export function useIncomeApproachMonthlyDCF(projectId: string, enabled: boolean = true) {
  return useQuery({
    queryKey: ['income-approach-monthly-dcf', projectId],
    queryFn: async () => {
      const response = await fetch(
        `${DJANGO_API_URL}/api/valuation/income-approach-data/${projectId}/dcf/monthly/`
      );
      if (!response.ok) {
        throw new Error(`Failed to fetch monthly DCF data: ${response.statusText}`);
      }
      return response.json();
    },
    enabled: !!projectId && enabled,
  });
}
