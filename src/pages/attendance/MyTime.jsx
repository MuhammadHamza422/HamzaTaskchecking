// src/pages/attendance/MyTime.jsx
import React, { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button, Input, Table, Tag, message } from "antd";
import { getMyAttendance, checkIn, checkOut } from "../../api/attendance";

export default function MyTime() {
  const qc = useQueryClient();
  const [note, setNote] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["attendance", "me"],
    queryFn: async () => getMyAttendance({ page: 1, limit: 50 }),
    staleTime: 30_000,
  });

  const rows = data?.items ?? [];
  const openSession = useMemo(() => rows.find(r => !r.checkOutAt), [rows]);

  const mCheckIn = useMutation({
    mutationFn: () => checkIn(note.trim() || undefined),
    onSuccess: () => {
      setNote("");
      qc.invalidateQueries({ queryKey: ["attendance", "me"] });
      message.success("Checked in");
    },
    onError: (e) => message.error(e?.response?.data?.message || "Check-in failed"),
  });

  const mCheckOut = useMutation({
    mutationFn: () => checkOut(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["attendance", "me"] });
      message.success("Checked out");
    },
    onError: (e) => message.error(e?.response?.data?.message || "Check-out failed"),
  });

  const columns = [
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

  return (
    <div className="page-container">
      <h2 className="mb-4">My Time</h2>

      <div className="flex flex-col md:flex-row gap-3 items-start md:items-end mb-4">
        {!openSession ? (
          <>
            <div style={{ minWidth: 280 }}>
              <label className="block mb-1 text-sm text-gray-600">Note (optional)</label>
              <Input.TextArea
                autoSize={{ minRows: 1, maxRows: 3 }}
                placeholder="e.g. Started shift"
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </div>
            <Button
              type="primary"
              onClick={() => mCheckIn.mutate()}
              loading={mCheckIn.isPending}
            >
              Check In
            </Button>
          </>
        ) : (
          <Button
            danger
            onClick={() => mCheckOut.mutate()}
            loading={mCheckOut.isPending}
          >
            Check Out
          </Button>
        )}
      </div>

      <Table
        rowKey="_id"
        size="middle"
        loading={isLoading}
        columns={columns}
        dataSource={rows}
        pagination={{ pageSize: 50, hideOnSinglePage: true }}
      />
    </div>
  );
}
