import apiClient from "./client";

// For self
export const checkIn = (note) =>
  apiClient.post("/api/v1/attendance/check-in", { note }).then(r => r.data);

export const checkOut = () =>
  apiClient.post("/api/v1/attendance/check-out").then(r => r.data);

export const startBreak = (note) =>
  apiClient.post("/api/v1/attendance/break/start", { note }).then(r => r.data);

export const endBreak = () =>
  apiClient.post("/api/v1/attendance/break/end").then(r => r.data);

export const getMyStatus = ({ user } = {}) => {
  const p = new URLSearchParams();
  if (user) p.append("user", user);
  const qs = p.toString();
  return apiClient.get(`/api/v1/attendance/status${qs ? `?${qs}` : ""}`).then(r => r.data);
};

export const getMyAttendance = ({ page = 1, limit = 30, from, to } = {}) => {
  const p = new URLSearchParams({ page, limit });
  if (from) p.append("from", from);
  if (to) p.append("to", to);
  return apiClient.get(`/api/v1/attendance/me?${p.toString()}`).then(r => r.data);
};

// Kiosk/admin acting on behalf of someone (NOW REQUIRES PIN)
export const kioskCheckIn = ({ employeeId, note, pin }) =>
  apiClient.post("/api/v1/attendance/check-in", { employeeId, note, pin }).then(r => r.data);

export const kioskCheckOut = ({ employeeId, pin }) =>
  apiClient.post("/api/v1/attendance/check-out", { employeeId, pin }).then(r => r.data);

export const kioskStartBreak = ({ employeeId, note, pin }) =>
  apiClient.post("/api/v1/attendance/break/start", { employeeId, note, pin }).then(r => r.data);

export const kioskEndBreak = ({ employeeId, pin }) =>
  apiClient.post("/api/v1/attendance/break/end", { employeeId, pin }).then(r => r.data);

export const listAttendance = ({ user, page = 1, limit = 30, from, to } = {}) => {
  const p = new URLSearchParams({ page, limit });
  if (user) p.append("user", user);
  if (from) p.append("from", from);
  if (to) p.append("to", to);
  return apiClient.get(`/api/v1/attendance?${p.toString()}`).then(r => r.data);
};

// Admin-only: manual create with custom timestamps
export const manualCreateAttendance = ({ userId, checkInAt, checkOutAt, note, tzOffsetMinutes, breaks }) =>
  apiClient.post("/api/v1/attendance/manual", { userId, checkInAt, checkOutAt, note, tzOffsetMinutes, breaks }).then(r => r.data);

export const adminUpdateAttendance = (id, patch) =>
  apiClient.patch(`/api/v1/attendance/${id}`, patch).then(r => r.data);

export const adminDeleteAttendance = (id) =>
  apiClient.delete(`/api/v1/attendance/${id}`).then(r => r.data);
