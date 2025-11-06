import apiClient from "./client";

/** Get all active companies (id, name, timezone) */
export const fetchCompanies = async () => {
  const { data } = await apiClient.get("/api/v1/company/all");
  return Array.isArray(data?.companies) ? data.companies : [];
};

/**
 * Create company with FormData (supports multipart/form-data for logo upload)
 * @param {FormData} formData - FormData object with company fields
 */
export const createCompany = async (formData) => {
  const { data } = await apiClient.post("/api/v1/company/create", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
  return data;
};

/**
 * Update company with FormData (supports multipart/form-data for logo upload)
 * @param {string} id - Company ID
 * @param {FormData} formData - FormData object with company fields
 */
export const updateCompany = async (id, formData) => {
  const { data } = await apiClient.patch(`/api/v1/company/update/${id}`, formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
  return data;
};

export const deleteCompany = async (id) => {
  const { data } = await apiClient.delete(`/api/v1/company/delete/${id}`);
  return data;
};
