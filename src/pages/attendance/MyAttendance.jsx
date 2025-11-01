// src/pages/attendance/MyAttendance.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import { getMyAttendance } from "../../api/attendance";
import { formatTimeWithTimezone, formatAttendanceTime, formatCSVTime, formatCSVTimeOnly } from "../../utils/timezone";
import LiveTimeTracker from "../../components/common/LiveTimeTracker";
import { useAuth } from "../../contexts/AuthContext";
import { splitAttendanceByDays, normalizeDateFormat, sortRecordsForCSV, calculateWorkedHoursForCSV } from "../../utils/attendanceHelpers";
import { useCompanyAttendanceRules } from "../../hooks/useCompanyAttendanceRules";
import { 
  showSuccessToast, 
  showErrorToast, 
  showWarningToast,
  showInfoToast
} from "../../utils/sweetAlert";

import {
  Card,
  Table,
  Row,
  Col,
  Space,
  Tag,
  DatePicker,
  Select,
  Input,
  Button,
  Statistic,
  Segmented,
  Tooltip,
  message,
} from "antd";
import {
  ReloadOutlined,
  FileExcelOutlined,
  PauseCircleOutlined,
  LoginOutlined,
  ClockCircleOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";

const { RangePicker } = DatePicker;

/* ---------------- helpers ---------------- */
const fmtDTFallback = (d) => (d ? new Date(d).toLocaleString() : "—");
const fmtHM = (mins) => {
  const m = Math.max(0, Math.round(mins || 0));
  const h = Math.floor(m / 60);
  const mm = String(m % 60).padStart(2, "0");
  return `${h}:${mm}`;
};
const diffMinutes = (a, b) =>
  a ? Math.max(0, Math.round((new Date(b || new Date()) - new Date(a)) / 60000)) : 0;

const sumBreakMinutes = (breaks = []) =>
  breaks.reduce((acc, br) => acc + diffMinutes(br.startAt, br.endAt || new Date()), 0);

const quickRanges = {
  Today: [dayjs().startOf("day"), dayjs().endOf("day")],
  "This Week": [dayjs().startOf("week"), dayjs().endOf("week")],
  "This Month": [dayjs().startOf("month"), dayjs().endOf("month")],
  "Last 30d": [dayjs().subtract(29, "day").startOf("day"), dayjs().endOf("day")],
};

export default function MyAttendance() {
  const { user } = useAuth();
  
  /* ---------- filters ---------- */
  const [dateRange, setDateRange] = useState(null);
  const [status, setStatus] = useState("all"); // all | in | break | out
  const [source, setSource] = useState("all"); // all | kiosk | manual | admin
  const [noteQuery, setNoteQuery] = useState("");

  /* ---------- data ---------- */
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(30);
  const totalRef = useRef(0); // optional: store total if your API returns it

  // Derive user's company and timezone from results (assuming same company for self records)
  const company = useMemo(() => rows?.[0]?.company || null, [rows]);
  const companyTz = company?.timezone || "UTC";
  const companyId = company?._id || company?.id;
  const fmtDT = (d) => formatAttendanceTime(d, companyTz);

  const fetchData = async () => {
    const [from, to] = dateRange || [];
    setLoading(true);
    try {
      // If your API supports from/to, pass them; else remove these two keys.
      const res = await getMyAttendance({
        page,
        limit: pageSize,
        from: from ? from.format("YYYY-MM-DD") : "",
        to: to ? to.format("YYYY-MM-DD") : "",
      });
      setRows(res?.items || []);
      totalRef.current = res?.total ?? (res?.items?.length || 0);
    } catch (e) {
      showErrorToast(e?.response?.data?.message || "Failed to load attendance", "Data Load Failed");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize, dateRange]);

  /* ---------- derived ---------- */
  const filteredRows = useMemo(() => {
    return (rows || []).filter((r) => {
      if (source !== "all" && String(r.source || "").toLowerCase() !== source) return false;

      if (noteQuery && !(r.note || "").toLowerCase().includes(noteQuery.toLowerCase())) return false;

      if (status !== "all") {
        const onBreak =
          r.onBreak ||
          (Array.isArray(r.breaks) && r.breaks.length && !r.breaks[r.breaks.length - 1]?.endAt);
        const checkedIn = r.checkInAt && !r.checkOutAt;

        if (status === "break" && !onBreak) return false;
        if (status === "in" && (!checkedIn || onBreak)) return false;
        if (status === "out" && !r.checkOutAt) return false;
      }
      return true;
    });
  }, [rows, status, source, noteQuery]);

  // Get current attendance record for company rules
  const currentRecord = useMemo(() => {
    return filteredRows.find(r => r.checkInAt && !r.checkOutAt) || null;
  }, [filteredRows]);

  // Company-specific attendance rules
  const companyRules = useCompanyAttendanceRules(companyId, currentRecord);

  const metrics = useMemo(() => {
    const total = filteredRows.length;
    let checkedIn = 0;
    let onBreak = 0;
    let workedMins = 0;
    let breakMins = 0;

    filteredRows.forEach((r) => {
      const isIn = r.checkInAt && !r.checkOutAt;
      const isBr =
        r.onBreak ||
        (Array.isArray(r.breaks) && r.breaks.length && !r.breaks[r.breaks.length - 1]?.endAt);

      if (isIn) checkedIn += 1;
      if (isBr) onBreak += 1;
      workedMins += Number(r.minutesWorked || 0);
      breakMins += sumBreakMinutes(r.breaks);
    });

    return {
      total,
      checkedIn,
      onBreak,
      workedHours: (workedMins / 60).toFixed(1),
      avgHours: total ? (workedMins / 60 / total).toFixed(2) : "0.00",
      breakHours: (breakMins / 60).toFixed(1),
      totalBreaks: filteredRows.reduce((a, r) => a + (r.breaks?.length || 0), 0),
    };
  }, [filteredRows]);

  /* ---------- ui actions ---------- */
  const hardRefresh = () => fetchData();

  const exportCSV = () => {
    // Split multi-day records into separate days
    const splitRecords = [];
    filteredRows.forEach(record => {
      const recordTimezone = record.company?.timezone || companyTz;
      const dayRecords = splitAttendanceByDays(record, recordTimezone);
      splitRecords.push(...dayRecords);
    });

    // Sort records for CSV: name (ascending) then date (sequential)
    const sortedRecords = sortRecordsForCSV(splitRecords);

    const rowsForCsv = sortedRecords.map((r) => {
      const recordTimezone = r.company?.timezone || companyTz;
      
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
      
      // For CSV, handle live shifts vs completed shifts differently
      const isLiveShift = r.checkInAt && !r.checkOutAt;
      const companyCode = r.company?.code || r.user?.company?.code;
      
      let displayHours, payHours, totalPay;
      
      if (isLiveShift) {
        // For live shifts, calculate current actual work time
        const checkInTime = new Date(r.checkInAt);
        const checkOutTime = new Date(); // Current time
        const totalMinutes = Math.floor((checkOutTime - checkInTime) / (1000 * 60));
        
        // Calculate break time
        const breakMinutes = (r.breaks || []).reduce((acc, br) => {
          if (!br.startAt) return acc;
          const end = br.endAt ? new Date(br.endAt) : new Date();
          return acc + Math.max(0, Math.round((end - new Date(br.startAt)) / 60000));
        }, 0);
        
        // Calculate actual work time (excluding breaks)
        const actualWorkMinutes = Math.max(0, totalMinutes - breakMinutes);
        const actualWorkHours = actualWorkMinutes / 60;
        
        // For US/Colombia, cap display hours at 9, pay hours at 8
        if (companyCode === 'USWH' || companyCode === 'COL') {
          displayHours = Math.min(actualWorkHours, 9);
          payHours = Math.min(actualWorkHours, 8);
        } else {
          // Japan: use actual hours
          displayHours = actualWorkHours;
          payHours = actualWorkHours;
        }
        
        // Calculate total pay for live shift
        // Note: getHourlyRate helper is defined later in the function
        const hourlyRateForCalc = r.payroll?.hourlyRate || r.user?.hourlyRate;
        totalPay = hourlyRateForCalc ? hourlyRateForCalc * payHours : 0;
      } else {
        // For completed shifts, use backend-calculated values
        displayHours = r.totalHoursForPayroll || 0;
        payHours = r.payroll?.totalHours || 0;
        totalPay = r.payroll?.totalPay || 0;
      }
      
      const workedHours = {
        totalHours: displayHours,
        workHours: payHours,
        breakHours: 0, // Not used in CSV
        isForceCheckout: false
      };
      
      // Get currency based on company code/name (company-specific)
      const getCompanyCurrency = (record) => {
        const companyCode = record.company?.code;
        const companyName = record.company?.name || '';
        
        // Company-specific currency mapping
        if (companyCode === 'JPOS' || companyName.toLowerCase().includes('japan')) {
          return 'JPY';
        }
        if (companyCode === 'COL' || companyName.toLowerCase().includes('colombia') || companyName.toLowerCase().includes('bogota')) {
          return 'COP';
        }
        if (companyCode === 'USWH' || companyName.toLowerCase().includes('us') || companyName.toLowerCase().includes('america')) {
          return 'USD';
        }
        return 'USD';
      };

      // Get currency with proper fallback chain
      const getCurrency = (record) => {
        // Prioritize payroll snapshot currency (set at check-in)
        if (record.payroll?.currency) {
          return record.payroll.currency;
        }
        // Fallback to company-based currency
        const companyCurrency = getCompanyCurrency(record);
        if (companyCurrency) {
          return companyCurrency;
        }
        // Last resort: user/employee currency
        return record.user?.currency || record.employee?.payroll?.currency || 'USD';
      };

      // Get hourly rate with proper fallback chain
      const getHourlyRate = (record) => {
        // Prioritize payroll snapshot (set at check-in)
        if (typeof record.payroll?.hourlyRate === 'number') {
          return record.payroll.hourlyRate;
        }
        // Fallback to user/employee rate
        return record.user?.hourlyRate || record.employee?.payroll?.hourlyRate || null;
      };

      // Format currency
      const formatCurrency = (amount, currency = 'USD') => {
        if (amount === null || amount === undefined) return '-';
        
        // For Colombian Peso, use custom formatting to show $ symbol
        if (currency === 'COP') {
          return `$${amount.toFixed(2)}`;
        }
        
        // For Japanese Yen, use custom formatting (no decimal places)
        if (currency === 'JPY') {
          return `¥${Math.round(amount).toLocaleString()}`;
        }
        
        return new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: currency,
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }).format(amount);
      };

      const currency = getCurrency(r);
      const hourlyRate = getHourlyRate(r);

      return {
        Employee: `${r.user?.firstName || ""} ${r.user?.lastName || ""}`.trim(),
        Date: r.splitDay ? r.day : normalizeDateFormat(r.day || r.checkInAt),
        "Check In": checkIn,
        "Check Out": checkOut,
        "Total Hours": `${Math.floor(workedHours.totalHours)}:${String(Math.round((workedHours.totalHours % 1) * 60)).padStart(2, '0')}`,
        "Hourly Rate": formatCurrency(hourlyRate, currency),
        "Total Pay": (() => {
          // Use calculated totalPay (already computed above for both live and completed shifts)
          if (totalPay > 0) {
            return formatCurrency(totalPay, currency);
          }
          return '-';
        })(),
        "Currency": currency,
      };
    });

    const header = Object.keys(rowsForCsv[0] || {});
    const escape = (v) =>
      `"${String(v ?? "").replaceAll('"', '""').replace(/\n/g, " ").trim()}"`;
    if (rowsForCsv.length === 0) {
      showWarningToast("No data to export", "Export Failed");
      return;
    }

    const csv = [
      header.join(","),
      ...rowsForCsv.map((r) => header.map((h) => escape(r[h])).join(",")),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    
    // Get user name and date range for filename
    const userName = `${user?.firstName || 'user'}_${user?.lastName || 'attendance'}`.toLowerCase();
    const dateRangeStr = dateRange ? `${dateRange[0].format("YYYY-MM-DD")}_to_${dateRange[1].format("YYYY-MM-DD")}` : "all_dates";
    a.download = `${userName}_${dateRangeStr}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    
    showSuccessToast(`CSV exported successfully with ${rowsForCsv.length} records`, "Export Complete");
  };

  /* ---------- table ---------- */
  const columns = [
    {
      title: "Company",
      key: "company",
      width: 240,
      render: (_, r) => {
        const c = r.company || {};
        if (!c || (!c.name && !c.code)) return "—";
        return (
          <Space size={6}>
            {/* <Tag color="geekblue">{c.code || "—"}</Tag> */}
            <span>{c.name || "—"}</span>
          </Space>
        );
      },
      sorter: (a, b) => String(a.company?.name || "").localeCompare(String(b.company?.name || "")),
    },
    {
      title: "Day",
      dataIndex: "day",
      key: "day",
      width: 120,
      render: (d) => <Tag>{d || "—"}</Tag>,
      sorter: (a, b) => String(a.day || "").localeCompare(String(b.day || "")),
    },
    { title: "Check In", dataIndex: "checkInAt", key: "in", width: 200, render: fmtDT },
    { title: "Check Out", dataIndex: "checkOutAt", key: "out", width: 200, render: fmtDT },
    {
      title: "Status",
      key: "status",
      width: 130,
      render: (_, r) => {
        const onBreak =
          r.onBreak ||
          (Array.isArray(r.breaks) && r.breaks.length && !r.breaks[r.breaks.length - 1]?.endAt);
        if (r.checkInAt && !r.checkOutAt) {
          if (onBreak) return <Tag color="gold">On Break</Tag>;
          return <Tag color="green">Checked In</Tag>;
        }
        if (r.checkOutAt) return <Tag>Checked Out</Tag>;
        return <Tag>—</Tag>;
      },
    },
    {
      title: "Worked",
      dataIndex: "minutesWorked",
      key: "mins",
      width: 120,
      align: "right",
      render: (v) => (
        <Space size={4}>
          <span style={{ fontVariantNumeric: "tabular-nums" }}>{fmtHM(v)}</span>
          <span style={{ color: "rgba(0,0,0,.45)" }}>({v ?? 0} m)</span>
        </Space>
      ),
    },
    {
      title: "Live Time",
      key: "liveTime",
      width: 140,
      align: "center",
      render: (_, record) => {
        const isCurrentlyWorking = record.checkInAt && !record.checkOutAt;
        
        return (
          <LiveTimeTracker 
            record={record}
            breaks={record.breaks || []}
            timezone={companyTz}
            isLive={isCurrentlyWorking}
          />
        );
      },
    },
    {
      title: "Breaks",
      key: "breaks",
      width: 160,
      render: (_, r) => {
        const count = r.breaks?.length || 0;
        const mins = sumBreakMinutes(r.breaks);
        return (
          <Space size={6}>
            <Tag color="blue">{count}x</Tag>
            <span style={{ color: "rgba(0,0,0,.65)" }}>{fmtHM(mins)} ({mins}m)</span>
          </Space>
        );
      },
    },
    { title: "Note", dataIndex: "note", key: "note", ellipsis: true, render: (n) => n || "—" },
    {
      title: "Source",
      dataIndex: "source",
      key: "source",
      width: 90,
      render: (s) => (
        <Tag color={s === "kiosk" ? "blue" : s === "manual" ? "purple" : s === "admin" ? "red" : "default"}>
          {s || "—"}
        </Tag>
      ),
    },
  ];

  const expandedRowRender = (r) => {
    const breaks = r.breaks || [];
    if (!breaks.length)
      return <div style={{ paddingLeft: 8, color: "rgba(0,0,0,.45)" }}>No breaks</div>;
    return (
      <Table
        size="small"
        pagination={false}
        columns={[
          { title: "Start", dataIndex: "startAt", width: 220, render: fmtDT },
          { title: "End", dataIndex: "endAt", width: 220, render: fmtDT },
          {
            title: "Duration",
            key: "dur",
            align: "right",
            width: 140,
            render: (_, b) => {
              const mins = diffMinutes(b.startAt, b.endAt);
              return (
                <Space size={4}>
                  <span style={{ fontVariantNumeric: "tabular-nums" }}>{fmtHM(mins)}</span>
                  <span style={{ color: "rgba(0,0,0,.45)" }}>({mins} m)</span>
                </Space>
              );
            },
          },
          { title: "Note", dataIndex: "note", ellipsis: true },
        ]}
        dataSource={breaks.map((b, i) => ({ ...b, key: `${r._id}-br-${i}` }))}
      />
    );
  };

  /* ---------- render ---------- */
  return (
    <div className="page-container">
      <Space direction="vertical" size={16} style={{ display: "flex" }}>
        {/* Header */}
        <Row align="middle" justify="space-between" gutter={[16, 16]}>
          <Col>
            <div style={{ display: "flex", gap: 8, alignItems: "baseline" }}>
              <h2 style={{ margin: 0 }}>My Attendance</h2>
              <Tag color="blue">Personal</Tag>
            </div>
            <div style={{ color: "rgba(0,0,0,.45)", marginTop: 4 }}>
              Review your check-ins, breaks, and total hours with powerful filters.
            </div>
            {company && (
              <div style={{ marginTop: 8, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                <Tag color="geekblue">{company.code || "—"}</Tag>
                <span style={{ fontWeight: 500 }}>{company.name}</span>
                <Tag>{company.timezone || "UTC"}</Tag>
                <span style={{ color: "rgba(0,0,0,.45)" }}>Local time: {fmtDTFallback(new Date().toISOString())} → {formatAttendanceTime(new Date().toISOString(), companyTz)}</span>
              </div>
            )}

            {/* Company-specific rules display */}
            {companyRules.isLoading && (
              <div style={{ marginTop: 12, padding: 12, backgroundColor: "#f9fafb", border: "1px solid #d1d5db", borderRadius: 8 }}>
                <div style={{ color: "#6b7280", fontSize: 14 }}>Loading company rules...</div>
              </div>
            )}
            
            {companyRules.error && (
              <div style={{ marginTop: 12, padding: 12, backgroundColor: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8 }}>
                <div style={{ color: "#dc2626", fontSize: 14 }}>Failed to load company rules. Using default settings.</div>
              </div>
            )}
            
            {companyRules.isFixedShift && !companyRules.isLoading && (
              <div style={{ marginTop: 12, padding: 12, backgroundColor: "#f0f4ff", border: "1px solid #dbeafe", borderRadius: 8 }}>
                <div style={{ color: "#1e40af", fontSize: 14, fontWeight: 500, marginBottom: 4 }}>
                  {companyRules.uiMessages.shiftInfo}
                </div>
                <div style={{ color: "#3730a3", fontSize: 13 }}>
                  {companyRules.uiMessages.breakInfo}
                </div>
                
                {/* Work progress for current session */}
                {currentRecord && (
                  <div style={{ marginTop: 8 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#3730a3", marginBottom: 4 }}>
                      <span>Current Session Progress</span>
                      <span>{Math.round(companyRules.getWorkProgress().progress)}%</span>
                    </div>
                    <div style={{ width: "100%", backgroundColor: "#e0e7ff", borderRadius: 4, height: 6 }}>
                      <div 
                        style={{ 
                          backgroundColor: "#3b82f6", 
                          height: 6, 
                          borderRadius: 4,
                          width: `${Math.min(100, companyRules.getWorkProgress().progress)}%`,
                          transition: "width 0.3s ease"
                        }}
                      />
                    </div>
                    <div style={{ fontSize: 11, color: "#6b7280", marginTop: 4 }}>
                      {(() => {
                        const workProgress = companyRules.getWorkProgress();
                        const isOnBreak = currentRecord.onBreak || 
                          (Array.isArray(currentRecord.breaks) && currentRecord.breaks.length && !currentRecord.breaks[currentRecord.breaks.length - 1]?.endAt);
                        
                        if (isOnBreak) {
                          const remainingBreakTime = companyRules.getRemainingBreakTime();
                          return remainingBreakTime !== null 
                            ? `On break - ${remainingBreakTime} minutes remaining`
                            : 'On break';
                        }
                        
                        return workProgress.remainingMinutes > 0 
                          ? `${workProgress.remainingMinutes} minutes remaining`
                          : 'Session complete';
                      })()}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Warnings */}
            {companyRules.warnings.length > 0 && (
              <div style={{ marginTop: 12 }}>
                {companyRules.warnings.map((warning, index) => (
                  <div 
                    key={index}
                    style={{
                      padding: 8,
                      borderRadius: 6,
                      marginBottom: 4,
                      fontSize: 13,
                      backgroundColor: warning.type === 'error' ? '#fef2f2' : '#fffbeb',
                      border: `1px solid ${warning.type === 'error' ? '#fecaca' : '#fed7aa'}`,
                      color: warning.type === 'error' ? '#dc2626' : '#d97706'
                    }}
                  >
                    {warning.message}
                  </div>
                ))}
              </div>
            )}
          </Col>
          <Col>
            <Space wrap>
              <Button icon={<ReloadOutlined />} onClick={hardRefresh}>
                Refresh
              </Button>
              <Button icon={<FileExcelOutlined />} onClick={exportCSV}>
                Export CSV
              </Button>
            </Space>
          </Col>
        </Row>

        {/* Filters */}
        <Card size="small">
          <Row gutter={[12, 12]} align="middle">
            <Col xs={24} md={10} lg={8}>
              <div style={{ marginBottom: 6, color: "rgba(0,0,0,.6)" }}>Date Range</div>
              <RangePicker
                allowClear
                value={dateRange}
                onChange={(v) => {
                  setDateRange(v);
                  setPage(1);
                }}
                presets={[
                  { label: 'Today', value: quickRanges.Today },
                  { label: 'This Week', value: quickRanges['This Week'] },
                  { label: 'This Month', value: quickRanges['This Month'] },
                ]}
                style={{ width: "100%" }}
              />
            </Col>

            <Col xs={12} md={5} lg={4}>
              <div style={{ marginBottom: 6, color: "rgba(0,0,0,.6)" }}>Status</div>
              {/* add select dropdown in it */}
              <Select
                value={status}
                onChange={setStatus}
                style={{ width: "100%" }}
                options={[
                  { label: "All", value: "all" },
                  { label: "In", value: "in" },
                  { label: "Break", value: "break" },
                  { label: "Out", value: "out" },
                ]}
              />
            </Col>

            <Col xs={12} md={5} lg={4}>
              <div style={{ marginBottom: 6, color: "rgba(0,0,0,.6)" }}>Source</div>
              <Select
                value={source}
                onChange={setSource}
                style={{ width: "100%" }}
                options={[
                  { value: "all", label: "All" },
                  { value: "kiosk", label: "Kiosk" },
                  { value: "manual", label: "Manual" },
                  // { value: "admin", label: "Admin" },
                ]}
              />
            </Col>

            <Col xs={24} md={8} lg={8}>
              <div style={{ marginBottom: 6, color: "rgba(0,0,0,.6)" }}>Note contains</div>
              <Input
                placeholder="Search notes…"
                allowClear
                value={noteQuery}
                onChange={(e) => setNoteQuery(e.target.value)}
              />
            </Col>
          </Row>
        </Card>

        {/* Dashboard */}
        <Row gutter={[16, 16]}>
          <Col xs={12} sm={12} md={6}>
            <Card>
              <Statistic title="Records" value={metrics.total} />
            </Card>
          </Col>
          <Col xs={12} sm={12} md={6}>
            <Card>
              <Statistic title="Currently In" value={metrics.checkedIn} prefix={<LoginOutlined />} />
            </Card>
          </Col>
          <Col xs={12} sm={12} md={6}>
            <Card>
              <Statistic title="On Break" value={metrics.onBreak} prefix={<PauseCircleOutlined />} />
            </Card>
          </Col>
          <Col xs={12} sm={12} md={6}>
            <Card>
              <Statistic title="Hours Worked" value={metrics.workedHours} suffix="h" prefix={<ClockCircleOutlined />} />
              <div style={{ color: "rgba(0,0,0,.45)", marginTop: 8 }}>
                Avg {metrics.avgHours} h / record • Break {metrics.breakHours} h
              </div>
            </Card>
          </Col>
        </Row>

        {/* Table */}
        <Card>
          <Table
            size="middle"
            rowKey={(r) => r._id}
            columns={columns}
            dataSource={filteredRows}
            loading={loading}
            expandable={{ expandedRowRender }}
            pagination={{
              current: page,
              pageSize,
              showSizeChanger: true,
              total: totalRef.current || filteredRows.length,
              onChange: (p, ps) => {
                setPage(p);
                setPageSize(ps);
              },
            }}
            scroll={{ x: 1140 }}
          />
        </Card>
      </Space>
    </div>
  );
}
