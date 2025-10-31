import apiClient from './client';

// Employee Management API
export const getEmployees = async (params = {}) => {
  const response = await apiClient.get('/api/v1/employees/list', { params });
  return response.data;
};

export const getEmployee = async (id) => {
  const response = await apiClient.get(`/api/v1/employees/${id}`);
  return response.data;
};

export const createEmployee = async (employeeData) => {
  const response = await apiClient.post('/api/v1/employees/create', employeeData);
  return response.data;
};

export const updateEmployee = async (id, employeeData) => {
  const response = await apiClient.put(`/api/v1/employees/${id}/update`, employeeData);
  return response.data;
};

export const deleteEmployee = async (id) => {
  const response = await apiClient.delete(`/api/v1/employees/${id}/delete`);
  return response.data;
};

export const getEmployeesByCompany = async (companyId, params = {}) => {
  const response = await apiClient.get(`/api/v1/employees/company/${companyId}`, { params });
  return response.data;
};

export const bulkImportEmployees = async (employees) => {
  const response = await apiClient.post('/api/v1/employees/bulk-import', { employees });
  return response.data;
};

export const restoreEmployee = async (id) => {
  const response = await apiClient.post(`/api/v1/employees/${id}/restore`);
  return response.data;
};

// Deleted employees (trash)
export const getDeletedEmployees = async (params = {}) => {
  const response = await apiClient.get('/api/v1/employees/deleted', { params });
  return response.data;
};

// Hard delete (permanent) - only from Deleted tab
export const hardDeleteEmployee = async (id, force = false) => {
  const url = force 
    ? `/api/v1/employees/${id}/hard-delete?force=true`
    : `/api/v1/employees/${id}/hard-delete`;
  const response = await apiClient.delete(url);
  return response.data;
};

// Employee search and filtering
export const searchEmployees = async (query, filters = {}) => {
  const params = {
    search: query,
    ...filters
  };
  return getEmployees(params);
};

// Get employee statistics
export const getEmployeeStats = async (companyId) => {
  const response = await apiClient.get(`/api/v1/employees/stats/${companyId}`);
  return response.data;
};
