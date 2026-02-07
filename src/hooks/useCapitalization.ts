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

export function useLeveragedCashFlow(projectId: string, enabled: boolean = true) {
  return useQuery({
    queryKey: ['leveraged-cash-flow', projectId],
    queryFn: () =>
      fetch(`/api/projects/${projectId}/cash-flow/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ includeFinancing: true }),
      }).then((r) => r.json()),
    enabled: !!projectId && enabled,
  });
}
