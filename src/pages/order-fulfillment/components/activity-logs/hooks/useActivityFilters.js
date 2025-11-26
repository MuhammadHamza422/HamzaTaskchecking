import { useState, useCallback } from "react";

const INITIAL_FILTERS = {
  search: "",           // Unified search (replaces packingId and dropshipId)
  type: "",
  userId: "",
  platform: "",
  sortBy: "timestamp",  // Default sort by timestamp
  sortOrder: "desc",    // Default descending (newest first)
  startDate: "",
  endDate: "",
};

export function useActivityFilters() {
  const [filters, setFilters] = useState(INITIAL_FILTERS);

  const updateFilter = useCallback((key, value) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
    }));
  }, []);

  const setDateRange = useCallback((dates) => {
    if (!dates) {
      setFilters((prev) => ({
        ...prev,
        startDate: "",
        endDate: "",
      }));
      return;
    }

    setFilters((prev) => ({
      ...prev,
      startDate: dates[0] ? dates[0].format("YYYY-MM-DD") : "",
      endDate: dates[1] ? dates[1].format("YYYY-MM-DD") : "",
    }));
  }, []);

  const clearFilters = useCallback(() => {
    setFilters(INITIAL_FILTERS);
  }, []);

  const hasActiveFilters = 
    filters.search || 
    filters.type || 
    filters.userId ||
    filters.platform ||
    filters.startDate || 
    filters.endDate ||
    filters.sortBy !== "timestamp" ||
    filters.sortOrder !== "desc";

  return {
    filters,
    updateFilter,
    setDateRange,
    clearFilters,
    hasActiveFilters,
  };
}
