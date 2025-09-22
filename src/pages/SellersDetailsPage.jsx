import React, { useEffect, useMemo, useState } from "react";
import {

  Card,
  Row,
  Col,
  Typography,
  Descriptions,
  Tag,
  Space,
  Button,
  Divider,
  Table,
  Tooltip,
  Skeleton,
  Popconfirm,
  Statistic,
} from "antd";
import { useParams, useNavigate } from "react-router-dom";
import {
  MailOutlined,
  PhoneOutlined,
  GlobalOutlined,
  CheckCircleTwoTone,
  StopTwoTone,
  EditOutlined,
  ReloadOutlined,
  VerifiedOutlined,
} from "@ant-design/icons";
import apiClient from "../api/client";
import Swal from "sweetalert2";

const { Title, Text, Link } = Typography;

/* ------------------- styling ------------------- */
const gradientStyle = {
  background: "linear-gradient(to right, #f8fbff, #e0f2fe)",
  borderRadius: "12px",
  padding: "1rem",
  marginBottom: "1rem",
  boxShadow: "0 4px 20px rgba(0, 0, 0, 0.06)",
};

const baseToast = {
  toast: true,
  position: "top-end",
  showConfirmButton: false,
  timer: 3500,
  timerProgressBar: true,
  customClass: { popup: "rounded-lg" },
};
const toastSuccess = (title = "Success!", text = "") =>
  Swal.fire({ ...baseToast, icon: "success", title, text, background: "#10b981", color: "#fff" });
const toastError = (title = "Something went wrong", text = "") =>
  Swal.fire({ ...baseToast, icon: "error", title, text, background: "#ef4444", color: "#fff" });

/* ------------------- helpers ------------------- */
const ensureHttp = (v) => {
  if (!v) return v;
  const s = String(v).trim();
  if (/^https?:\/\//i.test(s)) return s;
  return `https://${s}`;
};
const formatAddress = (a = {}) =>
  [a.line1, a.line2, a.city, a.state, a.postalCode, a.country].filter(Boolean).join(", ");

const prettyDate = (d) => (d ? new Date(d).toLocaleString() : "—");

const currency = (n) =>
  typeof n === "number" ? n.toLocaleString(undefined, { style: "currency", currency: "USD" }) : "—";

/* ------------------- page ------------------- */
export default function SellerDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [seller, setSeller] = useState(null);
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try {
      setLoading(true);
      const { data } = await apiClient.get(`/api/v1/sellers/${id}`);
      setSeller(data);
    } catch (e) {
      toastError("Failed to load seller", e?.response?.data?.message || e?.message || "");
    } finally {
      setLoading(false);
    }
  };

  const loadOrders = async () => {
    try {
      setLoadingOrders(true);
      const { data } = await apiClient.get(`/api/v1/sourcing`, { params: { seller: id } });
      setOrders(Array.isArray(data) ? data : data?.docs || []);
    } catch (e) {
      toastError("Failed to load seller orders", e?.response?.data?.message || e?.message || "");
    } finally {
      setLoadingOrders(false);
    }
  };

  useEffect(() => {
    if (!id) return;
    load();
    loadOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const tags = useMemo(() => (seller?.tags || []).slice(0, 12), [seller]);
  const market = seller?.market;

  const handlePatch = async (patch) => {
    try {
      setSaving(true);
      const { data } = await apiClient.patch(`/api/v1/sellers/${id}`, patch);
      setSeller(data);
      toastSuccess("Updated", "Seller updated successfully.");
    } catch (e) {
      toastError("Update failed", e?.response?.data?.message || e?.message || "");
    } finally {
      setSaving(false);
    }
  };

  const columns = [
    {
      title: "Sourcing #",
      dataIndex: "sourcing_id",
      width: 120,
      render: (v, rec) => (
        <Button type="link" onClick={() => navigate(`/sourcing/${rec._id}`)}>
          #{v || "—"}
        </Button>
      ),
    },
    { title: "Status", dataIndex: "status", width: 160 },
    {
      title: "Actual",
      dataIndex: "total_actual_cost",
      width: 120,
      render: (v) => currency(v),
    },
    {
      title: "Target",
      dataIndex: "target_total_cost",
      width: 120,
      render: (v) => currency(v),
    },
    { title: "Created", dataIndex: "createdAt", render: (v) => prettyDate(v) },
  ];

  return (
    <div style={{ padding: 20 }}>
      <Space direction="vertical" size="large" style={{ display: "flex" }}>
        {/* Header */}
        <Card style={gradientStyle}>
          {loading ? (
            <Skeleton active />
          ) : !seller ? (
            <Text type="danger">Seller not found.</Text>
          ) : (
            <>
              <Row align="middle" justify="space-between" gutter={[12, 12]}>
                <Col>
                  <Space align="baseline">
                    <Title level={3} style={{ margin: 0 }}>
                      {seller.name}
                    </Title>
                    <Tag color="blue">{market}</Tag>
                    {seller.verified ? (
                      <Tag icon={<CheckCircleTwoTone twoToneColor="#52c41a" />} color="success">
                        Verified
                      </Tag>
                    ) : (
                      <Tag icon={<VerifiedOutlined />} color="default">
                        Unverified
                      </Tag>
                    )}
                    {seller.blocked && (
                      <Tag icon={<StopTwoTone twoToneColor="#ff4d4f" />} color="error">
                        Blocked
                      </Tag>
                    )}
                  </Space>
                  <div style={{ marginTop: 4 }}>
                    <Text type="secondary">Created: {prettyDate(seller.createdAt)}</Text>
                    <Text type="secondary" style={{ marginLeft: 16 }}>
                      Updated: {prettyDate(seller.updatedAt)}
                    </Text>
                  </div>
                </Col>
                <Col>
                  <Space wrap>
                    <Button icon={<ReloadOutlined />} onClick={() => { load(); loadOrders(); }}>
                      Refresh
                    </Button>
                    <Button
                      icon={<EditOutlined />}
                      onClick={() => navigate(`/sellers/${id}/edit`)}
                    >
                      Edit
                    </Button>
                    <Button
                      type={seller.verified ? "default" : "primary"}
                      loading={saving}
                      onClick={() => handlePatch({ verified: !seller.verified })}
                    >
                      {seller.verified ? "Unverify" : "Verify"}
                    </Button>
                    <Popconfirm
                      title={seller.blocked ? "Unblock this seller?" : "Block this seller?"}
                      okText={seller.blocked ? "Unblock" : "Block"}
                      onConfirm={() => handlePatch({ blocked: !seller.blocked })}
                    >
                      <Button danger loading={saving}>
                        {seller.blocked ? "Unblock" : "Block"}
                      </Button>
                    </Popconfirm>
                  </Space>
                </Col>
              </Row>
            </>
          )}
        </Card>

        {/* Contact & Address */}
        <Row gutter={[16, 16]}>
          <Col xs={24} md={12}>
            <Card title="Contact" style={gradientStyle}>
              {loading ? (
                <Skeleton active />
              ) : (
                <Descriptions column={1} size="small" labelStyle={{ width: 140 }}>
                  <Descriptions.Item label="Email">
                    {seller?.contact?.email ? (
                      <Space>
                        <Link href={`mailto:${seller.contact.email}`} target="_blank">
                          <MailOutlined /> {seller.contact.email}
                        </Link>
                        {seller.contact.emailLower && (
                          <Tag>{seller.contact.emailLower}</Tag>
                        )}
                      </Space>
                    ) : (
                      "—"
                    )}
                  </Descriptions.Item>

                  <Descriptions.Item label="Phone">
                    {seller?.contact?.phone ? (
                      <Space>
                        <Link href={`tel:${seller.contact.phone}`}>
                          <PhoneOutlined /> {seller.contact.phone}
                        </Link>
                        {seller.contact.phoneE164 && <Tag>{seller.contact.phoneE164}</Tag>}
                      </Space>
                    ) : (
                      "—"
                    )}
                  </Descriptions.Item>

                  <Descriptions.Item label="WhatsApp">
                    {seller?.contact?.whatsapp ? (
                      <Link
                        href={`https://wa.me/${seller.contact.whatsapp.replace(/[^\d]/g, "")}`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {seller.contact.whatsapp}
                      </Link>
                    ) : (
                      "—"
                    )}
                  </Descriptions.Item>

                  <Descriptions.Item label="Website">
                    {seller?.contact?.website ? (
                      <Link href={ensureHttp(seller.contact.website)} target="_blank">
                        <GlobalOutlined /> {seller.contact.website}
                      </Link>
                    ) : (
                      "—"
                    )}
                  </Descriptions.Item>

                  <Descriptions.Item label="Preferred Contact">
                    {seller?.preferredContact || "—"}
                  </Descriptions.Item>

                  <Descriptions.Item label="Last Seen">
                    {prettyDate(seller?.lastSeenAt)}
                  </Descriptions.Item>
                </Descriptions>
              )}
            </Card>
          </Col>

          <Col xs={24} md={12}>
            <Card title="Address" style={gradientStyle}>
              {loading ? (
                <Skeleton active />
              ) : (
                <Descriptions column={1} size="small" labelStyle={{ width: 140 }}>
                  <Descriptions.Item label="Address">
                    {seller?.address ? formatAddress(seller.address) : "—"}
                  </Descriptions.Item>
                </Descriptions>
              )}
              <Divider style={{ margin: "12px 0" }} />
              <Row gutter={12}>
                <Col span={12}>
                  <Statistic title="Rating" value={seller?.rating ?? 0} precision={1} />
                </Col>
                <Col span={12}>
                  <Statistic title="Verified" value={seller?.verified ? "Yes" : "No"} />
                </Col>
              </Row>
            </Card>
          </Col>
        </Row>

        {/* Handles & Tags & Notes */}
        <Row gutter={[16, 16]}>
          <Col xs={24} md={12}>
            <Card title="Marketplace Handles" style={gradientStyle}>
              {loading ? (
                <Skeleton active />
              ) : (
                <Descriptions column={1} size="small" labelStyle={{ width: 140 }}>
                  <Descriptions.Item label="eBay">
                    {seller?.handles?.ebay || "—"}
                  </Descriptions.Item>
                  <Descriptions.Item label="Mercari">
                    {seller?.handles?.mercari || "—"}
                  </Descriptions.Item>
                  <Descriptions.Item label="Facebook">
                    {seller?.handles?.facebook || "—"}
                  </Descriptions.Item>
                  <Descriptions.Item label="Other">
                    {seller?.handles?.other || "—"}
                  </Descriptions.Item>
                </Descriptions>
              )}
            </Card>
          </Col>
          <Col xs={24} md={12}>
            <Card title="Tags & Notes" style={gradientStyle}>
              {loading ? (
                <Skeleton active />
              ) : (
                <>
                  <Space wrap>
                    {tags.length ? tags.map((t) => <Tag key={t}>{t}</Tag>) : <Text>—</Text>}
                  </Space>
                  <Divider />
                  <Text type="secondary" style={{ whiteSpace: "pre-wrap" }}>
                    {seller?.notes || "—"}
                  </Text>
                </>
              )}
            </Card>
          </Col>
        </Row>

        {/* Orders for this seller */}
        <Card title="Sourcing Orders" style={gradientStyle} extra={<Text type="secondary">{orders?.length || 0} total</Text>}>
          {loadingOrders ? (
            <Skeleton active />
          ) : (
            <Table
              rowKey={(r) => r._id}
              columns={columns}
              dataSource={orders}
              size="small"
              pagination={{ pageSize: 10 }}
            />
          )}
        </Card>
      </Space>
    </div>
  );
}
