// src/pages/attendance/AdminAttendance.jsx
import React, { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Table, Select, DatePicker, Button, Input, Tag, message, Alert } from "antd";
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
  const [employeeIdManual, setEmployeeIdManual] = useState("");

  const canSeeUsers = me?.role === "admin";

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
    enabled: !!(selectedUser || employeeIdManual || canSeeUsers === false), // load after selection
  });

  const mKioskIn = useMutation({
    mutationFn: (employeeId) => kioskCheckIn({ employeeId, note: note.trim() || undefined }),
    onSuccess: () => {
      message.success("Checked in (kiosk)");
      qc.invalidateQueries({ queryKey: ["attendance", "admin"] });
      setNote("");
    },
    onError: (e) => message.error(e?.response?.data?.message || "Kiosk check-in failed"),
  });

  const mKioskOut = useMutation({
    mutationFn: (employeeId) => kioskCheckOut({ employeeId }),
    onSuccess: () => {
      message.success("Checked out (kiosk)");
      qc.invalidateQueries({ queryKey: ["attendance", "admin"] });
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

  const chosenEmployeeId = canSeeUsers ? selectedUser : employeeIdManual.trim();

  return (
    <div className="page-container">
      <h2 className="mb-4">Attendance (Admin/Kiosk)</h2>

      {me?.role === "attendance" && (
        <Alert
          className="mb-3"
          type="info"
          showIcon
          message="Kiosk mode"
          description="As an attendance/kiosk user you can check in/out employees by their ID. (Admins also get a dropdown of users.)"
        />
      )}

      <div className="grid md:grid-cols-2 gap-3 mb-4">
        {canSeeUsers ? (
          <div>
            <div className="mb-1 text-sm text-gray-600">Employee</div>
            <Select
              showSearch
              style={{ width: "100%" }}
              placeholder="Select employee"
              loading={usersQ.isLoading}
              options={(usersQ.data || []).map(u => ({
                value: u._id,
                label: `${u.firstName ?? ""} ${u.lastName ?? ""} — ${u.email}`,
              }))}
              value={selectedUser}
              onChange={setSelectedUser}
              optionFilterProp="label"
            />
          </div>
        ) : (
          <div>
            <div className="mb-1 text-sm text-gray-600">Employee ID</div>
            <Input
              placeholder="Paste employee _id"
              value={employeeIdManual}
              onChange={(e) => setEmployeeIdManual(e.target.value)}
            />
          </div>
        )}

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
          disabled={!chosenEmployeeId}
          loading={mKioskIn.isPending}
          onClick={() => mKioskIn.mutate(chosenEmployeeId)}
        >
          Kiosk: Check In
        </Button>
        <Button
          danger
          disabled={!chosenEmployeeId}
          loading={mKioskOut.isPending}
          onClick={() => mKioskOut.mutate(chosenEmployeeId)}
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
    </div>
  );
}
