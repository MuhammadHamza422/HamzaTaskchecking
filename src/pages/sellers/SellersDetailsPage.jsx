
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
import apiClient from "../../api/client";
import Swal from "sweetalert2";

const { Title, Text, Link } = Typography;

/* ------------------- styling ------------------- */
// gradientStyle converted to Tailwind classes: bg-gradient-to-r from-blue-50 to-cyan-50 rounded-xl p-4 mb-4 shadow-lg

const baseToast = {
  toast: true,
  position: "top-end",
  showConfirmButton: false,
  timer: 3500,
  timerProgressBar: true,
  customClass: { popup: "rounded-lg" },
};
const toastSuccess = (title = "Success!", text = "") =>
  Swal.fire({
    ...baseToast,
    icon: "success",
    title,
    text,
    background: "#10b981",
    color: "#fff",
  });
const toastError = (title = "Something went wrong", text = "") =>
  Swal.fire({
    ...baseToast,
    icon: "error",
    title,
    text,
    background: "#ef4444",
    color: "#fff",
  });

/* ------------------- helpers ------------------- */
const ensureHttp = (v) => {
  if (!v) return v;
  const s = String(v).trim();
  if (/^https?:\/\//i.test(s)) return s;
  return `https://${s}`;
};
const formatAddress = (a = {}) =>
  [a.line1, a.line2, a.city, a.state, a.postalCode, a.country]
    .filter(Boolean)
    .join(", ");

const prettyDate = (d) => (d ? new Date(d).toLocaleString() : "—");

const currency = (n) =>
  typeof n === "number"
    ? n.toLocaleString(undefined, { style: "currency", currency: "USD" })
    : "—";

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
      toastError(
        "Failed to load seller",
        e?.response?.data?.message || e?.message || ""
      );
    } finally {
      setLoading(false);
    }
  };

  const loadOrders = async () => {
    try {
      setLoadingOrders(true);
      const { data } = await apiClient.get(`/api/v1/sourcing`, {
        params: { seller: id },
      });
      setOrders(Array.isArray(data) ? data : data?.docs || []);
    } catch (e) {
      toastError(
        "Failed to load seller orders",
        e?.response?.data?.message || e?.message || ""
      );
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
      toastError(
        "Update failed",
        e?.response?.data?.message || e?.message || ""
      );
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
    <div>
      <Space direction="vertical" size="large" className="flex flex-col">
        {/* Header */}
        <div className="rounded-xl border border-blue-100 bg-none md:bg-gradient-to-br md:from-blue-50 md:to-indigo-50 shadow-lg p-4 mb-3">
          {loading ? (
            // Simple skeleton approximation
            <div className="animate-pulse space-y-2">
              <div className="h-6 w-40 bg-gray-200 rounded" />
              <div className="h-4 w-56 bg-gray-200 rounded" />
            </div>
          ) : !seller ? (
            <p className="text-red-600">Seller not found.</p>
          ) : (
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              {/* Left: seller info */}
              <div>
                <div className="flex items-baseline gap-3 flex-wrap">
                  <h3 className="text-2xl font-semibold m-0">{seller.name}</h3>

                  {/* Market tag */}
                  <span className="text-sm px-2 py-0.5 rounded-md bg-blue-100 text-blue-700">
                    {market}
                  </span>

                  {/* Verified / Unverified */}
                  {seller.verified ? (
                    <span className="flex items-center gap-1 text-sm px-2 py-0.5 rounded-md bg-green-50 text-green-700">
                      {/* check icon */}
                      <svg
                        className="w-4 h-4"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <path
                          d="M20 6L9 17l-5-5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                      Verified
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-sm px-2 py-0.5 rounded-md bg-gray-100 text-gray-700">
                      {/* verified (outline) icon */}
                      <svg
                        className="w-4 h-4"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <circle
                          cx="12"
                          cy="12"
                          r="9"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        <path
                          d="M9 12l2 2 4-4"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                      Unverified
                    </span>
                  )}

                  {/* Blocked tag */}
                  {seller.blocked && (
                    <span className="flex items-center gap-1 text-sm px-2 py-0.5 rounded-md bg-red-50 text-red-700">
                      {/* stop icon */}
                      <svg
                        className="w-4 h-4"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <path
                          d="M18.364 5.636L5.636 18.364"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        <path
                          d="M5.636 5.636l12.728 12.728"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                      Blocked
                    </span>
                  )}
                </div>

                <div className="mt-1 text-sm text-gray-500">
                  <span>Created: {prettyDate(seller.createdAt)}</span>
                  <span className="ml-4">
                    Updated: {prettyDate(seller.updatedAt)}
                  </span>
                </div>
              </div>

              {/* Right: actions */}
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => {
                    load();
                    loadOrders();
                  }}
                  className="h-9 px-3 rounded-md border border-gray-300 bg-white text-sm hover:bg-gray-50 flex items-center gap-2"
                  aria-label="Refresh"
                >
                  {/* reload icon */}
                  <svg
                    className="w-4 h-4"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path
                      d="M21 12a9 9 0 1 0-3.2 6.2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M21 3v6h-6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  Refresh
                </button>

                <button
                  type="button"
                  onClick={() => navigate(`/sellers/${id}/edit`)}
                  className="h-9 px-3 rounded-md border border-gray-300 bg-white text-sm hover:bg-gray-50 flex items-center gap-2"
                  aria-label="Edit seller"
                >
                  {/* edit icon */}
                  <svg
                    className="w-4 h-4"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path
                      d="M12 20h9"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  Edit
                </button>

                <button
                  type="button"
                  onClick={() => handlePatch({ verified: !seller.verified })}
                  disabled={saving}
                  className={`h-9 px-3 rounded-md text-sm flex items-center gap-2 ${
                    seller.verified
                      ? "border border-gray-300 bg-white text-gray-800 hover:bg-gray-50"
                      : "bg-indigo-600 text-white hover:bg-indigo-700"
                  } ${saving ? "opacity-60 cursor-not-allowed" : ""}`}
                  aria-label={seller.verified ? "Unverify" : "Verify"}
                >
                  {seller.verified ? "Unverify" : "Verify"}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const ok = window.confirm(
                      seller.blocked
                        ? "Unblock this seller?"
                        : "Block this seller?"
                    );
                    if (ok) handlePatch({ blocked: !seller.blocked });
                  }}
                  disabled={saving}
                  className={`h-9 px-3 rounded-md text-sm flex items-center gap-2 ${
                    saving
                      ? "opacity-60 cursor-not-allowed"
                      : "bg-white border border-red-300 text-red-700 hover:bg-red-50"
                  }`}
                  aria-label={
                    seller.blocked ? "Unblock seller" : "Block seller"
                  }
                >
                  {seller.blocked ? "Unblock" : "Block"}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Contact & Address */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-xl p-4 mb-4 shadow-lg">
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-gray-800 m-0">
                Contact
              </h3>
            </div>
            {loading ? (
              <Skeleton active />
            ) : (
              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center">
                  <div className="w-full sm:w-36 text-sm font-medium text-gray-600 mb-1 sm:mb-0">
                    Email
                  </div>
                  <div className="flex-1">
                    {seller?.contact?.email ? (
                      <Space>
                        <Link
                          href={`mailto:${seller.contact.email}`}
                          target="_blank"
                        >
                          <MailOutlined /> {seller.contact.email}
                        </Link>
                        {seller.contact.emailLower && (
                          <Tag>{seller.contact.emailLower}</Tag>
                        )}
                      </Space>
                    ) : (
                      "—"
                    )}
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center">
                  <div className="w-full sm:w-36 text-sm font-medium text-gray-600 mb-1 sm:mb-0">
                    Phone
                  </div>
                  <div className="flex-1">
                    {seller?.contact?.phone ? (
                      <Space>
                        <Link href={`tel:${seller.contact.phone}`}>
                          <PhoneOutlined /> {seller.contact.phone}
                        </Link>
                        {seller.contact.phoneE164 && (
                          <Tag>{seller.contact.phoneE164}</Tag>
                        )}
                      </Space>
                    ) : (
                      "—"
                    )}
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center">
                  <div className="w-full sm:w-36 text-sm font-medium text-gray-600 mb-1 sm:mb-0">
                    WhatsApp
                  </div>
                  <div className="flex-1">
                    {seller?.contact?.whatsapp ? (
                      <Link
                        href={`https://wa.me/${seller.contact.whatsapp.replace(
                          /[^\d]/g,
                          ""
                        )}`}
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

                <div className="flex flex-col sm:flex-row sm:items-center">
                  <div className="w-full sm:w-36 text-sm font-medium text-gray-600 mb-1 sm:mb-0">
                    Website
                  </div>
                  <div className="flex-1">
                    {seller?.contact?.website ? (
                      <Link
                        href={ensureHttp(seller.contact.website)}
                        target="_blank"
                      >
                        <GlobalOutlined /> {seller.contact.website}
                      </Link>
                    ) : (
                      "—"
                    )}
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center">
                  <div className="w-full sm:w-36 text-sm font-medium text-gray-600 mb-1 sm:mb-0">
                    Preferred Contact
                  </div>
                  <div className="flex-1">
                    {seller?.preferredContact || "—"}
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center">
                  <div className="w-full sm:w-36 text-sm font-medium text-gray-600 mb-1 sm:mb-0">
                    Last Seen
                  </div>
                  <div className="flex-1">{prettyDate(seller?.lastSeenAt)}</div>
                </div>
              </div>
            )}
          </div>

          <div className="rounded-xl p-4 mb-4 shadow-lg">
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-gray-800 m-0">
                Address
              </h3>
            </div>
            {loading ? (
              <Skeleton active />
            ) : (
              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center">
                  <div className="w-full sm:w-36 text-sm font-medium text-gray-600 mb-1 sm:mb-0">
                    Address
                  </div>
                  <div className="flex-1">
                    {seller?.address ? formatAddress(seller.address) : "—"}
                  </div>
                </div>
              </div>
            )}
            <Divider className="my-3" />
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center">
                <div className="text-2xl font-semibold text-gray-800">
                  {seller?.rating ?? 0}
                </div>
                <div className="text-sm text-gray-600">Rating</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-semibold text-gray-800">
                  {seller?.verified ? "Yes" : "No"}
                </div>
                <div className="text-sm text-gray-600">Verified</div>
              </div>
            </div>
          </div>
        </div>

        {/* Handles & Tags & Notes */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-xl p-4 mb-4 shadow-lg">
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-gray-800 m-0">
                Marketplace Handles
              </h3>
            </div>
            {loading ? (
              <Skeleton active />
            ) : (
              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center">
                  <div className="w-full sm:w-36 text-sm font-medium text-gray-600 mb-1 sm:mb-0">
                    eBay
                  </div>
                  <div className="flex-1">{seller?.handles?.ebay || "—"}</div>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center">
                  <div className="w-full sm:w-36 text-sm font-medium text-gray-600 mb-1 sm:mb-0">
                    Mercari
                  </div>
                  <div className="flex-1">
                    {seller?.handles?.mercari || "—"}
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center">
                  <div className="w-full sm:w-36 text-sm font-medium text-gray-600 mb-1 sm:mb-0">
                    Facebook
                  </div>
                  <div className="flex-1">
                    {seller?.handles?.facebook || "—"}
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center">
                  <div className="w-full sm:w-36 text-sm font-medium text-gray-600 mb-1 sm:mb-0">
                    Other
                  </div>
                  <div className="flex-1">{seller?.handles?.other || "—"}</div>
                </div>
              </div>
            )}
          </div>
          <div className="rounded-xl p-4 mb-4 shadow-lg">
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-gray-800 m-0">
                Tags & Notes
              </h3>
            </div>
            {loading ? (
              <Skeleton active />
            ) : (
              <div className="space-y-4">
                <div>
                  <Space wrap>
                    {tags.length ? (
                      tags.map((t) => <Tag key={t}>{t}</Tag>)
                    ) : (
                      <Text>—</Text>
                    )}
                  </Space>
                </div>
                <Divider />
                <div>
                  <Text type="secondary" className="whitespace-pre-wrap">
                    {seller?.notes || "—"}
                  </Text>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Orders for this seller */}
        <div className="rounded-xl p-4 mb-4 shadow-lg">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-800 m-0">
              Sourcing Orders
            </h3>
            <Text type="secondary">{orders?.length || 0} total</Text>
          </div>
          {loadingOrders ? (
            <Skeleton active />
          ) : (
            <Table
              rowKey={(r) => r._id}
              columns={columns}
              dataSource={orders}
              size="small"
              pagination={{ pageSize: 10 }}
              className="overflow-x-auto"
            />
          )}
        </div>
      </Space>
    </div>
  );
}
