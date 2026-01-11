/**
 * useActivityFeed Hook
 *
 * React Query hooks for fetching and managing Landscaper activity feed.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

export interface ActivityItem {
  id: string;
  type: 'status' | 'decision' | 'update' | 'alert';
  title: string;
  summary: string;
  status: 'complete' | 'partial' | 'blocked' | 'pending';
  confidence: 'high' | 'medium' | 'low' | null;
  timestamp: string;
  read: boolean;
  link?: string;
  blockedBy?: string;
  details?: string[];
  highlightFields?: string[];
}

interface ActivityFeedResponse {
  activities: ActivityItem[];
  count: number;
  unread_count: number;
  error?: string;
}

interface MarkReadResponse {
  success: boolean;
  activity?: ActivityItem;
  error?: string;
}

interface MarkAllReadResponse {
  success: boolean;
  updated_count?: number;
  error?: string;
}

/**
 * Fetch activity feed for a project.
 */
export function useActivityFeed(projectId?: string | number) {
  const id = projectId?.toString() || '';

  return useQuery<ActivityFeedResponse>({
    queryKey: ['landscaper-activities', id],
    queryFn: async () => {
      const response = await fetch(`/api/projects/${id}/landscaper/activities`);
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to fetch activities');
      }
      return response.json();
    },
    enabled: Boolean(id),
    staleTime: 30_000, // 30 seconds
    refetchInterval: 60_000, // Auto-refresh every minute
  });
}

/**
 * Mark a single activity as read.
 */
export function useMarkActivityRead(projectId?: string | number) {
  const queryClient = useQueryClient();
  const id = projectId?.toString() || '';

  return useMutation<MarkReadResponse, Error, string>({
    mutationFn: async (activityId: string) => {
      if (!id) {
        throw new Error('Project ID is required');
      }

      const response = await fetch(
        `/api/projects/${id}/landscaper/activities/${activityId}/mark-read`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        }
      );

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to mark activity as read');
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['landscaper-activities', id] });
    },
    // Optimistic update
    onMutate: async (activityId) => {
      await queryClient.cancelQueries({ queryKey: ['landscaper-activities', id] });

      const previousData = queryClient.getQueryData<ActivityFeedResponse>([
        'landscaper-activities',
        id,
      ]);

      if (previousData) {
        queryClient.setQueryData<ActivityFeedResponse>(['landscaper-activities', id], {
          ...previousData,
          activities: previousData.activities.map((a) =>
            a.id === activityId ? { ...a, read: true } : a
          ),
          unread_count: Math.max(0, previousData.unread_count - 1),
        });
      }

      return { previousData };
    },
    onError: (_err, _activityId, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(['landscaper-activities', id], context.previousData);
      }
    },
  });
}

/**
 * Mark all activities as read.
 */
export function useMarkAllRead(projectId?: string | number) {
  const queryClient = useQueryClient();
  const id = projectId?.toString() || '';

  return useMutation<MarkAllReadResponse, Error, void>({
    mutationFn: async () => {
      if (!id) {
        throw new Error('Project ID is required');
      }

      const response = await fetch(
        `/api/projects/${id}/landscaper/activities/mark-all-read`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        }
      );

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to mark all as read');
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['landscaper-activities', id] });
    },
    // Optimistic update
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ['landscaper-activities', id] });

      const previousData = queryClient.getQueryData<ActivityFeedResponse>([
        'landscaper-activities',
        id,
      ]);

      if (previousData) {
        queryClient.setQueryData<ActivityFeedResponse>(['landscaper-activities', id], {
          ...previousData,
          activities: previousData.activities.map((a) => ({ ...a, read: true })),
          unread_count: 0,
        });
      }

      return { previousData };
    },
    onError: (_err, _variables, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(['landscaper-activities', id], context.previousData);
      }
    },
  });
}
