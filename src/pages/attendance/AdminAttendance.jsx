// src/pages/attendance/AdminAttendance.jsx
import React, { useMemo, useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Table, Select, DatePicker, Button, Input, Tag, message, Alert, Modal } from "antd";
import dayjs from "dayjs";
import { listAttendance, kioskCheckIn, kioskCheckOut } from "../../api/attendance";
import { fetchAllUsers } from "../../api/auth";
import useAuth from "../../hooks/useAuth";

const { RangePicker } = DatePicker;

export default function AdminAttendance() {
  const qc = useQueryClient();
  const { user: me } = useAuth();

  const [selectedUser, setSelectedUser] = useState();
  const [dateRange, setDateRange] = useState([]);
  const [note, setNote] = useState("");

  // PIN modal state
  const [pinModalOpen, setPinModalOpen] = useState(false);
  const [pinMode, setPinMode] = useState("in"); // "in" | "out"
  const [pin, setPin] = useState("");
  const pinInputRef = useRef(null);

  const canSeeUsers = me?.roles?.role === "admin";

  const usersQ = useQuery({
    queryKey: ["users", "all"],
    queryFn: fetchAllUsers,
    enabled: canSeeUsers,
    staleTime: 5 * 60_000,
  });

  const params = useMemo(() => {
    const from = dateRange?.[0]?.format?.("YYYY-MM-DD");
    const to = dateRange?.[1]?.format?.("YYYY-MM-DD");
    return {
      user: selectedUser || undefined,
      from,
      to,
      page: 1,
      limit: 100,
    };
  }, [selectedUser, dateRange]);

  const attendQ = useQuery({
    queryKey: ["attendance", "admin", params],
    queryFn: () => listAttendance(params),
    enabled: !!selectedUser, // load after employee is selected
  });

  const mKioskIn = useMutation({
    mutationFn: ({ employeeId, note, pin }) => kioskCheckIn({ employeeId, note, pin }),
    onSuccess: () => {
      message.success("Checked in (kiosk)");
      qc.invalidateQueries({ queryKey: ["attendance", "admin"] });
      setNote("");
      setPin("");
      setPinModalOpen(false);
    },
    onError: (e) => message.error(e?.response?.data?.message || "Kiosk check-in failed"),
  });

  const mKioskOut = useMutation({
    mutationFn: ({ employeeId, pin }) => kioskCheckOut({ employeeId, pin }),
    onSuccess: () => {
      message.success("Checked out (kiosk)");
      qc.invalidateQueries({ queryKey: ["attendance", "admin"] });
      setPin("");
      setPinModalOpen(false);
    },
    onError: (e) => message.error(e?.response?.data?.message || "Kiosk check-out failed"),
  });

  const rows = attendQ.data?.items ?? [];
  const columns = [
    {
      title: "Employee",
      key: "emp",
      render: (_, r) => r.user
        ? `${r.user.firstName ?? ""} ${r.user.lastName ?? ""}`.trim()
        : "—",
    },
    { title: "Day", dataIndex: "day", key: "day" },
    {
      title: "Check In",
      dataIndex: "checkInAt",
      key: "in",
      render: (v) => (v ? new Date(v).toLocaleString() : "-"),
    },
    {
      title: "Check Out",
      dataIndex: "checkOutAt",
      key: "out",
      render: (v) => (v ? new Date(v).toLocaleString() : <Tag color="blue">Open</Tag>),
    },
    { title: "Minutes", dataIndex: "minutesWorked", key: "mins" },
    { title: "Note", dataIndex: "note", key: "note" },
    { title: "Source", dataIndex: "source", key: "source" },
  ];

  const openPinModal = (mode) => {
    if (!selectedUser) {
      message.warning("Select an employee first");
      return;
    }
    setPinMode(mode);
    setPin("");
    setPinModalOpen(true);
    setTimeout(() => pinInputRef.current?.focus?.(), 0);
  };

  const submitPin = () => {
    if (!/^\d{4,6}$/.test(pin)) {
      message.error("PIN must be 4–6 digits");
      return;
    }
    const employeeId = selectedUser;
    if (pinMode === "in") {
      mKioskIn.mutate({ employeeId, note: note.trim() || "", pin });
    } else {
      mKioskOut.mutate({ employeeId, pin });
    }
  };

  return (
    <div className="page-container">
      <h2 className="mb-4">Attendance (Admin/Kiosk)</h2>

      {me?.roles?.role === "attendance" && (
        <Alert
          className="mb-3"
          type="info"
          showIcon
          message="Kiosk mode"
          description="As an attendance/kiosk user you can check in/out employees by their ID. A PIN from the employee is required."
        />
      )}

      <div className="grid md:grid-cols-2 gap-3 mb-4">
        <div>
          <div className="mb-1 text-sm text-gray-600">Employee</div>
          <Select
            showSearch
            style={{ width: "100%" }}
            placeholder="Select employee"
            loading={usersQ.isLoading}
            options={(usersQ.data || []).map(u => ({
              value: u._id,
              label: `${u.firstName ?? ""} ${u.lastName ?? ""} — ${u.email} (${u.roles?.role ?? 'No Role'})`,
            }))}
            value={selectedUser}
            onChange={setSelectedUser}
            optionFilterProp="label"
          />
        </div>

        <div>
          <div className="mb-1 text-sm text-gray-600">Date range</div>
          <RangePicker
            style={{ width: "100%" }}
            allowClear
            value={dateRange}
            onChange={(vals) => setDateRange(vals || [])}
            disabledDate={(d) => d && d.isAfter(dayjs(), "day")}
          />
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-3 items-start md:items-end mb-4">
        <div style={{ minWidth: 280 }}>
          <div className="mb-1 text-sm text-gray-600">Note (optional)</div>
          <Input.TextArea
            autoSize={{ minRows: 1, maxRows: 3 }}
            placeholder="Reason / remarks"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </div>

        <Button
          type="primary"
          disabled={!selectedUser}
          loading={mKioskIn.isPending}
          onClick={() => openPinModal("in")}
        >
          Kiosk: Check In
        </Button>

        <Button
          danger
          disabled={!selectedUser}
          loading={mKioskOut.isPending}
          onClick={() => openPinModal("out")}
        >
          Kiosk: Check Out
        </Button>
      </div>

      <Table
        rowKey="_id"
        size="middle"
        loading={attendQ.isLoading}
        columns={columns}
        dataSource={rows}
        pagination={{ pageSize: 100, hideOnSinglePage: true }}
      />

      <Modal
        title={pinMode === "in" ? "Enter PIN to Check In" : "Enter PIN to Check Out"}
        open={pinModalOpen}
        onCancel={() => setPinModalOpen(false)}
        onOk={submitPin}
        okText={pinMode === "in" ? "Check In" : "Check Out"}
        okButtonProps={{ loading: mKioskIn.isPending || mKioskOut.isPending }}
        maskClosable={false}
        keyboard={false}
        destroyOnClose
      >
        <Input
          ref={pinInputRef}
          placeholder="4–6 digit PIN"
          value={pin}
          onChange={(e) => setPin(e.target.value.replace(/\D+/g, "").slice(0, 6))}
          onPressEnter={submitPin}
          size="large"
          type="password"
          inputMode="numeric"
          autoComplete="one-time-code"
        />
      </Modal>
    </div>
  );
}
