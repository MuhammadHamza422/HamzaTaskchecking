// src/pages/attendance/ManageAttendance.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import {
  listAttendance,
  manualCreateAttendance,
  adminUpdateAttendance,
  adminDeleteAttendance,
} from "../../api/attendance";
import { fetchAllUsers } from "../../api/auth";

import {
  Card,
  Row,
  Col,
  Space,
  Table,
  Tag,
  Select,
  DatePicker,
  Input,
  Button,
  Statistic,
  Switch,
  Segmented,
  Tooltip,
  Popconfirm,
  message,
  Modal,
  Form,
} from "antd";
import {
  ReloadOutlined,
  LoginOutlined,
  LogoutOutlined,
  PauseCircleOutlined,
  ClockCircleOutlined,
  DeleteOutlined,
  EditOutlined,
  FileExcelOutlined,
  PlusOutlined,
  CloseOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";

const { RangePicker } = DatePicker;

/* ---------------- utils ---------------- */
const fmtDT = (d) => (d ? new Date(d).toLocaleString() : "—");
const diffMinutes = (a, b) => Math.max(0, Math.round((new Date(b) - new Date(a)) / 60000));
const sumBreakMinutes = (breaks = []) =>
  breaks.reduce((acc, br) => {
    if (!br.startAt) return acc;
    const end = br.endAt ? new Date(br.endAt) : new Date();
    return acc + Math.max(0, Math.round((end - new Date(br.startAt)) / 60000));
  }, 0);

const quickRanges = {
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
  const [dateRange, setDateRange] = useState(quickRanges.Today);
  const [status, setStatus] = useState("all"); // all | in | break | out
  const [source, setSource] = useState("all"); // all | kiosk | manual | admin
  const [searchNote, setSearchNote] = useState("");

  // Data
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);

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

  // Edit modal
  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState(null); // record being edited
  const [form] = Form.useForm();
  const [breaksData, setBreaksData] = useState([]); // editable list in modal

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
      });
      setRows(data?.items || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedUsers.length, dateRange, page, pageSize]);

  useEffect(() => {
    if (!autoRefresh || !isTodayView) return;
    clearInterval(timerRef.current);
    timerRef.current = setInterval(fetchData, refreshEvery * 1000);
    return () => clearInterval(timerRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoRefresh, isTodayView, refreshEvery, selectedUsers.length, page, pageSize]);

  /* ---------- derived ---------- */
  const filteredRows = useMemo(() => {
    const ids = new Set(selectedUsers);
    return (rows || []).filter((r) => {
      if (ids.size > 1 && r.user?._id && !ids.has(r.user._id)) return false;
      if (source !== "all" && String(r.source || "").toLowerCase() !== source) return false;
      if (searchNote && !(r.note || "").toLowerCase().includes(searchNote.toLowerCase())) return false;

      if (status !== "all") {
        const onBreak =
          r.onBreak || (Array.isArray(r.breaks) && r.breaks.length && !r.breaks[r.breaks.length - 1]?.endAt);
        const checkedIn = r.checkInAt && !r.checkOutAt;
        if (status === "break" && !onBreak) return false;
        if (status === "in" && (!checkedIn || onBreak)) return false;
        if (status === "out" && !!r.checkOutAt === false) return false;
      }
      return true;
    });
  }, [rows, selectedUsers, status, source, searchNote]);

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

  const handleManualCreate = async () => {
    if (!manual.userId || !manual.checkInAt) {
      return message.error("Employee and check-in time required");
    }
    try {
      await manualCreateAttendance({
        userId: manual.userId,
        checkInAt: manual.checkInAt,
        checkOutAt: manual.checkOutAt || null,
        note: manual.note || "",
      });
      message.success("Record added");
      setManual({ userId: "", checkInAt: "", checkOutAt: "", note: "" });
      fetchData();
    } catch (e) {
      message.error(e?.response?.data?.message || "Failed to add record");
    }
  };

  const handleDelete = async (id) => {
    if (!canEdit) return;
    try {
      await adminDeleteAttendance(id);
      message.success("Deleted");
      fetchData();
    } catch (e) {
      message.error(e?.response?.data?.message || "Delete failed");
    }
  };

  const openEdit = (record) => {
    setEditing(record);
    form.setFieldsValue({
      checkInAt: record.checkInAt ? dayjs(record.checkInAt) : null,
      checkOutAt: record.checkOutAt ? dayjs(record.checkOutAt) : null,
      note: record.note || "",
    });
    setBreaksData(
      (record.breaks || []).map((b, i) => ({
        key: `${record._id}-br-${i}`,
        startAt: b.startAt ? dayjs(b.startAt) : null,
        endAt: b.endAt ? dayjs(b.endAt) : null,
        note: b.note || "",
      }))
    );
    setEditOpen(true);
  };

  const saveEdit = async () => {
    try {
      const values = await form.validateFields();
      const payload = {
        checkInAt: values.checkInAt ? values.checkInAt.toISOString() : null,
        checkOutAt: values.checkOutAt ? values.checkOutAt.toISOString() : null,
        note: values.note || "",
        breaks: breaksData.map((b) => ({
          startAt: b.startAt ? b.startAt.toISOString() : null,
          endAt: b.endAt ? b.endAt.toISOString() : null,
          note: b.note || "",
        })),
      };
      await adminUpdateAttendance(editing._id, payload);
      message.success("Updated");
      setEditOpen(false);
      setEditing(null);
      fetchData();
    } catch (e) {
      if (e?.errorFields) return; // form validation error
      message.error(e?.response?.data?.message || "Update failed");
    }
  };

  /* ---------- table ---------- */
  const columns = [
    {
      title: "Employee",
      key: "user",
      render: (_, r) => (
        <Space size={6} wrap>
          <Tag>{(r.user?.firstName || "?")[0]}{(r.user?.lastName || "")[0] || ""}</Tag>
          <span style={{ fontWeight: 500 }}>
            {r.user?.firstName} {r.user?.lastName}
          </span>
          {/* <span style={{ color: "rgba(0,0,0,.45)" }}>{r.user?.email}</span> */}
        </Space>
      ),
      sorter: (a, b) => (a.user?.firstName || "").localeCompare(b.user?.firstName || ""),
    },
    // { title: "Day", dataIndex: "day", key: "day", width: 120 },
    { title: "Check In", dataIndex: "checkInAt", key: "in", width: 160, render: fmtDT },
    { title: "Check Out", dataIndex: "checkOutAt", key: "out", width: 160, render: fmtDT },
    {
      title: "Status",
      key: "status",
      width: 130,
      render: (_, r) => {
        const onBreak =
          r.onBreak || (Array.isArray(r.breaks) && r.breaks.length && !r.breaks[r.breaks.length - 1]?.endAt);
        if (r.checkInAt && !r.checkOutAt) {
          if (onBreak) return <Tag color="gold">On Break</Tag>;
          return <Tag color="green">Checked In</Tag>;
        }
        if (r.checkOutAt) return <Tag>Checked Out</Tag>;
        return <Tag>—</Tag>;
      },
    },
    {
      title: "Worked (min)",
      dataIndex: "minutesWorked",
      key: "mins",
      width: 120,
      align: "right",
      render: (v) => v ?? 0,
    },
    {
      title: "Breaks",
      key: "breaks",
      width: 140,
      render: (_, r) => {
        const count = r.breaks?.length || 0;
        const mins = sumBreakMinutes(r.breaks);
        return (
          <Space size={6}>
            <Tag color="blue">{count}x</Tag>
            <span style={{ color: "rgba(0,0,0,.65)" }}>{mins} min</span>
          </Space>
        );
      },
    },
    {
      title: "Source",
      dataIndex: "source",
      key: "source",
      width: 90,
      render: (s) => <Tag color={s === "kiosk" ? "blue" : s === "manual" ? "purple" : "default"}>{s || "—"}</Tag>,
    },
    { title: "Note", dataIndex: "note", key: "note", ellipsis: true, render: (n) => n || "—" },
    {
      title: "Actions",
      key: "actions",
      fixed: "right",
      width: 160,
      render: (_, r) => (
        <Space wrap>
          <Tooltip title="Edit">
            <Button
              size="small"
              icon={<EditOutlined />}
              onClick={() => openEdit(r)}
              disabled={!canEdit}
            />
          </Tooltip>
          <Popconfirm
            title="Delete this record?"
            onConfirm={() => handleDelete(r._id)}
            okButtonProps={{ danger: true }}
            okText="Delete"
            disabled={!canEdit}
          >
            <Button size="small" danger icon={<DeleteOutlined />} disabled={!canEdit} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const expandedRowRender = (r) => {
    const breaks = r.breaks || [];
    if (!breaks.length) return <div style={{ paddingLeft: 8, color: "rgba(0,0,0,.45)" }}>No breaks</div>;
    return (
      <Table
        size="small"
        pagination={false}
        columns={[
          { title: "Start", dataIndex: "startAt", render: (v) => fmtDT(v), width: 180 },
          { title: "End", dataIndex: "endAt", render: (v) => fmtDT(v), width: 180 },
          {
            title: "Duration (min)",
            key: "dur",
            align: "right",
            width: 140,
            render: (_, b) => (b.startAt ? diffMinutes(b.startAt, b.endAt || new Date()) : 0),
          },
          { title: "Note", dataIndex: "note", ellipsis: true },
        ]}
        dataSource={breaks.map((b, i) => ({ ...b, key: `${r._id}-br-${i}` }))}
      />
    );
  };

  /* ---------- export CSV ---------- */
  const exportCSV = () => {
    const rowsForCsv = filteredRows.map((r) => ({
      Employee: `${r.user?.firstName || ""} ${r.user?.lastName || ""}`.trim(),
      Email: r.user?.email || "",
      Day: r.day || "",
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
      Source: r.source || "",
      Note: r.note || "",
    }));

    const header = Object.keys(rowsForCsv[0] || {});
    const escape = (v) => `"${String(v ?? "").replaceAll('"', '""').replace(/\n/g, " ").trim()}"`;
    const csv = [header.join(","), ...rowsForCsv.map((r) => header.map((h) => escape(r[h])).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `attendance_${dayjs().format("YYYYMMDD_HHmmss")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  /* ---------- render ---------- */
  return (
    <div className="page-container">
      <Space direction="vertical" size={16} style={{ display: "flex" }}>
        {/* Header */}
        <Row align="middle" justify="space-between" gutter={[16, 16]}>
          <Col>
            <div style={{ display: "flex", gap: 8, alignItems: "baseline" }}>
              <h2 style={{ margin: 0 }}>Attendance</h2>
              <Tag color="blue">Live</Tag>
            </div>
            <div style={{ color: "rgba(0,0,0,.45)", marginTop: 4 }}>
              Clean, real-time view of check-ins, breaks, and hours.
            </div>
          </Col>
          <Col>
            <Space wrap>
              <Button icon={<ReloadOutlined />} onClick={hardRefresh}>Refresh</Button>
              <Switch checkedChildren="Auto" unCheckedChildren="Auto" checked={autoRefresh} onChange={setAutoRefresh} />
              <Segmented
                value={refreshEvery}
                onChange={setRefreshEvery}
                options={[
                  { label: "15s", value: 15 },
                  { label: "30s", value: 30 },
                  { label: "60s", value: 60 },
                ]}
              />
              <Button icon={<FileExcelOutlined />} onClick={exportCSV}>Export CSV</Button>
            </Space>
          </Col>
        </Row>

        {/* Filters */}
        <Card size="small">
          <Row gutter={[12, 12]} align="middle">
            <Col xs={24} md={10} lg={8}>
              <div style={{ marginBottom: 6, color: "rgba(0,0,0,.6)" }}>Employees</div>
              <Select
                mode="multiple"
                allowClear
                placeholder="All employees"
                loading={loadingUsers}
                value={selectedUsers}
                onChange={setSelectedUsers}
                showSearch
                optionFilterProp="label"
                style={{ width: "100%" }}
                options={users.map((u) => ({
                  value: u._id,
                  label: `${u.firstName} ${u.lastName} ${u.email ? `(${u.email})` : ""}`,
                }))}
              />
            </Col>

            <Col xs={24} sm={12} md={7} lg={6}>
              <div style={{ marginBottom: 6, color: "rgba(0,0,0,.6)" }}>Date Range</div>
              <RangePicker
                allowClear={false}
                value={dateRange}
                onChange={(v) => setDateRange(v)}
                ranges={quickRanges}
                style={{ width: "100%" }}
              />
            </Col>

            <Col xs={12} sm={6} md={3}>
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

            <Col xs={12} sm={6} md={3}>
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

            <Col xs={24} md={6} lg={7}>
              <div style={{ marginBottom: 6, color: "rgba(0,0,0,.6)" }}>Note contains</div>
              <Input
                placeholder="Search notes…"
                allowClear
                value={searchNote}
                onChange={(e) => setSearchNote(e.target.value)}
              />
            </Col>
          </Row>
        </Card>

        {/* Dashboard */}
        <Row gutter={[16, 16]}>
          <Col xs={12} sm={12} md={6}>
            <Card>
              <Statistic title="Checked In" value={metrics.checkedIn} prefix={<LoginOutlined />} />
              {isTodayView && metrics.notIn !== undefined && (
                <div style={{ color: "rgba(0,0,0,.45)", marginTop: 8 }}>
                  Not In: <strong>{metrics.notIn}</strong> / {usersInScope.length}
                </div>
              )}
            </Card>
          </Col>
          <Col xs={12} sm={12} md={6}>
            <Card>
              <Statistic title="On Break" value={metrics.onBreak} prefix={<PauseCircleOutlined />} />
            </Card>
          </Col>
          <Col xs={12} sm={12} md={6}>
            <Card>
              <Statistic title="Hours Worked" value={metrics.totalHours} suffix="h" prefix={<ClockCircleOutlined />} />
              <div style={{ color: "rgba(0,0,0,.45)", marginTop: 8 }}>Avg {metrics.avgHours} h / record</div>
            </Card>
          </Col>
          <Col xs={12} sm={12} md={6}>
            <Card>
              <Statistic title="Break Time" value={metrics.breakHours} suffix="h" />
              <div style={{ color: "rgba(0,0,0,.45)", marginTop: 8 }}>
                {filteredRows.reduce((a, r) => a + (r.breaks?.length || 0), 0)} total breaks
              </div>
            </Card>
          </Col>
        </Row>

        {/* Manual record (admin) */}
        {canEdit && (
          <Card title="Manual Record (Admin)" size="small">
            <Row gutter={[12, 12]}>
              <Col xs={24} md={6}>
                <div style={{ marginBottom: 6, color: "rgba(0,0,0,.6)" }}>Employee</div>
                <Select
                  showSearch
                  placeholder="Select"
                  value={manual.userId || undefined}
                  onChange={(v) => setManual({ ...manual, userId: v })}
                  style={{ width: "100%" }}
                  options={users.map((u) => ({ value: u._id, label: `${u.firstName} ${u.lastName}` }))}
                />
              </Col>
              <Col xs={24} md={6}>
                <div style={{ marginBottom: 6, color: "rgba(0,0,0,.6)" }}>Check-In At</div>
                <DatePicker
                  showTime
                  value={manual.checkInAt ? dayjs(manual.checkInAt) : null}
                  onChange={(v) => setManual({ ...manual, checkInAt: v ? v.toISOString() : "" })}
                  style={{ width: "100%" }}
                />
              </Col>
              <Col xs={24} md={6}>
                <div style={{ marginBottom: 6, color: "rgba(0,0,0,.6)" }}>Check-Out At (optional)</div>
                <DatePicker
                  showTime
                  value={manual.checkOutAt ? dayjs(manual.checkOutAt) : null}
                  onChange={(v) => setManual({ ...manual, checkOutAt: v ? v.toISOString() : "" })}
                  style={{ width: "100%" }}
                />
              </Col>
              <Col xs={24} md={6}>
                <div style={{ marginBottom: 6, color: "rgba(0,0,0,.6)" }}>Note</div>
                <Input value={manual.note} onChange={(e) => setManual({ ...manual, note: e.target.value })} />
              </Col>
            </Row>
            <div style={{ marginTop: 12 }}>
              <Button type="primary" onClick={handleManualCreate}>Add Record</Button>
            </div>
          </Card>
        )}

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
              onChange: (p, ps) => {
                setPage(p);
                setPageSize(ps);
              },
            }}
            scroll={{ x: 1100 }}
          />
        </Card>
      </Space>

      {/* Edit Modal (Admin) */}
      <Modal
        open={editOpen}
        title="Edit Attendance"
        onCancel={() => {
          setEditOpen(false);
          setEditing(null);
          setBreaksData([]);
          form.resetFields();
        }}
        onOk={saveEdit}
        okText="Save Changes"
        okButtonProps={{ type: "primary" }}
        destroyOnClose
      >
        <Form form={form} layout="vertical">
          <Form.Item label="Check-In At" name="checkInAt">
            <DatePicker showTime style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item label="Check-Out At" name="checkOutAt">
            <DatePicker showTime style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item label="Note" name="note">
            <Input.TextArea rows={3} placeholder="Optional note" />
          </Form.Item>

          <div style={{ fontWeight: 600, margin: "8px 0" }}>Breaks</div>
          <Table
            size="small"
            pagination={false}
            dataSource={breaksData}
            rowKey="key"
            columns={[
              {
                title: "Start",
                dataIndex: "startAt",
                width: 210,
                render: (_, record, idx) => (
                  <DatePicker
                    showTime
                    value={record.startAt}
                    onChange={(v) => {
                      const next = [...breaksData];
                      next[idx] = { ...next[idx], startAt: v };
                      setBreaksData(next);
                    }}
                    style={{ width: "100%" }}
                  />
                ),
              },
              {
                title: "End",
                dataIndex: "endAt",
                width: 210,
                render: (_, record, idx) => (
                  <DatePicker
                    showTime
                    value={record.endAt}
                    onChange={(v) => {
                      const next = [...breaksData];
                      next[idx] = { ...next[idx], endAt: v };
                      setBreaksData(next);
                    }}
                    style={{ width: "100%" }}
                  />
                ),
              },
              {
                title: "Duration (min)",
                key: "dur",
                align: "right",
                width: 130,
                render: (_, b) =>
                  b.startAt ? diffMinutes(b.startAt.toISOString(), b.endAt ? b.endAt.toISOString() : new Date()) : 0,
              },
              {
                title: "Note",
                dataIndex: "note",
                render: (_, record, idx) => (
                  <Input
                    value={record.note}
                    onChange={(e) => {
                      const next = [...breaksData];
                      next[idx] = { ...next[idx], note: e.target.value };
                      setBreaksData(next);
                    }}
                    placeholder="Optional"
                  />
                ),
              },
              {
                title: "",
                key: "actions",
                width: 48,
                render: (_, __, idx) => (
                  <Tooltip title="Remove break">
                    <Button
                      size="small"
                      icon={<CloseOutlined />}
                      onClick={() => setBreaksData((prev) => prev.filter((_, i) => i !== idx))}
                    />
                  </Tooltip>
                ),
              },
            ]}
          />
          <Button
            icon={<PlusOutlined />}
            style={{ marginTop: 8 }}
            onClick={() =>
              setBreaksData((p) => [
                ...p,
                {
                  key: `br-${Date.now()}`,
                  startAt: null,
                  endAt: null,
                  note: "",
                },
              ])
            }
          >
            Add Break
          </Button>
        </Form>
      </Modal>
    </div>
  );
}
