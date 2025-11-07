import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { getVendors, getCompanies, getUsers } from "../api/procurement";

const ProcurementDataContext = createContext(null);

/**
 * Procurement Data Context
 * Provides shared vendors, companies, and buyers data with simple caching
 * Cache is cleared when component unmounts or on manual refresh
 */
export const ProcurementDataProvider = ({ children }) => {
  const [vendors, setVendors] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [buyers, setBuyers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadDropdownData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [vendorsData, companiesData, buyersData] = await Promise.all([
        getVendors({ limit: 1000 }),
        getCompanies(),
        getUsers(),
      ]);
      setVendors(vendorsData || []);
      setCompanies(companiesData || []);
      setBuyers(buyersData || []);
    } catch (err) {
      console.error("Failed to load dropdown data:", err);
      setError(err);
      setVendors([]);
      setCompanies([]);
      setBuyers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDropdownData();
  }, [loadDropdownData]);

  const refreshData = useCallback(() => {
    loadDropdownData();
  }, [loadDropdownData]);

  const value = {
    vendors,
    companies,
    buyers,
    loading,
    error,
    refreshData,
  };

  return (
    <ProcurementDataContext.Provider value={value}>
      {children}
    </ProcurementDataContext.Provider>
  );
};

export const useProcurementData = () => {
  const context = useContext(ProcurementDataContext);
  if (!context) {
    throw new Error("useProcurementData must be used within ProcurementDataProvider");
  }
  return context;
};

