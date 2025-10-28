import React, { useEffect, useMemo, useRef, useState } from "react";
import { listAttendance } from "../../../api/attendance";
import { fetchCompanies } from "../../../api/company";
import { fetchAllUsers } from "../../../api/auth";
import { Space, message } from "antd";
import dayjs from "dayjs";
import { formatCSVTime, formatCSVTimeOnly, getCompanyTimezone } from "../../../utils/timezone";
import { splitAttendanceByDays, normalizeDateFormat, sortRecordsForCSV, calculateWorkedHoursForCSV } from "../../../utils/attendanceHelpers";

// Import components
import AttendanceHeader from "./AttendanceHeader";
import AttendanceFilters from "./AttendanceFilters";
import AttendanceDashboard from "./AttendanceDashboard";
import ManualRecordForm from "./ManualRecordForm";
import AttendanceTable from "./AttendanceTable";
import CustomPagination from "./CustomPagination";

/* ---------------- utils ---------------- */
const sumBreakMinutes = (breaks = []) =>
  breaks.reduce((acc, br) => {
    if (!br.startAt) return acc;
    const end = br.endAt ? new Date(br.endAt) : new Date();
    return acc + Math.max(0, Math.round((end - new Date(br.startAt)) / 60000));
  }, 0);

// Format minutes to HH:MM (e.g., 5:06)
const fmtHM = (mins) => {
  const m = Math.max(0, Math.round(mins || 0));
  const h = Math.floor(m / 60);
  const mm = String(m % 60).padStart(2, "0");
  return `${h}:${mm}`;
};

// Dynamic biweekly range based on current date
const getBiweeklyRange = () => {
  const today = dayjs();
  const currentDay = today.date();
  
  if (currentDay <= 15) {
    // First 15 days of the month (1-15)
    return [today.startOf("month"), today.startOf("month").add(14, "day")];
  } else {
    // Last 15 days of the month (16-31/30)
    const lastDayOfMonth = today.endOf("month").date();
    const startDay = Math.max(16, lastDayOfMonth - 14);
    return [today.startOf("month").add(startDay - 1, "day"), today.endOf("month")];
  }
};

const quickRanges = {
  "Biweekly (15 days)": getBiweeklyRange(),
  Today: [dayjs().startOf("day"), dayjs().endOf("day")],
  "This Week": [dayjs().startOf("week"), dayjs().endOf("week")],
  "This Month": [dayjs().startOf("month"), dayjs().endOf("month")],
};

export default function ManageAttendance({ canEdit = false }) {
  /* ---------- state ---------- */
  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [companies, setCompanies] = useState([]);
  const [loadingCompanies, setLoadingCompanies] = useState(false);

  // Filters
  const [selectedUsers, setSelectedUsers] = useState([]); // multi
  const [dateRange, setDateRange] = useState(quickRanges["Biweekly (15 days)"]);
  const [status, setStatus] = useState("all"); // all | in | break | out
  const [source, setSource] = useState("all"); // all | manual | kiosk
  const [searchNote, setSearchNote] = useState("");
  const [company, setCompany] = useState("");

  // Data
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [total, setTotal] = useState(0);

  // Live refresh
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshEvery, setRefreshEvery] = useState(30);
  const timerRef = useRef(null);

  // Manual create
  const [manual, setManual] = useState({
    userId: "",
    checkInAt: "",
    checkOutAt: "",
    note: "",
  });

  /* ---------- effects ---------- */
  useEffect(() => {
    (async () => {
      setLoadingUsers(true);
      try {
        const list = await fetchAllUsers();
        setUsers(list || []);
      } finally {
        setLoadingUsers(false);
      }
    })();
  }, []);

  useEffect(() => {
    (async () => {
      setLoadingCompanies(true);
      try {
        const list = await fetchCompanies();
        setCompanies(list || []);
      } finally {
        setLoadingCompanies(false);
      }
    })();
  }, []);

  const isTodayView = useMemo(() => {
    const [from, to] = dateRange || [];
    if (!from || !to) return false;
    return from.isSame(dayjs(), "day") && to.isSame(dayjs(), "day");
  }, [dateRange]);

  const fetchData = async () => {
    const [from, to] = dateRange || [];
    const serverUser = selectedUsers.length === 1 ? selectedUsers[0] : "";
    setLoading(true);
    try {
      const data = await listAttendance({
        user: serverUser,
        company: company || undefined,
        from: from ? from.format("YYYY-MM-DD") : "",
        to: to ? to.format("YYYY-MM-DD") : "",
        page,
        limit: pageSize,
        // Add filter parameters to server call
        status: status !== "all" ? status : undefined,
        source: source !== "all" ? source : undefined,
        searchNote: searchNote || undefined,
      });
      setRows(data?.items || []);
      setTotal(data?.total || 0);
    } catch (error) {
      console.error("Failed to fetch attendance data:", error);
      if (error?.response?.status === 403) {
        message.error("You don't have permission to view attendance data. Please contact an administrator.");
      } else {
        message.error("Failed to load attendance data. Please try again.");
      }
      setRows([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedUsers.length, dateRange, page, pageSize, status, source, searchNote, company]);

  useEffect(() => {
    if (!autoRefresh || !isTodayView) return;
    clearInterval(timerRef.current);
    timerRef.current = setInterval(fetchData, refreshEvery * 1000);
    return () => clearInterval(timerRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoRefresh, isTodayView, refreshEvery, selectedUsers.length, page, pageSize, status, source, searchNote]);

  /* ---------- derived ---------- */
  // Since we're doing server-side filtering, we use the raw rows directly
  const filteredRows = rows;

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [status, source, searchNote, company]);

  const usersInScope = useMemo(() => {
    if (selectedUsers.length > 0) return users.filter((u) => selectedUsers.includes(u._id));
    return users;
  }, [users, selectedUsers]);

  const metrics = useMemo(() => {
    const total = filteredRows.length;
    let checkedIn = 0;
    let onBreak = 0;
    let totalMinutes = 0;
    let totalBreakMins = 0;

    filteredRows.forEach((r) => {
      const isIn = r.checkInAt && !r.checkOutAt;
      const isBr =
        r.onBreak || (Array.isArray(r.breaks) && r.breaks.length && !r.breaks[r.breaks.length - 1]?.endAt);
      if (isIn) checkedIn += 1;
      if (isBr) onBreak += 1;
      totalMinutes += Number(r.minutesWorked || 0);
      totalBreakMins += sumBreakMinutes(r.breaks);
    });

    const totalEmployees = usersInScope.length || 0;
    const notIn = Math.max(0, totalEmployees - checkedIn);

    return {
      totalRecords: total,
      checkedIn,
      onBreak,
      notIn: isTodayView ? notIn : undefined,
      totalHours: (totalMinutes / 60).toFixed(1),
      avgHours: total ? (totalMinutes / 60 / total).toFixed(2) : "0.00",
      breakHours: (totalBreakMins / 60).toFixed(1),
    };
  }, [filteredRows, usersInScope.length, isTodayView]);

  /* ---------- actions ---------- */
  const hardRefresh = () => fetchData();

  /* ---------- export CSV ---------- */
  const exportCSV = () => {
    // Split multi-day records into separate days
    const splitRecords = [];
    (filteredRows || []).forEach(record => {
      const recordTimezone = getCompanyTimezone(record);
      const dayRecords = splitAttendanceByDays(record, recordTimezone);
      splitRecords.push(...dayRecords);
    });

    // Sort data alphabetically by employee name, then by date (sequential)
    const sortedRows = sortRecordsForCSV(splitRecords);

    const rowsForCsv = sortedRows.map((r) => {
      const recordTimezone = getCompanyTimezone(r);
      
      // For split records, show times appropriately
      let checkIn = "";
      let checkOut = "";
      
      if (r.splitDay) {
        // Split day record - use display times
        checkIn = r.displayCheckIn || "-";
        checkOut = r.displayCheckOut || "-";
      } else {
        // Normal record - use time-only format
        checkIn = formatCSVTimeOnly(r.checkInAt, recordTimezone) || "-";
        checkOut = formatCSVTimeOnly(r.checkOutAt, recordTimezone) || "-";
      }
      
      // Calculate actual work time for all companies (same as UI table)
      const checkInTime = new Date(r.checkInAt);
      const checkOutTime = r.checkOutAt ? new Date(r.checkOutAt) : new Date();
      const totalMinutes = Math.floor((checkOutTime - checkInTime) / (1000 * 60));
      
      // Calculate break time
      const breakMinutes = (r.breaks || []).reduce((acc, br) => {
        if (!br.startAt) return acc;
        const end = br.endAt ? new Date(br.endAt) : new Date();
        return acc + Math.max(0, Math.round((end - new Date(br.startAt)) / 60000));
      }, 0);
      
      // Calculate actual work time (excluding breaks) - same logic as UI table
      const actualWorkMinutes = Math.max(0, totalMinutes - breakMinutes);
      const actualWorkHours = actualWorkMinutes / 60;
      
      const workedHours = {
        totalHours: actualWorkHours,
        workHours: actualWorkHours,
        breakHours: breakMinutes / 60,
        isForceCheckout: false
      };
      
      // Format currency
      const formatCurrency = (amount, currency = 'USD') => {
        if (amount === null || amount === undefined) return '-';
        
        // For Colombian Peso, use custom formatting to show $ symbol
        if (currency === 'COP') {
          return `$${amount.toFixed(2)}`;
        }
        
        return new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: currency,
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }).format(amount);
      };

      return {
        Employee: `${r.user?.firstName || ""} ${r.user?.lastName || ""}`.trim(),
        Date: r.splitDay ? r.day : normalizeDateFormat(r.day || r.checkInAt),
        "Check In": checkIn,
        "Check Out": checkOut,
        "Total Hours": `${Math.floor(workedHours.totalHours)}:${String(Math.round((workedHours.totalHours % 1) * 60)).padStart(2, '0')}`,
        "Hourly Rate": formatCurrency(r.payroll?.hourlyRate || r.user?.hourlyRate, r.payroll?.currency || r.user?.currency || 'USD'),
        "Total Pay": (() => {
          const hourlyRate = r.payroll?.hourlyRate || r.user?.hourlyRate;
          if (hourlyRate) {
            const totalPay = hourlyRate * workedHours.totalHours;
            return formatCurrency(totalPay, r.payroll?.currency || r.user?.currency || 'USD');
          }
          return '-';
        })(),
        "Currency": r.payroll?.currency || r.user?.currency || 'USD',
      };
    });

    if (rowsForCsv.length === 0) {
      message.warning("No data to export");
      return;
    }

    const header = Object.keys(rowsForCsv[0] || {});
    const escape = (v) => `"${String(v ?? "").replaceAll('"', '""').replace(/\n/g, " ").trim()}"`;
    const csv = [header.join(","), ...rowsForCsv.map((r) => header.map((h) => escape(r[h])).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    // show name of the selected company and the selected date range
    const companyName = company ? companies.find(c => c._id === company)?.name : "All Companies";
    const dateRangeStr = dateRange ? `${dateRange[0].format("YYYY-MM-DD")} to ${dateRange[1].format("YYYY-MM-DD")}` : "All Dates";
    a.download = `attendance_${companyName}_${dateRangeStr}_${dayjs().format("YYYYMMDD_HHmmss")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  /* ---------- render ---------- */
  return (
    <div className="page-container">
      <Space direction="vertical" size={16} style={{ display: "flex" }}>
        {/* Header */}
        <AttendanceHeader
          autoRefresh={autoRefresh}
          setAutoRefresh={setAutoRefresh}
          refreshEvery={refreshEvery}
          setRefreshEvery={setRefreshEvery}
          hardRefresh={hardRefresh}
          exportCSV={exportCSV}
        />

        {/* Filters */}
        <AttendanceFilters
          users={users}
          loadingUsers={loadingUsers}
          selectedUsers={selectedUsers}
          setSelectedUsers={setSelectedUsers}
          dateRange={dateRange}
          setDateRange={setDateRange}
          status={status}
          setStatus={setStatus}
          source={source}
          setSource={setSource}
          searchNote={searchNote}
          setSearchNote={setSearchNote}
          companies={companies}
          loadingCompanies={loadingCompanies}
          company={company}
          setCompany={setCompany}
        />

        {/* Dashboard */}
        {/* <AttendanceDashboard
          metrics={metrics}
          isTodayView={isTodayView}
          usersInScope={usersInScope}
          filteredRows={filteredRows}
        /> */}

        {/* Manual record (admin) */}
        <ManualRecordForm
          canEdit={canEdit}
          users={users}
          manual={manual}
          setManual={setManual}
          fetchData={fetchData}
        />

         {/* Table */}
         <AttendanceTable
           filteredRows={filteredRows}
           loading={loading}
           canEdit={canEdit}
           fetchData={fetchData}
           page={page}
           setPage={setPage}
           pageSize={pageSize}
           setPageSize={setPageSize}
           total={total}
           currentPageStart={(page - 1) * pageSize}
           companies={companies}
         />

         {/* Custom Pagination */}
         <CustomPagination
           page={page}
           setPage={setPage}
           pageSize={pageSize}
           setPageSize={setPageSize}
           total={total}
         />
      </Space>
    </div>
  );
}
