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
        method: 'PATCH',
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

export interface LoanBudgetSummaryRow {
  label: string;
  total: number;
  borrower: number;
  lender: number;
}

export interface LoanBudgetSummaryResponse {
  project_id: number;
  loan_id: number;
  loan_name: string;
  project_type_code: string | null;
  governing_constraint: string | null;
  sizing_method: string | null;
  commitment_amount: number;
  net_loan_proceeds: number;
  loan_budget: {
    rows: LoanBudgetSummaryRow[];
    totals: {
      total_budget: number;
      borrower_total: number;
      lender_total: number;
    };
  };
  summary_of_proceeds: Array<{
    label: string;
    pct_of_loan: number | null;
    total: number;
  }>;
  equity_to_close: Array<{
    label: string;
    total: number;
  }>;
}

export function useLoanBudgetSummary(
  projectId: string,
  loanId: string | number | null,
  enabled = true
) {
  return useQuery({
    queryKey: ['loan-budget-summary', projectId, loanId],
    queryFn: async () => {
      const response = await fetch(
        `/api/projects/${projectId}/loans/${loanId}/budget-summary/`
      );
      if (!response.ok) {
        throw new Error(`Failed to fetch loan budget summary: ${response.statusText}`);
      }
      return response.json() as Promise<LoanBudgetSummaryResponse>;
    },
    enabled: !!projectId && !!loanId && enabled,
  });
}

export interface InterestReserveRecommendation {
  recommended_reserve: number;
  calculation_basis: {
    monthly_interest?: number;
    reserve_months?: number;
    inflator?: number;
    method: string;
    iterations?: number;
    peak_balance?: number;
  };
}

export function useCalculateInterestReserve(projectId: string, loanId: number | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const response = await fetch(
        `/api/projects/${projectId}/loans/${loanId}/interest-reserve/calculate/`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({}),
        }
      );
      if (!response.ok) {
        throw response;
      }
      return response.json() as Promise<InterestReserveRecommendation>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loans', projectId] });
    },
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

export interface AcquisitionPriceSummary {
  project_id: number;
  asking_price: number | null;
  has_closing_date: boolean;
  closing_date: string | null;
  total_acquisition_cost: number | null;
  effective_acquisition_price: number | null;
  price_source: 'calculated' | 'asking' | null;
}

export function useAcquisitionPriceSummary(projectId: string, enabled: boolean = true) {
  return useQuery({
    queryKey: ['acquisition-price-summary', projectId],
    queryFn: async () => {
      const response = await fetch(
        `${DJANGO_API_URL}/api/projects/${projectId}/acquisition/price-summary/`
      );
      if (!response.ok) {
        throw new Error(`Failed to fetch acquisition price summary: ${response.statusText}`);
      }
      return response.json() as Promise<AcquisitionPriceSummary>;
    },
    enabled: !!projectId && enabled,
  });
}
