import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

const API_BASE = process.env.NEXT_PUBLIC_DJANGO_API_URL || 'http://localhost:8000';

/**
 * Hook to fetch the current user's tier level
 * @returns Query object with tier_level ('analyst' or 'pro')
 */
export function useUserTier() {
  return useQuery({
    queryKey: ['user-tier'],
    queryFn: async () => {
      const response = await fetch(`${API_BASE}/api/users/tier/`);
      if (!response.ok) {
        throw new Error('Failed to fetch user tier');
      }
      const data = await response.json();
      return data.tier_level as 'analyst' | 'pro';
    },
    staleTime: 5 * 60 * 1000, // Consider data fresh for 5 minutes
    gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
  });
}

/**
 * Hook to update the user's tier level
 * @returns Mutation object for updating tier level
 */
export function useUpdateUserTier() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (tierLevel: 'analyst' | 'pro') => {
      const response = await fetch(`${API_BASE}/api/users/tier/`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ tier_level: tierLevel }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update tier');
      }

      return response.json();
    },
    onSuccess: () => {
      // Invalidate tier query to refresh navigation and other components
      queryClient.invalidateQueries({ queryKey: ['user-tier'] });
    },
  });
}
