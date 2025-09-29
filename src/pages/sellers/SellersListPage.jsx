
// src/pages/sellers/SellersListPage.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Card,
  Table,
  Space,
  Button,
  Input,
  Select,
  Typography,
  Tooltip,
  Skeleton,
  Empty,
} from "antd";
import { ReloadOutlined, SearchOutlined, RedoOutlined } from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import apiClient from "../../api/client";
import SleekPagination from "./components/SleekPagination";

const { Text, Title } = Typography;
const { Option } = Select;

const prettyDate = (d) => (d ? new Date(d).toLocaleString() : "—");

// Map Ant Design sorter to your API `sort` param (e.g. "-updatedAt")
function sorterToSortParam(sorter, fallback = "-updatedAt") {
  if (!sorter || !sorter.field || !sorter.order) return fallback;
  const field = String(sorter.field);
  return sorter.order === "ascend" ? field : `-${field}`;
}

// Tailwind pill style (matches your sourcing columns)
const PILL = "px-2 py-1 rounded text-xs font-medium";
const PILL_MARKET = "bg-blue-100 text-blue-800";
const PILL_VER_YES = "bg-emerald-100 text-emerald-800";
const PILL_VER_NO = "bg-gray-100 text-gray-700";
const PILL_BLOCK_YES = "bg-red-100 text-red-800";
const PILL_BLOCK_NO = "bg-gray-100 text-gray-700";

export default function SellersListPage() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);

  // server paging/sorting/filters
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [q, setQ] = useState("");
  const [verified, setVerified] = useState(undefined); // true/false/undefined
  const [blocked, setBlocked] = useState(undefined);   // true/false/undefined
  const [sort, setSort] = useState("-updatedAt");

  // dev double-fetch guard
  const didInit = useRef(false);

  const load = async (opts = {}) => {
    const p  = opts.page ?? page;
    const ps = opts.pageSize ?? pageSize;
    const s  = opts.sort ?? sort;
    const query = {
      page: p,
      limit: ps,
      q: q || "",
      sort: s || "-updatedAt",
    };
    if (verified !== undefined) query.verified = verified;
    if (blocked !== undefined)  query.blocked  = blocked;

    setLoading(true);
    try {
      const { data } = await apiClient.get("/api/v1/sellers/list", { params: query });
      const list = Array.isArray(data?.data) ? data.data : [];
      setRows(list);
      setTotal(Number(data?.total ?? list.length ?? 0));
      setPage(Number(data?.page ?? p));
      setPageSize(Number(data?.limit ?? ps));
      setSort(s);
    } catch (e) {
      console.error("Failed to load sellers:", e?.response?.data || e);
    } finally {
      setLoading(false);
    }
  };

  // initial load
  useEffect(() => {
    if (import.meta.env?.DEV) {
      if (didInit.current) return;
      didInit.current = true;
    }
    load({ page: 1, pageSize, sort: "-updatedAt" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // debounce search & filters
  useEffect(() => {
    const t = setTimeout(() => load({ page: 1 }), 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, verified, blocked]);

  const columns = useMemo(
    () => [
      {
        title: "Name",
        dataIndex: "name",
        key: "name",
        fixed: "left",
        width: 280,
        // Keep neutral (not highlighted). Row click handles navigation.
        render: (v) => <span className="text-gray-900">{v || "—"}</span>,
        sorter: true,
      },
      {
        title: "Market",
        dataIndex: "marketName", // controller returns marketName & marketSlug
        key: "marketName",
        width: 190,
        render: (_, rec) => {
          const label = rec.marketName || rec.market?.name || rec.marketSlug || "—";
          return <span className={`${PILL} ${PILL_MARKET}`}>{label}</span>;
        },
      },
      {
        title: "Verified",
        dataIndex: "verified",
        key: "verified",
        width: 140,
        render: (v) => (
          <span className={`${PILL} ${v ? PILL_VER_YES : PILL_VER_NO}`}>{v ? "Yes" : "No"}</span>
        ),
        sorter: true,
      },
      {
        title: "Blocked",
        dataIndex: "blocked",
        key: "blocked",
        width: 140,
        render: (v) => (
          <span className={`${PILL} ${v ? PILL_BLOCK_YES : PILL_BLOCK_NO}`}>{v ? "Yes" : "No"}</span>
        ),
        sorter: true,
      },
      {
        title: "Updated",
        dataIndex: "updatedAt",
        key: "updatedAt",
        width: 220,
        render: (v) => <span className="text-gray-700">{prettyDate(v)}</span>,
        sorter: true,
      },
      {
        title: "Created",
        dataIndex: "createdAt",
        key: "createdAt",
        width: 220,
        render: (v) => <span className="text-gray-700">{prettyDate(v)}</span>,
        sorter: true,
      },
    ],
    []
  );

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="rounded-2xl border border-blue-100 bg-gradient-to-br from-[#f7fbff] to-[#eef4ff] shadow-lg px-5 py-5 mb-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
          <div>
            <Title level={3} className="!mb-1">
              Sellers
            </Title>
            <Text type="secondary">Browse and manage seller profiles</Text>
          </div>
          <Space wrap>
            <Tooltip title="Refresh">
              <Button icon={<ReloadOutlined />} onClick={() => load()} />
            </Tooltip>
          </Space>
        </div>

        {/* Filters */}
        <div className="mt-4 grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="md:col-span-3">
            <div className="text-xs text-gray-600 mb-1">Search</div>
            <Input
              allowClear
              size="large"
              placeholder="Search by name, email, handle, phone, tags…"
              prefix={<SearchOutlined />}
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>

          <div className="md:col-span-1">
            <div className="text-xs text-gray-600 mb-1">Verified</div>
            <Select
              allowClear
              size="large"
              className="w-full"
              value={verified}
              onChange={(v) => setVerified(v)}
              placeholder="Any"
            >
              <Option value={true}>Yes</Option>
              <Option value={false}>No</Option>
            </Select>
          </div>

          <div className="md:col-span-1">
            <div className="text-xs text-gray-600 mb-1">Blocked</div>
            <Select
              allowClear
              size="large"
              className="w-full"
              value={blocked}
              onChange={(v) => setBlocked(v)}
              placeholder="Any"
            >
              <Option value={true}>Yes</Option>
              <Option value={false}>No</Option>
            </Select>
          </div>
        </div>

        <div className="mt-3">
          <Button
            size="small"
            icon={<RedoOutlined />}
            onClick={() => {
              setQ("");
              setVerified(undefined);
              setBlocked(undefined);
              // debounced effect will reload
            }}
            className="bg-white hover:bg-gray-50 border-gray-300"
          >
            Reset Filters
          </Button>
        </div>
      </div>

      {/* Table Card */}
      <Card className="rounded-2xl shadow-sm border border-[#eef2ff]" bodyStyle={{ padding: 0 }}>
        <div className="p-3">
          {loading && rows.length === 0 ? (
            <Skeleton active paragraph={{ rows: 8 }} />
          ) : rows.length === 0 ? (
            <div className="py-16">
              <Empty description="No sellers found" />
            </div>
          ) : (
            <>
              <div className="rounded-xl border border-gray-100 bg-white overflow-hidden">
                <Table
                  rowKey={(r) => r._id || r.id}
                  columns={columns}
                  dataSource={rows}
                  loading={loading}
                  size="large" // slightly roomier by default
                  pagination={false} // custom pagination below
                  // Make rows clickable + pointer + hover color
                  onRow={(record) => ({
                    onClick: () => navigate(`/sourcing/sellers/${record._id || record.id}`),
                    style: { cursor: "pointer" },
                  })}
                  rowClassName={() =>
                    "transition-colors hover:bg-[#f8fbff]"
                  }
                  // Increase cell padding using Tailwind arbitrary selectors
                  className={[
                    "[&_.ant-table-thead>tr>th]:bg-[#f9fbff]",
                    "[&_.ant-table-thead>tr>th]:text-gray-600",
                    "[&_.ant-table-thead>tr>th]:font-semibold",
                    "[&_.ant-table-tbody>tr>td]:py-4", // ↑ vertical padding
                    "[&_.ant-table-tbody>tr>td]:px-5", // ↑ horizontal padding
                    "[&_.ant-table-cell]:align-middle",
                  ].join(" ")}
                  scroll={{ x: 1000 }}
                  onChange={(_, __, sorter) => {
                    const s = sorterToSortParam(Array.isArray(sorter) ? sorter[0] : sorter, "-updatedAt");
                    setSort(s);
                    load({ sort: s, page: 1 });
                  }}
                />
              </div>

              {/* Sleek Pagination */}
              <SleekPagination
                page={page}
                setPage={(p) => load({ page: p, pageSize })}
                limit={pageSize}
                setLimit={(ps) => load({ page: 1, pageSize: ps })}
                total={total}
              />
            </>
          )}
        </div>
      </Card>
    </div>
  );
}
