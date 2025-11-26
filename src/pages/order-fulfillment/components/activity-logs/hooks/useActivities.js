import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getActivities, createActivity } from "../../../../../api/activityLogs";

export function useActivities(filters, page = 1, limit = 50, includeStats = false) {
  const offset = (page - 1) * limit;

  const queryInfo = useQuery({
    queryKey: ["fulfillment-activities", { ...filters, limit, offset, includeStats }],
    queryFn: () => getActivities({ ...filters, limit, offset, includeStats }),
    staleTime: 0, // No cache as requested
    gcTime: 0, // Don't cache (gcTime replaces cacheTime in v5)
    refetchOnMount: true, // Always refetch on mount
    refetchOnWindowFocus: false,
  });

  // Use pagination metadata from API if available, otherwise calculate
  const pagination = queryInfo.data?.pagination;
  const total = queryInfo.data?.total || 0;
  const totalPages = pagination?.totalPages || Math.ceil(total / limit);

  return {
    ...queryInfo,
    activities: queryInfo.data?.data || [],
    total,
    totalPages,
    pagination: pagination || {
      page,
      limit,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    },
    stats: queryInfo.data?.stats || null, // Stats from API when includeStats=true
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
