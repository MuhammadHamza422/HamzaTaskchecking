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
      return companyRulesData.data;
    }
    return getDefaultCompanyRules(companyId);
  }, [companyRulesData, companyId]);
  
  // Get UI messages
  const uiMessages = useMemo(() => getCompanyUIMessages(companyId), [companyId]);

  // Force checkout removed by backend. Keep a stable shape for UI but always false.
  const forceCheckoutInfo = useMemo(() => ({ shouldForce: false }), []);

  // Validate break time
  const breakValidation = useMemo(() => {
    if (!currentRecord) return { isValid: true };
    return validateBreakTime(currentRecord, companyRules);
  }, [currentRecord, companyRules]);

  // Check if break is required but not taken
  const breakRequiredCheck = useMemo(() => {
    if (!companyRules.rules.breakRequired || !currentRecord || !currentRecord.checkInAt || currentRecord.checkOutAt) {
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
    if (!companyRules.rules.maxBreakTime) {
      return null; // No limit
    }
    
    const totalBreakMinutes = calculateTotalBreakTime(currentRecord?.breaks || []);
    const remaining = companyRules.rules.maxBreakTime - totalBreakMinutes;
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
    
    const totalWorkMinutes = companyRules.rules.workHours ? companyRules.rules.workHours * 60 : null;
    
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
    isHourlyBasis: companyRules.rules?.hourlyBasis || false,
    isFixedShift: companyRules.rules?.shiftType === 'fixed',
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

