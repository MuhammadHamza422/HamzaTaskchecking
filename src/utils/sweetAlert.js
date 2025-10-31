import Swal from 'sweetalert2';

/**
 * SweetAlert2 Utility for Attendance System
 * Clean, short toasts (top-right) + full dialog helpers
 */

// Inject custom CSS for toast styling
const injectToastStyles = () => {
  if (document.getElementById('sweetalert-toast-styles')) return;
  
  const style = document.createElement('style');
  style.id = 'sweetalert-toast-styles';
  style.textContent = `
    .custom-toast {
      width: auto !important;
      max-width: 350px !important;
      min-width: 200px !important;
      padding: 12px 16px !important;
      border-radius: 8px !important;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15) !important;
    }
    
    .custom-toast-container {
      position: fixed !important;
      top: 1rem !important;
      right: 1rem !important;
      z-index: 99999 !important;
    }
  `;
  document.head.appendChild(style);
};

// Initialize styles
injectToastStyles();

// ✅ Toast configuration
const Toast = Swal.mixin({
  toast: true,
  position: 'top-end', // top right
  showConfirmButton: false,
  timer: 3000,
  timerProgressBar: true,
  background: '#333', // dark style for better visibility
  color: '#fff',
  width: 'auto',
  padding: '10px 16px',
  customClass: {
    popup: 'custom-toast',
    container: 'custom-toast-container',
  },
  didOpen: (toast) => {
    toast.addEventListener('mouseenter', Swal.stopTimer);
    toast.addEventListener('mouseleave', Swal.resumeTimer);
  },
});

/**
 * Default Toast (simple message, auto-success icon)
 */
export const showToast = (message, type = 'success') => {
  Toast.fire({
    icon: type,
    title: message,
  });
};

/**
 * Success Toast
 */
export const showSuccessToast = (message, title = 'Success') => {
  Toast.fire({
    icon: 'success',
    title,
    text: message,
  });
};

/**
 * Error Toast
 */
export const showErrorToast = (message, title = 'Error') => {
  Toast.fire({
    icon: 'error',
    title,
    text: message,
  });
};

/**
 * Warning Toast
 */
export const showWarningToast = (message, title = 'Warning') => {
  Toast.fire({
    icon: 'warning',
    title,
    text: message,
  });
};

/**
 * Info Toast
 */
export const showInfoToast = (message, title = 'Info') => {
  Toast.fire({
    icon: 'info',
    title,
    text: message,
  });
};

/**
 * Confirmation dialogs and alerts remain same
 */

// Example confirmation (for check-in)
export const confirmCheckIn = async (employee, companyRules) => {
  const result = await Swal.fire({
    title: 'Check In Confirmation',
    html: `
      <div style="text-align: left;">
        <p><strong>Employee:</strong> ${employee.firstName} ${employee.lastName}</p>
        <p><strong>Company:</strong> ${companyRules.name || 'Unknown'}</p>
        ${companyRules.isFixedShift ? `
          <p><strong>Shift Type:</strong> ${companyRules.rules?.workHours || 8} hrs + ${companyRules.rules?.breakHours || 1} hr break</p>
        ` : '<p><strong>Shift Type:</strong> Hourly (flexible)</p>'}
      </div>
    `,
    icon: 'question',
    showCancelButton: true,
    confirmButtonColor: '#10b981',
    cancelButtonColor: '#6b7280',
    confirmButtonText: 'Yes, Check In',
    cancelButtonText: 'Cancel',
    reverseButtons: true,
  });

  return result.isConfirmed;
};

/**
 * Loading dialogs
 */
export const showLoading = (title = 'Loading...', text = 'Please wait') => {
  return Swal.fire({
    title,
    text,
    allowOutsideClick: false,
    allowEscapeKey: false,
    showConfirmButton: false,
    didOpen: () => Swal.showLoading(),
    zIndex: 99999,
  });
};

export const closeLoading = () => Swal.close();

/**
 * Generic delete confirmation dialog
 */
export const confirmDelete = async (title, text, confirmText = 'Yes, Delete', cancelText = 'Cancel') => {
  const result = await Swal.fire({
    title,
    text,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#ef4444',
    cancelButtonColor: '#6b7280',
    confirmButtonText: confirmText,
    cancelButtonText: cancelText,
    reverseButtons: true,
    customClass: {
      popup: 'rounded-lg',
      confirmButton: 'rounded-md',
      cancelButton: 'rounded-md',
    },
  });

  return result;
};
