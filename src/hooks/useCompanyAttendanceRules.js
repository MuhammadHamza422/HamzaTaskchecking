import { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { getCompanyRules as getCompanyRulesAPI, validateBreak, validateAttendanceAction } from '../api/companyRules';
import { getCompanyRules as getDefaultCompanyRules, shouldForceCheckout, validateBreakTime, getCompanyUIMessages } from '../config/companyRules';
import { calculateTotalBreakTime } from '../utils/attendanceHelpers';

/**
 * Hook to manage company-specific attendance rules and validations
 * @param {string} companyId - Company ID
 * @param {Object} currentRecord - Current attendance record
 * @returns {Object} Company rules and validation functions
 */
export const useCompanyAttendanceRules = (companyId, currentRecord) => {
  const [warnings, setWarnings] = useState([]);

  // Get company rules from backend
  const { data: companyRulesData, isLoading: rulesLoading, error: rulesError } = useQuery({
    queryKey: ['company-rules', companyId],
    queryFn: () => getCompanyRulesAPI(companyId),
    enabled: !!companyId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
    onError: (error) => {
      console.error('Failed to fetch company rules:', error);
    }
  });

  // Fallback to default rules if API fails
  const companyRules = useMemo(() => {
    if (companyRulesData?.success && companyRulesData?.data) {
      const api = companyRulesData.data;
      // If backend already provides normalized rules, use them directly
      if (api.rules && typeof api.rules === 'object') {
        return {
          name: api.name || api.companyName || 'Company',
          code: api.code || api.companyCode,
          timezone: api.timezone,
          rules: {
            ...api.rules,
          },
        };
      }

      const src = api._doc || api.attendanceRules || api;
      const isFixed = src.isFixedShift === true || (typeof src.shiftHours === 'number' && src.shiftHours > 0);
      const shiftType = isFixed ? 'fixed' : 'hourly';
      const workHours = src.workHours ?? (src.displayVsPay?.maxPayHours ?? null);
      const breakHours = src.breakHours ?? (src.displayVsPay && workHours != null && src.displayVsPay.displayHours != null
        ? Math.max(0, src.displayVsPay.displayHours - workHours)
        : null);
      const maxBreakTime = (src.breakPolicy && typeof src.breakPolicy.maxBreakMinutes === 'number')
        ? src.breakPolicy.maxBreakMinutes
        : null;

      const normalized = {
        name: api.companyName || api.name || 'Company',
        code: api.companyCode || api.code || undefined,
        timezone: api.timezone || undefined,
        rules: {
          shiftType,
          shiftHours: typeof src.shiftHours === 'number' ? src.shiftHours : (shiftType === 'fixed' && workHours != null && breakHours != null ? (workHours + breakHours) : null),
          breakHours,
          workHours,
          breakRequired: !!src.breakRequired,
          forceCheckout: !!src.isFixedShift && !!src.forceCheckout,
          multipleBreaks: src.breakPolicy?.allowMultipleBreaks ?? true,
          hourlyBasis: shiftType === 'hourly',
          maxBreakTime: maxBreakTime,
          warnings: {
            breakLimit: 'You have used your maximum break time. No more breaks allowed.',
            breakNotTaken: 'Break is required. You must take a break during your shift.',
            shiftComplete: 'Your shift is complete.'
          }
        }
      };
      return normalized;
    }
    return getDefaultCompanyRules(companyId);
  }, [companyRulesData, companyId]);
  
  // Get UI messages based on normalized rules (dynamic)
  const uiMessages = useMemo(() => {
    const r = companyRules?.rules || {};
    const name = companyRules?.name || 'Company';
    const messages = { shiftInfo: '', breakInfo: '', warnings: [] };
    if (r.shiftType === 'fixed') {
      const shiftHoursText = r.shiftHours != null ? r.shiftHours : (r.workHours && r.breakHours ? (r.workHours + r.breakHours) : null);
      messages.shiftInfo = `${name}: ${shiftHoursText ?? ''}-hour shift (${r.workHours ?? 0}h work + ${r.breakHours ?? 0}h break)`;
      if (r.breakRequired) {
        messages.breakInfo = 'Break is compulsory - you must take a break during your shift';
      } else if (r.multipleBreaks) {
        const max = r.maxBreakTime != null ? r.maxBreakTime : 0;
        messages.breakInfo = max > 0
          ? `You can take multiple breaks, but total break time cannot exceed ${max} minutes`
          : 'You can take multiple breaks';
      }
    } else if (r.hourlyBasis) {
      messages.shiftInfo = `${name}: Hourly basis - salary calculated on hours worked`;
      messages.breakInfo = 'You can take breaks as needed';
    }
    return messages;
  }, [companyRules]);

  // Force checkout removed by backend. Keep a stable shape for UI but always false.
  const forceCheckoutInfo = useMemo(() => ({ shouldForce: false }), []);

  // Validate break time
  const breakValidation = useMemo(() => {
    if (!currentRecord) return { isValid: true };
    return validateBreakTime(currentRecord, companyRules);
  }, [currentRecord, companyRules]);

  // Check if break is required but not taken
  const breakRequiredCheck = useMemo(() => {
    const rules = companyRules?.rules || {};
    if (!rules.breakRequired || !currentRecord || !currentRecord.checkInAt || currentRecord.checkOutAt) {
      return { isRequired: false };
    }

    const totalBreakMinutes = calculateTotalBreakTime(currentRecord.breaks || []);
    const hasTakenBreak = totalBreakMinutes > 0;
    
    // Check if shift is more than 4 hours and no break taken
    const checkInTime = new Date(currentRecord.checkInAt);
    const currentTime = new Date();
    const workedMinutes = Math.floor((currentTime - checkInTime) / (1000 * 60));
    
    if (workedMinutes > 240 && !hasTakenBreak) { // 4 hours = 240 minutes
      return {
        isRequired: true,
        warning: companyRules.rules.warnings?.breakNotTaken || 'Break is required. You must take a break during your shift.'
      };
    }
    
    return { isRequired: false };
  }, [currentRecord, companyRules]);

  // Update warnings based on current state
  useEffect(() => {
    const newWarnings = [];
    
    // Break time limit warning
    if (!breakValidation.isValid) {
      newWarnings.push({
        type: 'warning',
        message: breakValidation.reason,
        action: 'breakLimit'
      });
    }
    
    // Break required warning
    if (breakRequiredCheck.isRequired) {
      newWarnings.push({
        type: 'warning',
        message: breakRequiredCheck.warning,
        action: 'breakRequired'
      });
    }
    
    setWarnings(newWarnings);
  }, [breakValidation, breakRequiredCheck]);

  // Break validation mutation
  const breakValidationMutation = useMutation({
    mutationFn: ({ employeeId, companyId }) => validateBreak(employeeId, companyId),
    onError: (error) => {
      console.error('Break validation error:', error);
    }
  });


  // Check if break can be started (using backend validation)
  const canStartBreak = useMemo(() => {
    if (!currentRecord || !currentRecord.checkInAt || currentRecord.checkOutAt) {
      return false;
    }
    
    // Check if already on break
    const lastBreak = currentRecord.breaks?.[currentRecord.breaks.length - 1];
    if (lastBreak && !lastBreak.endAt) {
      return false; // Already on break
    }
    
    // Use backend validation result if available
    if (breakValidationMutation.data?.success) {
      return breakValidationMutation.data.canStartBreak;
    }
    
    // Fallback to local validation
    return breakValidation.isValid;
  }, [currentRecord, breakValidation, breakValidationMutation.data]);

  // Check if break can be ended
  const canEndBreak = useMemo(() => {
    if (!currentRecord || !currentRecord.breaks?.length) {
      return false;
    }
    
    const lastBreak = currentRecord.breaks[currentRecord.breaks.length - 1];
    return lastBreak && !lastBreak.endAt; // Currently on break
  }, [currentRecord]);

  // Get remaining break time
  const getRemainingBreakTime = () => {
    const rules = companyRules?.rules || {};
    if (!(typeof rules.maxBreakTime === 'number') || rules.maxBreakTime <= 0) {
      return null; // No limit
    }
    
    const totalBreakMinutes = calculateTotalBreakTime(currentRecord?.breaks || []);
    const remaining = rules.maxBreakTime - totalBreakMinutes;
    return Math.max(0, remaining);
  };

  // Get work progress
  const getWorkProgress = () => {
    if (!currentRecord || !currentRecord.checkInAt || currentRecord.checkOutAt) {
      return { progress: 0, workedMinutes: 0, totalMinutes: 0 };
    }
    
    const checkInTime = new Date(currentRecord.checkInAt);
    const currentTime = new Date();
    const totalMinutes = Math.floor((currentTime - checkInTime) / (1000 * 60));
    const breakMinutes = calculateTotalBreakTime(currentRecord.breaks || []);
    const actualWorkMinutes = Math.max(0, totalMinutes - breakMinutes); // Ensure non-negative
    
    const rules = companyRules?.rules || {};
    const totalWorkMinutes = rules.workHours ? rules.workHours * 60 : null;
    
    if (!totalWorkMinutes) {
      return { progress: 0, workedMinutes: actualWorkMinutes, totalMinutes: null };
    }
    
    const progress = Math.min(100, (actualWorkMinutes / totalWorkMinutes) * 100);
    
    return {
      progress,
      workedMinutes: actualWorkMinutes,
      totalMinutes: totalWorkMinutes,
      remainingMinutes: Math.max(0, totalWorkMinutes - actualWorkMinutes)
    };
  };

  // Functions to trigger backend validation
  const validateBreakWithBackend = async (employeeId) => {
    if (!employeeId || !companyId) return;
    return breakValidationMutation.mutateAsync({ employeeId, companyId });
  };

  // Force checkout removed - keep a no-op for backward compatibility
  const triggerForceCheckout = async () => Promise.resolve();

  const validateAttendanceWithBackend = async (action, employeeId, data = {}) => {
    if (!employeeId || !companyId) return;
    return validateAttendanceAction(action, employeeId, companyId, data);
  };

  return {
    companyRules,
    uiMessages,
    warnings,
    forceCheckoutInfo,
    breakValidation,
    breakRequiredCheck,
    canStartBreak,
    canEndBreak,
    getRemainingBreakTime,
    getWorkProgress,
    isHourlyBasis: (companyRules?.rules && companyRules.rules.hourlyBasis) || false,
    isFixedShift: (companyRules?.rules && companyRules.rules.shiftType === 'fixed') || false,
    isLoading: rulesLoading,
    error: rulesError,
    // Backend validation functions
    validateBreakWithBackend,
    triggerForceCheckout,
    validateAttendanceWithBackend,
    // Mutation states
    isBreakValidationLoading: breakValidationMutation.isPending
  };
};

