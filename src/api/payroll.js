import client from './client';

/**
 * Get employee payroll information
 * @param {string} employeeId - Employee ID
 * @returns {Promise<Object>} Employee payroll data
 */
export const getEmployeePayroll = async (employeeId) => {
  try {
    const response = await client.get(`/api/v1/payroll/employees/${employeeId}/payroll`);
    return response.data;
  } catch (error) {
    console.error('Error fetching employee payroll:', error);
    throw error;
  }
};

/**
 * Update employee payroll information
 * @param {string} employeeId - Employee ID
 * @param {Object} payrollData - Payroll data
 * @returns {Promise<Object>} Updated payroll data
 */
export const updateEmployeePayroll = async (employeeId, payrollData) => {
  try {
    const response = await client.put(`/api/v1/payroll/employees/${employeeId}/payroll`, payrollData);
    return response.data;
  } catch (error) {
    console.error('Error updating employee payroll:', error);
    throw error;
  }
};

/**
 * Bulk update employee payroll
 * @param {Object} bulkData - Bulk update data
 * @returns {Promise<Object>} Bulk update result
 */
export const bulkUpdateEmployeePayroll = async (bulkData) => {
  try {
    const response = await client.post('/api/v1/payroll/employees/payroll/bulk', bulkData);
    return response.data;
  } catch (error) {
    console.error('Error bulk updating employee payroll:', error);
    throw error;
  }
};

/**
 * Recalculate attendance payroll
 * @param {string} attendanceId - Attendance ID
 * @returns {Promise<Object>} Recalculation result
 */
export const recalculateAttendancePayroll = async (attendanceId) => {
  try {
    const response = await client.post(`/api/v1/payroll/attendance/${attendanceId}/payroll/recalculate`);
    return response.data;
  } catch (error) {
    console.error('Error recalculating attendance payroll:', error);
    throw error;
  }
};

/**
 * Recalculate payroll for date range
 * @param {Object} rangeData - Date range data
 * @returns {Promise<Object>} Recalculation result
 */
export const recalculatePayrollRange = async (rangeData) => {
  try {
    const response = await client.post('/api/v1/payroll/attendance/payroll/recalculate', rangeData);
    return response.data;
  } catch (error) {
    console.error('Error recalculating payroll range:', error);
    throw error;
  }
};

/**
 * Get payroll summary
 * @param {Object} params - Query parameters
 * @returns {Promise<Object>} Payroll summary
 */
export const getPayrollSummary = async (params) => {
  try {
    const response = await client.get('/api/v1/payroll/summary', { params });
    return response.data;
  } catch (error) {
    console.error('Error fetching payroll summary:', error);
    throw error;
  }
};

/**
 * Export payroll data
 * @param {Object} params - Export parameters
 * @returns {Promise<Object>} Export data
 */
export const exportPayrollData = async (params) => {
  try {
    const response = await client.get('/api/v1/payroll/export', { params });
    return response.data;
  } catch (error) {
    console.error('Error exporting payroll data:', error);
    throw error;
  }
};
