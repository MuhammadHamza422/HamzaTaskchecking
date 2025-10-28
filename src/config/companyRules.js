/**
 * Company-specific attendance rules configuration
 */

export const COMPANY_RULES = {
  // Colombia rules
  '68f793adebae0e4c6ea5b2f7': { // Columbia (America/Bogota)
    name: 'Colombia',
    code: 'COL',
    timezone: 'America/Bogota',
    rules: {
      shiftType: 'fixed', // fixed shift length
      shiftHours: 9, // 9 hours total
      breakHours: 1, // 1 hour break included
      workHours: 8, // 8 hours actual work (9 - 1)
      breakRequired: true, // break is compulsory
      forceCheckout: true, // force checkout after shift
      multipleBreaks: false, // only one break allowed
      hourlyBasis: false, // not hourly basis
      maxBreakTime: 60, // 60 minutes max break
      warnings: {
        breakNotTaken: 'Break is compulsory. You must take a 1-hour break during your shift.',
        breakLimit: 'You have used your maximum break time (1 hour). No more breaks allowed.',
        approachingLimit: 'You are approaching your 9-hour shift limit. Consider taking your break soon.',
        shiftComplete: 'Your 9-hour shift is complete. You will be automatically checked out.'
      }
    }
  },
  
  // US rules
  '689f45477bff1bccf75f24de': { // Retro US Warehouse
    name: 'US Warehouse',
    code: 'USWH',
    timezone: 'America/New_York',
    rules: {
      shiftType: 'fixed', // fixed shift length
      shiftHours: 9, // 9 hours total (8 work + 1 break)
      breakHours: 1, // 1 hour break separate
      workHours: 8, // 8 hours actual work
      breakRequired: false, // break is not compulsory
      forceCheckout: true, // force checkout after shift
      multipleBreaks: true, // multiple breaks allowed
      hourlyBasis: false, // not hourly basis
      maxBreakTime: 60, // 60 minutes total break time
      warnings: {
        breakLimit: 'You have used your maximum break time (1 hour). No more breaks allowed.',
        approachingLimit: 'You are approaching your 9-hour shift limit.',
        shiftComplete: 'Your 9-hour shift is complete. You will be automatically checked out.'
      }
    }
  },
  
  // Japan rules
  '68f793c2ebae0e4c6ea5b311': { // Retro vGames Godo-Kaisha Osaka, Japan
    name: 'Japan',
    code: 'JPOS',
    timezone: 'Asia/Tokyo',
    rules: {
      shiftType: 'hourly', // hourly basis
      shiftHours: null, // no fixed shift length
      breakHours: null, // no fixed break time
      workHours: null, // no fixed work hours
      breakRequired: false, // break is not compulsory
      forceCheckout: false, // no force checkout
      multipleBreaks: true, // multiple breaks allowed
      hourlyBasis: true, // hourly basis for salary
      maxBreakTime: null, // no break time limit
      warnings: {
        hourlyBasis: 'You are on hourly basis. Your salary will be calculated based on hours worked.'
      }
    }
  }
};

/**
 * Get company rules by company ID
 * @param {string} companyId - Company ID
 * @returns {Object} Company rules or default rules
 */
export const getCompanyRules = (companyId) => {
  return COMPANY_RULES[companyId] || {
    name: 'Default',
    code: 'DEFAULT',
    timezone: 'UTC',
    rules: {
      shiftType: 'flexible',
      shiftHours: null,
      breakHours: null,
      workHours: null,
      breakRequired: false,
      forceCheckout: false,
      multipleBreaks: true,
      hourlyBasis: false,
      maxBreakTime: null,
      warnings: {}
    }
  };
};

/**
 * Check if employee should be force checked out
 * @param {Object} record - Attendance record
 * @param {Object} companyRules - Company rules
 * @returns {Object} Force checkout info
 */
export const shouldForceCheckout = (record, companyRules) => {
  if (!companyRules.rules.forceCheckout || !record.checkInAt || record.checkOutAt) {
    return { shouldForce: false };
  }

  const checkInTime = new Date(record.checkInAt);
  const currentTime = new Date();
  const workedMinutes = Math.floor((currentTime - checkInTime) / (1000 * 60));
  const breakMinutes = calculateTotalBreakTime(record.breaks || []);
  const actualWorkMinutes = workedMinutes - breakMinutes;
  
  const maxWorkMinutes = companyRules.rules.workHours * 60;
  
  if (actualWorkMinutes >= maxWorkMinutes) {
    return {
      shouldForce: true,
      reason: companyRules.rules.warnings?.shiftComplete || 'Your shift is complete. You will be automatically checked out.',
      workedMinutes: actualWorkMinutes,
      maxWorkMinutes
    };
  }
  
  return { shouldForce: false };
};

/**
 * Check break time limits
 * @param {Object} record - Attendance record
 * @param {Object} companyRules - Company rules
 * @returns {Object} Break validation info
 */
export const validateBreakTime = (record, companyRules) => {
  if (!companyRules.rules.maxBreakTime) {
    return { isValid: true };
  }

  const totalBreakMinutes = calculateTotalBreakTime(record.breaks || []);
  const maxBreakMinutes = companyRules.rules.maxBreakTime;
  
  if (totalBreakMinutes >= maxBreakMinutes) {
    return {
      isValid: false,
      reason: companyRules.rules.warnings?.breakLimit || 'You have used your maximum break time. No more breaks allowed.',
      totalBreakMinutes,
      maxBreakMinutes
    };
  }
  
  return { isValid: true };
};

/**
 * Calculate total break time in minutes
 * @param {Array} breaks - Array of break records
 * @returns {number} Total break time in minutes
 */
const calculateTotalBreakTime = (breaks) => {
  return breaks.reduce((total, breakRecord) => {
    if (breakRecord.startAt && breakRecord.endAt) {
      const startTime = new Date(breakRecord.startAt);
      const endTime = new Date(breakRecord.endAt);
      return total + Math.floor((endTime - startTime) / (1000 * 60));
    }
    return total;
  }, 0);
};

/**
 * Get company-specific UI messages
 * @param {string} companyId - Company ID
 * @returns {Object} UI messages
 */
export const getCompanyUIMessages = (companyId) => {
  const rules = getCompanyRules(companyId);
  
  const messages = {
    shiftInfo: '',
    breakInfo: '',
    warnings: []
  };
  
  if (rules.rules.shiftType === 'fixed') {
    messages.shiftInfo = `${rules.name}: ${rules.rules.shiftHours}-hour shift (${rules.rules.workHours}h work + ${rules.rules.breakHours}h break)`;
    
    if (rules.rules.breakRequired) {
      messages.breakInfo = 'Break is compulsory - you must take a break during your shift';
    } else if (rules.rules.multipleBreaks) {
      messages.breakInfo = `You can take multiple breaks, but total break time cannot exceed ${rules.rules.maxBreakTime} minutes`;
    }
  } else if (rules.rules.hourlyBasis) {
    messages.shiftInfo = `${rules.name}: Hourly basis - salary calculated on hours worked`;
    messages.breakInfo = 'You can take breaks as needed';
  }
  
  return messages;
};
