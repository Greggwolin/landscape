/**
 * React Query hooks for Report Templates API and Report Definitions API
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type {
  ReportDefinition,
  ReportPreviewResponse,
  ReportHistoryEntry,
} from '@/types/report-definitions';
import { getAuthHeaders } from '@/lib/authHeaders';

export interface ReportTemplate {
  id: number;
  template_name: string;
  description: string;
  output_format: 'pdf' | 'excel' | 'powerpoint';
  assigned_tabs: string[];
  sections: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

export interface CreateReportTemplateData {
  template_name: string;
  description?: string;
  output_format: 'pdf' | 'excel' | 'powerpoint';
  assigned_tabs: string[];
  sections: string[];
  created_by?: string;
}

export interface UpdateReportTemplateData extends Partial<CreateReportTemplateData> {
  id: number;
}

const DJANGO_API_URL = process.env.NEXT_PUBLIC_DJANGO_API_URL || 'http://localhost:8000';

/**
 * Fetch all report templates
 */
export function useReportTemplates(isActive?: boolean) {
  return useQuery<ReportTemplate[]>({
    queryKey: ['reportTemplates', isActive],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (isActive !== undefined) {
        params.append('is_active', String(isActive));
      }

      const url = `${DJANGO_API_URL}/api/reports/templates/${params.toString() ? '?' + params.toString() : ''}`;
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error('Failed to fetch report templates');
      }

      const data = await response.json();

      // Handle paginated response from Django REST Framework
      // DRF returns {count, next, previous, results} when pagination is enabled
      const templates = data.results || data;
      return templates;
    },
  });
}

/**
 * Fetch report templates assigned to a specific tab
 */
export function useReportTemplatesForTab(tabName: string) {
  return useQuery<ReportTemplate[]>({
    queryKey: ['reportTemplates', 'tab', tabName],
    queryFn: async () => {
      const url = `${DJANGO_API_URL}/api/reports/templates/for-tab/${encodeURIComponent(tabName)}/`;
      console.log('🔍 [useReportTemplatesForTab] Fetching:', url);

      const response = await fetch(url);
      console.log('🔍 [useReportTemplatesForTab] Response status:', response.status);

      if (!response.ok) {
        console.error('❌ [useReportTemplatesForTab] Failed with status:', response.status);
        throw new Error(`Failed to fetch templates for tab: ${tabName}`);
      }

      const data = await response.json();
      console.log('✅ [useReportTemplatesForTab] Fetched data:', data);
      console.log('✅ [useReportTemplatesForTab] Number of templates:', data?.length);
      return data;
    },
    enabled: !!tabName,
  });
}

/**
 * Create a new report template
 */
export function useCreateReportTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateReportTemplateData) => {
      const response = await fetch(`${DJANGO_API_URL}/api/reports/templates/`, {
        method: 'POST',
        headers: { ...getAuthHeaders(), 'Content-Type': 'application/json', },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create report template');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reportTemplates'] });
    },
  });
}

/**
 * Update an existing report template
 */
export function useUpdateReportTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...data }: UpdateReportTemplateData) => {
      const response = await fetch(`${DJANGO_API_URL}/api/reports/templates/${id}/`, {
        method: 'PATCH',
        headers: { ...getAuthHeaders(), 'Content-Type': 'application/json', },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to update report template');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reportTemplates'] });
    },
  });
}

/**
 * Delete a report template
 */
export function useDeleteReportTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`${DJANGO_API_URL}/api/reports/templates/${id}/`, { headers: getAuthHeaders(),
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete report template');
      }

      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reportTemplates'] });
    },
  });
}

/**
 * Toggle active status of a report template
 */
export function useToggleReportTemplateActive() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`${DJANGO_API_URL}/api/reports/templates/${id}/toggle_active/`, { headers: getAuthHeaders(),
        method: 'PATCH',
      });

      if (!response.ok) {
        throw new Error('Failed to toggle template active status');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reportTemplates'] });
    },
  });
}

/**
 * Generate a report from a template
 */
export function useGenerateReport() {
  return useMutation({
    mutationFn: async ({ templateId, projectId }: { templateId: number; projectId: string }) => {
      const response = await fetch(`${DJANGO_API_URL}/api/reports/generate/${templateId}/${projectId}/`, { headers: getAuthHeaders(),
          method: 'POST',
        });

      if (!response.ok) {
        throw new Error('Failed to generate report');
      }

      // Return blob for PDF download
      const blob = await response.blob();
      return { blob, templateId, projectId };
    },
  });
}


// =============================================================================
// Report Definitions API (DB-driven report catalog)
// =============================================================================

/**
 * Fetch report definitions filtered by project type
 */
export function useReportDefinitions(propertyType: string) {
  return useQuery<ReportDefinition[]>({
    queryKey: ['reportDefinitions', propertyType],
    queryFn: async () => {
      const url = `${DJANGO_API_URL}/api/report-definitions/by-type/${propertyType}/`;
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch report definitions');
      return response.json();
    },
    enabled: !!propertyType,
  });
}

/**
 * Fetch all report definitions (unfiltered)
 */
export function useAllReportDefinitions() {
  return useQuery<ReportDefinition[]>({
    queryKey: ['reportDefinitions', 'all'],
    queryFn: async () => {
      const url = `${DJANGO_API_URL}/api/report-definitions/`;
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch report definitions');
      const data = await response.json();
      return data.results || data;
    },
  });
}

/**
 * Fetch preview data for a specific report
 */
export function useReportPreview(
  reportCode: string | null,
  projectId: number | string | null,
  params?: Record<string, string>
) {
  const queryParams = params ? '?' + new URLSearchParams(params).toString() : '';
  return useQuery<ReportPreviewResponse>({
    queryKey: ['reportPreview', reportCode, projectId, params],
    queryFn: async () => {
      const url = `${DJANGO_API_URL}/api/reports/preview/${reportCode}/${projectId}/${queryParams}`;
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch report preview');
      return response.json();
    },
    enabled: !!reportCode && !!projectId,
  });
}

/**
 * Fetch report PDF for inline preview (rendered in iframe).
 * Returns a blob URL that can be used as iframe src.
 */
export function useReportPdfPreview(
  reportCode: string | null,
  projectId: number | string | null,
) {
  return useQuery<string>({
    queryKey: ['reportPdfPreview', reportCode, projectId],
    queryFn: async () => {
      const response = await fetch(
        `${DJANGO_API_URL}/api/reports/export/${reportCode}/${projectId}/`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ format: 'pdf', parameters: {} }),
        }
      );
      if (!response.ok) {
        const contentType = response.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
          const errData = await response.json();
          throw new Error(errData.error || `PDF preview failed (${response.status})`);
        }
        throw new Error(`PDF preview failed (${response.status})`);
      }
      const blob = await response.blob();
      return URL.createObjectURL(blob);
    },
    enabled: !!reportCode && !!projectId,
    staleTime: 5 * 60 * 1000, // Cache 5 min — PDF generation is expensive
    gcTime: 10 * 60 * 1000,
  });
}

/**
 * Export report as PDF or Excel
 */
export function useReportExport() {
  return useMutation({
    mutationFn: async ({
      reportCode,
      projectId,
      format,
      parameters = {},
    }: {
      reportCode: string;
      projectId: number | string;
      format: 'pdf' | 'excel';
      parameters?: Record<string, unknown>;
    }) => {
      const response = await fetch(`${DJANGO_API_URL}/api/reports/export/${reportCode}/${projectId}/`, {
          method: 'POST',
          headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
          body: JSON.stringify({ format, parameters }),
        });
      if (!response.ok) {
        // Try to extract error message from JSON response
        const contentType = response.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
          const errData = await response.json();
          throw new Error(errData.error || `Export failed (${response.status})`);
        }
        throw new Error(`Export failed (${response.status})`);
      }
      const blob = await response.blob();
      return { blob, reportCode, projectId, format };
    },
  });
}

/**
 * Fetch report generation history for a project
 */
export function useReportHistory(projectId: number | string | null) {
  return useQuery<ReportHistoryEntry[]>({
    queryKey: ['reportHistory', projectId],
    queryFn: async () => {
      const url = `${DJANGO_API_URL}/api/reports/history/${projectId}/`;
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch report history');
      return response.json();
    },
    enabled: !!projectId,
  });
}
