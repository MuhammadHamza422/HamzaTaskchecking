import apiClient from './client';

// Tax Calculation API
export const calculateTax = async (taxData) => {
  const response = await apiClient.post('/api/v1/tax/calculate', taxData);
  return response.data;
};

export const getTaxConfig = async (country, year) => {
  const response = await apiClient.get(`/api/v1/tax/config/${country}/${year}`);
  return response.data;
};

export const updateTaxConfig = async (country, year, configData) => {
  const response = await apiClient.put(`/api/v1/tax/config/${country}/${year}`, configData);
  return response.data;
};

export const createTaxConfig = async (configData) => {
  const response = await apiClient.post('/api/v1/tax/config', configData);
  return response.data;
};

export const getTaxConfigs = async (params = {}) => {
  const response = await apiClient.get('/api/v1/tax/configs', { params });
  return response.data;
};

export const deactivateTaxConfig = async (country, year) => {
  const response = await apiClient.delete(`/api/v1/tax/config/${country}/${year}`);
  return response.data;
};

// Tax calculation helpers
export const calculateEmployeeTax = async (employeeId, grossIncome, country, year, templateType) => {
  return calculateTax({
    employeeId,
    grossIncome,
    country,
    year,
    templateType
  });
};

// Get available countries and years for tax configs
export const getTaxCountries = async () => {
  const response = await apiClient.get('/api/v1/tax/countries');
  return response.data;
};

export const getTaxYears = async (country) => {
  const response = await apiClient.get(`/api/v1/tax/years/${country}`);
  return response.data;
};
