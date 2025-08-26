import apiClient from "./client";

export const requestTimeOff = async (payload) => {
  const { data } = await apiClient.post("/api/v1/timeoff/request", payload);
  return data;
};

export const myTimeOff = async (params = {}) => {
  const qs = new URLSearchParams(params).toString();
  const { data } = await apiClient.get(`/api/v1/timeoff/me${qs ? `?${qs}` : ""}`);
  return data;
};

export const listTimeOff = async (params = {}) => {
  const qs = new URLSearchParams(params).toString();
  const { data } = await apiClient.get(`/api/v1/timeoff${qs ? `?${qs}` : ""}`);
  return data;
};

export const approveTimeOff = async (id) => {
  const { data } = await apiClient.patch(`/api/v1/timeoff/${id}/approve`);
  return data;
};

export const refuseTimeOff = async (id, reason = "") => {
  const { data } = await apiClient.patch(`/api/v1/timeoff/${id}/refuse`, { reason });
  return data;
};

export const fetchAdminTimeOffTypes = async () => {
  const { data } = await apiClient.get("/api/v1/admin/timeoff/types");
  return Array.isArray(data?.types) ? data.types : [];
};

// For normal users
export const fetchUserTimeOffTypes = async () => {
  const { data } = await apiClient.get("/api/v1/timeoff/types");
  return Array.isArray(data?.types) ? data.types : [];
};

export const createTimeOffType = async (payload) => {
  const { data } = await apiClient.post("/api/v1/admin/timeoff/types", payload);
  return data;
};

export const updateTimeOffType = async (id, payload) => {
  const { data } = await apiClient.patch(`/api/v1/admin/timeoff/types/${id}`, payload);
  return data;
};

export const deleteTimeOffType = async (id) => {
  const { data } = await apiClient.delete(`/api/v1/admin/timeoff/types/${id}`);
  return data;
};

export const allocateTimeOff = async (payload) => {
  const { data } = await apiClient.post("/api/v1/admin/timeoff/allocations", payload);
  return data;
};

export const fetchMyBalance = async () => {
  try {
    const { data } = await apiClient.get("/api/v1/timeoff/me/balance");
    console.log("[fetchMyBalance] Response:", data);
    return data.balance || [];
  } catch (error) {
    console.error("[fetchMyBalance] Error:", error);
    return [];
  }
};

export const deleteTimeOff = async (id) => {
  const { data } = await apiClient.delete(`/api/v1/timeoff/${id}`);
  return data;
};

export const updateTimeOff = async (id, payload) => {
  const { data } = await apiClient.put(`/api/v1/timeoff/${id}`, payload);
  return data;
};
