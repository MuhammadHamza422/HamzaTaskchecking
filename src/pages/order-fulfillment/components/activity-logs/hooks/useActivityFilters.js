import { useState, useCallback } from "react";

const INITIAL_FILTERS = {
  packingId: "",
  dropshipId: "",
  type: "",
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
    filters.packingId || 
    filters.dropshipId || 
    filters.type || 
    filters.startDate || 
    filters.endDate;

  return {
    filters,
    updateFilter,
    setDateRange,
    clearFilters,
    hasActiveFilters,
  };
}
