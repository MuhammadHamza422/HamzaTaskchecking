
// /src/pages/purchaser/PurchaserDashboard.jsx
import React, { useMemo } from "react";
import { Card, Row, Col, Space, Typography, Button, Statistic, Divider, Table, Tag, Empty, Skeleton } from "antd";
import { ReloadOutlined } from "@ant-design/icons";
import { motion } from "framer-motion";
import dayjs from "dayjs";
import PurchasedTop5Table from "./components/PurchasedTop5Table";
import { num, getCreated, statusColor, labelFromMarket } from "./utils/PurchaseTableUtils";

const { Title, Text } = Typography;

/** --- helpers for response time --- */
function toDate(v) {
  const d = v ? new Date(v) : null;
  return d && !isNaN(d.getTime()) ? d : null;
}
function formatDuration(ms) {
  if (!Number.isFinite(ms) || ms < 0) return "—";
  const s = Math.floor(ms / 1000);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export default function PurchaserDashboard({
  data = [],
  loading = false,
  onRefresh,
  showDebug = true,
  /** admin scope props */
  adminScopeSlot = null,
  isAdmin = false,
  scopedPurchaser = null,
  onClearScope,
}) {
  const {
    count,
    byStatus,
    totals, // still computed for tables; not displayed as KPI
    byMarket,
    bySeller,
    last7Purchased,
    purchasedCount,
    avgResponseMs,
    responseCount,
  } = useMemo(() => {
    const rows = Array.isArray(data) ? data : [];
    const agg = {
      count: rows.length,
      byStatus: new Map(),
      totals: { seller: 0, ship: 0, tax: 0, actual: 0, target: 0 },
      byMarket: new Map(),
      bySeller: new Map(),
      last7Purchased: new Map(),
      purchasedCount: 0,
      // response time
      responseSumMs: 0,
      responseCount: 0,
    };

    const today = dayjs().startOf("day");
    const last7Keys = Array.from({ length: 7 }, (_, i) =>
      today.subtract(i, "day").format("YYYY-MM-DD")
    );

    for (const d of rows) {
      const s = String(d?.status ?? "Pending");
      agg.byStatus.set(s, (agg.byStatus.get(s) || 0) + 1);

      const seller = num(d?.sellers_price);
      const ship = num(d?.shipping_charges ?? d?.shipping_price);
      const tax = num(d?.taxes ?? d?.tax);
      const actual = num(d?.total_actual_cost);
      const target = num(d?.target_total_cost);

      agg.totals.seller += seller;
      agg.totals.ship += ship;
      agg.totals.tax += tax;
      agg.totals.actual += actual;
      agg.totals.target += target;

      const mkt = labelFromMarket(d?.market ?? d?.sellerMarket);
      agg.byMarket.set(mkt, (agg.byMarket.get(mkt) || 0) + 1);

      const sellerName = d?.seller_name ?? d?.sellerName ?? "—";
      agg.bySeller.set(sellerName, (agg.bySeller.get(sellerName) || 0) + 1);

      if (s === "Purchased") {
        agg.purchasedCount += 1;
        const cd = dayjs(getCreated(d));
        const key = cd.isValid() ? cd.format("YYYY-MM-DD") : null;
        if (key && last7Keys.includes(key)) {
          agg.last7Purchased.set(key, (agg.last7Purchased.get(key) || 0) + 1);
        }
      }

      // --- response time aggregation ---
      const assignedAt = toDate(d?.assignedAt);
      const actionAt =
        toDate(d?.purchaserActionTime) ||
        toDate(d?.purchaserResponseTime); // fallback if action time missing

      if (assignedAt && actionAt) {
        const delta = actionAt.getTime() - assignedAt.getTime();
        if (Number.isFinite(delta) && delta >= 0) {
          agg.responseSumMs += delta;
          agg.responseCount += 1;
        }
      }
    }

    const top6 = (arr) => arr.sort((a, b) => b[1] - a[1]).slice(0, 6);

    return {
      count: agg.count,
      byStatus: Array.from(agg.byStatus.entries()).sort((a, b) => b[1] - a[1]),
      totals: agg.totals,
      byMarket: top6(Array.from(agg.byMarket.entries())),
      bySeller: top6(Array.from(agg.bySeller.entries())),
      last7Purchased: Array.from(agg.last7Purchased.entries()).sort((a, b) => (a[0] < b[0] ? -1 : 1)),
      purchasedCount: agg.purchasedCount,
      avgResponseMs: agg.responseCount ? Math.round(agg.responseSumMs / agg.responseCount) : null,
      responseCount: agg.responseCount,
    };
  }, [data]);

  return (
    <motion.div
      initial={{ scale: 0.98, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.35 }}
      style={{
        borderRadius: 16,
        padding: 16,
        background:
          "radial-gradient(circle at 0% 0%, rgba(99,102,241,0.06), transparent 40%), radial-gradient(circle at 100% 0%, rgba(34,211,238,0.06), transparent 40%), #fff",
        boxShadow: "0 10px 30px rgba(15,23,42,0.06)",
      }}
    >
      <Row justify="space-between" align="middle" style={{ marginBottom: 12 }}>
        <Col>
          <Title level={4} style={{ margin: 0 }}>
            Purchaser Dashboard
          </Title>
          <Text type="secondary">
            {loading ? "Loading…" : `Showing ${count} records${responseCount ? ` · ${responseCount} with response time` : ""}`}
          </Text>

          {isAdmin && scopedPurchaser ? (
            <div style={{ marginTop: 6 }}>
              <Tag color="geekblue" closable onClose={onClearScope} style={{ borderRadius: 6 }}>
                {[
                  scopedPurchaser.firstName,
                  scopedPurchaser.lastName,
                ].filter(Boolean).join(" ") || scopedPurchaser.name || scopedPurchaser.email || "Selected purchaser"}
                {scopedPurchaser.email ? ` · ${scopedPurchaser.email}` : ""}
              </Tag>
            </div>
          ) : null}
        </Col>

        <Col>
          <Space wrap>
            {/* Admin purchaser search/select renders here */}
            {adminScopeSlot}
            <Button icon={<ReloadOutlined />} onClick={onRefresh} disabled={loading}>
              Refresh
            </Button>
          </Space>
        </Col>
      </Row>

      {/* KPIs: Total Orders, Purchased, Average Response Time */}
      <Row gutter={[12, 12]} align="stretch">
        {[
          { title: "Total Orders", value: count },
          { title: "Purchased", value: purchasedCount },
          {
            title: "Average Response Time",
            value: avgResponseMs === null ? "—" : formatDuration(avgResponseMs),
          },
        ].map((kpi, i) => (
          <Col xs={12} md={8} key={i} style={{ display: "flex" }}>
            <Card
              bordered
              style={{ borderRadius: 14, flex: 1 }}
              bodyStyle={{ padding: 16, display: "flex", flexDirection: "column", height: "100%" }}
            >
              {loading ? <Skeleton active paragraph={false} /> : <Statistic title={kpi.title} value={kpi.value} />}
            </Card>
          </Col>
        ))}
      </Row>

      <Divider style={{ margin: "16px 0" }} />

      {/* three breakdown cards */}
      <Row gutter={[12, 12]} align="stretch">
        <Col xs={24} md={8} style={{ display: "flex" }}>
          <Card
            title={<Space>By Status <Text type="secondary">({byStatus.length})</Text></Space>}
            size="small"
            bordered
            style={{ borderRadius: 12, flex: 1 }}
            bodyStyle={{ padding: 12, height: "100%" }}
          >
            <Table
              size="small"
              pagination={false}
              loading={loading}
              rowKey="status"
              dataSource={byStatus.map(([status, cnt]) => ({ status, cnt }))}
              columns={[
                { title: "Status", dataIndex: "status", render: (s) => <Tag color={statusColor(s)} style={{ borderRadius: 6 }}>{s}</Tag> },
                { title: "Count", dataIndex: "cnt", align: "right", width: 90 },
              ]}
              locale={{ emptyText: <Empty description="No data" /> }}
            />
          </Card>
        </Col>

        <Col xs={24} md={8} style={{ display: "flex" }}>
          <Card
            title={<Space>Top Markets <Text type="secondary">({byMarket.length})</Text></Space>}
            size="small"
            bordered
            style={{ borderRadius: 12, flex: 1 }}
            bodyStyle={{ padding: 12, height: "100%" }}
          >
            <Table
              size="small"
              pagination={false}
              loading={loading}
              rowKey="market"
              dataSource={byMarket.map(([market, cnt]) => ({ market: market || "—", cnt }))}
              columns={[
                { title: "Market", dataIndex: "market" },
                { title: "Count", dataIndex: "cnt", align: "right", width: 90 },
              ]}
              locale={{ emptyText: <Empty description="No data" /> }}
            />
          </Card>
        </Col>

        <Col xs={24} md={8} style={{ display: "flex" }}>
          <Card
            title={<Space>Top Sellers <Text type="secondary">({bySeller.length})</Text></Space>}
            size="small"
            bordered
            style={{ borderRadius: 12, flex: 1 }}
            bodyStyle={{ padding: 12, height: "100%" }}
          >
            <Table
              size="small"
              pagination={false}
              loading={loading}
              rowKey="seller"
              dataSource={bySeller.map(([seller, cnt]) => ({ seller: seller || "—", cnt }))}
              columns={[
                { title: "Seller", dataIndex: "seller" },
                { title: "Count", dataIndex: "cnt", align: "right", width: 90 },
              ]}
              locale={{ emptyText: <Empty description="No data" /> }}
            />
          </Card>
        </Col>
      </Row>

      <Divider style={{ margin: "16px 0" }} />

      <PurchasedTop5Table
        data={data}
        loading={loading}
        title="Latest 5 Purchased Orders"
        currency="USD"
        requirePurchased={false}
      />

      <style>{`
        .ant-card-head-title { font-weight: 600; }
        .ant-statistic-title { color: #64748b; }
      `}</style>
    </motion.div>
  );
}
