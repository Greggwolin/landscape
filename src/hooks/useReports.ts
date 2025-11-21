/**
 * React Query hooks for Report Templates API
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

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

      return response.json();
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
      const response = await fetch(`${DJANGO_API_URL}/api/reports/templates/for-tab/${encodeURIComponent(tabName)}/`);

      if (!response.ok) {
        throw new Error(`Failed to fetch templates for tab: ${tabName}`);
      }

      return response.json();
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
        headers: {
          'Content-Type': 'application/json',
        },
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
        headers: {
          'Content-Type': 'application/json',
        },
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
      const response = await fetch(`${DJANGO_API_URL}/api/reports/templates/${id}/`, {
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
      const response = await fetch(`${DJANGO_API_URL}/api/reports/templates/${id}/toggle_active/`, {
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
      const response = await fetch(
        `${DJANGO_API_URL}/api/reports/generate/${templateId}/${projectId}/`,
        {
          method: 'POST',
        }
      );

      if (!response.ok) {
        throw new Error('Failed to generate report');
      }

      // Return blob for PDF download
      const blob = await response.blob();
      return { blob, templateId, projectId };
    },
  });
}
