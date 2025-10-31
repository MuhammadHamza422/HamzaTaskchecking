import client from './client';

/**
 * Get company-specific attendance rules
 * @param {string} companyId - Company ID
 * @returns {Promise<Object>} Company rules
 */
export const getCompanyRules = async (companyId) => {
  try {
    const response = await client.get(`/api/v1/company/${companyId}/attendance-rules`);
    return response.data;
  } catch (error) {
    console.error('Error fetching company rules:', error);
    throw error;
  }
};

/**
 * Get all companies' attendance rules (paginated)
 * @param {number} page
 * @param {number} limit
 * @returns {Promise<Object>} { success, total, page, perPage, data }
 */
export const getAllCompanyRules = async (page = 1, limit = 30) => {
  try {
    const response = await client.get(`/api/v1/company/rules`, {
      params: { page, limit }
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching all company rules:', error);
    throw error;
  }
};

/**
 * Update company rules (admin only)
 * @param {string} companyId - Company ID
 * @param {Object} rules - Updated rules
 * @returns {Promise<Object>} Updated company rules
 */
export const updateCompanyRules = async (companyId, rules) => {
  try {
    const response = await client.put(`/api/v1/company/${companyId}/attendance-rules`, rules);
    return response.data;
  } catch (error) {
    console.error('Error updating company rules:', error);
    throw error;
  }
};

/**
 * Validate if employee can start a break
 * @param {string} employeeId - Employee ID
 * @param {string} companyId - Company ID
 * @returns {Promise<Object>} Break validation result
 */
export const validateBreak = async (employeeId, companyId) => {
  try {
    const response = await client.post('/api/v1/attendance/validate/break-start', {
      employeeId
    });
    return response.data;
  } catch (error) {
    console.error('Error validating break:', error);
    throw error;
  }
};

/**
 * Validate attendance actions against company rules
 * @param {string} action - Action type (checkin, checkout, break_start, break_end)
 * @param {string} employeeId - Employee ID
 * @param {string} companyId - Company ID
 * @param {Object} data - Action-specific data
 * @returns {Promise<Object>} Validation result
 */
export const validateAttendanceAction = async (action, employeeId, companyId, data = {}) => {
  try {
    let path = '';
    if (action === 'checkin') path = '/api/v1/attendance/validate/checkin';
    else if (action === 'checkout') path = '/api/v1/attendance/validate/checkout';
    else if (action === 'breakStart' || action === 'break_start') path = '/api/v1/attendance/validate/break-start';
    else if (action === 'breakEnd' || action === 'break_end') path = '/api/v1/attendance/validate/break-end';
    else path = '/api/v1/attendance/validate/checkout';

    const response = await client.post(path, { employeeId, ...data });
    return response.data;
  } catch (error) {
    console.error('Error validating attendance action:', error);
    throw error;
  }
};
