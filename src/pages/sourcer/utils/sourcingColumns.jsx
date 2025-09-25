

// src/pages/sourcer/utils/sourcingColumns.jsx
import React, { useEffect, useState } from "react";
import { Table, Tag, Space, Typography, Tooltip, Button, Popconfirm } from "antd";
import { Pencil, Trash2 } from "lucide-react";
import dayjs from "dayjs";
import apiClient from "../../../api/client"; // note the relative path

const { Text } = Typography;

/* ---------- helpers ---------- */
const num = (v) => (typeof v === "number" ? v : Number(v) || 0);
const fmtMoney = (v) =>
  typeof v === "number" && !Number.isNaN(v) ? `$${v.toFixed(2)}` : "$0.00";
const fmtDateTime = (v) => (v ? dayjs(v).format("YYYY-MM-DD HH:mm") : "N/A");

const formatOid = (id) =>
  id ? String(id).slice(0, 6) + "…" + String(id).slice(-4) : "—";

const idNum = (rec) => {
  const raw = rec?.sourcing_id;
  if (raw == null) return Number.NEGATIVE_INFINITY;
  const n = Number(raw);
  if (Number.isFinite(n)) return n;
  const m = String(raw).match(/\d+/);
  return m ? Number(m[0]) : Number.NEGATIVE_INFINITY;
};

const getSellerName = (rec) => {
  if (rec?.seller && typeof rec.seller === "object") {
    return rec.seller.name || `Seller ${formatOid(rec.seller._id)}`;
  }
  return (
    rec?.seller_name || (rec?.seller ? `Seller ${formatOid(rec.seller)}` : "—")
  );
};

/* ---------- MarketName (cached resolver) ---------- */
const _marketCache = new Map();
const isObjectIdLike = (v) => typeof v === "string" && /^[a-f0-9]{24}$/i.test(v);

function MarketName({ market }) {
  const [name, setName] = useState("—");

  useEffect(() => {
    let cancelled = false;

    const resolve = async () => {
      if (!market) return setName("—");

      // populated object
      if (typeof market === "object") {
        if (market.name) return setName(market.name);
        if (market.slug && _marketCache.has(market.slug)) {
          return setName(_marketCache.get(market.slug).name);
        }
        if (market._id && _marketCache.has(market._id)) {
          return setName(_marketCache.get(market._id).name);
        }
      }

      // string key: ObjectId or slug
      const key =
        typeof market === "string" ? market : market._id || market.slug || "";
      if (!key) return setName("—");

      if (_marketCache.has(key)) {
        return setName(_marketCache.get(key).name);
      }

      try {
        let rec = null;
        if (isObjectIdLike(key)) {
          const { data } = await apiClient.get(`/api/v1/markets/${key}`);
          rec = data;
        } else {
          const { data } = await apiClient.get(`/api/v1/markets`, {
            params: { q: key },
          });
          const list = Array.isArray(data) ? data : [];
          rec =
            list.find(
              (m) => (m.slug || "").toLowerCase() === key.toLowerCase()
            ) || list[0] || null;
        }

        if (!cancelled) {
          if (rec?.name) {
            _marketCache.set(key, rec);
            if (rec.slug) _marketCache.set(rec.slug, rec);
            if (rec._id) _marketCache.set(rec._id, rec);
            setName(rec.name);
          } else setName("—");
        }
      } catch {
        if (!cancelled) setName("—");
      }
    };

    resolve();
    return () => (cancelled = true);
  }, [market]);

  return <span>{name}</span>;
}

/* ---------- exported columns factory ---------- */
export function getSourcingColumns({
  statusPill,
  canEdit,
  navigate,
  handleDeleteOrder,
}) {
  const cols = [
    {
      title: "ID",
      dataIndex: "sourcing_id",
      key: "sourcing_id",
      width: 110,
      sorter: (a, b) => idNum(a) - idNum(b),
      defaultSortOrder: "descend",
      sortDirections: ["descend", "ascend"],
      render: (sid, rec) => (
        <Tooltip title={`MongoID: ${rec._id || rec.id || "N/A"}`}>
          <span style={{ fontWeight: 700, letterSpacing: 0.2 }}>
            {sid != null ? `#${sid}` : "—"}
          </span>
        </Tooltip>
      ),
    },
    {
      title: "Sourcer Name",
      dataIndex: "sourcerName",
      key: "sourcerName",
      width: 230,
      render: (val, rec) => {
        const fallback =
          [rec?.sourcer_id?.firstName, rec?.sourcer_id?.lastName]
            .filter(Boolean)
            .join(" ") || rec?.sourcer_id?.email || "—";
        const display = val || fallback;
        return (
          <div style={{ lineHeight: 1.2 }}>
            <div style={{ fontWeight: 600 }}>{display}</div>
            {rec?.sourcer_id?.email && (
              <Text type="secondary" style={{ fontSize: 12 }}>
                {rec.sourcer_id.email}
              </Text>
            )}
          </div>
        );
      },
    },
    {
      title: "Purchaser",
      dataIndex: "purchaserName",
      key: "purchaserName",
      width: 230,
      render: (val, rec) => {
        const full = [rec?.purchaser_id?.firstName, rec?.purchaser_id?.lastName]
          .filter(Boolean)
          .join(" ");
        const fallback = full || rec?.purchaser_id?.email || "—";
        const display = val || fallback || "—";
        return (
          <div style={{ lineHeight: 1.2 }}>
            <div style={{ fontWeight: 600 }}>{display}</div>
            {rec?.purchaser_id?.email && (
              <Text type="secondary" style={{ fontSize: 12 }}>
                {rec.purchaser_id.email}
              </Text>
            )}
          </div>
        );
      },
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      width: 130,
      render: (s) => <Tag color={statusPill(s)}>{s || "Pending"}</Tag>,
    },
    {
      title: "Seller",
      key: "seller",
      width: 100,
      render: (_, rec) => (
        <span style={{ fontWeight: 600 }}>{getSellerName(rec)}</span>
      ),
    },
    {
      title: "Market",
      key: "market",
      width: 100,
      render: (_, rec) => {
        const marketRef =
          rec?.seller && typeof rec.seller === "object"
            ? rec.seller.market
            : rec.market;
        const origin = rec.origin || "—";
        return (
          <div style={{ lineHeight: 1.2 }}>
            <div>
              <MarketName market={marketRef} />
            </div>
            <Text type="secondary" style={{ fontSize: 12 }}>
              {origin}
            </Text>
          </div>
        );
      },
    },
    {
      title: "Seller $",
      dataIndex: "sellers_price",
      key: "sellers_price",
      width: 110,
      render: (v) => <span>{fmtMoney(num(v))}</span>,
    },
    {
      title: "Ship $",
      dataIndex: "shipping_charges",
      key: "shipping_charges",
      width: 110,
      render: (_, rec) =>
        fmtMoney(num(rec.shipping_charges ?? rec.shipping_price)),
    },
    {
      title: "Tax $",
      dataIndex: "taxes",
      key: "taxes",
      width: 110,
      render: (_, rec) => fmtMoney(num(rec.taxes ?? rec.tax)),
    },
    {
      title: "Total Target $",
      dataIndex: "target_total_cost",
      key: "target_total_cost",
      width: 150,
      render: (v) => fmtMoney(num(v)),
    },
    {
      title: "Actual Cost $",
      dataIndex: "total_actual_cost",
      key: "total_actual_cost",
      width: 150,
      render: (v) => fmtMoney(num(v)),
    },
    {
      title: "Efficiency $",
      key: "purchase_efficiency",
      width: 150,
      render: (_, rec) => {
        const n =
          num(rec.target_total_cost) -
          num(rec.sellers_price) -
          num(rec.shipping_charges ?? rec.shipping_price) -
          num(rec.taxes ?? rec.tax);
        return (
          <span style={{ fontWeight: 600, color: n >= 0 ? "green" : "red" }}>
            {fmtMoney(n)}
          </span>
        );
      },
    },
    {
      title: "Created",
      dataIndex: "createdAt",
      key: "createdAt",
      width: 170,
      render: (dt, rec) => {
        const actual = dt || rec.created_at || rec.created_on;
        return fmtDateTime(actual);
      },
    },
  ];

  if (canEdit) {
    cols.push({
      title: "Actions",
      key: "actions",
      fixed: "right",
      width: 120,
      render: (_, rec) => (
        <Space size={4}>
          <Tooltip title="Edit">
            <Button
              type="text"
              icon={<Pencil size={16} />}
              aria-label="Edit"
              onClick={() => navigate(`/sourcing/edit/${rec._id}`)}
            />
          </Tooltip>
          <Popconfirm
            title="Delete this sourcing request?"
            description="This action cannot be undone."
            okText="Delete"
            okButtonProps={{ danger: true }}
            onConfirm={() => handleDeleteOrder(rec._id || rec.id)}
          >
            <Tooltip title="Delete">
              <Button type="text" danger icon={<Trash2 size={16} />} aria-label="Delete" />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    });
  }

  return cols;
}

/* ---------- exported expanded-row table ---------- */
export const makeItemsTable = (order) => {
  const data = order?.items || [];
  return (
    <Table
      rowKey="_id"
      size="small"
      pagination={false}
      dataSource={data}
      columns={[
        {
          title: "Product",
          dataIndex: "name",
          render: (_t, r) => r?.name || r?.product_name || "Untitled",
        },
        {
          title: "SKU",
          dataIndex: "sku",
          render: (v) => <Text type="secondary">{v || "—"}</Text>,
        },
        { title: "Qty", dataIndex: "quantity_needed", width: 80 },
        {
          title: "Seller $",
          dataIndex: "sourced_price",
          width: 110,
          render: (v) => fmtMoney(num(v)),
        },
        {
          title: "Condition",
          dataIndex: "product_condition",
          width: 140,
          render: (v) => v || "—",
        },
      ]}
    />
  );
};
