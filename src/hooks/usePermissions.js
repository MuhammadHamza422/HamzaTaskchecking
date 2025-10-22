// src/hooks/usePermissions.js
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import apiClient from "../api/client";
import { useAuth } from "../contexts/AuthContext";


function pickAndNormalizeRole(raw, roleKey) {
  const rolesArr = Array.isArray(raw?.roles) ? raw.roles : [];

  // Find the record that matches the current user's role (case-insensitive)
  const current =
    rolesArr.find(
      (r) => String(r?.role || "").trim().toLowerCase() === roleKey
    ) || null;

  // If not found (some backends return one role only), fall back to the first
  const roleDoc = current || rolesArr[0] || { access: [] };

  const accessList = Array.isArray(roleDoc.access) ? roleDoc.access : [];

  // Merge duplicates by app (defensive), keep original labels for display
  const byApp = new Map();
  for (const a of accessList) {
    const appLabel = String(a?.app || "").trim();
    if (!appLabel) continue;
    const appKey = appLabel.toLowerCase();

    const menuArr = Array.isArray(a?.menu) ? a.menu : [];
    if (!byApp.has(appKey)) {
      byApp.set(appKey, { app: appLabel, menu: new Set() });
    }
    const entry = byApp.get(appKey);
    for (const m of menuArr) {
      const mm = String(m || "").trim();
      if (mm) entry.menu.add(mm);
    }
  }

  const mergedAccess = Array.from(byApp.values()).map(({ app, menu }) => ({
    app,
    menu: Array.from(menu),
  }));

  return { mergedAccess };
}

/**
 * Fetch and cache permissions for the current user's role.
 * Returns react-query result (data, isLoading, error, etc.)
 */
export function usePermissions() {
  const { user } = useAuth();
  const roleKey = useMemo(
    () => String(user?.roles?.role || user?.role || "").trim().toLowerCase(),
    [user]
  );

  return useQuery({
    queryKey: ["permissions", roleKey],
    enabled: !!roleKey, // don't fetch until we know the user's role
    queryFn: async () => {
      const { data } = await apiClient.get("/api/v1/role/all");
      return pickAndNormalizeRole(data, roleKey);
    },
    // sensible caching so you don't refetch on every component mount
    staleTime: 5 * 60 * 1000, // 5 minutes "fresh"
    cacheTime: 30 * 60 * 1000, // 30 minutes in cache
    retry: 1, // be gentle on failures
  });
}

export function useCan(app, menu) {
  const { data, isLoading } = usePermissions();

  if (isLoading) return null;

  const access = Array.isArray(data?.mergedAccess) ? data.mergedAccess : [];
  const appKey = String(app || "").trim().toLowerCase();
  const menuKey = String(menu || "").trim().toLowerCase();

  const appEntry = access.find(
    (a) => String(a?.app || "").trim().toLowerCase() === appKey
  );
  if (!appEntry) return false;

  const has = (appEntry.menu || [])
    .map((m) => String(m).trim().toLowerCase())
    .includes(menuKey);

  return !!has;
}


export function useAccessList() {
  const { data } = usePermissions();
  return Array.isArray(data?.mergedAccess) ? data.mergedAccess : [];
}
