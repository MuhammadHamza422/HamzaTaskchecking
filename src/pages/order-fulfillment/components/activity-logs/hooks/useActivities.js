import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getActivities, createActivity } from "../../../../../api/activityLogs";

export function useActivities(filters, page = 1, limit = 50) {
  const offset = (page - 1) * limit;

  const queryInfo = useQuery({
    queryKey: ["fulfillment-activities", { ...filters, limit, offset }],
    queryFn: () => getActivities({ ...filters, limit, offset }),
    staleTime: 0, // No cache as requested
    gcTime: 0, // Don't cache (gcTime replaces cacheTime in v5)
    refetchOnMount: true, // Always refetch on mount
    refetchOnWindowFocus: false,
  });

  return {
    ...queryInfo,
    activities: queryInfo.data?.data || [],
    total: queryInfo.data?.total || 0,
    totalPages: Math.ceil((queryInfo.data?.total || 0) / limit),
  };
}

export function useCreateActivity() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createActivity,
    onSuccess: () => {
      // Invalidate and refetch activities
      queryClient.invalidateQueries({ queryKey: ["fulfillment-activities"] });
    },
  });
}
