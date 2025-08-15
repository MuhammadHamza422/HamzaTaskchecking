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
  // Expected shape: { users: [{ _id, firstName, lastName, email, ... }] }
  return Array.isArray(data?.users) ? data.users : [];
};
