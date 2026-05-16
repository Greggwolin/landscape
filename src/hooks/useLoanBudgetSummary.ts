'use client';

/**
 * useLoanBudgetSummary
 *
 * Fetches all loans for a project and their budget summaries.
 * Used by the Debt section on the Reports page.
 */

import { useState, useEffect, useCallback } from 'react';
import { getAuthHeaders } from '@/lib/authHeaders';

const DJANGO_API_URL = process.env.NEXT_PUBLIC_DJANGO_API_URL || 'http://localhost:8000';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface LoanListItem {
  loan_id: number;
  loan_name: string;
  loan_type: string;
  structure_type: string;
  seniority: number;
  commitment_amount: number | null;
  loan_amount: number | null;
  interest_rate_pct: number | null;
  status: string | null;
}

export interface LoanBudgetRow {
  label: string;
  total: number;
  borrower: number;
  lender: number;
}

export interface ProceedsRow {
  label: string;
  pct_of_loan: number | null;
  total: number;
}

export interface EquityRow {
  label: string;
  total: number;
}

export interface LoanBudgetSummary {
  project_id: number;
  loan_id: number;
  loan_name: string;
  project_type_code: string | null;
  governing_constraint: string | null;
  sizing_method: string | null;
  commitment_amount: number;
  net_loan_proceeds: number;
  loan_budget: {
    rows: LoanBudgetRow[];
    totals: {
      total_budget: number;
      borrower_total: number;
      lender_total: number;
    };
  };
  summary_of_proceeds: ProceedsRow[];
  equity_to_close: EquityRow[];
}

export interface UseLoanBudgetResult {
  loans: LoanListItem[];
  budgetSummaries: Record<number, LoanBudgetSummary>;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useLoanBudgetSummary(projectId: number): UseLoanBudgetResult {
  const [loans, setLoans] = useState<LoanListItem[]>([]);
  const [budgetSummaries, setBudgetSummaries] = useState<Record<number, LoanBudgetSummary>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!projectId) return;

    try {
      setIsLoading(true);
      setError(null);

      // 1. Fetch all loans for the project
      const loansRes = await fetch(`${DJANGO_API_URL}/api/projects/${projectId}/loans/`, { headers: getAuthHeaders() });
      if (!loansRes.ok) {
        throw new Error(`Failed to fetch loans: ${loansRes.statusText}`);
      }
      const loansJson = await loansRes.json();
      // DRF may return {results: [...]} envelope or a raw array
      const loansData: LoanListItem[] = Array.isArray(loansJson) ? loansJson : (loansJson.results ?? []);
      setLoans(loansData);

      // 2. Fetch budget summary for each loan (in parallel)
      const summaryEntries = await Promise.all(
        loansData.map(async (loan) => {
          try {
            const res = await fetch(`${DJANGO_API_URL}/api/projects/${projectId}/loans/${loan.loan_id}/budget-summary/`, { headers: getAuthHeaders() });
            if (!res.ok) return null;
            const summary: LoanBudgetSummary = await res.json();
            return [loan.loan_id, summary] as const;
          } catch {
            return null;
          }
        })
      );

      const summaries: Record<number, LoanBudgetSummary> = {};
      for (const entry of summaryEntries) {
        if (entry) summaries[entry[0]] = entry[1];
      }
      setBudgetSummaries(summaries);
    } catch (err) {
      console.error('Error fetching loan budget data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load loan data');
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { loans, budgetSummaries, isLoading, error, refetch: fetchData };
}
