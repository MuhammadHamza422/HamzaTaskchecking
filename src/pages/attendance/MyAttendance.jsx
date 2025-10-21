// src/pages/attendance/MyAttendance.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import { getMyAttendance } from "../../api/attendance";
import { formatTimeWithTimezone } from "../../utils/timezone";

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
  /* ---------- filters ---------- */
  const [dateRange, setDateRange] = useState(quickRanges["This Month"]);
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
  const fmtDT = (d) => formatTimeWithTimezone(d, companyTz);

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
      message.error(e?.response?.data?.message || "Failed to load attendance");
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
    const rowsForCsv = filteredRows.map((r) => ({
      Day: r.day || "",
      Company: r.company?.name || "",
      CompanyCode: r.company?.code || "",
      CompanyTimezone: r.company?.timezone || companyTz,
      CheckInLocal: formatTimeWithTimezone(r.checkInAt, r.company?.timezone || companyTz) || "",
      CheckOutLocal: formatTimeWithTimezone(r.checkOutAt, r.company?.timezone || companyTz) || "",
      CheckInAt: r.checkInAt || "",
      CheckOutAt: r.checkOutAt || "",
      Status:
        r.checkInAt && !r.checkOutAt
          ? r.onBreak ||
            (Array.isArray(r.breaks) && r.breaks.length && !r.breaks[r.breaks.length - 1]?.endAt)
            ? "On Break"
            : "Checked In"
          : r.checkOutAt
          ? "Checked Out"
          : "",
      MinutesWorked: r.minutesWorked ?? 0,
      BreaksCount: r.breaks?.length || 0,
      BreaksMinutes: sumBreakMinutes(r.breaks),
      Note: r.note || "",
      Source: r.source || "",
    }));

    const header = Object.keys(rowsForCsv[0] || {});
    const escape = (v) =>
      `"${String(v ?? "").replaceAll('"', '""').replace(/\n/g, " ").trim()}"`;
    const csv = [
      header.join(","),
      ...rowsForCsv.map((r) => header.map((h) => escape(r[h])).join(",")),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `my_attendance_${dayjs().format("YYYYMMDD_HHmmss")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
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
                <span style={{ color: "rgba(0,0,0,.45)" }}>Local time: {fmtDTFallback(new Date().toISOString())} → {formatTimeWithTimezone(new Date().toISOString(), companyTz)}</span>
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
                allowClear={false}
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
              <Segmented
                block
                value={status}
                onChange={setStatus}
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
                  { value: "admin", label: "Admin" },
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
            scroll={{ x: 1000 }}
          />
        </Card>
      </Space>
    </div>
  );
}
