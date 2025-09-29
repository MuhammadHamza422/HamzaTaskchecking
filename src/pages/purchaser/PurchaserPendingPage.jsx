

// /src/pages/purchaser/PurchaserPendingPage.jsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Card,
  Table,
  Tag,
  Button,
  Empty,
  message,
  Modal,
  Select,
} from "antd";
import { ReloadOutlined, LoadingOutlined } from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import dayjs from "dayjs";
import apiClient from "../../api/client";

// shared utils you already had
import {
  normalizeRequests,
  statusColor,
  num as safeNum,
  ExpandedItemsTable,
} from "./utils/PurchaseTableUtils.jsx";

const MAX_FETCH = 200; // how many purchasers to show initially

// open raw URL or add https://
const toListingUrl = (url) =>
  !url ? "#" : /^https?:\/\//i.test(url) ? url : `https://${url}`;

export default function PurchaserPendingPage({ onAssigned, isAdmin = false }) {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [assigningId, setAssigningId] = useState(null);

  // --- assign-to-purchaser modal state ---
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [assignTargetId, setAssignTargetId] = useState(null);

  const [purchaserOptions, setPurchaserOptions] = useState([]); // [{value,label,search,email,raw}]
  const [purchaserLoading, setPurchaserLoading] = useState(false);
  const [selectedPurchaserId, setSelectedPurchaserId] = useState(null);
  const [hasPrefetched, setHasPrefetched] = useState(false);

  const navigate = useNavigate();

  /* ------------------- fetch pending ------------------- */
  const fetchPending = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient.get("/api/v1/sourcing/pending");
      setRequests(normalizeRequests(res.data));
    } catch (err) {
      console.error(err);
      message.error("Failed to fetch pending requests.");
      setRequests([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPending();
  }, [fetchPending]);

  /* ------------------- assign to me ------------------- */
  const handleAssignToMe = async (sourcingId) => {
    setAssigningId(sourcingId);
    try {
      const res = await apiClient.post(`/api/v1/sourcing/${sourcingId}/assign`);
      // (optional) set assignedAt for consistency with your previous behavior
      const assignedAt = new Date().toISOString();
      await apiClient.patch(`/api/v1/sourcing/${sourcingId}`, { assignedAt });

      // remove from local list & notify parent
      setRequests((prev) => prev.filter((r) => String(r._id) !== String(sourcingId)));
      onAssigned?.({ ...res.data, assignedAt });
      message.success(`Assigned #${res.data?.sourcing_id ?? res.data?._id} to you.`);
    } catch (e) {
      console.error(e);
      message.error(e?.response?.data?.message || "Failed to assign request.");
    } finally {
      setAssigningId(null);
    }
  };

  /* ------------------- assign to purchaser (admin) ------------------- */
  const openAssignModal = (sourcingId) => {
    setAssignTargetId(sourcingId);
    setSelectedPurchaserId(null);
    setAssignModalOpen(true);
    // fetch the list once when the modal opens
    if (!hasPrefetched) prefetchAllPurchasers();
  };

  const normalizePurchaserList = (payload) => {
    const list = Array.isArray(payload?.results)
      ? payload.results
      : Array.isArray(payload?.data)
      ? payload.data
      : Array.isArray(payload?.users)
      ? payload.users
      : Array.isArray(payload)
      ? payload
      : [];

    return list
      .map((u) => {
        const id = String(u.value || u._id || u.id || "");
        const name =
          u.label ||
          [u.firstName, u.lastName].filter(Boolean).join(" ") ||
          u.name ||
          u.email ||
          "Unnamed";
        const email = u.email || "";
        const search = `${name} ${email}`.toLowerCase();
        return {
          value: id,
          label: (
            <div style={{ display: "flex", gap: 8, alignItems: "baseline" }}>
              <span style={{ fontWeight: 600 }}>{name}</span>
              {email ? <span style={{ color: "#888" }}>· {email}</span> : null}
            </div>
          ),
          search, // used for client filtering
          email,
          raw: u,
        };
      })
      .filter((o) => o.value);
  };

  const prefetchAllPurchasers = async () => {
    setPurchaserLoading(true);
    try {
      // fetch an initial page of purchasers (no query) so dropdown shows them all
      const { data } = await apiClient.get("/api/v1/sourcing/purchasers/search", {
        params: { q: "", page: 1, limit: MAX_FETCH },
      });
      const opts = normalizePurchaserList(data);
      setPurchaserOptions(opts);
      setHasPrefetched(true);
    } catch (e) {
      const status = e?.response?.status;
      if (status === 403) message.warning("Only admins can search purchasers.");
      else message.error(e?.response?.data?.message || "Failed to load purchasers.");
      setPurchaserOptions([]);
    } finally {
      setPurchaserLoading(false);
    }
  };

  const submitAssignTo = async () => {
    if (!assignTargetId || !selectedPurchaserId) return;
    try {
      await apiClient.post(`/api/v1/sourcing/${assignTargetId}/assign-to`, {
        purchaserId: selectedPurchaserId,
      });
      // update UI
      setRequests((prev) => prev.filter((r) => String(r._id) !== String(assignTargetId)));
      setAssignModalOpen(false);
      onAssigned?.({ _id: assignTargetId, purchaserId: selectedPurchaserId });
      message.success("Assigned to purchaser.");
    } catch (e) {
      console.error(e);
      message.error(e?.response?.data?.message || "Assign failed.");
    }
  };

  /* ------------------- columns ------------------- */
  const columns = useMemo(
    () => [
      {
        title: "ID",
        dataIndex: "sourcing_id",
        width: 90,
        align: "left",
        render: (_, rec) => (
          <strong>#{String(rec.sourcing_id ?? rec.id ?? rec._id).slice(-6)}</strong>
        ),
      },
      { title: "Sourcer", dataIndex: "sourcer_name", width: 160, render: (v) => v || "—" },
      {
        title: "Status",
        dataIndex: "status",
        width: 140,
        align: "center",
        render: (s) => (
          <Tag color={statusColor(s)} style={{ fontWeight: 400, fontSize: 14, borderRadius: 6 }}>
            {s}
          </Tag>
        ),
      },
      {
        title: "Seller",
        dataIndex: "seller_name",
        width: 180,
        ellipsis: true,
        render: (v) => (v ? <p className="m-0">{v}</p> : "—"),
      },
      { title: "Market", dataIndex: "market", width: 100, render: (v) => v || "—" },
      {
        title: "Seller Price",
        dataIndex: "sellers_price",
        width: 120,
        align: "right",
        render: (v) => (v ? <p className="m-0">${parseFloat(v).toFixed(2)}</p> : "—"),
      },
      {
        title: "Ship Charges",
        dataIndex: "shipping_charges",
        width: 110,
        align: "right",
        render: (v) => (v ? <p className="m-0">${parseFloat(v).toFixed(2)}</p> : "—"),
      },
      {
        title: "Tax",
        dataIndex: "taxes",
        width: 100,
        align: "right",
        render: (v) => (v ? <p className="m-0">${parseFloat(v).toFixed(2)}</p> : "—"),
      },
      {
        title: "Target Cost",
        dataIndex: "target_total_cost",
        width: 130,
        align: "right",
        render: (v) => (v ? <p className="m-0">${parseFloat(v).toFixed(2)}</p> : "—"),
        responsive: ["sm"],
      },
      {
        title: "Actual Cost",
        dataIndex: "total_actual_cost",
        width: 130,
        align: "right",
        render: (v) => (v ? <p className="m-0">${parseFloat(v).toFixed(2)}</p> : "—"),
        responsive: ["sm"],
      },
      {
        title: "Efficiency",
        key: "efficiency",
        width: 140,
        align: "right",
        render: (_, rec) => {
          const eff =
            typeof rec.purchase_efficiency === "number"
              ? rec.purchase_efficiency
              : safeNum(rec.target_total_cost) - safeNum(rec.total_actual_cost);
          const color = eff >= 0 ? "#16a34a" : "#ef4444";
          return <p className="m-0" style={{ color }}>${eff ? parseFloat(eff).toFixed(2) : "0.00"}</p>;
        },
        responsive: ["md"],
      },
      {
        title: "Created At",
        dataIndex: "created_at",
        width: 190,
        render: (date, rec) => {
          const d = new Date(date || rec.createdAt || rec.created_on || 0);
          return <span style={{ fontWeight: 400 }}>{dayjs(d).format("MM/DD/YYYY hh:mm A")}</span>;
        },
      },
      {
        title: "Actions",
        key: "actions",
        width: isAdmin ? 300 : 170,
        fixed: "right",
        align: "right",
        render: (_, record) => (
          <div className="flex gap-2 justify-end">
            <Button
              type="primary"
              onClick={(e) => {
                e.stopPropagation();
                handleAssignToMe(record._id);
              }}
              loading={assigningId === record._id}
              disabled={assigningId !== null}
              style={{ border: "none", borderRadius: 8, fontWeight: 600 }}
            >
              Assign to Me
            </Button>

            {isAdmin && (
              <Button
                onClick={(e) => {
                  e.stopPropagation();
                  openAssignModal(record._id);
                }}
                style={{ borderRadius: 8, fontWeight: 600 }}
              >
                Assign to Purchaser
              </Button>
            )}
          </div>
        ),
      },
    ],
    [assigningId, isAdmin]
  );

  return (
    <>
      <Card
        style={{
          borderRadius: 16,
          background: "rgba(255,255,255,0.95)",
          boxShadow: "0 10px 40px rgba(0,0,0,0.06)",
        }}
        bodyStyle={{ padding: 16 }}
        extra={
          <Button icon={<ReloadOutlined />} onClick={fetchPending} aria-label="Refresh pending">
            Refresh
          </Button>
        }
      >
        <Table
          className="pending-table"
          locale={{ emptyText: <Empty description="No pending requests" /> }}
          dataSource={requests}
          columns={columns}
          rowKey={(rec) => rec._id}
          loading={{
            spinning: loading,
            indicator: <LoadingOutlined style={{ fontSize: 24 }} spin />,
          }}
          pagination={{ pageSize: 10, responsive: true }}
          onRow={(record) => ({
            onClick: () => {
              const url = toListingUrl(record.listing_link);
              if (url !== "#") window.open(url, "_blank", "noopener,noreferrer");
            },
            style: { cursor: record.listing_link ? "pointer" : "default" },
          })}
          tableLayout="fixed"
          scroll={{ x: 1600 }}
          sticky
          expandable={{
            expandedRowRender: (record) => (
              <ExpandedItemsTable order={record} onOpen={(to) => navigate(to)} />
            ),
            rowExpandable: (record) => Array.isArray(record.items) && record.items.length > 0,
          }}
        />

        <style>{`
          .pending-table .ant-table-thead > tr > th { white-space: nowrap; }
          .prod-cell { display: flex; flex-wrap: wrap; gap: 6px; overflow: hidden; }
          .prod-chip.ant-tag { margin: 0; border-radius: 6px; max-width: 100%; white-space: nowrap; text-overflow: ellipsis; overflow: hidden; }
        `}</style>
      </Card>

      {/* Assign-to-purchaser (admin only) */}
      <Modal
        title="Assign to a purchaser"
        open={assignModalOpen}
        okText="Assign"
        onOk={submitAssignTo}
        onCancel={() => setAssignModalOpen(false)}
        okButtonProps={{ disabled: !selectedPurchaserId, type: "primary" }}
        destroyOnClose
      >
        <Select
          showSearch
          placeholder={purchaserLoading ? "Loading purchasers…" : "Select / search purchaser"}
          style={{ width: "100%" }}
          size="large"
          value={selectedPurchaserId || undefined}
          loading={purchaserLoading}
          onChange={(val) => setSelectedPurchaserId(val)}
          onDropdownVisibleChange={(open) => {
            if (open && !hasPrefetched) prefetchAllPurchasers();
          }}
          options={purchaserOptions}
          filterOption={(input, option) => {
            const term = (input || "").toLowerCase().trim();
            if (!term) return true; // show all when input empty
            return (option?.search || "").includes(term);
          }}
          optionFilterProp="search" // so built-in also knows our field
          dropdownMatchSelectWidth
          getPopupContainer={() => document.body}
        />
      </Modal>
    </>
  );
}
