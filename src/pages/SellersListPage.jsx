// import React, { useEffect, useMemo, useState } from "react";
// import {
//   Card,
//   Table,
//   Typography,
//   Space,
//   Input,
//   Select,
//   Button,
//   Tag,
//   Row,
//   Col,
//   Tooltip,
// } from "antd";
// import { useNavigate } from "react-router-dom";
// import {
//   ReloadOutlined,
//   SearchOutlined,
//   CheckCircleTwoTone,
//   StopTwoTone,
//   PlusOutlined,
// } from "@ant-design/icons";
// import apiClient from "../api/client";

// const { Title, Text } = Typography;
// const { Option } = Select;

// const gradientStyle = {
//   background: "linear-gradient(to right, #f8fbff, #e0f2fe)",
//   borderRadius: "12px",
//   padding: "1rem",
//   marginBottom: "1rem",
//   boxShadow: "0 4px 20px rgba(0, 0, 0, 0.06)",
// };

// const MARKET_OPTIONS = ["eBay", "Mercari", "Facebook"];

// export default function SellersListPage() {
//   const navigate = useNavigate();

//   // table/state
//   const [loading, setLoading] = useState(false);
//   const [rows, setRows] = useState([]);
//   const [total, setTotal] = useState(0);

//   // filters
//   const [q, setQ] = useState("");
//   const [market, setMarket] = useState(undefined);
//   const [verified, setVerified] = useState(undefined); // true/false/undefined
//   const [blocked, setBlocked] = useState(undefined);

//   // table params
//   const [page, setPage] = useState(1);
//   const [pageSize, setPageSize] = useState(10);
//   const [sorter, setSorter] = useState({ field: "updatedAt", order: "descend" });

//   const queryParams = useMemo(() => {
//     const params = {
//       page,
//       limit: pageSize,
//       q,
//       market,
//       verified,
//       blocked,
//     };
//     // remove undefined
//     Object.keys(params).forEach((k) => params[k] === undefined && delete params[k]);
//     // sort
//     if (sorter?.field) {
//       params.sort = `${sorter.order === "ascend" ? "" : "-"}${sorter.field}`;
//     }
//     return params;
//   }, [page, pageSize, q, market, verified, blocked, sorter]);

//   const load = async () => {
//     setLoading(true);
//     try {
//       // This assumes your backend supports pagination on GET /api/v1/sellers
//       // Return shape can be:
//       //  - { docs, totalDocs } (mongoose-paginate)
//       //  - { data, total }     (custom)
//       //  - or a plain array (fallback)
//       const { data } = await apiClient.get("/api/v1/sellers/list", { params: queryParams });

//       if (Array.isArray(data)) {
//         setRows(data);
//         setTotal(data.length);
//       } else if (data?.docs) {
//         setRows(data.docs);
//         setTotal(data.totalDocs ?? data.total ?? data.docs.length);
//       } else if (data?.data) {
//         setRows(data.data);
//         setTotal(data.total ?? data.data.length ?? 0);
//       } else {
//         setRows([]);
//         setTotal(0);
//       }
//     } catch (e) {
//       // fail silently to keep the page usable
//       setRows([]);
//       setTotal(0);
//     } finally {
//       setLoading(false);
//     }
//   };

//   useEffect(() => {
//     load();
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [queryParams]);

//   const columns = [
//     {
//       title: "Name",
//       dataIndex: "name",
//       sorter: true,
//       render: (text, rec) => (
//         <Button type="link" onClick={() => navigate(`/sellers/${rec._id}`)}>
//           {text || "—"}
//         </Button>
//       ),
//     },
//     {
//       title: "Market",
//       dataIndex: "market",
//       width: 120,
//       sorter: true,
//       render: (v) => (v ? <Tag color="blue">{v}</Tag> : "—"),
//     },
//     {
//       title: "Email",
//       dataIndex: ["contact", "email"],
//       width: 220,
//       ellipsis: true,
//       render: (v) => v || "—",
//     },
//     {
//       title: "Phone",
//       dataIndex: ["contact", "phone"],
//       width: 160,
//       render: (v, rec) => v || rec?.contact?.phoneE164 || "—",
//     },
//     {
//       title: "City",
//       dataIndex: ["address", "city"],
//       width: 140,
//       render: (v) => v || "—",
//     },
//     {
//       title: "Country",
//       dataIndex: ["address", "country"],
//       width: 140,
//       render: (v) => v || "—",
//     },
//     {
//       title: "Tags",
//       dataIndex: "tags",
//       render: (tags) =>
//         Array.isArray(tags) && tags.length ? (
//           <Space wrap>
//             {tags.slice(0, 3).map((t) => (
//               <Tag key={t}>{t}</Tag>
//             ))}
//             {tags.length > 3 && <Tag>+{tags.length - 3}</Tag>}
//           </Space>
//         ) : (
//           "—"
//         ),
//     },
//     {
//       title: "Flags",
//       dataIndex: "flags",
//       width: 160,
//       render: (_, rec) => (
//         <Space>
//           {rec.verified ? (
//             <Tooltip title="Verified">
//               <CheckCircleTwoTone twoToneColor="#52c41a" />
//             </Tooltip>
//           ) : (
//             <Tooltip title="Unverified">
//               <CheckCircleTwoTone twoToneColor="#d9d9d9" />
//             </Tooltip>
//           )}
//           {rec.blocked ? (
//             <Tooltip title="Blocked">
//               <StopTwoTone twoToneColor="#ff4d4f" />
//             </Tooltip>
//           ) : null}
//         </Space>
//       ),
//     },
//     {
//       title: "Updated",
//       dataIndex: "updatedAt",
//       width: 200,
//       sorter: true,
//       render: (v) => (v ? new Date(v).toLocaleString() : "—"),
//       defaultSortOrder: "descend",
//     },
//   ];

//   return (
//     <div style={{ padding: 20 }}>
//       <Card style={gradientStyle}>
//         <Row align="middle" justify="space-between" gutter={[12, 12]}>
//           <Col>
//             <Title level={3} style={{ margin: 0 }}>
//               Sellers
//             </Title>
//             <Text type="secondary">Click a seller to view details</Text>
//           </Col>
//           <Col>
//             <Space>
//               <Button icon={<ReloadOutlined />} onClick={load}>
//                 Refresh
//               </Button>
//               {/* Optional: if you later add a create form */}
//               <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate("/sellers/new")}>
//                 New Seller
//               </Button>
//             </Space>
//           </Col>
//         </Row>
//       </Card>

//       <Card style={gradientStyle}>
//         {/* Filters */}
//         <Space wrap style={{ marginBottom: 12 }}>
//           <Input
//             allowClear
//             prefix={<SearchOutlined />}
//             placeholder="Search name / email / phone"
//             value={q}
//             onChange={(e) => {
//               setPage(1);
//               setQ(e.target.value);
//             }}
//             style={{ width: 280 }}
//           />
//           <Select
//             allowClear
//             placeholder="Market"
//             style={{ width: 160 }}
//             value={market}
//             onChange={(v) => {
//               setPage(1);
//               setMarket(v);
//             }}
//           >
//             {MARKET_OPTIONS.map((m) => (
//               <Option key={m} value={m}>
//                 {m}
//               </Option>
//             ))}
//           </Select>
//           <Select
//             allowClear
//             placeholder="Verified"
//             style={{ width: 140 }}
//             value={verified}
//             onChange={(v) => {
//               setPage(1);
//               setVerified(v);
//             }}
//             options={[
//               { label: "Verified", value: true },
//               { label: "Unverified", value: false },
//             ]}
//           />
//           <Select
//             allowClear
//             placeholder="Blocked"
//             style={{ width: 140 }}
//             value={blocked}
//             onChange={(v) => {
//               setPage(1);
//               setBlocked(v);
//             }}
//             options={[
//               { label: "Blocked", value: true },
//               { label: "Not Blocked", value: false },
//             ]}
//           />
//         </Space>

//         {/* Table */}
//         <Table
//           rowKey={(r) => r._id}
//           columns={columns}
//           dataSource={rows}
//           loading={loading}
//           size="middle"
//           pagination={{
//             current: page,
//             pageSize,
//             total,
//             showSizeChanger: true,
//             onChange: (p, ps) => {
//               setPage(p);
//               setPageSize(ps);
//             },
//           }}
//           onChange={(pagination, _filters, sorterInfo) => {
//             // sorterInfo: { columnKey, order, field }
//             if (sorterInfo?.field) {
//               setSorter({ field: sorterInfo.field, order: sorterInfo.order });
//             } else {
//               setSorter({ field: "updatedAt", order: "descend" });
//             }
//           }}
//           onRow={(record) => ({
//             onClick: () => navigate(`/sellers/${record._id}`),
//             style: { cursor: "pointer" },
//           })}
//         />
//       </Card>
//     </div>
//   );
// }



import React, { useEffect, useMemo, useState } from "react";
import {
  Card,
  Table,
  Typography,
  Space,
  Input,
  Select,
  Button,
  Tag,
  Row,
  Col,
  Tooltip,
  Avatar,
  Divider,
  Drawer,
  Form,
  message,
  InputNumber,
  Empty,
} from "antd";
import { useNavigate } from "react-router-dom";
import {
  ReloadOutlined,
  SearchOutlined,
  CheckCircleTwoTone,
  StopTwoTone,
  PlusOutlined,
  GlobalOutlined,
  PhoneOutlined,
  MailOutlined,
  UserOutlined,
} from "@ant-design/icons";
import apiClient from "../api/client";

const { Title, Text } = Typography;
const { Option } = Select;

const gradientStyle = {
  background: "linear-gradient(to right, #f8fbff, #e0f2fe)",
  borderRadius: "16px",
  padding: "1rem",
  marginBottom: "1rem",
  boxShadow: "0 6px 24px rgba(0, 0, 0, 0.08)",
};

const MARKET_OPTIONS = ["eBay", "Mercari", "Facebook"];

/* helpers */
const initials = (name = "") =>
  name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase())
    .join("");

const fmtDate = (v) => (v ? new Date(v).toLocaleString() : "—");

export default function SellersListPage() {
  const navigate = useNavigate();

  // table/state
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);

  // filters
  const [q, setQ] = useState("");
  const [market, setMarket] = useState(undefined);
  const [verified, setVerified] = useState(undefined); // true/false/undefined
  const [blocked, setBlocked] = useState(undefined);

  // table params
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [sorter, setSorter] = useState({ field: "updatedAt", order: "descend" });

  // drawer (create)
  const [openDrawer, setOpenDrawer] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm();

  const queryParams = useMemo(() => {
    const params = {
      page,
      limit: pageSize,
      q,
      market,
      verified,
      blocked,
    };
    Object.keys(params).forEach((k) => params[k] === undefined && delete params[k]);
    if (sorter?.field) {
      params.sort = `${sorter.order === "ascend" ? "" : "-"}${sorter.field}`;
    }
    return params;
  }, [page, pageSize, q, market, verified, blocked, sorter]);

  const load = async () => {
    setLoading(true);
    try {
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

  /* quick stats (based on current dataset page; still useful) */
  const pageStats = useMemo(() => {
    const ver = rows.filter((r) => r.verified).length;
    const blk = rows.filter((r) => r.blocked).length;
    return { ver, blk, count: rows.length };
  }, [rows]);

  /* ---------- columns ---------- */
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
            <Button type="link" onClick={() => navigate(`/sellers/${rec._id}`)} style={{ padding: 0 }}>
              {text || "—"}
            </Button>
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
          {rec.verified ? (
            <Tooltip title="Verified">
              <CheckCircleTwoTone twoToneColor="#52c41a" />
            </Tooltip>
          ) : (
            <Tooltip title="Unverified">
              <CheckCircleTwoTone twoToneColor="#d9d9d9" />
            </Tooltip>
          )}
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
      render: (v) => fmtDate(v),
      defaultSortOrder: "descend",
    },
  ];

  /* ---------- Drawer: Add Seller ---------- */
  const onOpenDrawer = () => {
    form.resetFields();
    setOpenDrawer(true);
  };
  const onCloseDrawer = () => setOpenDrawer(false);

  const onCreateSeller = async () => {
    try {
      const values = await form.validateFields();

      // Normalize tags (comma/space)
      const tags =
        typeof values.tags === "string"
          ? values.tags
              .split(/[, ]+/)
              .map((t) => t.trim())
              .filter(Boolean)
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
      if (e?.errorFields) return; // form errors
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
              <Title level={3} style={{ margin: 0 }}>
                Sellers
              </Title>
              <Text type="secondary">Browse, filter, and add marketplace sellers</Text>
            </Space>
          </Col>
          <Col>
            <Space size="small" wrap>
              <Button icon={<ReloadOutlined />} onClick={load}>
                Refresh
              </Button>
              <Button type="primary" icon={<PlusOutlined />} onClick={onOpenDrawer}>
                Add Seller
              </Button>
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
                <Title level={4} style={{ margin: 0 }}>{pageStats.count}</Title>
              </Space>
            </Card>
          </Col>
          <Col xs={24} sm={8}>
            <Card size="small" style={{ borderRadius: 12 }}>
              <Space direction="vertical" size={0}>
                <Text type="secondary">Verified</Text>
                <Title level={4} style={{ margin: 0 }}>{pageStats.ver}</Title>
              </Space>
            </Card>
          </Col>
          <Col xs={24} sm={8}>
            <Card size="small" style={{ borderRadius: 12 }}>
              <Space direction="vertical" size={0}>
                <Text type="secondary">Blocked</Text>
                <Title level={4} style={{ margin: 0 }}>{pageStats.blk}</Title>
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
                onChange={(e) => {
                  setPage(1);
                  setQ(e.target.value);
                }}
                style={{ width: 320 }}
              />
              <Select
                allowClear
                placeholder="Market"
                style={{ width: 160 }}
                value={market}
                onChange={(v) => {
                  setPage(1);
                  setMarket(v);
                }}
              >
                {MARKET_OPTIONS.map((m) => (
                  <Option key={m} value={m}>
                    {m}
                  </Option>
                ))}
              </Select>
              <Select
                allowClear
                placeholder="Verified"
                style={{ width: 140 }}
                value={verified}
                onChange={(v) => {
                  setPage(1);
                  setVerified(v);
                }}
                options={[
                  { label: "Verified", value: true },
                  { label: "Unverified", value: false },
                ]}
              />
              <Select
                allowClear
                placeholder="Blocked"
                style={{ width: 140 }}
                value={blocked}
                onChange={(v) => {
                  setPage(1);
                  setBlocked(v);
                }}
                options={[
                  { label: "Blocked", value: true },
                  { label: "Not Blocked", value: false },
                ]}
              />
            </Space>
          </Col>
          <Col>
            <Space>
              <Button onClick={() => { setQ(""); setMarket(undefined); setVerified(undefined); setBlocked(undefined); setPage(1); }}>
                Clear
              </Button>
              <Button type="primary" icon={<PlusOutlined />} onClick={onOpenDrawer}>
                New
              </Button>
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
            onChange: (p, ps) => {
              setPage(p);
              setPageSize(ps);
            },
          }}
          onChange={(pagination, _filters, sorterInfo) => {
            if (sorterInfo?.field) {
              setSorter({ field: sorterInfo.field, order: sorterInfo.order });
            } else {
              setSorter({ field: "updatedAt", order: "descend" });
            }
          }}
          onRow={(record) => ({
            onClick: () => navigate(`/sellers/${record._id}`),
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
            <Button type="primary" loading={saving} onClick={onCreateSeller}>
              Save
            </Button>
          </Space>
        }
      >
        <Form layout="vertical" form={form} initialValues={{ market: "eBay" }}>
          <Row gutter={12}>
            <Col span={16}>
              <Form.Item
                name="name"
                label="Seller Name"
                rules={[{ required: true, message: "Please enter a seller name" }]}
              >
                <Input placeholder="e.g., RetroStar LLC" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="market"
                label="Market"
                rules={[{ required: true, message: "Please select a market" }]}
              >
                <Select>
                  {MARKET_OPTIONS.map((m) => (
                    <Option key={m} value={m}>
                      {m}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Divider />

          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="email" label="Email">
                <Input prefix={<MailOutlined />} placeholder="hello@example.com" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="phone" label="Phone">
                <Input prefix={<PhoneOutlined />} placeholder="+1 415 555 0199" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="whatsapp" label="WhatsApp">
                <Input placeholder="+14155550199" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="website" label="Website">
                <Input prefix={<GlobalOutlined />} placeholder="https://seller.example" />
              </Form.Item>
            </Col>
          </Row>

          <Divider />

          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="line1" label="Address Line 1">
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="line2" label="Address Line 2">
                <Input />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="city" label="City">
                <Input />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="state" label="State/Region">
                <Input />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="postalCode" label="Postal Code">
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="country" label="Country">
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="rating" label="Rating (0-5)">
                <InputNumber min={0} max={5} step={0.1} style={{ width: "100%" }} />
              </Form.Item>
            </Col>
          </Row>

          <Divider />

          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="handle_ebay" label="eBay Handle">
                <Input placeholder="@seller_ebay" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="handle_mercari" label="Mercari Handle">
                <Input placeholder="@seller_mercari" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="handle_facebook" label="Facebook Handle">
                <Input placeholder="@seller_facebook" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="handle_other" label="Other Handle">
                <Input placeholder="@seller_other" />
              </Form.Item>
            </Col>
          </Row>

          <Divider />

          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="preferredContact" label="Preferred Contact">
                <Select
                  options={[
                    { label: "None", value: "none" },
                    { label: "Email", value: "email" },
                    { label: "Phone", value: "phone" },
                    { label: "WhatsApp", value: "whatsapp" },
                    { label: "Website", value: "website" },
                  ]}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="tags" label="Tags (comma or space separated)">
                <Input placeholder="trusted fast-shipper west-coast" />
              </Form.Item>
            </Col>
            <Col span={24}>
              <Form.Item name="notes" label="Notes">
                <Input.TextArea rows={4} placeholder="Any useful notes..." />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Drawer>
    </div>
  );
}
