// StatPanels.jsx
import React from "react";
import { Row, Col, Table, Tag, Empty } from "antd";
import { PieChart, Store, ShoppingBag } from "lucide-react";

/* Tailwind-only, colored lucide icons, compact white cards with top/bottom accents */
function MinimalStatPanel({ icon: Icon, title, count, children }) {
  return (
    <div
      className="
        relative w-full overflow-hidden rounded-lg
        bg-white ring-1 ring-slate-200
        transition-all duration-150 hover:shadow-sm hover:scale-[1.01] bg-gradient-to-b from-white via-white to-slate-50
      "
      style={{ fontSize: "13px" }}
    >
      {/* tone accent bars (top & bottom) */}
      <div className="absolute inset-x-0 top-0 h-0.5 bg-sky-300/90" />
      <div className="absolute inset-x-0 bottom-0 h-[0.5px] bg-sky-300/90" />

      <div className="p-2.5">
        <div className="mb-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {/* colored lucide icon only (no tinted background) */}
            {Icon ? <Icon className="h-4 w-4 text-sky-600" /> : null}
            <span className="text-[13px] font-semibold text-slate-800">
              {title}
            </span>
          </div>

          <span className="inline-flex items-center rounded-md bg-sky-50 ring-1 ring-sky-200 px-2 py-[1px] text-[10px] font-medium text-sky-700">
            {count}
          </span>
        </div>

        <div className="table-minimal text-[12px]">{children}</div>
      </div>
    </div>
  );
}

export default function StatPanels({
  loading,
  byStatus,
  byMarket,
  bySellerTop5,
  bySellerAllCount,
  statusColor,
}) {
  return (
    <>
      <Row gutter={[10, 10]} align="stretch" className="mt-3">
        {/* By Status */}
        <Col xs={24} md={8} className="flex">
          <MinimalStatPanel
            icon={PieChart}
            title="By Status"
            count={byStatus.length}
          >
            <Table
              size="small"
              pagination={false}
              loading={loading}
              rowKey="status"
              dataSource={byStatus.map(([status, cnt]) => ({ status, cnt }))}
              columns={[
                {
                  title: "Status",
                  dataIndex: "status",
                  render: (s) => (
                    <Tag color={statusColor(s)} style={{ borderRadius: 6 }}>
                      {s}
                    </Tag>
                  ),
                },
                { title: "Count", dataIndex: "cnt", align: "right", width: 80 },
              ]}
              locale={{ emptyText: <Empty description="No data" /> }}
              className="bg-transparent table-minimal"
            />
          </MinimalStatPanel>
        </Col>

        {/* Top Markets */}
        <Col xs={24} md={8} className="flex">
          <MinimalStatPanel
            icon={Store}
            title="Top Markets"
            count={byMarket.length}
          >
            <Table
              size="small"
              pagination={false}
              loading={loading}
              rowKey="market"
              dataSource={byMarket.map(([market, cnt]) => ({
                market: market || "—",
                cnt,
              }))}
              columns={[
                { title: "Market", dataIndex: "market" },
                { title: "Count", dataIndex: "cnt", align: "right", width: 80 },
              ]}
              locale={{ emptyText: <Empty description="No data" /> }}
              className="bg-transparent table-minimal"
            />
          </MinimalStatPanel>
        </Col>

        {/* Top Sellers */}
        <Col xs={24} md={8} className="flex">
          <MinimalStatPanel
            icon={ShoppingBag}
            title="Top Sellers"
            count={bySellerAllCount}
          >
            <Table
              size="small"
              pagination={false}
              loading={loading}
              rowKey="seller"
              dataSource={bySellerTop5.map(([seller, cnt]) => ({
                seller: seller || "—",
                cnt,
              }))}
              columns={[
                { title: "Seller", dataIndex: "seller" },
                { title: "Count", dataIndex: "cnt", align: "right", width: 80 },
              ]}
              locale={{ emptyText: <Empty description="No data" /> }}
              className="bg-transparent table-minimal"
            />
          </MinimalStatPanel>
        </Col>
      </Row>

      {/* AntD table polish (Tailwind-friendly) */}
      <style>{`
        .table-minimal .ant-table {
          background: transparent !important;
        }
        .table-minimal .ant-table-thead > tr > th {
          background: #f8fafc !important; /* neutral header */
          font-weight: 600; font-size: 12px;
          border-bottom: 0 !important;
          padding: 6px 8px !important;
        }
        .table-minimal .ant-table-thead > tr > th::before { display: none !important; }
        .table-minimal .ant-table-tbody > tr > td {
          border-bottom: 0 !important;
          padding: 6px 8px !important;
        }
        .table-minimal .ant-table-tbody > tr:hover > td {
          background: rgba(2,132,199,0.04) !important; /* sky-600 @ 4% */
        }
      `}</style>
    </>
  );
}
