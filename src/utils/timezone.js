/**
 * Timezone utility functions for attendance system
 */

/**
 * Format a date/time string to a specific timezone
 * @param {string|Date} dateTime - The date/time to format
 * @param {string} timezone - The target timezone (e.g., 'America/Bogota')
 * @param {object} options - Formatting options
 * @returns {string} Formatted date/time string
 */
export const formatDateTimeInTimezone = (dateTime, timezone = 'UTC', options = {}) => {
  if (!dateTime) return "—";
  
  const defaultOptions = {
    dateStyle: 'short',
    timeStyle: 'short',
    hour12: true, // Changed to true for AM/PM format
    ...options
  };

  try {
    const date = new Date(dateTime);
    return new Intl.DateTimeFormat('en-US', { // Changed to en-US for better AM/PM support
      timeZone: timezone,
      ...defaultOptions
    }).format(date);
  } catch (error) {
    console.error('Timezone formatting error:', error);
    // Fallback to original formatting
    const date = new Date(dateTime);
    const dateStr = date.toLocaleDateString('en-US', { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric' 
    });
    const timeStr = date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });
    return `${dateStr} ${timeStr}`;
  }
};

/**
 * Get current time in a specific timezone
 * @param {string} timezone - The target timezone
 * @returns {Date} Current time in the specified timezone
 */
export const getCurrentTimeInTimezone = (timezone = 'UTC') => {
  try {
    const now = new Date();
    return new Intl.DateTimeFormat('en-GB', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    }).formatToParts(now);
  } catch (error) {
    console.error('Timezone conversion error:', error);
    return new Date();
  }
};

/**
 * Convert a date from one timezone to another
 * @param {string|Date} dateTime - The date/time to convert
 * @param {string} fromTimezone - Source timezone
 * @param {string} toTimezone - Target timezone
 * @returns {Date} Converted date
 */
export const convertTimezone = (dateTime, fromTimezone, toTimezone) => {
  if (!dateTime) return null;
  
  try {
    const date = new Date(dateTime);
    // Get the time in the source timezone
    const sourceTime = new Intl.DateTimeFormat('en-GB', {
      timeZone: fromTimezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    }).formatToParts(date);
    
    // Create a new date with the target timezone
    const targetDate = new Date(date.toLocaleString('en-US', { timeZone: toTimezone }));
    return targetDate;
  } catch (error) {
    console.error('Timezone conversion error:', error);
    return new Date(dateTime);
  }
};

/**
 * Get timezone offset in minutes for a given timezone
 * @param {string} timezone - The timezone
 * @returns {number} Offset in minutes
 */
export const getTimezoneOffset = (timezone = 'UTC') => {
  try {
    const now = new Date();
    const utc = new Date(now.getTime() + (now.getTimezoneOffset() * 60000));
    const target = new Date(utc.toLocaleString('en-US', { timeZone: timezone }));
    return (target.getTime() - utc.getTime()) / 60000;
  } catch (error) {
    console.error('Timezone offset error:', error);
    return 0;
  }
};

/**
 * Format time with timezone abbreviation
 * @param {string|Date} dateTime - The date/time to format
 * @param {string} timezone - The target timezone
 * @returns {string} Formatted time with timezone
 */
export const formatTimeWithTimezone = (dateTime, timezone = 'UTC') => {
  if (!dateTime) return "—";
  
  try {
    const date = new Date(dateTime);
    const formatted = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true // Changed to true for AM/PM format
    }).format(date);
    
    // Get timezone abbreviation
    const timeZoneName = new Intl.DateTimeFormat('en', {
      timeZone: timezone,
      timeZoneName: 'short'
    }).formatToParts(date).find(part => part.type === 'timeZoneName')?.value || timezone;
    
    return `${formatted} (${timeZoneName})`;
  } catch (error) {
    console.error('Timezone formatting error:', error);
    return formatDateTimeInTimezone(dateTime, timezone);
  }
};

/**
 * Format time for attendance display with AM/PM and timezone
 * @param {string|Date} dateTime - The date/time to format
 * @param {string} timezone - The target timezone
 * @returns {string} Formatted time for attendance display
 */
export const formatAttendanceTime = (dateTime, timezone = 'UTC') => {
  if (!dateTime) return "—";
  
  try {
    const date = new Date(dateTime);
    const formatted = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    }).format(date);
    
    // Get timezone abbreviation
    const timeZoneName = new Intl.DateTimeFormat('en', {
      timeZone: timezone,
      timeZoneName: 'short'
    }).formatToParts(date).find(part => part.type === 'timeZoneName')?.value || timezone;
    
    return `${formatted} (${timeZoneName})`;
  } catch (error) {
    console.error('Attendance time formatting error:', error);
    // Fallback to simple format
    const date = new Date(dateTime);
    const timeStr = date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });
    return `${timeStr} (${timezone})`;
  }
};

/**
 * Get company timezone from attendance record
 * @param {object} record - Attendance record
 * @returns {string} Company timezone or 'UTC' as fallback
 */
export const getCompanyTimezone = (record) => {
  if (record?.company?.timezone) {
    return record.company.timezone;
  }
  if (record?.company && typeof record.company === 'string') {
    // If company is just an ID, we'll need to look it up
    return 'UTC'; // Fallback
  }
  return 'UTC';
};
