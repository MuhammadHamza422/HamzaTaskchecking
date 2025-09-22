

import React, { useState, useEffect, useCallback } from "react";
import { Table, Button, message, Space, Typography, Card, Tag } from "antd";
import { LoadingOutlined, ReloadOutlined } from "@ant-design/icons";
import apiClient from "../../api/client";
import Swal from "sweetalert2";


const { Title } = Typography;

// normalize API payloads to a stable shape for the table
const normalizeRequests = (payload) => {
  const list = Array.isArray(payload) ? payload : payload?.data || [];
  return list.map((doc) => {
    const id = doc.id ?? doc._id ?? doc.sourcing_id ?? String(doc._id || "");
    const created_at = doc.created_at ?? doc.createdAt ?? doc.created_on ?? null;
    const assigned_at = doc.assigned_at ?? doc.assignedAt ?? null;
    const purchaser_id =
      doc.purchaser_id ?? doc.purchaserId ?? doc.purchaser?._id ?? null;
    const items = Array.isArray(doc.items) ? doc.items : [];
    const status = doc.status ?? "Pending";

    return {
      ...doc,
      id,
      created_at,
      assigned_at,
      purchaser_id,
      status,
      items: items.map((it) => ({
        ...it,
        id: it.id ?? it._id ?? String(it._id || ""),
        product_name: it.product_name ?? it.name ?? "Unnamed",
      })),
    };
  });
};

const PurchaserPendingPage = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [assigningId, setAssigningId] = useState(null);

  const fetchPending = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient.get("/api/v1/sourcing/pending");
      const data = normalizeRequests(res.data);
      setRequests(data);
    } catch (err) {
      console.error(err);
      message.error("Failed to fetch pending requests.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPending();
  }, [fetchPending]);

const handleAssign = async (sourcingId) => {
  setAssigningId(sourcingId);
  try {
    const res = await apiClient.post(`/api/v1/sourcing/${sourcingId}/assign`);
    const [updated] = normalizeRequests([res.data]);

    // Remove from the pending list
    setRequests((prev) => prev.filter((r) => String(r.id) !== String(sourcingId)));

    // ✅ SUCCESS toast (green)
    Swal.fire({
      icon: "success",
      title: "Assigned!",
      text: `Request #${updated.id} is now ${updated.status}.`,
      toast: true,
      position: "top-end",
      showConfirmButton: false,
      timer: 3000,
      timerProgressBar: true,
      background: "#10b981",
      color: "#fff",
      customClass: { popup: "rounded-lg" },
    });
  } catch (error) {
    const msg =
      error?.response?.data?.message ||
      "Failed to assign request.";

    // If backend says it's not pending anymore, show a warning-style toast
    const isAlreadyTaken =
      error?.response?.status === 400 &&
      /Cannot assign request/i.test(msg);

    Swal.fire({
      icon: isAlreadyTaken ? "warning" : "error",
      title: isAlreadyTaken ? "Already Taken" : "Error",
      text: msg,
      toast: true,
      position: "top-end",
      showConfirmButton: false,
      timer: 3500,
      timerProgressBar: true,
      background: isAlreadyTaken ? "#f59e0b" : "#ef4444",
      color: "#fff",
      customClass: { popup: "rounded-lg" },
    });
  } finally {
    setAssigningId(null);
  }
};

  const columns = [
    {
      title: "ID",
      dataIndex: "id",
      key: "id",
      width: 90,
      render: (id) => <strong style={{ color: "#2c2c2c" }}>#{String(id)}</strong>,
    },
    {
      title: "Product(s)",
      key: "products",
      render: (_, record) => (
        <Space direction="vertical" size="small">
          {(record.items || []).map((item) => (
            <span key={item.id} style={{ fontWeight: 500, color: "#3a3a3a" }}>
              {item.product_name}
            </span>
          ))}
        </Space>
      ),
    },
    // (Optional) show current status even on pending page
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      width: 120,
      render: (s) => (
        <Tag color={s === "Pending" ? "gold" : s === "Assigned" ? "blue" : "green"}>
          {s}
        </Tag>
      ),
      responsive: ["md"],
    },
    // (Optional) show purchaser/assigned timestamps if server fills them before you remove row
    {
      title: "Purchaser",
      dataIndex: "purchaser_id",
      key: "purchaser_id",
      width: 170,
      render: (v) => <span style={{ color: "#555" }}>{v || "—"}</span>,
      responsive: ["lg"],
    },
    {
      title: "Created At",
      dataIndex: "created_at",
      key: "created_at",
      render: (date) => (
        <span style={{ color: "#777" }}>
          {date ? new Date(date).toLocaleString() : "—"}
        </span>
      ),
      responsive: ["md"],
    },
    {
      title: "Actions",
      key: "actions",
      width: 170,
      render: (_, record) => (
        <Button
          type="primary"
          onClick={() => handleAssign(record.id)}
          loading={assigningId === record.id}
          disabled={assigningId !== null}
          style={{
            background: "linear-gradient(90deg, #4facfe 0%, #00f2fe 100%)",
            border: "none",
            borderRadius: 8,
            fontWeight: 600,
            boxShadow: "0 2px 8px rgba(79, 172, 254, 0.3)",
          }}
        >
          Assign to Me
        </Button>
      ),
    },
  ];

  return (
    <div
      className="page-container"
      style={{ padding: "2rem", background: "#f5f9ff", minHeight: "100vh" }}
    >
      <div
        style={{
          background: "linear-gradient(to right, #4facfe, #00f2fe)",
          padding: "1.5rem 2rem",
          borderRadius: "16px",
          marginBottom: "2rem",
          color: "#fff",
          boxShadow: "0 6px 20px rgba(0, 0, 0, 0.08)",
        }}
      >
        <Title level={2} style={{ color: "#fff", margin: 0, fontWeight: 700 }}>
          Pending Sourcing Requests
        </Title>
        <p style={{ marginTop: 6, fontSize: 15, opacity: 0.9 }}>
          Assign yourself to incoming sourcing tasks
        </p>
      </div>

      <Card
        style={{
          borderRadius: "20px",
          background: "rgba(255, 255, 255, 0.95)",
          backdropFilter: "blur(6px)",
          boxShadow: "0 10px 40px rgba(0, 0, 0, 0.06)",
        }}
        bodyStyle={{ padding: "2rem" }}
        extra={
          <Button icon={<ReloadOutlined />} onClick={fetchPending}>
            Refresh
          </Button>
        }
      >
        <Table
          dataSource={requests}
          columns={columns}
          rowKey="id"
          loading={{
            spinning: loading,
            indicator: <LoadingOutlined style={{ fontSize: 24 }} spin />,
          }}
          pagination={{ pageSize: 10 }}
          rowClassName={() => "hoverable-row"}
          locale={{ emptyText: "No pending requests found" }}
        />
      </Card>

      <style>{`
        .hoverable-row:hover {
          background-color: #f0f9ff !important;
          transition: background 0.3s ease;
        }
      `}</style>
    </div>
  );
};

export default PurchaserPendingPage;
