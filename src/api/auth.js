import apiClient from "./client";

export const fetchUserActivity = async ({
  page = 1,
  limit = 30,
  app,
  date,
  user,
}) => {
  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  });

  if (date) {
    params.append("date", date);
  }
  if (user) {
    params.append("user", user);
  }
  if (app) {
    params.append("app", app);
  }

  const { data } = await apiClient.get(
    `/api/v1/auth/activity?${params.toString()}`
  );
  return data;
};

export const fetchAllUsers = async () => {
  const { data } = await apiClient.get("/api/v1/auth/all");
  return Array.isArray(data?.users) ? data.users : [];
};

export const fetchRoles = async () => {
  const { data } = await apiClient.get("/api/v1/auth/roles");
  return Array.isArray(data?.roles) ? data.roles : [];
};

/**
 * Kiosk employees with optional company filter + search
 * returns { success, page, perPage, total, users: [...] }
 */
export const fetchEmployeesForKiosk = async ({
  page = 1,
  limit = 50,
  search = "",
  companyId,
} = {}) => {
  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  });
  if (search.trim()) params.append("search", search.trim());
  if (companyId) params.append("companyId", String(companyId));
  const { data } = await apiClient.get(
    `/api/v1/auth/employees?${params.toString()}`
  );
  return data;
};

/** Admin: set/reset a user's kiosk PIN (4–6 digits) */
export const setEmployeeKioskPin = async (userId, pin) => {
  const { data } = await apiClient.patch(`/api/v1/auth/${userId}/kiosk-pin`, {
    pin,
  });
  return data;
};
