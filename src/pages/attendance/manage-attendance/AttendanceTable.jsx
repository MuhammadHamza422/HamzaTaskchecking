import React from "react";
import { Card, Table, Space, Tag, Button, Tooltip, Modal, Form, DatePicker, Input, message } from "antd";
import { EditOutlined, DeleteOutlined, CloseOutlined, PlusOutlined } from "@ant-design/icons";
import { adminUpdateAttendance, adminDeleteAttendance } from "../../../api/attendance";
import dayjs from "dayjs";
import Swal from "sweetalert2";

const fmtDT = (d) => {
  if (!d) return "—";
  const date = new Date(d);
  const dateStr = date.toLocaleDateString('en-GB', { 
    day: '2-digit', 
    month: '2-digit', 
    year: 'numeric' 
  });
  const timeStr = date.toLocaleTimeString('en-GB', { 
    hour: '2-digit', 
    minute: '2-digit',
    hour12: false 
  });
  return `${dateStr} ${timeStr}`;
};
const diffMinutes = (a, b) => Math.max(0, Math.round((new Date(b) - new Date(a)) / 60000));
const sumBreakMinutes = (breaks = []) =>
  breaks.reduce((acc, br) => {
    if (!br.startAt) return acc;
    const end = br.endAt ? new Date(br.endAt) : new Date();
    return acc + Math.max(0, Math.round((end - new Date(br.startAt)) / 60000));
  }, 0);

const AttendanceTable = ({
  filteredRows,
  loading,
  canEdit,
  fetchData,
  page,
  setPage,
  pageSize,
  setPageSize,
  total,
  currentPageStart = 0,
  companies = [],
}) => {
  const [editOpen, setEditOpen] = React.useState(false);
  const [editing, setEditing] = React.useState(null);
  const [form] = Form.useForm();
  const [breaksData, setBreaksData] = React.useState([]);

  const handleDelete = async (id) => {
    if (!canEdit) return;
    
    const result = await Swal.fire({
      title: "Delete Attendance Record",
      text: "Are you sure you want to delete this attendance record? This action cannot be undone.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ff4d4f",
      cancelButtonColor: "#6b7280",
      confirmButtonText: "Yes, Delete",
      cancelButtonText: "Cancel",
      reverseButtons: true,
      customClass: {
        popup: "rounded-lg",
        confirmButton: "rounded-md",
        cancelButton: "rounded-md",
      },
    });

    if (result.isConfirmed) {
      try {
        await adminDeleteAttendance(id);
        Swal.fire({
          title: "Deleted!",
          text: "The attendance record has been deleted successfully.",
          icon: "success",
          timer: 2000,
          showConfirmButton: false,
          customClass: {
            popup: "rounded-lg",
          },
        });
        fetchData();
      } catch (e) {
        Swal.fire({
          title: "Error!",
          text: e?.response?.data?.message || "Failed to delete the attendance record.",
          icon: "error",
          customClass: {
            popup: "rounded-lg",
          },
        });
      }
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

  const columns = [
    {
      title: "#",
      key: "index",
      width: 70,
      align: "center",
      fixed: "left",
      render: (_, __, index) => (
        <span style={{ fontWeight: 500, color: "rgba(0,0,0,.65)" }}>
          #{currentPageStart + index + 1}
        </span>
      ),
    },
    {
      title: "Employee",
      key: "user",
      width: 250,
      fixed: "left",
      render: (_, r) => (
        <div clasName="flex flex-col items-start gap-2 min-w-0">
          <div className="font-medium whitespace-nowrap min-w-0">
            {r.user?.firstName} {r.user?.lastName}
          </div>
          <p className="text-sm text-gray-500 whitespace-nowrap text-ellipsis">{r.user?.email}</p>
        </div>
      ),
      sorter: (a, b) => (a.user?.firstName || "").localeCompare(b.user?.firstName || ""),
    },
    {
      title: "Company",
      key: "company",
      width: 240,
      render: (_, r) => {
        const companyName = (() => {
          if (r.company && typeof r.company === 'object') return r.company.name || '—';
          if (r.company && typeof r.company === 'string') {
            const c = companies.find(x => x._id === r.company);
            return c?.name || '—';
          }
          return '—';
        })();
        return (
          <div style={{ fontSize: "12px", lineHeight: "1.4", whiteSpace: "nowrap" }}>
            {companyName}
          </div>
        );
      },
      sorter: (a, b) => {
        const getName = (row) => {
          if (row.company && typeof row.company === 'object') return row.company.name || '';
          if (row.company && typeof row.company === 'string') {
            const c = companies.find(x => x._id === row.company);
            return c?.name || '';
          }
          return '';
        };
        return getName(a).localeCompare(getName(b));
      },
    },
    { 
      title: "Check In", 
      dataIndex: "checkInAt", 
      key: "in", 
      width: 180, 
      render: (value) => (
        <div style={{ fontSize: "12px", lineHeight: "1.4" }}>
          {fmtDT(value)}
        </div>
      )
    },
    { 
      title: "Check Out", 
      dataIndex: "checkOutAt", 
      key: "out", 
      width: 180, 
      render: (value) => (
        <div style={{ fontSize: "12px", lineHeight: "1.4" }}>
          {fmtDT(value)}
        </div>
      )
    },
    {
      title: "Status",
      key: "status",
      width: 120,
      align: "center",
      render: (_, r) => {
        const onBreak =
          r.onBreak || (Array.isArray(r.breaks) && r.breaks.length && !r.breaks[r.breaks.length - 1]?.endAt);
        if (r.checkInAt && !r.checkOutAt) {
          if (onBreak) return <Tag color="gold" style={{ fontSize: "11px" }}>On Break</Tag>;
          return <Tag color="green" style={{ fontSize: "11px" }}>Checked In</Tag>;
        }
        if (r.checkOutAt) return <Tag style={{ fontSize: "11px" }}>Checked Out</Tag>;
        return <Tag style={{ fontSize: "11px" }}>—</Tag>;
      },
    },
    {
      title: "Worked (min)",
      dataIndex: "minutesWorked",
      key: "mins",
      width: 110,
      align: "right",
      render: (v) => (
        <span style={{ fontWeight: 500, color: "rgba(0,0,0,.85)" }}>
          {v ?? 0}
        </span>
      ),
    },
    {
      title: "Breaks",
      key: "breaks",
      width: 120,
      align: "center",
      render: (_, r) => {
        const count = r.breaks?.length || 0;
        const mins = sumBreakMinutes(r.breaks);
        return (
          <div style={{ display: "flex", alignItems: "center", gap: 4, justifyContent: "center" }}>
            <Tag color="blue" style={{ fontSize: "10px", margin: 0 }}>{count}x</Tag>
            <span style={{ color: "rgba(0,0,0,.65)", fontSize: "11px" }}>{mins}m</span>
          </div>
        );
      },
    },
    {
      title: "Source",
      dataIndex: "source",
      key: "source",
      width: 100,
      align: "center",
      render: (s) => (
        <Tag 
          color={s === "kiosk" ? "blue" : s === "manual" ? "purple" : "default"}
          style={{ fontSize: "11px" }}
        >
          {s || "—"}
        </Tag>
      ),
    },
    { 
      title: "Note", 
      dataIndex: "note", 
      key: "note", 
      width: 150,
      ellipsis: true, 
      render: (n) => (
        <span style={{ fontSize: "12px", color: "rgba(0,0,0,.65)" }}>
          {n || "—"}
        </span>
      )
    },
    {
      title: "Actions",
      key: "actions",
      fixed: "right",
      width: 120,
      align: "center",
      render: (_, r) => (
        <Space size={4}>
          <Tooltip title="Edit">
            <Button
              size="small"
              icon={<EditOutlined />}
              onClick={() => openEdit(r)}
              disabled={!canEdit}
              style={{ minWidth: "32px", height: "24px" }}
            />
          </Tooltip>
          <Tooltip title="Delete">
            <Button 
              size="small" 
              danger 
              icon={<DeleteOutlined />} 
              disabled={!canEdit}
              onClick={() => handleDelete(r._id)}
              style={{ minWidth: "32px", height: "24px" }}
            />
          </Tooltip>
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

  return (
    <>
      <div>
        <Table
          size="middle"
          rowKey={(r) => r._id}
          columns={columns}
          dataSource={filteredRows}
          loading={loading}
          expandable={{ expandedRowRender }}
          pagination={false}
          scroll={{ x: 1600 }}
          style={{ 
            fontSize: "13px",
            fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
          }}
        />
      </div>

      {/* Edit Modal */}
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
    </>
  );
};

export default AttendanceTable;
