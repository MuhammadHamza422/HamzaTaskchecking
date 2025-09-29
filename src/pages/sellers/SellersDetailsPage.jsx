

// src/pages/sellers/SellerDetailsPage.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Card,
  Typography,
  Tag,
  Space,
  Button,
  Divider,
  Table,
  Skeleton,
  Tooltip,
  Badge,
  Modal,
  Form,
  Input,
  Select,
  Switch,
  InputNumber,
} from "antd";
import { useParams, useNavigate } from "react-router-dom";
import {
  MailOutlined,
  PhoneOutlined,
  GlobalOutlined,
  ReloadOutlined,
  EditOutlined,
  CheckCircleTwoTone,
  StopTwoTone,
} from "@ant-design/icons";
import apiClient from "../../api/client";
import Swal from "sweetalert2";
import { getSourcingColumns } from "../sourcer/utils/sourcingColumns";

const { Text, Link } = Typography;
const { Option } = Select;

/* toasts */
const baseToast = {
  toast: true,
  position: "top-end",
  showConfirmButton: false,
  timer: 3000,
  timerProgressBar: true,
  customClass: { popup: "rounded-lg" },
};
const toastSuccess = (title = "Success!", text = "") =>
  Swal.fire({ ...baseToast, icon: "success", title, text, background: "#10b981", color: "#fff" });
const toastError = (title = "Something went wrong", text = "") =>
  Swal.fire({ ...baseToast, icon: "error", title, text, background: "#ef4444", color: "#fff" });

/* helpers */
const ensureHttp = (v) => {
  if (!v) return v;
  const s = String(v).trim();
  if (/^https?:\/\//i.test(s)) return s;
  return `https://${s}`;
};
const formatAddress = (a = {}) =>
  [a.line1, a.line2, a.city, a.state, a.postalCode, a.country].filter(Boolean).join(", ");
const prettyDate = (d) => (d ? new Date(d).toLocaleString() : "—");
const pickRows = (body) =>
  Array.isArray(body) ? body : body?.docs || body?.data || body?.results || body?.items || body?.orders || [];

/* page */
export default function SellerDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [seller, setSeller] = useState(null);
  const [loadingSeller, setLoadingSeller] = useState(true);
  const [saving, setSaving] = useState(false);

  // edit modal
  const [editOpen, setEditOpen] = useState(false);
  const [form] = Form.useForm();

  // orders
  const [orders, setOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [totalOrders, setTotalOrders] = useState(0);

  const didInit = useRef(false);

  const marketLabel = useMemo(() => {
    if (seller?.marketName) return seller.marketName;
    if (seller?.market?.name) return seller.market.name;
    if (seller?.marketSlug) return seller.marketSlug;
    return "—";
  }, [seller]);

  const loadSeller = async () => {
    try {
      setLoadingSeller(true);
      const { data } = await apiClient.get(`/api/v1/sellers/${id}`);
      setSeller(data);
    } catch (e) {
      toastError("Failed to load seller", e?.response?.data?.message || e?.message || "");
    } finally {
      setLoadingSeller(false);
    }
  };

  const loadOrders = async (p = page, ps = limit) => {
    try {
      setLoadingOrders(true);
      const { data } = await apiClient.get(`/api/v1/sourcing/by-seller/${id}`, {
        params: { page: p, limit: ps, sort: "-createdAt" },
      });
      const rows = pickRows(data);
      setOrders(rows);
      setTotalOrders(Number(data?.total ?? rows.length ?? 0));
      setPage(p);
      setLimit(ps);
    } catch (e) {
      toastError("Failed to load seller orders", e?.response?.data?.message || e?.message || "");
    } finally {
      setLoadingOrders(false);
    }
  };

  useEffect(() => {
    if (!id) return;
    if (import.meta.env?.DEV) {
      if (didInit.current) return;
      didInit.current = true;
    }
    loadSeller();
    loadOrders(1, limit);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

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

  /* --- sourcing columns (all), rows clickable to edit page --- */
  const sourcingColumns = useMemo(
    () =>
      getSourcingColumns({
        statusPill: true,
        canEdit: false,
        navigate,
        handleDeleteOrder: () => {},
      }),
    [navigate]
  );

  /* --- edit modal helpers --- */
  const openEdit = () => {
    if (!seller) return;
    form.setFieldsValue({
      name: seller.name,
      verified: !!seller.verified,
      blocked: !!seller.blocked,
      preferredContact: seller.preferredContact || "none",
      rating: seller.rating ?? 0,
      email: seller?.contact?.email || "",
      phone: seller?.contact?.phone || "",
      whatsapp: seller?.contact?.whatsapp || "",
      website: seller?.contact?.website || "",
      line1: seller?.address?.line1 || "",
      line2: seller?.address?.line2 || "",
      city: seller?.address?.city || "",
      state: seller?.address?.state || "",
      postalCode: seller?.address?.postalCode || "",
      country: seller?.address?.country || "",
      ebay: seller?.handles?.ebay || "",
      mercari: seller?.handles?.mercari || "",
      facebook: seller?.handles?.facebook || "",
      other: seller?.handles?.other || "",
    });
    setEditOpen(true);
  };

  const submitEdit = async () => {
    try {
      const values = await form.validateFields();
      const patch = {
        name: values.name?.trim(),
        verified: !!values.verified,
        blocked: !!values.blocked,
        preferredContact: values.preferredContact || "none",
        rating: Number(values.rating ?? 0),
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
        handles: {
          ebay: values.ebay || undefined,
          mercari: values.mercari || undefined,
          facebook: values.facebook || undefined,
          other: values.other || undefined,
        },
      };
      await handlePatch(patch);
      setEditOpen(false);
    } catch (e) {
      // validation errors already shown by antd
    }
  };

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="rounded-2xl border border-blue-100 bg-gradient-to-br from-[#f7fbff] to-[#eef4ff] shadow-lg px-5 py-5 mb-5">
        {loadingSeller ? (
          <Skeleton active paragraph={{ rows: 2 }} />
        ) : !seller ? (
          <Text type="danger">Seller not found.</Text>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
              <div className="flex items-start gap-3">
                <Badge color={seller?.blocked ? "red" : seller?.verified ? "green" : "blue"} dot offset={[0, 12]}>
                  <div className="h-12 w-12 rounded-xl bg-white border border-gray-200 shadow-sm flex items-center justify-center text-lg font-bold text-gray-700">
                    {seller.name?.[0]?.toUpperCase() || "S"}
                  </div>
                </Badge>

                <div>
                  <h1 className="text-2xl md:text-3xl font-semibold m-0">{seller.name}</h1>

                  <div className="flex flex-wrap items-center gap-2 text-[13px] mt-1">
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-700">
                      {marketLabel}
                    </span>

                    {seller.verified ? (
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700">
                        Verified
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-700">
                        Unverified
                      </span>
                    )}

                    {seller.blocked && (
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700">
                        Blocked
                      </span>
                    )}

                    <span className="text-gray-500">
                      Created: {prettyDate(seller.createdAt)} · Updated: {prettyDate(seller.updatedAt)}
                    </span>
                  </div>
                </div>
              </div>

              <Space wrap>
                <Tooltip title="Refresh">
                  <Button
                    icon={<ReloadOutlined />}
                    onClick={() => {
                      loadSeller();
                      loadOrders(page, limit);
                    }}
                  >
                    Refresh
                  </Button>
                </Tooltip>

                <Button icon={<EditOutlined />} onClick={openEdit}>
                  Edit
                </Button>

                <Button
                  type={seller?.verified ? "default" : "primary"}
                  onClick={() => handlePatch({ verified: !seller?.verified })}
                  disabled={saving}
                >
                  {seller?.verified ? "Unverify" : "Verify"}
                </Button>

                <Button
                  danger
                  ghost
                  onClick={() => {
                    const ok = window.confirm(seller?.blocked ? "Unblock this seller?" : "Block this seller?");
                    if (ok) handlePatch({ blocked: !seller?.blocked });
                  }}
                  disabled={saving}
                >
                  {seller?.blocked ? "Unblock" : "Block"}
                </Button>
              </Space>
            </div>

            {/* Quick stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="rounded-xl border border-[#eef2ff] bg-white shadow-sm p-4">
                <div className="text-xs text-gray-500 mb-1">Total Orders</div>
                <div className="text-xl font-semibold">{totalOrders}</div>
              </div>
              <div className="rounded-xl border border-[#eef2ff] bg-white shadow-sm p-4">
                <div className="text-xs text-gray-500 mb-1">Verified</div>
                <div className="text-xl font-semibold">
                  {seller?.verified ? (
                    <span className="inline-flex items-center gap-1 text-green-700">
                      <CheckCircleTwoTone twoToneColor="#52c41a" />
                      Yes
                    </span>
                  ) : (
                    "No"
                  )}
                </div>
              </div>
              <div className="rounded-xl border border-[#eef2ff] bg-white shadow-sm p-4">
                <div className="text-xs text-gray-500 mb-1">Blocked</div>
                <div className="text-xl font-semibold">
                  {seller?.blocked ? (
                    <span className="inline-flex items-center gap-1 text-red-600">
                      <StopTwoTone twoToneColor="#ff4d4f" />
                      Yes
                    </span>
                  ) : (
                    "No"
                  )}
                </div>
              </div>
              <div className="rounded-xl border border-[#eef2ff] bg-white shadow-sm p-4">
                <div className="text-xs text-gray-500 mb-1">Rating</div>
                <div className="text-xl font-semibold">{seller?.rating ?? 0}</div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 3 cards in ONE row: Contact, Address, Marketplace Handles */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card
          title={<span className="font-semibold">Contact</span>}
          className="rounded-xl shadow-sm border border-[#eef2ff]"
          bodyStyle={{ padding: 16 }}
        >
          {loadingSeller ? (
            <Skeleton active />
          ) : (
            <div className="space-y-3 text-[14px]">
              <div className="flex">
                <div className="w-28 text-gray-600">Email</div>
                <div className="flex-1">
                  {seller?.contact?.email ? (
                    <Space>
                      <Link href={`mailto:${seller.contact.email}`} target="_blank">
                        <MailOutlined /> {seller.contact.email}
                      </Link>
                      {seller.contact.emailLower && <Tag>{seller.contact.emailLower}</Tag>}
                    </Space>
                  ) : (
                    "—"
                  )}
                </div>
              </div>

              <div className="flex">
                <div className="w-28 text-gray-600">Phone</div>
                <div className="flex-1">
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
                </div>
              </div>

              <div className="flex">
                <div className="w-28 text-gray-600">WhatsApp</div>
                <div className="flex-1">
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
                </div>
              </div>

              <div className="flex">
                <div className="w-28 text-gray-600">Website</div>
                <div className="flex-1">
                  {seller?.contact?.website ? (
                    <Link href={ensureHttp(seller.contact.website)} target="_blank">
                      <GlobalOutlined /> {seller.contact.website}
                    </Link>
                  ) : (
                    "—"
                  )}
                </div>
              </div>

              <div className="flex">
                <div className="w-28 text-gray-600">Preferred</div>
                <div className="flex-1">{seller?.preferredContact || "—"}</div>
              </div>

              <div className="flex">
                <div className="w-28 text-gray-600">Last Seen</div>
                <div className="flex-1">{prettyDate(seller?.lastSeenAt)}</div>
              </div>
            </div>
          )}
        </Card>

        <Card
          title={<span className="font-semibold">Address</span>}
          className="rounded-xl shadow-sm border border-[#eef2ff]"
          bodyStyle={{ padding: 16 }}
        >
          {loadingSeller ? (
            <Skeleton active />
          ) : (
            <>
              <div className="text-[14px]">{seller?.address ? formatAddress(seller.address) : "—"}</div>
              <Divider className="my-3" />
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-xs text-gray-500">Verified</div>
                  <div className="text-base font-medium mt-1">{seller?.verified ? "Yes" : "No"}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500">Rating</div>
                  <div className="text-base font-medium mt-1">{seller?.rating ?? 0}</div>
                </div>
              </div>
            </>
          )}
        </Card>

        <Card
          title={<span className="font-semibold">Marketplace Handles</span>}
          className="rounded-xl shadow-sm border border-[#eef2ff]"
          bodyStyle={{ padding: 16 }}
        >
          {loadingSeller ? (
            <Skeleton active />
          ) : (
            <div className="space-y-3">
              <div className="flex">
                <div className="w-28 text-gray-600">eBay</div>
                <div className="flex-1">{seller?.handles?.ebay || "—"}</div>
              </div>
              <div className="flex">
                <div className="w-28 text-gray-600">Mercari</div>
                <div className="flex-1">{seller?.handles?.mercari || "—"}</div>
              </div>
              <div className="flex">
                <div className="w-28 text-gray-600">Facebook</div>
                <div className="flex-1">{seller?.handles?.facebook || "—"}</div>
              </div>
              <div className="flex">
                <div className="w-28 text-gray-600">Other</div>
                <div className="flex-1">{seller?.handles?.other || "—"}</div>
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* --- BOTTOM: Sourcing Orders (ALL columns, roomy, clickable) --- */}
      <Card
        title={<span className="font-semibold">Sourcing Orders</span>}
        extra={<span className="text-gray-500">{totalOrders} total</span>}
        className="rounded-xl shadow-sm border border-[#eef2ff] mt-6"
        bodyStyle={{ padding: 0 }}
      >
        <div className="p-3">
          <div className="rounded-xl border border-gray-100 bg-white overflow-hidden">
            <Table
              rowKey={(r) => r._id || r.id}
              columns={sourcingColumns}
              dataSource={orders}
              loading={loadingOrders}
              size="middle"
              pagination={{
                current: page,
                pageSize: limit,
                total: totalOrders,
                showSizeChanger: true,
                onChange: (p, ps) => loadOrders(p, ps),
              }}
              onRow={(record) => ({
                onClick: () => navigate(`/sourcing/edit/${record._id || record.id}`),
                style: { cursor: "pointer" },
              })}
              rowClassName={() => "hover:bg-blue-50 transition-colors"}
              scroll={{ x: 1200 }}
              className="
                [&_.ant-table-thead>tr>th]:bg-[#f9fbff]
                [&_.ant-table-thead>tr>th]:text-gray-600
                [&_.ant-table-thead>tr>th]:font-semibold
                [&_.ant-table-tbody>tr>td]:py-4
              "
            />
          </div>
        </div>
      </Card>

      {/* Edit Seller Modal */}
      <Modal
        title="Edit Seller"
        open={editOpen}
        onCancel={() => setEditOpen(false)}
        onOk={submitEdit}
        okText="Save"
        confirmLoading={saving}
        destroyOnClose
      >
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="Name" rules={[{ required: true, message: "Name is required" }]}>
            <Input placeholder="Seller name" />
          </Form.Item>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Form.Item name="verified" label="Verified" valuePropName="checked">
              <Switch />
            </Form.Item>
            <Form.Item name="blocked" label="Blocked" valuePropName="checked">
              <Switch />
            </Form.Item>
            <Form.Item name="rating" label="Rating">
              <InputNumber min={0} max={5} style={{ width: "100%" }} />
            </Form.Item>
          </div>

          <Form.Item name="preferredContact" label="Preferred Contact">
            <Select placeholder="Select">
              <Option value="none">None</Option>
              <Option value="email">Email</Option>
              <Option value="phone">Phone</Option>
              <Option value="whatsapp">WhatsApp</Option>
              <Option value="website">Website</Option>
            </Select>
          </Form.Item>

          <Divider />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Form.Item name="email" label="Email">
              <Input placeholder="Email" />
            </Form.Item>
            <Form.Item name="phone" label="Phone">
              <Input placeholder="Phone" />
            </Form.Item>
            <Form.Item name="whatsapp" label="WhatsApp">
              <Input placeholder="WhatsApp" />
            </Form.Item>
            <Form.Item name="website" label="Website">
              <Input placeholder="Website" />
            </Form.Item>
          </div>

          <Divider />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Form.Item name="line1" label="Address line 1">
              <Input />
            </Form.Item>
            <Form.Item name="line2" label="Address line 2">
              <Input />
            </Form.Item>
            <Form.Item name="city" label="City">
              <Input />
            </Form.Item>
            <Form.Item name="state" label="State">
              <Input />
            </Form.Item>
            <Form.Item name="postalCode" label="Postal Code">
              <Input />
            </Form.Item>
            <Form.Item name="country" label="Country">
              <Input />
            </Form.Item>
          </div>

          <Divider />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Form.Item name="ebay" label="eBay">
              <Input />
            </Form.Item>
            <Form.Item name="mercari" label="Mercari">
              <Input />
            </Form.Item>
            <Form.Item name="facebook" label="Facebook">
              <Input />
            </Form.Item>
            <Form.Item name="other" label="Other">
              <Input />
            </Form.Item>
          </div>
        </Form>
      </Modal>
    </div>
  );
}
