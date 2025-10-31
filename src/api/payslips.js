import apiClient from './client';

// Payslip Generation API
export const generatePayslip = async (payslipData) => {
  const response = await apiClient.post('/api/v1/payslips/generate', payslipData);
  return response.data;
};

export const getPayslips = async (params = {}) => {
  const response = await apiClient.get('/api/v1/payslips/list', { params });
  return response.data;
};

export const getPayslip = async (id) => {
  const response = await apiClient.get(`/api/v1/payslips/${id}`);
  return response.data;
};

export const getEmployeePayslips = async (employeeId, params = {}) => {
  const response = await apiClient.get(`/api/v1/payslips/employee/${employeeId}`, { params });
  return response.data;
};

export const updatePayslipStatus = async (id, statusData) => {
  const response = await apiClient.put(`/api/v1/payslips/${id}/status`, statusData);
  return response.data;
};

export const generatePayslipPDF = async (id) => {
  const response = await apiClient.get(`/api/v1/payslips/${id}/pdf`);
  return response.data;
};

export const bulkGeneratePayslips = async (bulkData) => {
  const response = await apiClient.post('/api/v1/payslips/bulk-generate', bulkData);
  return response.data;
};

export const getPayslipSummary = async (params = {}) => {
  const response = await apiClient.get('/api/v1/payslips/summary', { params });
  return response.data;
};

// Payslip templates and configurations
export const getPayslipTemplates = async () => {
  const response = await apiClient.get('/api/v1/payslips/templates');
  return response.data;
};

// Download payslip as PDF
export const downloadPayslipPDF = async (id) => {
  const response = await apiClient.get(`/api/v1/payslips/${id}/pdf`, {
    responseType: 'blob'
  });
  
  // Create blob URL and trigger download
  const blob = new Blob([response.data], { type: 'application/pdf' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `payslip_${id}.pdf`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
  
  return response.data;
};
