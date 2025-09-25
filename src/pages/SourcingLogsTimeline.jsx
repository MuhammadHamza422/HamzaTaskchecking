import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Card,
  Typography,
  Empty,
  Skeleton,
  Divider,
  Tooltip,
  Button,
  Timeline,
  theme,
} from "antd";
import {
  ReloadOutlined,
  FieldTimeOutlined,
  InfoCircleOutlined,
  PlusOutlined,
  MinusOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import apiClient from "../api/client";

const { Text, Title } = Typography;

/* ======================== helpers ======================== */
const getDate = (d) => (d && d.$date) || d;
const fmtDate = (v) => (v ? dayjs(getDate(v)).format("MMM D, YYYY") : "—");
const fmtTime = (v) => (v ? dayjs(getDate(v)).format("HH:mm") : "—");
const fmtDateTime = (v) =>
  v ? dayjs(getDate(v)).format("MMM D, YYYY • HH:mm") : "—";

const LABELS = {
  sourcing_id: "Sourcing #",
  sourcer_id: "Sourcer",
  purchaser_id: "Purchaser",
  createdAt: "Created At",
  updatedAt: "Updated At",
  seller: "Seller",
  origin: "Origin",
  target_cost_per_unit: "Target / Unit",
  target_total_cost: "Target Total",
  sellers_price: "Seller Price",
  sellers_price_per_unit: "Seller Price / Unit",
  shipping_charges: "Shipping",
  shipping_price: "Shipping",
  taxes: "Taxes",
  tax: "Tax",
  actual_cost_per_unit: "Actual / Unit",
  total_actual_cost: "Actual Total",
  sku_efficiency: "SKU Efficiency",
  purchase_efficiency: "Purchase Efficiency",
  listing_link: "Listing Link",
  sourcer_remarks: "Sourcer Remarks",
  status: "Status",
  assignedAt: "Assigned At",
  purchaserResponseTime: "Purchaser Response",
  purchaser_remarks: "Purchaser Remarks",
  market_order_num: "Market Order #",
  purchase_link: "Purchase Link",
  destination_warehouse: "Destination",
  tracking_status: "Tracking Status",
  carrier: "Carrier",
  tracking_id: "Tracking ID",
  tracking_link: "Tracking Link",
};

const MONEY_FIELDS = new Set([
  "sellers_price",
  "sellers_price_per_unit",
  "shipping_charges",
  "shipping_price",
  "taxes",
  "tax",
  "target_cost_per_unit",
  "target_total_cost",
  "actual_cost_per_unit",
  "total_actual_cost",
]);

const fmtMoney = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? `$ ${n.toFixed(2)}` : String(v ?? "—");
};

const actionColor = (action, token) => {
  switch (action) {
    case "CREATE":
      return token.colorSuccess;
    case "DELETE":
      return token.colorError;
    case "UPDATE":
    case "STATUS_CHANGE":
    default:
      return token.colorInfo;
  }
};

/* flatten limited depth */
function flatten(obj, prefix = "", out = {}, depth = 0) {
  if (!obj || typeof obj !== "object" || Array.isArray(obj) || depth >= 3) {
    out[prefix || ""] = obj;
    return out;
  }
  for (const k of Object.keys(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    const val = obj[k];
    if (val && typeof val === "object" && !Array.isArray(val)) {
      flatten(val, key, out, depth + 1);
    } else {
      out[key] = val;
    }
  }
  return out;
}

const isNumericString = (s) =>
  typeof s === "string" && s.trim() !== "" && !Number.isNaN(Number(s));
const normalizeForDiff = (v) => {
  if (v === "" || v === null || v === undefined) return null;
  if (typeof v === "string") {
    const s = v.trim();
    if (s === "") return null;
    if (isNumericString(s)) return Number(s);
    return s;
  }
  if (v && typeof v === "object") {
    if (v.$date) {
      const d = dayjs(v.$date);
      return d.isValid() ? d.toISOString() : v.$date;
    }
    if (v instanceof Date) return v.toISOString();
    if (v._bsontype === "ObjectID") return String(v);
  }
  return v;
};

const EXCLUDE_FIELDS = new Set([
  "updatedAt",
  "__v",
  "items", // avoid huge array dumps; prefer meta.itemsOps for item-level changes
]);

function changesWithValues(before = {}, after = {}) {
  const b = flatten(before);
  const a = flatten(after);
  const keys = Array.from(new Set([...Object.keys(b), ...Object.keys(a)])).sort();

  const rows = keys.map((k) => {
    const from = b[k];
    const to = a[k];
    const nFrom = normalizeForDiff(from);
    const nTo = normalizeForDiff(to);
    return { field: k, from, to, nFrom, nTo };
  });

  return rows
    .filter(({ field }) => !EXCLUDE_FIELDS.has(field))
    .filter(({ nFrom, nTo }) => JSON.stringify(nFrom) !== JSON.stringify(nTo))
    .filter(({ nFrom, nTo }) => !(nFrom === null && nTo === null))
    .map(({ field, from, to }) => ({ field, from, to }));
}

const toStringish = (v) => {
  if (v === null || v === undefined) return "—";
  if (typeof v === "string") return v.trim() === "" ? "—" : v;
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  try {
    return JSON.stringify(v);
  } catch {
    return String(v);
  }
};

const isDateField = (field) =>
  /(At|Time|Date)$/i.test(field) ||
  ["createdAt", "updatedAt", "assignedAt", "purchaserResponseTime"].includes(
    field
  );

const renderVal = (field, v) => {
  if (MONEY_FIELDS.has(field)) return fmtMoney(v);
  if (isDateField(field)) {
    const d = getDate(v);
    return d && dayjs(d).isValid()
      ? dayjs(d).format("MMM D, YYYY • HH:mm")
      : toStringish(v);
  }
  return toStringish(v);
};

const ellipsis = (s, n = 36) =>
  s && s.length > n ? s.slice(0, n - 1) + "…" : s;

function groupByDay(logs) {
  const map = new Map();
  logs.forEach((l) => {
    const key = dayjs(getDate(l.createdAt) || getDate(l.updatedAt)).format(
      "YYYY-MM-DD"
    );
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(l);
  });
  return Array.from(map.entries())
    .sort((a, b) => (a[0] < b[0] ? 1 : -1))
    .map(([day, arr]) => ({
      key: day,
      label: fmtDate(day),
      items: arr.sort((a, b) =>
        dayjs(getDate(a.createdAt)).isBefore(dayjs(getDate(b.createdAt))) ? 1 : -1
      ),
    }));
}

/* ======================== Component ======================== */
export default function SourcingLogsTimeline({
  targetId,
  title = "Activity Log",
  refreshKey,
}) {
  const { token } = theme.useToken();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(null);

  // collapsed by default
  const [expanded, setExpanded] = useState(false);

  const fetchLogs = useCallback(async () => {
    if (!targetId) {
      setRows([]);
      return;
    }
    setLoading(true);
    setErr(null);
    try {
      const { data } = await apiClient.get("/api/v1/userlogs", {
        params: { targetId, _: Date.now() },
        headers: { "Cache-Control": "no-cache" },
      });
      const list = Array.isArray(data)
        ? data
        : Array.isArray(data?.results)
        ? data.results
        : [];
      list.sort(
        (a, b) =>
          new Date(getDate(b.createdAt)) - new Date(getDate(a.createdAt))
      );
      setRows(list);
    } catch (e) {
      console.error("Failed to fetch logs", e?.response?.data || e.message);
      setErr(e);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [targetId]);

  // fetch only when expanded
  useEffect(() => {
    if (expanded) fetchLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expanded, refreshKey, targetId]);

  const grouped = useMemo(() => groupByDay(rows), [rows]);

  return (
    <Card
      title={
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Title level={5} style={{ margin: 0 }}>
            {title}
          </Title>
          {expanded && (
            <Tooltip title="Reload">
              <Button
                size="small"
                icon={<ReloadOutlined />}
                onClick={fetchLogs}
              />
            </Tooltip>
          )}
        </div>
      }
      extra={
        <Tooltip title={expanded ? "Collapse" : "Expand"}>
          <Button
            type="text"
            shape="circle"
            aria-label={expanded ? "Collapse activity log" : "Expand activity log"}
            onClick={() => setExpanded((v) => !v)}
            icon={expanded ? <MinusOutlined /> : <PlusOutlined />}
          />
        </Tooltip>
      }
      bodyStyle={{ padding: 0 }}
      style={{ borderRadius: token.borderRadiusLG, overflow: "hidden" }}
    >
      {!expanded ? (
        // collapsed: render nothing (fully hidden)
        <div style={{ display: "none" }} />
      ) : loading ? (
        <div style={{ padding: 20 }}>
          <Skeleton active paragraph={{ rows: 2 }} />
          <Divider style={{ margin: "12px 0" }} />
          <Skeleton active paragraph={{ rows: 2 }} />
        </div>
      ) : err ? (
        <div style={{ padding: 32, textAlign: "center" }}>
          <InfoCircleOutlined
            style={{ fontSize: 18, color: token.colorTextTertiary }}
          />
          <div style={{ marginTop: 8 }}>
            <Text type="secondary">Could not load activity.</Text>
          </div>
          <Button style={{ marginTop: 12 }} onClick={fetchLogs}>
            Try again
          </Button>
        </div>
      ) : grouped.length === 0 ? (
        <div style={{ padding: 32 }}>
          <Empty description="No activity yet" />
        </div>
      ) : (
        <div style={{ padding: 12 }}>
          {grouped.map((g) => (
            <div key={g.key} style={{ marginBottom: 8 }}>
              {/* day header */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  margin: "8px 0 6px",
                  color: token.colorTextTertiary,
                  fontWeight: 600,
                }}
              >
                <div style={{ height: 1, background: token.colorSplit, flex: 1 }} />
                <div style={{ whiteSpace: "nowrap" }}>{g.label}</div>
                <div style={{ height: 1, background: token.colorSplit, flex: 1 }} />
              </div>

              {/* timeline */}
              <Timeline
                items={g.items.flatMap((log) => {
                  const who = log.userEmail || "—";
                  const when =
                    getDate(log.createdAt) || getDate(log.updatedAt);
                  const color = actionColor(log.action, token);
                  const itemsOps = Array.isArray(log?.meta?.itemsOps)
                    ? log.meta.itemsOps
                    : [];

                  if (itemsOps.length) {
                    return itemsOps.map((op, idx) => {
                      const title =
                        op.op === "ADD"
                          ? "added"
                          : op.op === "REMOVE"
                          ? "removed"
                          : op.op === "QTY"
                          ? "changed quantity"
                          : "updated item";
                      const main = op.name || op.sku || "Item";
                      const sub =
                        op.op === "QTY" && (op.from != null || op.to != null)
                          ? ` ${op.from ?? 0} → ${op.to ?? 0}`
                          : op.op === "ADD" && op.qty != null
                          ? ` qty ${op.qty}`
                          : "";

                      return {
                        color,
                        key: `${log._id || idx}-op-${idx}`,
                        children: (
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              gap: 12,
                              width: "100%",
                            }}
                          >
                            <div
                              style={{
                                display: "flex",
                                flexDirection: "column",
                                gap: 4,
                                minWidth: 0,
                                lineHeight: 1.5,
                              }}
                            >
                              <div
                                style={{
                                  display: "flex",
                                  flexWrap: "wrap",
                                  gap: 6,
                                  alignItems: "baseline",
                                }}
                              >
                                <Text strong>{who}</Text>
                                <Text>{title}</Text>
                                <Text code>{main}</Text>
                                {op.sku && (
                                  <Text type="secondary" code>
                                    {op.sku}
                                  </Text>
                                )}
                                <Text>{sub}</Text>
                              </div>
                            </div>
                            <Tooltip
                              title={
                                <span>
                                  <FieldTimeOutlined /> {fmtDateTime(when)}
                                </span>
                              }
                            >
                              <Text
                                type="secondary"
                                style={{ whiteSpace: "nowrap" }}
                              >
                                {fmtTime(when)}
                              </Text>
                            </Tooltip>
                          </div>
                        ),
                      };
                    });
                  }

                  const changes = changesWithValues(log.before, log.after);
                  if (changes.length === 0 && log.action === "STATUS_CHANGE") {
                    const fromStr = renderVal("status", log.statusFrom);
                    const toStr = renderVal("status", log.statusTo);
                    return [
                      {
                        color,
                        children: (
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              gap: 12,
                              width: "100%",
                            }}
                          >
                            <div
                              style={{
                                display: "flex",
                                flexDirection: "column",
                                gap: 4,
                                minWidth: 0,
                                lineHeight: 1.5,
                              }}
                            >
                              <div
                                style={{
                                  display: "flex",
                                  flexWrap: "wrap",
                                  gap: 6,
                                  alignItems: "baseline",
                                }}
                              >
                                <Text strong>{who}</Text>
                                <Text>changed</Text>
                                <Text code>Status</Text>
                              </div>
                              <div
                                style={{
                                  display: "flex",
                                  flexWrap: "wrap",
                                  gap: 6,
                                  alignItems: "baseline",
                                }}
                              >
                                <Text type="secondary">from</Text>
                                <Text code>{fromStr}</Text>
                                <Text
                                  type="secondary"
                                  style={{ margin: "0 4px" }}
                                >
                                  →
                                </Text>
                                <Text type="secondary">to</Text>
                                <Text code>{toStr}</Text>
                              </div>
                            </div>
                            <Tooltip
                              title={
                                <span>
                                  <FieldTimeOutlined /> {fmtDateTime(when)}
                                </span>
                              }
                            >
                              <Text
                                type="secondary"
                                style={{ whiteSpace: "nowrap" }}
                              >
                                {fmtTime(when)}
                              </Text>
                            </Tooltip>
                          </div>
                        ),
                      },
                    ];
                  }

                  return changes.map(({ field, from, to }, idx) => {
                    const label = LABELS[field] || field;
                    const fromStr = renderVal(field, from);
                    const toStr = renderVal(field, to);
                    const shortFrom = ellipsis(fromStr);
                    const shortTo = ellipsis(toStr);

                    return {
                      color,
                      key: `${log._id || "log"}-${idx}`,
                      children: (
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            gap: 12,
                            width: "100%",
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              flexDirection: "column",
                              gap: 4,
                              minWidth: 0,
                              lineHeight: 1.5,
                            }}
                          >
                            <div
                              style={{
                                display: "flex",
                                flexWrap: "wrap",
                                gap: 6,
                                alignItems: "baseline",
                              }}
                            >
                              <Text strong>{who}</Text>
                              <Text>changed</Text>
                              <Text code>{label}</Text>
                            </div>
                            <div
                              style={{
                                display: "flex",
                                flexWrap: "wrap",
                                gap: 6,
                                alignItems: "baseline",
                              }}
                            >
                              <Text type="secondary">from</Text>
                              <Tooltip title={fromStr}>
                                <Text
                                  code
                                  style={{
                                    maxWidth: 280,
                                    display: "inline-block",
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                    verticalAlign: "bottom",
                                  }}
                                >
                                  {shortFrom}
                                </Text>
                              </Tooltip>
                              <Text
                                type="secondary"
                                style={{ margin: "0 4px" }}
                              >
                                →
                              </Text>
                              <Text type="secondary">to</Text>
                              <Tooltip title={toStr}>
                                <Text
                                  code
                                  style={{
                                    maxWidth: 280,
                                    display: "inline-block",
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                    verticalAlign: "bottom",
                                  }}
                                >
                                  {shortTo}
                                </Text>
                              </Tooltip>
                            </div>
                          </div>
                          <Tooltip
                            title={
                              <span>
                                <FieldTimeOutlined /> {fmtDateTime(when)}
                              </span>
                            }
                          >
                            <Text
                              type="secondary"
                              style={{ whiteSpace: "nowrap" }}
                            >
                              {fmtTime(when)}
                            </Text>
                          </Tooltip>
                        </div>
                      ),
                    };
                  });
                })}
              />
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
