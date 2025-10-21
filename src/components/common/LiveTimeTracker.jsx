import React, { useState, useEffect } from 'react';
import { ClockCircleOutlined } from '@ant-design/icons';
import { formatTimeWithTimezone, getCompanyTimezone } from '../../utils/timezone';

/**
 * Live time tracker component that shows real-time work duration
 * @param {Object} record - Attendance record
 * @param {Array} breaks - Array of breaks for the record
 * @param {string} timezone - Company timezone
 * @param {boolean} isLive - Whether to show live updates
 */
const LiveTimeTracker = ({ record, breaks = [], timezone = 'UTC', isLive = true }) => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [liveDuration, setLiveDuration] = useState(0);

  // Update current time every second when live
  useEffect(() => {
    if (!isLive) return;

    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(interval);
  }, [isLive]);

  // Calculate live duration
  useEffect(() => {
    if (!record?.checkInAt) {
      setLiveDuration(0);
      return;
    }

    const calculateLiveDuration = () => {
      const checkInTime = new Date(record.checkInAt);
      const endTime = record.checkOutAt ? new Date(record.checkOutAt) : currentTime;
      
      // Calculate total work time
      let totalWorkMinutes = Math.max(0, Math.round((endTime - checkInTime) / 60000));
      
      // Subtract break time
      const breakMinutes = breaks.reduce((acc, br) => {
        if (!br.startAt) return acc;
        const breakStart = new Date(br.startAt);
        const breakEnd = br.endAt ? new Date(br.endAt) : currentTime;
        return acc + Math.max(0, Math.round((breakEnd - breakStart) / 60000));
      }, 0);
      
      return Math.max(0, totalWorkMinutes - breakMinutes);
    };

    setLiveDuration(calculateLiveDuration());
  }, [record, breaks, currentTime]);

  const formatDuration = (minutes) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    const secs = isLive ? Math.floor((currentTime.getTime() / 1000) % 60) : 0;
    
    if (isLive && record?.checkInAt && !record?.checkOutAt) {
      return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }
    return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
  };

  const isCurrentlyWorking = record?.checkInAt && !record?.checkOutAt;
  const isOnBreak = record?.onBreak || (breaks.length > 0 && !breaks[breaks.length - 1]?.endAt);

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <ClockCircleOutlined 
        style={{ 
          color: isCurrentlyWorking ? (isOnBreak ? '#faad14' : '#52c41a') : '#8c8c8c',
          fontSize: '12px'
        }} 
      />
      <span style={{ 
        fontVariantNumeric: 'tabular-nums',
        fontWeight: isCurrentlyWorking ? 500 : 400,
        color: isCurrentlyWorking ? (isOnBreak ? '#faad14' : '#52c41a') : 'rgba(0,0,0,.65)'
      }}>
        {formatDuration(liveDuration)}
      </span>
      {isCurrentlyWorking && (
        <span style={{ 
          fontSize: '10px', 
          color: isOnBreak ? '#faad14' : '#52c41a',
          fontWeight: 500
        }}>
          {isOnBreak ? 'ON BREAK' : 'LIVE'}
        </span>
      )}
    </div>
  );
};

export default LiveTimeTracker;
