
// src/components/SourcingLogsTimeline.jsx
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
const fmtDateTime = (v) => (v ? dayjs(getDate(v)).format("MMM D, YYYY • HH:mm") : "—");

const LABELS = {
  sourcing_id: "Sourcing #",
  sourcer_id: "Sourcer",
  purchaser_id: "Purchaser",
  createdAt: "Created At",
  updatedAt: "Updated At",
  seller: "Seller",
  market: "Marketplace",
  origin: "Origin",
  offer_price: "Offer Price",
  sellers_price: "Seller Price",
  sellers_price_per_unit: "Seller / Unit",
  shipping_charges: "Shipping",
  shipping_price: "Shipping",
  taxes: "Taxes",
  tax: "Tax",
  target_cost_per_unit: "Target / Unit",
  target_total_cost: "Target Total",
  actual_cost_per_unit: "Actual / Unit",
  total_actual_cost: "Actual Total",
  sku_efficiency: "SKU Efficiency",
  purchase_efficiency: "Purchase Efficiency",
  listing_link: "Listing Link",
  sourcer_remarks: "Sourcer Remarks",
  purchaser_remarks: "Purchaser Remarks",
  status: "Status",
  assignedAt: "Assigned At",
  purchaserActionTime: "Purchaser Action Time",
  purchaserResponseTime: "Purchaser Response",
  market_order_num: "Market Order #",
  purchase_link: "Purchase Link",
  destination_warehouse: "Destination",
  tracking_status: "Tracking Status",
  carrier: "Carrier",
  tracking_id: "Tracking ID",
  tracking_link: "Tracking Link",
};

const ITEM_FIELD_LABELS = {
  product_name: "Product Name",
  name: "Product Name",
  sku: "SKU",
  quantity_needed: "Quantity",
  product_condition: "Condition",
  tested: "Tested",
  product_type: "Type",
  target_cost_per_unit: "Target / Unit",
  sellers_price_per_unit: "Seller / Unit",
  actual_cost_per_unit: "Actual / Unit",
  total_target_cost: "Target Total (line)",
};

const MONEY_FIELDS = new Set([
  "offer_price",
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

const HIDE_ALWAYS_ROOTS = new Set(["updatedAt", "createdAt"]); // hide completely

// Any field path that is an identifier we should not show directly
const ID_LAST_KEYS = new Set([
  "_id",
  "id",
  "product",
  "product_id",
  "productId",
  "product_uid",
  "user_id",
  "userId",
]);

const fmtMoney = (v) => {
  const n = Number(
    typeof v === "string" ? v.replace(/\s/g, "").replace(/^\$/, "").replace(/,/g, "") : v
  );
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

const DISPLAY_FIELDS = new Set(Object.keys(LABELS));
const ATOMIC_ROOTS = new Set(["seller", "market", "carrier", "sourcer_id", "purchaser_id"]);

const isObjId = (s) => typeof s === "string" && /^[0-9a-fA-F]{24}$/.test(s);
const extractId = (v) => {
  if (v == null) return null;
  if (typeof v === "string") return v;
  if (typeof v === "object") return v._id || v.id || v.$oid || null;
  return null;
};

/** Normalize values to compare robustly */
const normalizeForDiff = (v) => {
  if (v === "" || v === null || v === undefined) return null;

  if (typeof v === "string") {
    const s = v.trim();
    if (s === "") return null;
    // currency-like?
    const currency = s.replace(/\s/g, "").replace(/^\$/, "").replace(/,/g, "");
    if (currency !== "" && !Number.isNaN(Number(currency))) return Number(currency);
    if (!Number.isNaN(Number(s))) return Number(s);
    return s;
  }

  if (typeof v === "number" || typeof v === "boolean") return v;

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

function flatten(obj, prefix = "", out = {}, depth = 0) {
  if (obj === null || obj === undefined) {
    if (prefix) out[prefix] = obj;
    return out;
  }
  const root = prefix ? prefix.split(".")[0] : "";
  if (root && ATOMIC_ROOTS.has(root)) {
    out[root] = obj; // keep whole thing for atomic roots
    return out;
  }
  if (typeof obj !== "object" || Array.isArray(obj) || depth >= 3) {
    if (prefix) out[prefix] = obj;
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

const EXCLUDE_FIELDS = new Set(["updatedAt", "__v", "items"]); // never show the top-level "items" key itself

function shouldHideFieldPath(field) {
  // Hide any path that ends with a known id-like key (except atomic roots which we render as names)
  const parts = (field || "").split(".");
  const last = parts[parts.length - 1];
  const root = parts[0];
  if (EXCLUDE_FIELDS.has(field)) return true;
  if (HIDE_ALWAYS_ROOTS.has(root)) return true;
  if (root === "items") {
    // Hide item-level technical IDs
    if (ID_LAST_KEYS.has(last)) return true;
    if (last === "product") return true;
  }
  if (ID_LAST_KEYS.has(last) && !ATOMIC_ROOTS.has(root)) return true;
  return false;
}

function changesWithValues(before = {}, after = {}) {
  const b = flatten(before);
  const a = flatten(after);

  const keysAll = Array.from(new Set([...Object.keys(b), ...Object.keys(a)])).sort();

  // allow: top-level allowed fields or "items.*"
  const keys = keysAll.filter((k) => {
    const root = k.split(".")[0];
    return root === "items" || DISPLAY_FIELDS.has(root);
  });

  let rows = keys
    .filter((k) => !shouldHideFieldPath(k))
    .map((k) => {
      const root = k.split(".")[0];
      const from = b[k];
      const to = a[k];

      if (ATOMIC_ROOTS.has(root) && !k.includes(".")) {
        return { field: k, from, to, _atomic: true };
      }
      return { field: k, from, to, _atomic: false };
    });

  // -------- FIX #1: don't drop atomic changes when not ObjectIDs ----------
  rows = rows.filter(({ field, from, to, _atomic }) => {
    // If both sides are ObjectIDs, compare by id; otherwise compare normalized values.
    if (_atomic) {
      const aId = extractId(from);
      const bId = extractId(to);
      if (aId && bId) {
        return aId !== bId;
      }
    }
    const nf = normalizeForDiff(from);
    const nt = normalizeForDiff(to);
    return JSON.stringify(nf) !== JSON.stringify(nt);
  });

  // If a root changed at top-level, drop nested changes to avoid duplicates
  const rootsChanged = new Set(
    rows.filter((d) => !d.field.includes(".")).map((d) => d.field.split(".")[0])
  );
  rows = rows.filter((d) => {
    const root = d.field.split(".")[0];
    if (rootsChanged.has(root) && d.field.includes(".")) return false;
    if (ATOMIC_ROOTS.has(root) && d.field.includes(".")) return false;
    return true;
  });

  return rows.map(({ field, from, to }) => ({ field, from, to }));
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
  [
    "createdAt",
    "updatedAt",
    "assignedAt",
    "purchaserActionTime",
    "purchaserResponseTime",
  ].includes(field);

const lastKey = (field = "") => field.split(".").pop() || field;

/* ======================== label resolution ======================== */
const safeName = (obj, keys) => keys.map((k) => obj?.[k]).find(Boolean);

async function fetchLabelFor(type, id) {
  if (!isObjId(id)) return null;
  try {
    switch (type) {
      case "seller": {
        const { data } = await apiClient.get(`/api/v1/sellers/${id}`);
        return data?.name || data?.seller?.name || data?.slug || null;
      }
      case "market": {
        const { data } = await apiClient.get(`/api/v1/markets/${id}`);
        return data?.name || data?.slug || null;
      }
      case "carrier": {
        const { data } = await apiClient.get(`/api/v1/carriers/${id}`);
        return data?.name || null;
      }
      case "sourcer_id":
      case "purchaser_id": {
        const { data } = await apiClient.get(`/api/v1/users/${id}`);
        const full = [data?.firstName, data?.lastName].filter(Boolean).join(" ").trim();
        return full || data?.email || null;
      }
      default:
        return null;
    }
  } catch {
    return null;
  }
}

/* ======================== items helpers ======================== */
const ITEM_PATH_RE = /^items\.(\d+)(?:\.([^.]+))?$/;

function getItemContext(field, before, after) {
  const m = ITEM_PATH_RE.exec(field);
  if (!m) return { name: null, sku: null, idx: null, sub: null };
  const idx = Number(m[1]);
  const sub = m[2] || null;
  const beforeItem = Array.isArray(before?.items) ? before.items[idx] : undefined;
  const afterItem = Array.isArray(after?.items) ? after.items[idx] : undefined;
  const src = afterItem || beforeItem || {};
  const name = src.product_name || src.name || null;
  const sku = src.sku || null;
  return { name, sku, idx, sub };
}

function labelForItemField(field) {
  const m = ITEM_PATH_RE.exec(field);
  if (!m) return LABELS[field] || field;
  const sub = m[2];
  if (!sub) return "Item";
  return ITEM_FIELD_LABELS[sub] || sub;
}

/* ======================== Component ======================== */
export default function SourcingLogsTimeline({ targetId, title = "Activity Log", refreshKey }) {
  const { token } = theme.useToken();

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(null);
  const [expanded, setExpanded] = useState(false);

  // cache of id -> human label
  const [refLabels, setRefLabels] = useState({});

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
      const list = Array.isArray(data) ? data : Array.isArray(data?.results) ? data.results : [];
      list.sort((a, b) => new Date(getDate(b.createdAt)) - new Date(getDate(a.createdAt)));
      setRows(list);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error("Failed to fetch logs", e?.response?.data || e.message);
      setErr(e);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [targetId]);

  useEffect(() => {
    if (expanded) fetchLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expanded, refreshKey, targetId]);

  // Resolve labels for atomic refs
  useEffect(() => {
    if (!rows.length) return;

    const need = {
      seller: new Set(),
      market: new Set(),
      carrier: new Set(),
      sourcer_id: new Set(),
      purchaser_id: new Set(),
    };

    const consider = (field, val) => {
      const root = field.split(".")[0];
      if (!ATOMIC_ROOTS.has(root)) return;
      const id = extractId(val);
      if (isObjId(id) && !refLabels[id]) need[root].add(id);
    };

    rows.forEach((log) => {
      // server-provided diffs
      if (Array.isArray(log?.diff)) {
        log.diff.forEach((d) => {
          const field = d.field || d.path || "";
          if (HIDE_ALWAYS_ROOTS.has(field.split(".")[0])) return;
          consider(field, d.from);
          consider(field, d.to);
        });
      }
      // snapshots
      const scanObj = (obj) => {
        if (!obj || typeof obj !== "object") return;
        ["seller", "market", "carrier", "sourcer_id", "purchaser_id"].forEach((f) => {
          if (f in obj) consider(f, obj[f]);
        });
      };
      scanObj(log.before);
      scanObj(log.after);
    });

    const doFetch = async () => {
      const updates = {};
      await Promise.all(
        Object.entries(need).flatMap(([type, set]) =>
          Array.from(set).map(async (id) => {
            const label = await fetchLabelFor(type, id);
            if (label) updates[id] = label;
          })
        )
      );
      if (Object.keys(updates).length) {
        setRefLabels((prev) => ({ ...prev, ...updates }));
      }
    };

    doFetch();
  }, [rows, refLabels]);

  const grouped = useMemo(() => groupByDay(rows), [rows]);

  const renderPerson = (v) => {
    // Never show raw IDs; if we can't resolve, show "—"
    if (!v) return "—";
    if (typeof v === "object") {
      const name = [v.firstName, v.lastName].filter(Boolean).join(" ").trim();
      return name || v.email || "—";
    }
    if (isObjId(v)) return refLabels[v] || "—";
    return String(v);
  };

  const renderNamedRef = (type, v, keys = ["name", "slug"]) => {
    // Never show raw IDs; show "—" if unresolved
    if (!v) return "—";
    if (typeof v === "object") {
      const name = safeName(v, keys);
      return name || "—";
    }
    if (isObjId(v)) return refLabels[v] || "—";
    return String(v);
  };

  const renderVal = (field, v) => {
    const key = lastKey(field);
    if (MONEY_FIELDS.has(key)) return fmtMoney(v);
    if (isDateField(key)) {
      const d = getDate(v);
      return d && dayjs(d).isValid() ? dayjs(d).format("MMM D, YYYY • HH:mm") : toStringish(v);
    }
    if (field === "sourcer_id" || field === "purchaser_id") return renderPerson(v);
    if (field === "seller") return renderNamedRef("seller", v, ["name"]);
    if (field === "market") return renderNamedRef("market", v, ["name", "slug"]);
    if (field === "carrier") return renderNamedRef("carrier", v, ["name"]);
    return toStringish(v);
  };

  const renderItemChangeLine = (who, when, main, sku, label, fromStr, toStr, color) => {
    // If display strings are equal, don't render
    if (String(fromStr) === String(toStr)) return null;
    return {
      color,
      key: `${who}-${when}-${label}-${main ?? ""}-${sku ?? ""}-${Math.random()
        .toString(36)
        .slice(2, 7)}`,
      children: (
        <RowLine who={who} when={when}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "baseline" }}>
            <Text strong>{who}</Text>
            <Text>changed</Text>
            <Text code>{label}</Text>
            {main && (
              <>
                <Text>for</Text>
                <Text code>{main}</Text>
              </>
            )}
            {sku && (
              <Text type="secondary" code>
                {sku}
              </Text>
            )}
          </div>
          <FromTo fromStr={fromStr} toStr={toStr} />
        </RowLine>
      ),
    };
  };

  return (
    <Card
      className="bg-sky-50/40"
      title={
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Title level={5} style={{ margin: 0 }}>
            {title}
          </Title>
          {expanded && (
            <Tooltip title="Reload">
              <Button size="small" icon={<ReloadOutlined />} onClick={fetchLogs} />
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
        <div style={{ display: "none" }} />
      ) : loading ? (
        <div style={{ padding: 20 }}>
          <Skeleton active paragraph={{ rows: 2 }} />
          <Divider style={{ margin: "12px 0" }} />
          <Skeleton active paragraph={{ rows: 2 }} />
        </div>
      ) : err ? (
        <div style={{ padding: 32, textAlign: "center" }}>
          <InfoCircleOutlined style={{ fontSize: 18, color: token.colorTextTertiary }} />
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
                <div style={{ whiteSpace: "nowrap" }}>{fmtDate(g.key)}</div>
                <div style={{ height: 1, background: token.colorSplit, flex: 1 }} />
              </div>

              {/* timeline */}
              <Timeline
                items={g.items.flatMap((log, logIdx) => {
                  const who = log.userEmail || "—";
                  const when = getDate(log.createdAt) || getDate(log.updatedAt);
                  const color = actionColor(log.action, token);

                  // 1) itemsOps from meta (preferred)
                  const itemsOps = Array.isArray(log?.meta?.itemsOps) ? log.meta.itemsOps : [];
                  if (itemsOps.length) {
                    return itemsOps
                      .map((op, idx) => {
                        const title =
                          op.op === "ADD"
                            ? "added"
                            : op.op === "REMOVE"
                            ? "removed"
                            : op.op === "QTY"
                            ? "changed quantity"
                            : "updated item";
                        const main = op.name || op.sku || "Item";

                        if (op.op === "QTY") {
                          const sub =
                            op.from != null || op.to != null
                              ? ` ${op.from ?? 0} → ${op.to ?? 0}`
                              : "";
                          return {
                            color,
                            key: `${log._id || logIdx}-op-${idx}`,
                            children: (
                              <RowLine who={who} when={when}>
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
                              </RowLine>
                            ),
                          };
                        }

                        if (op.op === "UPDATE" && op.field) {
                          const label = ITEM_FIELD_LABELS[op.field] || op.field;
                          const fromStr = renderVal(op.field, op.from);
                          const toStr = renderVal(op.field, op.to);
                          if (String(fromStr) === String(toStr)) return null;
                          return {
                            color,
                            key: `${log._id || logIdx}-op-${idx}`,
                            children: (
                              <RowLine who={who} when={when}>
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
                                  <Text>— changed</Text>
                                  <Text code>{label}</Text>
                                </div>
                                <FromTo fromStr={fromStr} toStr={toStr} />
                              </RowLine>
                            ),
                          };
                        }

                        // ADD / REMOVE
                        return {
                          color,
                          key: `${log._id || logIdx}-op-${idx}`,
                          children: (
                            <RowLine who={who} when={when}>
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
                                {op.qty != null &&
                                  (op.op === "ADD" || op.op === "REMOVE") && (
                                    <Text type="secondary">qty {op.qty}</Text>
                                  )}
                              </div>
                            </RowLine>
                          ),
                        };
                      })
                      .filter(Boolean);
                  }

                  // 2) diffs: prefer server diff; fallback to client diff
                  let changes =
                    Array.isArray(log?.diff) && log.diff.length
                      ? log.diff
                          .map((d, i) => ({
                            field: d.field || d.path || "",
                            from: d.from,
                            to: d.to,
                            _k: i,
                          }))
                          .filter((c) => !shouldHideFieldPath(c.field))
                          // -------- FIX #2: allow atomic fields that are strings/slugs ----------
                          .filter((c) => {
                            const root = c.field.split(".")[0];
                            if (ATOMIC_ROOTS.has(root) && !c.field.includes(".")) {
                              const aId = extractId(c.from);
                              const bId = extractId(c.to);
                              if (aId && bId) return aId !== bId; // both ObjectIDs → compare ids
                              const nf = normalizeForDiff(c.from);
                              const nt = normalizeForDiff(c.to);
                              return JSON.stringify(nf) !== JSON.stringify(nt);
                            }
                            return true;
                          })
                      : changesWithValues(log.before, log.after);

                  // transform & filter
                  const out = [];

                  changes.forEach(({ field, from, to, _k }, idx) => {
                    // Drop unchanged after normalization
                    const nf = normalizeForDiff(from);
                    const nt = normalizeForDiff(to);
                    if (JSON.stringify(nf) === JSON.stringify(nt)) return;

                    // Handle whole-item add/remove: items.N with no subkey
                    const m = ITEM_PATH_RE.exec(field);
                    const isItemPath = !!m;
                    const sub = isItemPath ? m[2] : null;

                    if (
                      isItemPath &&
                      !sub &&
                      (typeof from === "object" || from == null) &&
                      (typeof to === "object" || to == null)
                    ) {
                      if (from == null && to && typeof to === "object") {
                        // Added item
                        const main = to.product_name || to.name || "Item";
                        const sku = to.sku || undefined;
                        out.push({
                          color,
                          key: `${log._id || "log"}-${field || "field"}-${_k ?? idx}-add`,
                          children: (
                            <RowLine who={who} when={when}>
                              <div
                                style={{
                                  display: "flex",
                                  flexWrap: "wrap",
                                  gap: 6,
                                  alignItems: "baseline",
                                }}
                              >
                                <Text strong>{who}</Text>
                                <Text>added</Text>
                                <Text code>{main}</Text>
                                {sku && (
                                  <Text type="secondary" code>
                                    {sku}
                                  </Text>
                                )}
                              </div>
                            </RowLine>
                          ),
                        });
                        return;
                      }
                      if (to == null && from && typeof from === "object") {
                        // Removed item
                        const main = from.product_name || from.name || "Item";
                        const sku = from.sku || undefined;
                        out.push({
                          color,
                          key: `${log._id || "log"}-${field || "field"}-${_k ?? idx}-remove`,
                          children: (
                            <RowLine who={who} when={when}>
                              <div
                                style={{
                                  display: "flex",
                                  flexWrap: "wrap",
                                  gap: 6,
                                  alignItems: "baseline",
                                }}
                              >
                                <Text strong>{who}</Text>
                                <Text>removed</Text>
                                <Text code>{main}</Text>
                                {sku && (
                                  <Text type="secondary" code>
                                    {sku}
                                  </Text>
                                )}
                              </div>
                            </RowLine>
                          ),
                        });
                        return;
                      }
                      // both objects: let field-level diffs handle it; skip here
                      return;
                    }

                    // Regular change
                    const label = isItemPath ? labelForItemField(field) : LABELS[field] || field;
                    const fromStr = renderVal(field, from);
                    const toStr = renderVal(field, to);

                    // Extra safety: if display strings are equal, skip
                    if (String(fromStr) === String(toStr)) return;

                    if (isItemPath) {
                      const ctx = getItemContext(field, log.before, log.after);
                      const node = renderItemChangeLine(
                        who,
                        when,
                        ctx.name,
                        ctx.sku,
                        label,
                        fromStr,
                        toStr,
                        color
                      );
                      if (node) out.push(node);
                      return;
                    }

                    out.push({
                      color,
                      key: `${log._id || "log"}-${field || "field"}-${_k ?? idx}`,
                      children: (
                        <RowLine who={who} when={when}>
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
                          <FromTo fromStr={fromStr} toStr={toStr} />
                        </RowLine>
                      ),
                    });
                  });

                  // If nothing left and it's a pure status change, render that
                  if (!out.length && log.action === "STATUS_CHANGE") {
                    const fromStr = renderVal("status", log.statusFrom);
                    const toStr = renderVal("status", log.statusTo);
                    if (String(fromStr) !== String(toStr)) {
                      out.push({
                        color,
                        key: `${log._id || "status"}-only`,
                        children: (
                          <RowLine who={who} when={when}>
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
                            <FromTo fromStr={fromStr} toStr={toStr} />
                          </RowLine>
                        ),
                      });
                    }
                  }

                  return out;
                })}
              />
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

/* ---------- small presentational helpers ---------- */
function RowLine({ who, when, children }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 12, width: "100%" }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 0, lineHeight: 1.5 }}>
        {children}
      </div>
      <Tooltip title={<span><FieldTimeOutlined /> {fmtDateTime(when)}</span>}>
        <Text type="secondary" style={{ whiteSpace: "nowrap" }}>
          {fmtTime(when)}
        </Text>
      </Tooltip>
    </div>
  );
}

function FromTo({ fromStr, toStr }) {
  const short = (s) => (typeof s === "string" && s.length > 36 ? s.slice(0, 35) + "…" : String(s));
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "baseline" }}>
      <Text type="secondary">from</Text>
      <Tooltip title={String(fromStr)}>
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
          {short(fromStr)}
        </Text>
      </Tooltip>
      <Text type="secondary" style={{ margin: "0 4px" }}>→</Text>
      <Text type="secondary">to</Text>
      <Tooltip title={String(toStr)}>
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
          {short(toStr)}
        </Text>
      </Tooltip>
    </div>
  );
}

function groupByDay(logs) {
  const map = new Map();
  logs.forEach((l) => {
    const key = dayjs(getDate(l.createdAt) || getDate(l.updatedAt)).format("YYYY-MM-DD");
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(l);
  });
  return Array.from(map.entries())
    .sort((a, b) => (a[0] < b[0] ? 1 : -1))
    .map(([day, arr]) => ({
      key: day,
      items: arr.sort((a, b) =>
        dayjs(getDate(a.createdAt)).isBefore(dayjs(getDate(b.createdAt))) ? 1 : -1
      ),
    }));
}
