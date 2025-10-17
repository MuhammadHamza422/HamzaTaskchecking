import React, { useEffect, useMemo, useRef, useState } from "react";
import { listAttendance } from "../../../api/attendance";
import { fetchAllUsers } from "../../../api/auth";
import { Space, message } from "antd";
import dayjs from "dayjs";

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

  // Filters
  const [selectedUsers, setSelectedUsers] = useState([]); // multi
  const [dateRange, setDateRange] = useState(quickRanges["Biweekly (15 days)"]);
  const [status, setStatus] = useState("all"); // all | in | break | out
  const [source, setSource] = useState("all"); // all | kiosk | manual | admin
  const [searchNote, setSearchNote] = useState("");

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
  }, [selectedUsers.length, dateRange, page, pageSize, status, source, searchNote]);

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
  }, [status, source, searchNote]);

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
    // For server-side pagination, we export only the current page data
    // Sort data alphabetically by employee name, then by check-in date (descending within each employee)
    const sortedRows = [...(filteredRows || [])].sort((a, b) => {
      const nameA = `${a.user?.firstName || ""} ${a.user?.lastName || ""}`.trim();
      const nameB = `${b.user?.firstName || ""} ${b.user?.lastName || ""}`.trim();
      
      // First sort by employee name (ascending)
      const nameComparison = nameA.localeCompare(nameB);
      if (nameComparison !== 0) return nameComparison;
      
      // Then sort by check-in date (descending within each employee)
      const dateA = new Date(a.checkInAt || 0);
      const dateB = new Date(b.checkInAt || 0);
      return dateB - dateA;
    });

    const rowsForCsv = sortedRows.map((r) => ({
      Employee: `${r.user?.firstName || ""} ${r.user?.lastName || ""}`.trim(),
      "Check In": r.checkInAt ? new Date(r.checkInAt).toLocaleString() : "",
      "Check Out": r.checkOutAt ? new Date(r.checkOutAt).toLocaleString() : "",
      "Worked Hours": r.minutesWorked ? (r.minutesWorked / 60).toFixed(2) : "0.00",
    }));

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
    a.download = `attendance_page_${page}_${dayjs().format("YYYYMMDD_HHmmss")}.csv`;
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
        />

        {/* Dashboard */}
        <AttendanceDashboard
          metrics={metrics}
          isTodayView={isTodayView}
          usersInScope={usersInScope}
          filteredRows={filteredRows}
        />

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
