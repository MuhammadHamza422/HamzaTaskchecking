
import React, { useEffect, useMemo, useState } from "react";
import {
  Card, Table, Typography, Space, Input, Select, Button, Tag,
  Row, Col, Tooltip, Avatar, Divider, Drawer, Form, message,
  InputNumber, Empty
} from "antd";
import { Link, useNavigate } from "react-router-dom";
import {
  ReloadOutlined, SearchOutlined, CheckCircleTwoTone, StopTwoTone,
  PlusOutlined, GlobalOutlined, PhoneOutlined, MailOutlined, UserOutlined,
} from "@ant-design/icons";
import apiClient from "../../api/client";

const { Title, Text } = Typography;
const { Option } = Select;

const BASE = "/sourcing/sellers"; // <<< unify paths here

const gradientStyle = {
  background: "linear-gradient(to right, #f8fbff, #e0f2fe)",
  borderRadius: "16px",
  padding: "1rem",
  marginBottom: "1rem",
  boxShadow: "0 6px 24px rgba(0, 0, 0, 0.08)",
};

const MARKET_OPTIONS = ["eBay", "Mercari", "Facebook"];

const initials = (name = "") =>
  name.split(" ").filter(Boolean).slice(0, 2).map((s) => s[0]?.toUpperCase()).join("");

const fmtDate = (v) => (v ? new Date(v).toLocaleString() : "—");

export default function SellersListPage() {
  const navigate = useNavigate();

  // table/state
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);

  // filters
  const [q, setQ] = useState("");
  const [market, setMarket] = useState();
  const [verified, setVerified] = useState();
  const [blocked, setBlocked] = useState();

  // table params
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [sorter, setSorter] = useState({ field: "updatedAt", order: "descend" });

  // drawer (create)
  const [openDrawer, setOpenDrawer] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm();

  const queryParams = useMemo(() => {
    const params = { page, limit: pageSize, q, market, verified, blocked };
    Object.keys(params).forEach((k) => params[k] === undefined && delete params[k]);
    if (sorter?.field) params.sort = `${sorter.order === "ascend" ? "" : "-"}${sorter.field}`;
    return params;
  }, [page, pageSize, q, market, verified, blocked, sorter]);

  const load = async () => {
    setLoading(true);
    try {
      // If your backend uses GET /api/v1/sellers (no /list), change this path accordingly
      const { data } = await apiClient.get("/api/v1/sellers/list", { params: queryParams });
      if (Array.isArray(data)) {
        setRows(data);
        setTotal(data.length);
      } else if (data?.docs) {
        setRows(data.docs);
        setTotal(data.totalDocs ?? data.total ?? data.docs.length);
      } else if (data?.data) {
        setRows(data.data);
        setTotal(data.total ?? data.data.length ?? 0);
      } else {
        setRows([]);
        setTotal(0);
      }
    } catch (e) {
      setRows([]);
      setTotal(0);
      message.error(e?.response?.data?.message || "Failed to load sellers");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryParams]);

  const pageStats = useMemo(() => {
    const ver = rows.filter((r) => r.verified).length;
    const blk = rows.filter((r) => r.blocked).length;
    return { ver, blk, count: rows.length };
  }, [rows]);

  const columns = [
    {
      title: "Seller",
      dataIndex: "name",
      sorter: true,
      render: (text, rec) => (
        <Space>
          <Avatar style={{ background: "#1677ff20", color: "#1677ff" }} icon={!text && <UserOutlined />}>
            {text ? initials(text) : null}
          </Avatar>
          <div>
            {/* stop row click when clicking link to avoid double navigation */}
            <Link
              to={`${BASE}/${rec._id}`}
              onClick={(e) => e.stopPropagation()}
              style={{ padding: 0 }}
            >
              {text || "—"}
            </Link>
            <div style={{ lineHeight: 1.2 }}>
              <Text type="secondary" style={{ fontSize: 12 }}>
                {rec?.handles?.ebay || rec?.handles?.mercari || rec?.handles?.facebook || "—"}
              </Text>
            </div>
          </div>
        </Space>
      ),
    },
    {
      title: "Market",
      dataIndex: "market",
      width: 120,
      sorter: true,
      render: (v) => (v ? <Tag color="geekblue">{v}</Tag> : "—"),
    },
    {
      title: "Contact",
      dataIndex: "contact",
      width: 280,
      render: (_, rec) => (
        <Space direction="vertical" size={2}>
          <Text type="secondary" style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <MailOutlined /> {rec?.contact?.email || "—"}
          </Text>
          <Text type="secondary" style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <PhoneOutlined /> {rec?.contact?.phone || rec?.contact?.phoneE164 || "—"}
          </Text>
          {rec?.contact?.website ? (
            <Text type="secondary" style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <GlobalOutlined /> {rec?.contact?.website}
            </Text>
          ) : null}
        </Space>
      ),
    },
    {
      title: "Location",
      dataIndex: "address",
      width: 220,
      render: (addr) =>
        addr ? (
          <span>
            {addr.city || "—"}
            {addr.state ? `, ${addr.state}` : ""}
            {addr.country ? ` • ${addr.country}` : ""}
          </span>
        ) : (
          "—"
        ),
    },
    {
      title: "Tags",
      dataIndex: "tags",
      render: (tags) =>
        Array.isArray(tags) && tags.length ? (
          <Space wrap>
            {tags.slice(0, 3).map((t) => (
              <Tag key={t}>{t}</Tag>
            ))}
            {tags.length > 3 && <Tag>+{tags.length - 3}</Tag>}
          </Space>
        ) : (
          "—"
        ),
    },
    {
      title: "Flags",
      dataIndex: "flags",
      width: 160,
      render: (_, rec) => (
        <Space>
          <Tooltip title={rec.verified ? "Verified" : "Unverified"}>
            <CheckCircleTwoTone twoToneColor={rec.verified ? "#52c41a" : "#d9d9d9"} />
          </Tooltip>
          {rec.blocked ? (
            <Tooltip title="Blocked">
              <StopTwoTone twoToneColor="#ff4d4f" />
            </Tooltip>
          ) : null}
        </Space>
      ),
    },
    {
      title: "Updated",
      dataIndex: "updatedAt",
      width: 200,
      sorter: true,
      render: fmtDate,
      defaultSortOrder: "descend",
    },
  ];

  const onOpenDrawer = () => {
    form.resetFields();
    setOpenDrawer(true);
  };
  const onCloseDrawer = () => setOpenDrawer(false);

  const onCreateSeller = async () => {
    try {
      const values = await form.validateFields();
      const tags =
        typeof values.tags === "string"
          ? values.tags.split(/[, ]+/).map((t) => t.trim()).filter(Boolean)
          : [];

      const payload = {
        name: values.name,
        market: values.market,
        contact: {
          email: values.email || undefined,
          phone: values.phone || undefined,
          whatsapp: values.whatsapp || undefined,
          website: values.website || undefined,
        },
        address: {
          line1: values.line1 || undefined,
          line2: values.line2 || undefined,
          city: values.city || undefined,
          state: values.state || undefined,
          postalCode: values.postalCode || undefined,
          country: values.country || undefined,
        },
        tags,
        handles: {
          ebay: values.handle_ebay || undefined,
          mercari: values.handle_mercari || undefined,
          facebook: values.handle_facebook || undefined,
          other: values.handle_other || undefined,
        },
        preferredContact: values.preferredContact || "none",
        rating: values.rating ?? undefined,
        notes: values.notes || undefined,
      };

      setSaving(true);
      await apiClient.post("/api/v1/sellers/find-or-create", payload);
      message.success("Seller saved");
      setOpenDrawer(false);
      load();
    } catch (e) {
      if (e?.errorFields) return;
      message.error(e?.response?.data?.message || "Failed to save seller");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ padding: 20 }}>
      {/* Header */}
      <Card style={gradientStyle}>
        <Row align="middle" justify="space-between" gutter={[12, 12]}>
          <Col flex="auto">
            <Space direction="vertical" size={2}>
              <Title level={3} style={{ margin: 0 }}>Sellers</Title>
              <Text type="secondary">Browse, filter, and add marketplace sellers</Text>
            </Space>
          </Col>
          <Col>
            <Space size="small" wrap>
              <Button icon={<ReloadOutlined />} onClick={load}>Refresh</Button>
              <Button type="primary" icon={<PlusOutlined />} onClick={onOpenDrawer}>Add Seller</Button>
            </Space>
          </Col>
        </Row>

        <Divider style={{ margin: "12px 0" }} />

        {/* Quick stats */}
        <Row gutter={[12, 12]}>
          <Col xs={24} sm={8}>
            <Card size="small" style={{ borderRadius: 12 }}>
              <Space direction="vertical" size={0}>
                <Text type="secondary">On this page</Text>
                <Title level={4} style={{ margin: 0 }}>{rows.length}</Title>
              </Space>
            </Card>
          </Col>
          <Col xs={24} sm={8}>
            <Card size="small" style={{ borderRadius: 12 }}>
              <Space direction="vertical" size={0}>
                <Text type="secondary">Verified</Text>
                <Title level={4} style={{ margin: 0 }}>{rows.filter(r => r.verified).length}</Title>
              </Space>
            </Card>
          </Col>
          <Col xs={24} sm={8}>
            <Card size="small" style={{ borderRadius: 12 }}>
              <Space direction="vertical" size={0}>
                <Text type="secondary">Blocked</Text>
                <Title level={4} style={{ margin: 0 }}>{rows.filter(r => r.blocked).length}</Title>
              </Space>
            </Card>
          </Col>
        </Row>
      </Card>

      {/* Filters + Table */}
      <Card style={gradientStyle}>
        <Row gutter={[12, 12]} align="middle" justify="space-between" style={{ marginBottom: 8 }}>
          <Col flex="auto">
            <Space wrap>
              <Input
                allowClear
                prefix={<SearchOutlined />}
                placeholder="Search name / email / phone / handle / city / country"
                value={q}
                onChange={(e) => { setPage(1); setQ(e.target.value); }}
                style={{ width: 320 }}
              />
              <Select
                allowClear placeholder="Market" style={{ width: 160 }}
                value={market} onChange={(v) => { setPage(1); setMarket(v); }}
              >
                {MARKET_OPTIONS.map((m) => <Option key={m} value={m}>{m}</Option>)}
              </Select>
              <Select
                allowClear placeholder="Verified" style={{ width: 140 }}
                value={verified} onChange={(v) => { setPage(1); setVerified(v); }}
                options={[{ label: "Verified", value: true }, { label: "Unverified", value: false }]}
              />
              <Select
                allowClear placeholder="Blocked" style={{ width: 140 }}
                value={blocked} onChange={(v) => { setPage(1); setBlocked(v); }}
                options={[{ label: "Blocked", value: true }, { label: "Not Blocked", value: false }]}
              />
            </Space>
          </Col>
          <Col>
            <Space>
              <Button onClick={() => { setQ(""); setMarket(undefined); setVerified(undefined); setBlocked(undefined); setPage(1); }}>
                Clear
              </Button>
              <Button type="primary" icon={<PlusOutlined />} onClick={onOpenDrawer}>New</Button>
            </Space>
          </Col>
        </Row>

        <Table
          rowKey={(r) => r._id}
          columns={columns}
          dataSource={rows}
          loading={loading}
          size="middle"
          pagination={{
            current: page,
            pageSize,
            total,
            showSizeChanger: true,
            onChange: (p, ps) => { setPage(p); setPageSize(ps); },
          }}
          onChange={(_p, _f, sorterInfo) => {
            if (sorterInfo?.field) setSorter({ field: sorterInfo.field, order: sorterInfo.order });
            else setSorter({ field: "updatedAt", order: "descend" });
          }}
          onRow={(record) => ({
            onClick: () => navigate(`${BASE}/${record._id}`),
            style: { cursor: "pointer" },
          })}
          locale={{
            emptyText: (
              <Empty description="No sellers found. Try adjusting your filters or add a new seller." />
            ),
          }}
        />
      </Card>

      {/* Drawer: Add Seller */}
      <Drawer
        title="Add Seller"
        open={openDrawer}
        onClose={onCloseDrawer}
        width={720}
        extra={
          <Space>
            <Button onClick={onCloseDrawer}>Cancel</Button>
            <Button type="primary" loading={saving} onClick={onCreateSeller}>Save</Button>
          </Space>
        }
      >
        <Form layout="vertical" form={form} initialValues={{ market: "eBay" }}>
          {/* form fields same as your version */}
          {/* ... */}
          <Row gutter={12}>
            <Col span={16}>
              <Form.Item name="name" label="Seller Name" rules={[{ required: true, message: "Please enter a seller name" }]}>
                <Input placeholder="e.g., RetroStar LLC" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="market" label="Market" rules={[{ required: true, message: "Please select a market" }]}>
                <Select>{MARKET_OPTIONS.map((m) => <Option key={m} value={m}>{m}</Option>)}</Select>
              </Form.Item>
            </Col>
          </Row>
          {/* (rest unchanged) */}
          {/* … keep your contact, address, handles, meta fields … */}
        </Form>
      </Drawer>
    </div>
  );
}
