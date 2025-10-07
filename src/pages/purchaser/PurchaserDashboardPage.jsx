

// /src/pages/purchaser/PurchaserDashboardPage.jsx
import React, { useCallback, useEffect, useState } from "react";
import { message } from "antd";
import { useAuth } from "../../contexts/AuthContext";
import apiClient from "../../api/client";
import PurchaserDashboard from "./PurchaserDashboard";

const pickRows = (body) =>
  Array.isArray(body)
    ? body
    : body?.docs || body?.data || body?.results || body?.items || [];

// safe date parser
const toDate = (v) => {
  if (!v) return null;
  const d = new Date(v);
  return Number.isFinite(d.getTime()) ? d : null;
};

export default function PurchaserDashboardPage() {
  const { user } = useAuth();
  const role = String(user?.roles?.role || "").toLowerCase();
  const isAdmin = role === "admin";

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // Use all-sourcing for admin to include Purchased and other states.
      const endpoint = isAdmin
        ? "/api/v1/sourcing/all-sourcing"
        : "/api/v1/sourcing/assigned";

      const params = {
        sort: "-createdAt",
        page: 1,
        limit: 200,
        ...(isAdmin ? {} : { mine: true }),
      };

      const { data } = await apiClient.get(endpoint, { params });
      const raw = pickRows(data);

      // Enrich for Average Response Time = avg(purchaserResponseTime)
      const enriched = raw.map((r) => {
        const rtMs = Number(r?.purchaserResponseTime);
        if (!Number.isFinite(rtMs) || rtMs < 0) return r;

        // Prefer an existing assigned/created timestamp; fallback to now - rtMs
        const assignedBase =
          toDate(r?.assignedAt) ||
          toDate(r?.assigned_at) ||
          toDate(r?.createdAt) ||
          toDate(r?.created_at) ||
          new Date(Date.now() - rtMs);

        const purchaserActionDate = new Date(assignedBase.getTime() + rtMs);

        return {
          ...r,
          assignedAt: assignedBase.toISOString(),
          purchaserActionTime: purchaserActionDate.toISOString(),
        };
      });

      setRows(enriched);
    } catch (e) {
      message.error(
        e?.response?.data?.message || "Failed to load purchaser data."
      );
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [isAdmin]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return (
    <PurchaserDashboard
      data={rows}
      loading={loading}
      onRefresh={fetchData}
      isAdmin={isAdmin}
    />
  );
}