import dayjs from "dayjs";
import timezone from "dayjs/plugin/timezone";
import utc from "dayjs/plugin/utc";

// Extend dayjs with timezone support
dayjs.extend(utc);
dayjs.extend(timezone);

/**
 * Normalize date format to DD-MM-YYYY
 * @param {string|Date} date - The date to normalize
 * @returns {string} Normalized date in DD-MM-YYYY format
 */
export const normalizeDateFormat = (date) => {
  if (!date) return "";
  
  try {
    // If it's already in DD-MM-YYYY format, return as is
    if (typeof date === 'string' && /^\d{2}-\d{2}-\d{4}$/.test(date)) {
      return date;
    }
    
    // Parse the date and format as DD-MM-YYYY
    const parsed = dayjs(date);
    if (parsed.isValid()) {
      return parsed.format('DD-MM-YYYY');
    }
    
    return date; // Return original if parsing fails
  } catch (error) {
    console.error('Date normalization error:', error, 'Input:', date);
    return date; // Return original if parsing fails
  }
};

/**
 * Split a multi-day attendance record into separate day records
 * This handles cases where someone checks in but doesn't check out for multiple days
 * 
 * @param {Object} record - The attendance record
 * @param {string} timezone - The company timezone for proper time display
 * @returns {Array} Array of day-split records
 */
export const splitAttendanceByDays = (record, timezone = 'UTC') => {
  if (!record.checkInAt) {
    return [record];
  }

  const checkInDate = dayjs(record.checkInAt);
  const checkOutDate = record.checkOutAt ? dayjs(record.checkOutAt) : dayjs();

  // If same day, return as is
  if (checkInDate.isSame(checkOutDate, 'day')) {
    return [record];
  }

  // Calculate number of days between check-in and check-out
  const daysDiff = checkOutDate.diff(checkInDate, 'day');
  const splitRecords = [];

  for (let i = 0; i <= daysDiff; i++) {
    const currentDay = checkInDate.add(i, 'day');
    const isFirstDay = i === 0;
    const isLastDay = i === daysDiff;

    // Calculate start and end time for this day
    let dayStart, dayEnd;
    
    if (isFirstDay) {
      // First day: actual check-in time to end of day (11:59:59 PM)
      dayStart = checkInDate;
      dayEnd = checkInDate.endOf('day');
    } else if (isLastDay) {
      // Last day: start of day (12:00 AM) to check-out time (or current time if not checked out)
      dayStart = currentDay.startOf('day');
      dayEnd = record.checkOutAt ? checkOutDate : dayjs();
    } else {
      // Middle days: full 24 hours (12:00 AM to 11:59:59 PM)
      dayStart = currentDay.startOf('day');
      dayEnd = currentDay.endOf('day');
    }

    // Calculate hours worked for this day
    const minutesWorked = Math.round(dayEnd.diff(dayStart, 'minute', true));
    const hoursWorked = minutesWorked / 60;

    // For better CSV display, show check-in on first day and check-out on last day
    // Middle days show as full day shifts
    let displayCheckIn = '-';
    let displayCheckOut = '-';
    
    if (isFirstDay) {
      displayCheckIn = checkInDate.tz(timezone).format('hh:mm A');
    }
    
    if (isLastDay && record.checkOutAt) {
      displayCheckOut = checkOutDate.tz(timezone).format('hh:mm A');
    }

    splitRecords.push({
      ...record,
      _id: `${record._id}-day-${i}`,
      originalId: record._id,
      day: currentDay.format('DD-MM-YYYY'),
      splitDay: true,
      dayIndex: i,
      isFirstDay,
      isLastDay,
      checkInAt: isFirstDay ? record.checkInAt : null,
      checkOutAt: (isLastDay && record.checkOutAt) ? record.checkOutAt : null,
      displayCheckIn,
      displayCheckOut,
      minutesWorked: minutesWorked,
      hoursWorked: hoursWorked.toFixed(1),
      breaks: isFirstDay ? record.breaks : [], // Only show breaks on first day
    });
  }

  return splitRecords;
};

/**
 * Process attendance records to split multi-day records
 * @param {Array} records - Array of attendance records
 * @returns {Array} Processed records with multi-day splits
 */
export const processAttendanceRecords = (records) => {
  const processed = [];
  
  records.forEach(record => {
    const splitRecords = splitAttendanceByDays(record);
    processed.push(...splitRecords);
  });

  return processed;
};

/**
 * Format hours and minutes for display
 * @param {number} minutes - Total minutes
 * @returns {string} Formatted string (e.g., "8:30" or "24:00")
 */
export const formatHoursMinutes = (minutes) => {
  const m = Math.max(0, Math.round(minutes || 0));
  const h = Math.floor(m / 60);
  const mm = String(m % 60).padStart(2, '0');
  return `${h}:${mm}`;
};

/**
 * Format hours for display (e.g., "8.5hrs")
 * @param {number} hours - Hours as decimal
 * @returns {string} Formatted string
 */
export const formatHours = (hours) => {
  return `${hours}hrs`;
};

/**
 * Sort attendance records for CSV export
 * Primary sort: Employee name (ascending)
 * Secondary sort: Date (sequential - 1, 2, 3, 4...)
 * Tertiary sort: For same day, prioritize checkout records before new check-ins
 * @param {Array} records - Array of attendance records
 * @returns {Array} Sorted records
 */
export const sortRecordsForCSV = (records) => {
  return records.sort((a, b) => {
    // First sort by employee name (ascending)
    const nameA = `${a.user?.firstName || ""} ${a.user?.lastName || ""}`.trim();
    const nameB = `${b.user?.firstName || ""} ${b.user?.lastName || ""}`.trim();
    const nameComparison = nameA.localeCompare(nameB);
    if (nameComparison !== 0) return nameComparison;
    
    // Then sort by date (sequential - earliest first)
    const dateA = getDateForSorting(a);
    const dateB = getDateForSorting(b);
    const dateComparison = dateA - dateB;
    if (dateComparison !== 0) return dateComparison;
    
    // For same day records, prioritize checkout records before new check-ins
    // This ensures that a checkout from previous day appears before new check-in on same day
    const aIsCheckout = a.splitDay && a.isLastDay && a.displayCheckOut !== '-';
    const bIsCheckout = b.splitDay && b.isLastDay && b.displayCheckOut !== '-';
    const aIsNewCheckin = a.splitDay && a.isFirstDay && a.displayCheckIn !== '-';
    const bIsNewCheckin = b.splitDay && b.isFirstDay && b.displayCheckIn !== '-';
    
    // If one is checkout and other is new checkin, checkout comes first
    if (aIsCheckout && bIsNewCheckin) return -1;
    if (bIsCheckout && aIsNewCheckin) return 1;
    
    // If both are same type, sort by time
    const timeA = getTimeForSorting(a);
    const timeB = getTimeForSorting(b);
    return timeA - timeB;
  });
};

/**
 * Get date for sorting purposes
 * @param {Object} record - Attendance record
 * @returns {Date} Date object for sorting
 */
const getDateForSorting = (record) => {
  // Try different date fields in order of preference
  if (record.day) {
    // Parse DD-MM-YYYY format
    const dayParts = record.day.split('-');
    if (dayParts.length === 3) {
      const [day, month, year] = dayParts;
      return new Date(year, month - 1, day);
    }
  }
  
  if (record.checkInAt) {
    return new Date(record.checkInAt);
  }
  
  if (record.splitDay && record.day) {
    // For split records, use the day field
    const dayParts = record.day.split('-');
    if (dayParts.length === 3) {
      const [day, month, year] = dayParts;
      return new Date(year, month - 1, day);
    }
  }
  
  // Fallback to current date
  return new Date();
};

/**
 * Get time for sorting purposes within the same day
 * @param {Object} record - Attendance record
 * @returns {Date} Time object for sorting
 */
const getTimeForSorting = (record) => {
  // For split records, use the appropriate time
  if (record.splitDay) {
    if (record.displayCheckIn !== '-') {
      // Parse time from displayCheckIn (e.g., "2:18 PM")
      return parseTimeString(record.displayCheckIn);
    } else if (record.displayCheckOut !== '-') {
      // Parse time from displayCheckOut (e.g., "2:20 PM")
      return parseTimeString(record.displayCheckOut);
    }
  }
  
  // For normal records, use check-in time
  if (record.checkInAt) {
    return new Date(record.checkInAt);
  }
  
  // Fallback to current time
  return new Date();
};

/**
 * Parse time string to Date object for sorting
 * @param {string} timeStr - Time string like "2:18 PM"
 * @returns {Date} Date object with today's date and parsed time
 */
const parseTimeString = (timeStr) => {
  if (!timeStr || timeStr === '-') {
    return new Date();
  }
  
  try {
    // Parse time like "2:18 PM" or "2:20 PM"
    const [time, period] = timeStr.split(' ');
    const [hours, minutes] = time.split(':').map(Number);
    
    let hour24 = hours;
    if (period === 'PM' && hours !== 12) {
      hour24 += 12;
    } else if (period === 'AM' && hours === 12) {
      hour24 = 0;
    }
    
    const today = new Date();
    today.setHours(hour24, minutes, 0, 0);
    return today;
  } catch (error) {
    console.error('Time parsing error:', error, 'Input:', timeStr);
    return new Date();
  }
};

/**
 * Calculate total break time in minutes
 * @param {Array} breaks - Array of break records
 * @returns {number} Total break time in minutes
 */
export const calculateTotalBreakTime = (breaks) => {
  return breaks.reduce((total, breakRecord) => {
    if (breakRecord.startAt) {
      const startTime = new Date(breakRecord.startAt);
      const endTime = breakRecord.endAt ? new Date(breakRecord.endAt) : new Date(); // Use current time if break is ongoing
      return total + Math.floor((endTime - startTime) / (1000 * 60));
    }
    return total;
  }, 0);
};

/**
 * Calculate worked hours for CSV export based on company rules
 * @param {Object} record - Attendance record
 * @param {Object} company - Company object with rules
 * @returns {Object} Worked hours information
 */
export const calculateWorkedHoursForCSV = (record, company) => {
  if (!record.checkInAt) {
    return { totalHours: 0, workHours: 0, breakHours: 0, isForceCheckout: false };
  }

  const checkInTime = new Date(record.checkInAt);
  const checkOutTime = record.checkOutAt ? new Date(record.checkOutAt) : new Date();
  const totalMinutes = Math.floor((checkOutTime - checkInTime) / (1000 * 60));
  
  // Calculate break time
  const breakMinutes = calculateTotalBreakTime(record.breaks || []);
  const breakHours = breakMinutes / 60;
  
  // Get company rules
  const companyRules = company?.rules || {};
  let isHourlyBasis = companyRules.hourlyBasis || false;
  let shiftHours = companyRules.shiftHours || 8;
  const workHours = companyRules.workHours || 8;
  
  // Override shiftHours for specific companies based on company code
  const companyCode = company?.code || 'Unknown';
  if (companyCode === 'COL') {
    // Colombia: 9 hours total (8 work + 1 compulsory break)
    shiftHours = 9;
  } else if (companyCode === 'USWH') {
    // US: 9 hours total (8 work + 1 break)
    shiftHours = 9;
  } else if (companyCode === 'JPOS') {
    // Japan: Hourly basis - use actual work time, not fixed hours
    // Force hourly basis for Japan even if backend data is wrong
    isHourlyBasis = true;
    shiftHours = 0; // Japan has no fixed shift
  }
  
  // Debug logging
  console.log('CSV Calculation Debug:', {
    companyCode: company?.code || 'Unknown',
    companyId: company?._id || company?.id,
    totalMinutes,
    breakMinutes,
    shiftHours,
    workHours,
    isHourlyBasis,
    checkInAt: record.checkInAt,
    checkOutAt: record.checkOutAt,
    originalShiftHours: companyRules.shiftHours,
    overridden: shiftHours !== companyRules.shiftHours,
    companyRules: companyRules,
    company: company
  });
  
  let totalHours, actualWorkHours;
  
  if (isHourlyBasis) {
    // Japan: Hourly basis - show actual work time (excluding breaks)
    actualWorkHours = Math.max(0, (totalMinutes - breakMinutes) / 60);
    totalHours = actualWorkHours;
  } else {
    // Colombia & US: Fixed shift - show total shift time (including breaks)
    const expectedShiftMinutes = shiftHours * 60;
    
    if (totalMinutes >= expectedShiftMinutes) {
      // Full shift completed - always show the expected shift hours
      totalHours = shiftHours;
      actualWorkHours = workHours; // Actual work excluding break
    } else {
      // Partial shift - always show expected shift hours for fixed shift companies
      // This ensures Colombia and US always show 9 hours (including break)
      totalHours = shiftHours;
      actualWorkHours = Math.max(0, (totalMinutes - breakMinutes) / 60);
    }
  }
  
  // Check if this was a force checkout
  const isForceCheckout = record.forceCheckout || false;
  
  const result = {
    totalHours: Math.round(totalHours * 100) / 100, // Round to 2 decimal places
    workHours: Math.round(actualWorkHours * 100) / 100,
    breakHours: Math.round(breakHours * 100) / 100,
    isForceCheckout
  };
  
  console.log('CSV Calculation Result:', result);
  
  return result;
};

