import React from "react";
import { Card, Table, Space, Tag, Button, Tooltip, Modal, Form, DatePicker, Input, message, InputNumber, Select } from "antd";
import { EditOutlined, DeleteOutlined, CloseOutlined, PlusOutlined, DollarOutlined, CalculatorOutlined } from "@ant-design/icons";
import { adminUpdateAttendance, adminDeleteAttendance } from "../../../api/attendance";
import { updateEmployeePayroll, bulkUpdateEmployeePayroll, recalculateAttendancePayroll } from "../../../api/payroll";
import dayjs from "dayjs";
import Swal from "sweetalert2";
import { formatDateTimeInTimezone, formatTimeWithTimezone, formatAttendanceTime, getCompanyTimezone } from "../../../utils/timezone";
import LiveTimeTracker from "../../../components/common/LiveTimeTracker";

const fmtDT = (d, timezone = 'UTC') => {
  if (!d) return "-";
  return formatDateTimeInTimezone(d, timezone);
};

const fmtDTWithTimezone = (d, timezone = 'UTC') => {
  if (!d) return "-";
  return formatTimeWithTimezone(d, timezone);
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
  
  // Payroll states
  const [payrollModalOpen, setPayrollModalOpen] = React.useState(false);
  const [bulkPayrollModalOpen, setBulkPayrollModalOpen] = React.useState(false);
  const [selectedRows, setSelectedRows] = React.useState([]);
  const [editingPayroll, setEditingPayroll] = React.useState(null);
  const [payrollForm] = Form.useForm();
  const [bulkPayrollForm] = Form.useForm();
  const [payrollLoading, setPayrollLoading] = React.useState(false);
  const [bulkPayrollLoading, setBulkPayrollLoading] = React.useState(false);

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

  // Payroll functions
  const handlePayrollEdit = (record) => {
    setEditingPayroll(record);
    payrollForm.setFieldsValue({
      hourlyRate: record.payroll?.hourlyRate || record.user?.hourlyRate || 0,
      currency: record.payroll?.currency || record.user?.currency || 'USD',
    });
    setPayrollModalOpen(true);
  };

  const savePayrollEdit = async () => {
    try {
      setPayrollLoading(true);
      const values = await payrollForm.validateFields();
      await updateEmployeePayroll(editingPayroll.user._id, {
        hourlyRate: values.hourlyRate,
        currency: values.currency,
        payrollEnabled: true,
      });
      
      // Recalculate payroll for this attendance record
      await recalculateAttendancePayroll(editingPayroll._id);
      
      message.success("Payroll updated successfully");
      setPayrollModalOpen(false);
      setEditingPayroll(null);
      fetchData();
    } catch (error) {
      message.error(error?.response?.data?.message || "Failed to update payroll");
    } finally {
      setPayrollLoading(false);
    }
  };

  const handleBulkPayrollUpdate = async () => {
    try {
      setBulkPayrollLoading(true);
      const values = await bulkPayrollForm.validateFields();
      const employeeIds = selectedRows.map(row => row.user._id);
      
      await bulkUpdateEmployeePayroll({
        employeeIds,
        hourlyRate: values.hourlyRate,
        currency: values.currency,
        effectiveFrom: values.effectiveFrom ? values.effectiveFrom.toISOString() : new Date().toISOString(),
      });
      
      // Recalculate payroll for all selected attendance records
      const attendanceIds = selectedRows.map(row => row._id);
      for (const attendanceId of attendanceIds) {
        try {
          await recalculateAttendancePayroll(attendanceId);
        } catch (error) {
          console.warn(`Failed to recalculate payroll for attendance ${attendanceId}:`, error);
        }
      }
      
      message.success(`Payroll updated for ${employeeIds.length} employees`);
      setSelectedRows([]);
      setBulkPayrollModalOpen(false);
      bulkPayrollForm.resetFields();
      fetchData();
    } catch (error) {
      message.error(error?.response?.data?.message || "Failed to update payroll");
    } finally {
      setBulkPayrollLoading(false);
    }
  };

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

  const formatHours = (hours) => {
    if (hours === null || hours === undefined) return '-';
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    return `${h}:${m.toString().padStart(2, '0')}`;
  };

  // Calculate actual work time for payroll (excluding breaks)
  const calculateActualWorkTime = (record) => {
    if (!record.checkInAt) return 0;
    
    const checkInTime = new Date(record.checkInAt);
    const checkOutTime = record.checkOutAt ? new Date(record.checkOutAt) : new Date();
    const totalMinutes = Math.floor((checkOutTime - checkInTime) / (1000 * 60));
    
    // Calculate break time
    const breakMinutes = sumBreakMinutes(record.breaks || []);
    
    // Return actual work time in hours (excluding breaks)
    return Math.max(0, (totalMinutes - breakMinutes) / 60);
  };

  const columns = [
    {
      title: "#",
      key: "index",
      width: 70,
      align: "center",
      fixed: { xs: false, sm: "left" },
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
      fixed: { xs: false, sm: "left" },
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
      width: 280,
      render: (_, r) => {
        const companyName = (() => {
          if (r.company && typeof r.company === 'object') return r.company.name || '-';
          if (r.company && typeof r.company === 'string') {
            const c = companies.find(x => x._id === r.company);
            return c?.name || '-';
          }
          return '-';
        })();
        
        const timezone = getCompanyTimezone(r);
        const timezoneDisplay = timezone !== 'UTC' ? ` (${timezone})` : '';
        
        return (
          <div style={{ fontSize: "12px", lineHeight: "1.4", whiteSpace: "nowrap" }}>
            <div style={{ fontWeight: 500 }}>{companyName}</div>
            <div style={{ color: "rgba(0,0,0,.45)", fontSize: "11px" }}>
              {timezone}{timezoneDisplay}
            </div>
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
      width: 220, 
      render: (value, record) => {
        const timezone = getCompanyTimezone(record);
        return (
          <div style={{ fontSize: "12px", lineHeight: "1.4" }}>
            {formatAttendanceTime(value, timezone)}
          </div>
        );
      }
    },
    { 
      title: "Check Out", 
      dataIndex: "checkOutAt", 
      key: "out", 
      width: 220, 
      render: (value, record) => {
        const timezone = getCompanyTimezone(record);
        return (
          <div style={{ fontSize: "12px", lineHeight: "1.4" }}>
            {formatAttendanceTime(value, timezone)}
          </div>
        );
      }
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
        return <Tag style={{ fontSize: "11px" }}>-</Tag>;
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
      title: "Live Time",
      key: "liveTime",
      width: 140,
      align: "center",
      render: (_, record) => {
        const timezone = getCompanyTimezone(record);
        const isCurrentlyWorking = record.checkInAt && !record.checkOutAt;
        
        return (
          <LiveTimeTracker 
            record={record}
            breaks={record.breaks || []}
            timezone={timezone}
            isLive={isCurrentlyWorking}
          />
        );
      },
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
          {s || "-"}
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
          {n || "-"}
        </span>
      )
    },
    {
      title: "Total Hours",
      key: "totalHours",
      width: 120,
      align: "center",
      render: (_, record) => {
        // Always calculate actual work time for all companies (ignore backend fixed shift data)
        const totalHours = calculateActualWorkTime(record);
        return (
          <span style={{ fontWeight: 500, color: "rgba(0,0,0,.85)" }}>
            {formatHours(totalHours)}
          </span>
        );
      },
      sorter: (a, b) => {
        const aHours = calculateActualWorkTime(a);
        const bHours = calculateActualWorkTime(b);
        return aHours - bHours;
      },
    },
    {
      title: "Hourly Rate",
      key: "hourlyRate",
      width: 120,
      align: "center",
      render: (_, record) => {
        const hourlyRate = record.payroll?.hourlyRate || record.user?.hourlyRate;
        const currency = record.payroll?.currency || record.user?.currency || 'USD';
        return (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}>
            <span style={{ fontWeight: 500, color: "rgba(0,0,0,.85)" }}>
              {hourlyRate ? formatCurrency(hourlyRate, currency) : "-"}
            </span>
            {canEdit && (
              <Tooltip title="Edit hourly rate">
                <Button
                  size="small"
                  icon={<EditOutlined />}
                  onClick={() => handlePayrollEdit(record)}
                  style={{ minWidth: "20px", height: "20px", padding: 0 }}
                />
              </Tooltip>
            )}
          </div>
        );
      },
      sorter: (a, b) => (a.payroll?.hourlyRate || 0) - (b.payroll?.hourlyRate || 0),
    },
    {
      title: "Total Pay",
      key: "totalPay",
      width: 120,
      align: "center",
      render: (_, record) => {
        const hourlyRate = record.payroll?.hourlyRate || record.user?.hourlyRate;
        const currency = record.payroll?.currency || record.user?.currency || 'USD';
        
        // Always calculate total pay based on actual work time (ignore backend fixed shift data)
        let totalPay = null;
        if (hourlyRate) {
          const actualWorkHours = calculateActualWorkTime(record);
          totalPay = hourlyRate * actualWorkHours;
        }
        
        return (
          <span style={{ 
            fontWeight: 600, 
            color: totalPay ? "#52c41a" : "rgba(0,0,0,.45)",
            fontSize: "13px"
          }}>
            {formatCurrency(totalPay, currency)}
          </span>
        );
      },
      sorter: (a, b) => {
        const aRate = a.payroll?.hourlyRate || a.user?.hourlyRate || 0;
        const bRate = b.payroll?.hourlyRate || b.user?.hourlyRate || 0;
        const aHours = calculateActualWorkTime(a);
        const bHours = calculateActualWorkTime(b);
        const aPay = aRate * aHours;
        const bPay = bRate * bHours;
        return aPay - bPay;
      },
    },
    {
      title: "Currency",
      key: "currency",
      width: 80,
      align: "center",
      render: (_, record) => {
        const currency = record.payroll?.currency || record.user?.currency || 'USD';
        return (
          <Tag color="blue" style={{ fontSize: "11px" }}>
            {currency}
          </Tag>
        );
      },
    },
    {
      title: "Actions",
      key: "actions",
      fixed: { xs: false, sm: "right" },
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
    if (!breaks.length) return <div style={{ color: "rgba(0,0,0,.45)" }}>No breaks</div>;
    const timezone = getCompanyTimezone(r);
    return (
      <Table
        size="small"
        pagination={false}
        columns={[
          { 
            title: "Start", 
            dataIndex: "startAt", 
            render: (v) => formatAttendanceTime(v, timezone), 
            width: 220 
          },
          { 
            title: "End", 
            dataIndex: "endAt", 
            render: (v) => formatAttendanceTime(v, timezone), 
            width: 220 
          },
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

  const rowSelection = canEdit ? {
    selectedRowKeys: selectedRows.map(row => row._id),
    onChange: (selectedRowKeys, selectedRows) => {
      setSelectedRows(selectedRows);
    },
    getCheckboxProps: (record) => ({
      name: record._id,
    }),
    onSelect: (record, selected, selectedRows, nativeEvent) => {
      // Prevent modal from opening when clicking checkbox
      if (nativeEvent) {
        nativeEvent.stopPropagation();
      }
    },
    onSelectAll: (selected, selectedRows, changeRows) => {
      // Prevent modal from opening when clicking select all checkbox
    },
  } : null;

  return (
    <>
      <div style={{ marginBottom: 16 }}>
        {canEdit && selectedRows.length > 0 && (
          <Space>
            <Button
              type="primary"
              icon={<DollarOutlined />}
              onClick={() => {
                bulkPayrollForm.setFieldsValue({
                  hourlyRate: 0,
                  currency: 'USD',
                  effectiveFrom: dayjs(),
                });
                setBulkPayrollModalOpen(true);
              }}
            >
              Set Hourly Rate ({selectedRows.length} selected)
            </Button>
            <Button onClick={() => setSelectedRows([])}>
              Clear Selection
            </Button>
          </Space>
        )}
      </div>
      
      <div>
        <Table
          size="middle"
          rowKey={(r) => r._id}
          columns={columns}
          dataSource={filteredRows}
          loading={loading}
          expandable={{ expandedRowRender }}
          pagination={false}
          scroll={{ x: 2400 }}
          rowSelection={rowSelection}
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

      {/* Payroll Edit Modal */}
      <Modal
        open={payrollModalOpen}
        title="Edit Payroll"
        onCancel={() => {
          setPayrollModalOpen(false);
          setEditingPayroll(null);
          payrollForm.resetFields();
        }}
        onOk={savePayrollEdit}
        okText="Save Changes"
        okButtonProps={{ 
          type: "primary",
          loading: payrollLoading,
          disabled: payrollLoading
        }}
        cancelButtonProps={{
          disabled: payrollLoading
        }}
        destroyOnClose
      >
        <Form form={payrollForm} layout="vertical">
          <Form.Item 
            label="Employee" 
            name="employee"
            initialValue={editingPayroll ? `${editingPayroll.user?.firstName} ${editingPayroll.user?.lastName}` : ''}
          >
            <Input disabled />
          </Form.Item>
          <Form.Item 
            label="Hourly Rate" 
            name="hourlyRate"
            rules={[{ required: true, message: 'Please enter hourly rate' }]}
          >
            <InputNumber
              min={0}
              step={0.01}
              precision={2}
              style={{ width: '100%' }}
              placeholder="Enter hourly rate"
            />
          </Form.Item>
          <Form.Item 
            label="Currency" 
            name="currency"
            rules={[{ required: true, message: 'Please select currency' }]}
          >
            <Select placeholder="Select currency">
              <Select.Option value="USD">USD (US - America/New_York)</Select.Option>
              <Select.Option value="COP">COP (Colombia - America/Bogota)</Select.Option>
              <Select.Option value="JPY">JPY (Japan - Asia/Tokyo)</Select.Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>

      {/* Bulk Payroll Update Modal */}
      <Modal
        open={bulkPayrollModalOpen}
        title={`Set Hourly Rate for ${selectedRows.length} Employees`}
        onCancel={() => {
          setBulkPayrollModalOpen(false);
          bulkPayrollForm.resetFields();
        }}
        onOk={handleBulkPayrollUpdate}
        okText="Update All"
        okButtonProps={{ 
          type: "primary",
          loading: bulkPayrollLoading,
          disabled: bulkPayrollLoading
        }}
        cancelButtonProps={{
          disabled: bulkPayrollLoading
        }}
        destroyOnClose
      >
        <Form form={bulkPayrollForm} layout="vertical">
          <Form.Item 
            label="Hourly Rate" 
            name="hourlyRate"
            rules={[{ required: true, message: 'Please enter hourly rate' }]}
          >
            <InputNumber
              min={0}
              step={0.01}
              precision={2}
              style={{ width: '100%' }}
              placeholder="Enter hourly rate"
            />
          </Form.Item>
          <Form.Item 
            label="Currency" 
            name="currency"
            rules={[{ required: true, message: 'Please select currency' }]}
          >
            <Select placeholder="Select currency">
              <Select.Option value="USD">USD (US - America/New_York)</Select.Option>
              <Select.Option value="COP">COP (Colombia - America/Bogota)</Select.Option>
              <Select.Option value="JPY">JPY (Japan - Asia/Tokyo)</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item 
            label="Effective From" 
            name="effectiveFrom"
          >
            <DatePicker 
              style={{ width: '100%' }} 
              defaultValue={dayjs()}
            />
          </Form.Item>
          <div style={{ marginTop: 16, padding: 12, backgroundColor: '#f5f5f5', borderRadius: 4 }}>
            <strong>Selected Employees:</strong>
            <ul style={{ marginTop: 8, marginBottom: 0 }}>
              {selectedRows.map((row, index) => (
                <li key={index} style={{ fontSize: '12px' }}>
                  {row.user?.firstName} {row.user?.lastName}
                </li>
              ))}
            </ul>
          </div>
        </Form>
      </Modal>
    </>
  );
};

export default AttendanceTable;
