import Swal from 'sweetalert2';

/**
 * SweetAlert2 utility functions for attendance system
 */

// Toast configuration
const Toast = Swal.mixin({
  toast: true,
  position: 'top-end',
  showConfirmButton: false,
  timer: 3000,
  timerProgressBar: true,
  zIndex: 99999, // Very high z-index to ensure visibility in fullscreen
  target: 'body', // Always render in body
  didOpen: (toast) => {
    toast.addEventListener('mouseenter', Swal.stopTimer);
    toast.addEventListener('mouseleave', Swal.resumeTimer);
    // Ensure toast is visible in fullscreen
    toast.style.zIndex = '99999';
    toast.style.position = 'fixed';
  }
});

/**
 * Show success toast notification
 * @param {string} message - Success message
 * @param {string} title - Optional title
 */
export const showSuccessToast = (message, title = 'Success') => {
  Toast.fire({
    icon: 'success',
    title,
    text: message
  });
};

/**
 * Show error toast notification
 * @param {string} message - Error message
 * @param {string} title - Optional title
 */
export const showErrorToast = (message, title = 'Error') => {
  Toast.fire({
    icon: 'error',
    title,
    text: message
  });
};

/**
 * Show warning toast notification
 * @param {string} message - Warning message
 * @param {string} title - Optional title
 */
export const showWarningToast = (message, title = 'Warning') => {
  Toast.fire({
    icon: 'warning',
    title,
    text: message
  });
};

/**
 * Show info toast notification
 * @param {string} message - Info message
 * @param {string} title - Optional title
 */
export const showInfoToast = (message, title = 'Info') => {
  Toast.fire({
    icon: 'info',
    title,
    text: message
  });
};

/**
 * Show confirmation dialog for check-in
 * @param {Object} employee - Employee object
 * @param {Object} companyRules - Company rules
 * @returns {Promise<boolean>} - User confirmation
 */
export const confirmCheckIn = async (employee, companyRules) => {
  const result = await Swal.fire({
    title: 'Check In Confirmation',
    html: `
      <div style="text-align: left;">
        <p><strong>Employee:</strong> ${employee.firstName} ${employee.lastName}</p>
        <p><strong>Company:</strong> ${companyRules.name || 'Unknown'}</p>
        ${companyRules.isFixedShift ? `
          <p><strong>Shift Type:</strong> ${companyRules.rules?.workHours || 8} hours work + ${companyRules.rules?.breakHours || 1} hour break</p>
          ${companyRules.rules?.breakRequired ? '<p style="color: #f59e0b;"><strong>⚠️ Break is compulsory</strong></p>' : ''}
        ` : '<p><strong>Shift Type:</strong> Hourly basis (flexible)</p>'}
      </div>
    `,
    icon: 'question',
    showCancelButton: true,
    confirmButtonColor: '#10b981',
    cancelButtonColor: '#6b7280',
    confirmButtonText: 'Yes, Check In',
    cancelButtonText: 'Cancel',
    reverseButtons: true
  });

  return result.isConfirmed;
};

/**
 * Show confirmation dialog for check-out
 * @param {Object} employee - Employee object
 * @param {Object} companyRules - Company rules
 * @param {Object} workProgress - Work progress info
 * @returns {Promise<boolean>} - User confirmation
 */
export const confirmCheckOut = async (employee, companyRules, workProgress) => {
  const result = await Swal.fire({
    title: 'Check Out Confirmation',
    html: `
      <div style="text-align: left;">
        <p><strong>Employee:</strong> ${employee.firstName} ${employee.lastName}</p>
        <p><strong>Company:</strong> ${companyRules.name || 'Unknown'}</p>
        ${workProgress ? `
          <p><strong>Work Progress:</strong> ${Math.round(workProgress.progress)}% (${workProgress.workedMinutes} minutes)</p>
          ${workProgress.remainingMinutes > 0 ? `<p style="color: #f59e0b;">⚠️ ${workProgress.remainingMinutes} minutes remaining in shift</p>` : ''}
        ` : ''}
        ${companyRules.rules?.breakRequired && workProgress?.workedMinutes > 240 ? 
          '<p style="color: #ef4444;"><strong>⚠️ Break is required but not taken!</strong></p>' : ''}
      </div>
    `,
    icon: 'question',
    showCancelButton: true,
    confirmButtonColor: '#ef4444',
    cancelButtonColor: '#6b7280',
    confirmButtonText: 'Yes, Check Out',
    cancelButtonText: 'Cancel',
    reverseButtons: true
  });

  return result.isConfirmed;
};

/**
 * Show confirmation dialog for starting break
 * @param {Object} employee - Employee object
 * @param {Object} companyRules - Company rules
 * @param {number} remainingBreakTime - Remaining break time in minutes
 * @returns {Promise<boolean>} - User confirmation
 */
export const confirmStartBreak = async (employee, companyRules, remainingBreakTime) => {
  const result = await Swal.fire({
    title: 'Start Break Confirmation',
    html: `
      <div style="text-align: left;">
        <p><strong>Employee:</strong> ${employee.firstName} ${employee.lastName}</p>
        <p><strong>Company:</strong> ${companyRules.name || 'Unknown'}</p>
        ${remainingBreakTime !== null ? `
          <p><strong>Remaining Break Time:</strong> ${remainingBreakTime} minutes</p>
        ` : ''}
        ${companyRules.rules?.breakRequired ? 
          '<p style="color: #10b981;"><strong>✅ Break is required for this company</strong></p>' : 
          '<p style="color: #6b7280;">Break is optional</p>'}
        ${companyRules.rules?.multipleBreaks ? 
          '<p style="color: #3b82f6;">Multiple breaks allowed</p>' : 
          '<p style="color: #f59e0b;">Single break only</p>'}
      </div>
    `,
    icon: 'question',
    showCancelButton: true,
    confirmButtonColor: '#3b82f6',
    cancelButtonColor: '#6b7280',
    confirmButtonText: 'Start Break',
    cancelButtonText: 'Cancel',
    reverseButtons: true
  });

  return result.isConfirmed;
};

/**
 * Show confirmation dialog for ending break
 * @param {Object} employee - Employee object
 * @param {Object} companyRules - Company rules
 * @returns {Promise<boolean>} - User confirmation
 */
export const confirmEndBreak = async (employee, companyRules) => {
  const result = await Swal.fire({
    title: 'End Break Confirmation',
    html: `
      <div style="text-align: left;">
        <p><strong>Employee:</strong> ${employee.firstName} ${employee.lastName}</p>
        <p><strong>Company:</strong> ${companyRules.name || 'Unknown'}</p>
        <p>Are you sure you want to end your current break?</p>
      </div>
    `,
    icon: 'question',
    showCancelButton: true,
    confirmButtonColor: '#10b981',
    cancelButtonColor: '#6b7280',
    confirmButtonText: 'End Break',
    cancelButtonText: 'Cancel',
    reverseButtons: true
  });

  return result.isConfirmed;
};

/**
 * Show force checkout warning
 * @param {Object} employee - Employee object
 * @param {string} reason - Reason for force checkout
 * @returns {Promise<boolean>} - User acknowledgment
 */
export const showForceCheckoutWarning = async (employee, reason) => {
  const result = await Swal.fire({
    title: 'Force Checkout Required',
    html: `
      <div style="text-align: left;">
        <p><strong>Employee:</strong> ${employee.firstName} ${employee.lastName}</p>
        <p><strong>Reason:</strong> ${reason}</p>
        <p style="color: #ef4444;"><strong>⚠️ Your shift has been completed. You will be automatically checked out.</strong></p>
      </div>
    `,
    icon: 'warning',
    confirmButtonColor: '#ef4444',
    confirmButtonText: 'I Understand',
    allowOutsideClick: false,
    allowEscapeKey: false
  });

  return result.isConfirmed;
};

/**
 * Show break time limit warning
 * @param {Object} employee - Employee object
 * @param {number} remainingTime - Remaining break time
 * @returns {Promise<boolean>} - User acknowledgment
 */
export const showBreakTimeLimitWarning = async (employee, remainingTime) => {
  const result = await Swal.fire({
    title: 'Break Time Limit Reached',
    html: `
      <div style="text-align: left;">
        <p><strong>Employee:</strong> ${employee.firstName} ${employee.lastName}</p>
        <p style="color: #ef4444;"><strong>⚠️ You have used your maximum break time (${remainingTime} minutes remaining).</strong></p>
        <p>No more breaks are allowed for today.</p>
      </div>
    `,
    icon: 'error',
    confirmButtonColor: '#ef4444',
    confirmButtonText: 'I Understand'
  });

  return result.isConfirmed;
};

/**
 * Show break required warning
 * @param {Object} employee - Employee object
 * @param {string} message - Warning message
 * @returns {Promise<boolean>} - User acknowledgment
 */
export const showBreakRequiredWarning = async (employee, message) => {
  const result = await Swal.fire({
    title: 'Break Required',
    html: `
      <div style="text-align: left;">
        <p><strong>Employee:</strong> ${employee.firstName} ${employee.lastName}</p>
        <p style="color: #f59e0b;"><strong>⚠️ ${message}</strong></p>
        <p>Please take a break during your shift.</p>
      </div>
    `,
    icon: 'warning',
    confirmButtonColor: '#f59e0b',
    confirmButtonText: 'I Understand'
  });

  return result.isConfirmed;
};

/**
 * Show loading dialog
 * @param {string} title - Loading title
 * @param {string} text - Loading text
 * @returns {Object} - Swal instance
 */
export const showLoading = (title = 'Loading...', text = 'Please wait') => {
  return Swal.fire({
    title,
    text,
    allowOutsideClick: false,
    allowEscapeKey: false,
    showConfirmButton: false,
    zIndex: 99999, // Very high z-index to ensure visibility in fullscreen
    target: 'body', // Always render in body
    didOpen: () => {
      Swal.showLoading();
    }
  });
};

/**
 * Close loading dialog
 */
export const closeLoading = () => {
  Swal.close();
};
