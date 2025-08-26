import apiClient from "./client";

/** Get all active companies (id, name, timezone) */
export const fetchCompanies = async () => {
  const { data } = await apiClient.get("/api/v1/company/all");
  return Array.isArray(data?.companies) ? data.companies : [];
};

export const createCompany = async (payload) => {
  const { data } = await apiClient.post("/api/v1/company/create", payload);
  return data;
};

export const updateCompany = async (id, patch) => {
  const { data } = await apiClient.patch(`/api/v1/company/update/${id}`, patch);
  return data;
};

export const deleteCompany = async (id) => {
  const { data } = await apiClient.delete(`/api/v1/company/delete/${id}`);
  return data;
};
