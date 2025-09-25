
import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Card,
  Form,
  Input,
  Select,
  Button,
  Checkbox,
  Typography,
  Table,
  Spin,
  Space,
  InputNumber,
  Row,
  Col,
} from "antd";
import Swal from "sweetalert2";
import apiClient from "../api/client";
import SourcingLogsTimeline from "./SourcingLogsTimeline";

const { Title } = Typography;
const { Option } = Select;

/* ---------- Toast helpers ---------- */
const toast = Swal.mixin({
  toast: true,
  position: "top-end",
  showConfirmButton: false,
  timer: 3000,
  timerProgressBar: true,
  customClass: { popup: "rounded-lg" },
});
const toastWarn = (title, text, background = "#f59e0b") =>
  toast.fire({ icon: "warning", title, text, background, color: "#fff" });
const toastErr = (title, text, background = "#ef4444") =>
  toast.fire({ icon: "error", title, text, background, color: "#fff" });
const toastOk = (title, text, background = "#10b981") =>
  toast.fire({ icon: "success", title, text, background, color: "#fff" });
const toastInfo = (title, text, background = "#3b82f6") =>
  toast.fire({ icon: "info", title, text, background, color: "#fff" });

/* ---------- helpers ---------- */
const deslug = (slug) => {
  if (!slug) return "";
  try {
    const s = decodeURIComponent(slug);
    return s.replace(/[-+]/g, " ").trim();
  } catch {
    return String(slug).replace(/[-+]/g, " ").trim();
  }
};
const currency = (n) => (typeof n === "number" ? n.toFixed(2) : "0.00");

/** normalize market value for the <Select> (prefer slug, else _id, else string) */
const valueForMarket = (m) => {
  if (!m) return undefined;
  if (typeof m === "string") return m;
  if (typeof m === "object") return m.slug || m._id || undefined;
  return undefined;
};

/** Ensure URL has protocol (defaults to https) */
const ensureHttp = (v = "") => {
  const s = String(v).trim();
  if (!s) return "";
  return /^https?:\/\//i.test(s) ? s : `https://${s}`;
};

/** Optional: require a dot in hostname (stricter, closer to many backends) */
const isLikelyFqdn = (hostname = "") => /^[^.\/\s][^\s]*\.[^\s]+$/.test(hostname);

/** Normalize server payload into what the form expects */
const normalizeRequest = (raw = {}) => {
  const seller_name =
    raw.seller?.name ??
    raw.seller_name ??
    (typeof raw.seller === "string" ? raw.seller : "") ??
    "";

  const market = raw.seller?.market ?? raw.market ?? "";

  const sellers_price = raw.sellers_price ?? raw.seller_price ?? 0;
  const shipping_price = raw.shipping_price ?? raw.shipping_charges ?? 0;
  const tax = raw.tax ?? raw.taxes ?? 0;

  const id = raw._id ?? raw.id ?? "";
  const createdAt = raw.created_at ?? raw.createdAt ?? raw.created_on ?? undefined;

  const items = (Array.isArray(raw.items) ? raw.items : []).map((it, idx) => ({
    _id: it._id ?? it.id ?? `${id}-item-${idx}`,
    product_name: it.product_name ?? it.name ?? "Unnamed",
    sku: it.sku ?? "",
    quantity_needed: it.quantity_needed ?? 1,
    product_condition: it.product_condition ?? null,
    tested: !!it.tested,
  }));

  return {
    _id: id,
    id,
    seller_name,
    market,
    listing_link: raw.listing_link ?? raw.listingLink ?? raw.url ?? "",
    sellers_price,
    shipping_price,
    tax,
    status: raw.status ?? "Pending",

    market_order_num: raw.market_order_num ?? "",
    purchase_link: raw.purchase_link ?? "",
    destination_warehouse: raw.destination_warehouse ?? "",
    tracking_status: raw.tracking_status ?? "",
    carrier: raw.carrier ?? "",
    tracking_id: raw.tracking_id ?? "",
    tracking_link: raw.tracking_link ?? "",
    odoo_po_id: raw.odoo_po_id ?? "",
    po_reference: raw.po_reference ?? "",

    purchase_without_tracking: !!raw.purchase_without_tracking,
    purchase_with_tracking: !!raw.purchase_with_tracking,
    is_purchase_order_created: !!raw.is_purchase_order_created,

    createdAt,
    items,
  };
};

export default function RequestDetailPage() {
  const { seller, sourcingId, id } = useParams();
  const navigate = useNavigate();

  const [request, setRequest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [form] = Form.useForm();

  // Markets
  const [markets, setMarkets] = useState([]);
  const [loadingMarkets, setLoadingMarkets] = useState(false);

  // watch fields
  const watchedSellers = Form.useWatch("sellers_price", form);
  const watchedShipping = Form.useWatch("shipping_price", form);
  const watchedTax = Form.useWatch("tax", form);
  const watchedStatus = Form.useWatch("status", form);
  const isPurchased = String(watchedStatus || "").trim() === "Purchased";

  const sellers_price = Number(watchedSellers ?? request?.sellers_price ?? 0);
  const shipping_price = Number(watchedShipping ?? request?.shipping_price ?? 0);
  const tax = Number(watchedTax ?? request?.tax ?? 0);
  const total = sellers_price + shipping_price + tax;

  // auto-refresh key for logs
  const [logsTick, setLogsTick] = useState(0);

  // API helpers
  const fetchBySeller = (sellerName) =>
    apiClient.get(`/api/v1/sourcing/by-seller/${encodeURIComponent(sellerName)}`);
  const fetchById = (docId) => apiClient.get(`/api/v1/sourcing/${docId}`);

  // load markets (for Select)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoadingMarkets(true);
        const { data } = await apiClient.get("/api/v1/markets", { params: { q: "" } });
        if (!cancelled) setMarkets(Array.isArray(data) ? data : []);
      } catch {
        if (!cancelled) setMarkets([]);
      } finally {
        if (!cancelled) setLoadingMarkets(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const fetchRequest = useCallback(async () => {
    const sellerParam = seller || null;
    const idParam = sourcingId || id || null;

    if (!sellerParam && !idParam) {
      setRequest(null);
      setLoading(false);
      toastWarn("Missing parameter", "No seller or id was provided in the route.");
      return;
    }

    setLoading(true);
    try {
      let res;
      if (idParam && /^[0-9a-fA-F]{24}$/.test(String(idParam))) {
        res = await fetchById(String(idParam));
      } else if (sellerParam) {
        const sellerName = deslug(sellerParam);
        try {
          res = await fetchBySeller(sellerName);
        } catch {
          res = await apiClient.get("/api/v1/sourcing", { params: { seller: sellerName } });
        }
      } else {
        res = await fetchById(String(idParam));
      }

      const raw = Array.isArray(res.data) ? res.data[0] : res.data;
      if (!raw) {
        toastWarn("Not found", "No sourcing request matched your link.");
        throw new Error("Not found");
      }

      const normalized = normalizeRequest(raw);
      setRequest(normalized);

      // Keep InputNumber UX but store as number; we will cast to string on submit.
      const parsedMarketOrder =
        normalized.market_order_num !== "" && normalized.market_order_num != null
          ? Number(normalized.market_order_num)
          : undefined;

      form.setFieldsValue({
        seller_name: normalized.seller_name,
        market: valueForMarket(normalized.market),
        listing_link: normalized.listing_link,
        sellers_price: normalized.sellers_price,
        shipping_price: normalized.shipping_price,
        tax: normalized.tax,
        status: normalized.status,
        market_order_num: Number.isFinite(parsedMarketOrder) ? parsedMarketOrder : undefined,
        purchase_link: normalized.purchase_link,
        destination_warehouse: normalized.destination_warehouse,
        tracking_status: normalized.tracking_status,
        carrier: normalized.carrier,
        tracking_id: normalized.tracking_id,
        tracking_link: normalized.tracking_link,
        odoo_po_id: normalized.odoo_po_id,
        po_reference: normalized.po_reference,
        purchase_without_tracking: normalized.purchase_without_tracking,
        purchase_with_tracking: normalized.purchase_with_tracking,
        is_purchase_order_created: normalized.is_purchase_order_created,
      });
    } catch (err) {
      console.error(err);
      const serverMsg =
        err?.response?.data?.message || err.message || "Failed to fetch request details.";
      toastErr("Load failed", serverMsg);
      setRequest(null);
    } finally {
      setLoading(false);
    }
  }, [seller, sourcingId, id, form]);

  useEffect(() => {
    fetchRequest();
  }, [fetchRequest]);

  // Save order-level fields
  const handleOrderUpdate = async (values) => {
    try {
      const docId = request?._id || request?.id;
      if (!docId) {
        toastWarn("No ID", "Cannot update because sourcing id is missing.");
        return;
      }

      // Cast market_order_num to STRING to satisfy backend's isFilledStr()
      const monRaw = values?.market_order_num;
      const monStr =
        monRaw === 0 || monRaw
          ? String(monRaw).trim()
          : ""; // empty when not set

      // Normalize URLs; optionally enforce dotted hostname (client-side)
      let purchase = ensureHttp(values?.purchase_link || "");
      let listing = ensureHttp(values?.listing_link || "");

      try {
        const u = new URL(purchase);
        if (!isLikelyFqdn(u.hostname)) {
          // Surface friendly error and stop submit
          toastWarn("Invalid URL", "Please enter a full domain, e.g. https://example.com");
          return;
        }
      } catch {
        toastWarn("Invalid URL", "Purchase link looks malformed.");
        return;
      }

      if (listing) {
        try {
          const u2 = new URL(listing);
          if (!isLikelyFqdn(u2.hostname)) {
            toastWarn("Invalid URL", "Listing link needs a full domain, e.g. https://example.com");
            return;
          }
        } catch {
          toastWarn("Invalid URL", "Listing link looks malformed.");
          return;
        }
      }

      const payload = {
        ...values,
        market_order_num: monStr, // <-- critical fix
        listing_link: listing,
        purchase_link: purchase,
      };

      await apiClient.put(`/api/v1/sourcing/${docId}`, payload);
      toastOk("Saved", "Order details updated successfully!");
      fetchRequest();
      setLogsTick((n) => n + 1);
    } catch (err) {
      console.error(err);
      const serverMsg =
        err?.response?.data?.message || err.message || "Failed to update order details.";
      toastErr("Update failed", serverMsg);
    }
  };

  // Save inline item edits
  const handleItemUpdate = async (itemId, field, value) => {
    try {
      if (!itemId) {
        toastWarn("Missing item id", "We couldn't identify which item to update.");
        return;
      }
      await apiClient.patch(`/api/v1/sourcing/items/${itemId}`, { [field]: value });
      toastOk("Item updated", `#${itemId} saved`);
      fetchRequest();
      setLogsTick((n) => n + 1);
    } catch (err) {
      console.error(err);
      const serverMsg = err?.response?.data?.message || err.message || "Failed to update item.";
      toastErr("Item update failed", serverMsg);
    }
  };

  const itemColumns = [
    { title: "Product Name", dataIndex: "product_name", key: "product_name" },
    { title: "SKU", dataIndex: "sku", key: "sku" },
    { title: "Qty", dataIndex: "quantity_needed", key: "quantity_needed", width: 90 },
    {
      title: "Condition",
      dataIndex: "product_condition",
      key: "product_condition",
      render: (val, record) => (
        <Select
          value={val || undefined}
          style={{ width: 160 }}
          onChange={(value) => handleItemUpdate(record._id || record.id, "product_condition", value)}
        >
          <Option value="Excellent">Excellent</Option>
          <Option value="Refurbished">Refurbished</Option>
          <Option value="Acceptable">Acceptable</Option>
          <Option value="Scratched">Scratched</Option>
          <Option value="Unacceptable">Unacceptable</Option>
        </Select>
      ),
    },
    {
      title: "Tested",
      dataIndex: "tested",
      key: "tested",
      render: (val, record) => (
        <Checkbox
          checked={!!val}
          onChange={(e) => handleItemUpdate(record._id || record.id, "tested", e.target.checked)}
        />
      ),
      width: 110,
    },
  ];

  const moneyProps = {
    min: 0,
    step: 0.01,
    formatter: (val) => (val === undefined || val === null ? "" : `$ ${val}`),
    parser: (val) => (val ? val.replace(/\$\s?|(,*)/g, "") : ""),
    style: { width: "100%" },
  };

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 280 }}>
        <Spin size="large" />
      </div>
    );
  }
  if (!request) return <p>No request found.</p>;

  return (
    <div className="page-container" style={{ padding: 16 }}>
      <Space align="baseline" style={{ display: "flex", justifyContent: "space-between" }}>
        <Title level={2} style={{ marginBottom: 8 }}>
          {request.seller_name ? `Seller: ${request.seller_name}` : `Sourcing Request #${request.id}`}
        </Title>
        <Space>
          {!!request.listing_link && (
            <Button
              onClick={() => {
                try {
                  const url = /^https?:\/\//i.test(request.listing_link)
                    ? request.listing_link
                    : `https://${request.listing_link}`;
                  window.location.assign(url);
                } catch {
                  toastWarn("Invalid URL", "This listing link looks malformed.");
                }
              }}
            >
              View on Listing
            </Button>
          )}
          <Button onClick={() => navigate(-1)}>Back</Button>
        </Space>
      </Space>

      <Form form={form} layout="vertical" onFinish={handleOrderUpdate} initialValues={{ status: request?.status }}>
        <Card title="Sourcer Details (Editable)" style={{ marginBottom: 16 }}>
          <Row gutter={[16, 12]}>
            <Col xs={24} md={12} lg={8}>
              <Form.Item
                name="seller_name"
                label="Seller Name"
                rules={[{ required: true, message: "Seller name is required" }]}
              >
                <Input placeholder="e.g., John’s Retro Store" />
              </Form.Item>
            </Col>

            <Col xs={24} md={12} lg={8}>
              <Form.Item name="market" label="Marketplace">
                <Select
                  placeholder="Select marketplace"
                  allowClear
                  loading={loadingMarkets}
                  optionFilterProp="label"
                  showSearch
                >
                  {markets.map((m) => (
                    <Option key={m._id} value={m.slug || m._id} label={m.name}>
                      {m.name}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>

            <Col xs={24} lg={8}>
              <Form.Item name="listing_link" label="Listing Link">
                <Input
                  placeholder="https://..."
                  onBlur={(e) => {
                    const v = e.target.value?.trim();
                    if (v && !/^https?:\/\//i.test(v)) {
                      toastInfo("Protocol added", "We'll treat it as https://");
                      form.setFieldsValue({ listing_link: ensureHttp(v) });
                    }
                  }}
                />
              </Form.Item>
            </Col>

            <Col xs={24} md={8}>
              <Form.Item name="sellers_price" label="Seller’s Price">
                <InputNumber {...moneyProps} />
              </Form.Item>
            </Col>

            <Col xs={24} md={8}>
              <Form.Item name="shipping_price" label="Shipping">
                <InputNumber {...moneyProps} />
              </Form.Item>
            </Col>

            <Col xs={24} md={8}>
              <Form.Item name="tax" label="Tax">
                <InputNumber {...moneyProps} />
              </Form.Item>
            </Col>

            <Col xs={24} md={12} lg={8}>
              <div
                style={{
                  padding: 12,
                  borderRadius: 8,
                  background: "#f6ffed",
                  border: "1px solid #b7eb8f",
                  fontWeight: 600,
                }}
              >
                Total Order Value: ${currency(total)}
              </div>
            </Col>
          </Row>
        </Card>

        <Card title="Update Purchase & Tracking Details">
          <Row gutter={[16, 12]}>
            <Col xs={24} md={12} lg={8}>
              <Form.Item name="status" label="Order Status" rules={[{ required: true }]}>
                <Select allowClear>
                  <Option value="Pending">Pending</Option>
                  <Option value="Assigned">Assigned</Option>
                  <Option value="Offer">Offer</Option>
                  <Option value="Purchased">Purchased</Option>
                  <Option value="Disapproved">Disapproved</Option>
                  <Option value="Sold">Sold</Option>
                  <Option value="Hold">Hold</Option>
                  <Option value="Seller Rejected">Seller Rejected</Option>
                  <Option value="Dropshipped">Dropshipped</Option>
                  <Option value="Returned">Returned</Option>
                </Select>
              </Form.Item>
            </Col>

            {/* Market Order # — required & numeric when Purchased; will be sent as STRING */}
            <Col xs={24} md={12} lg={8}>
              <Form.Item
                name="market_order_num"
                label="Market Order #"
                dependencies={["status"]}
                rules={[
                  ({ getFieldValue }) => ({
                    validator(_, value) {
                      const purchased = getFieldValue("status") === "Purchased";
                      if (!purchased && (value === undefined || value === null || value === "")) {
                        return Promise.resolve();
                      }
                      // required + numeric
                      if (value === 0 || value) {
                        const n = typeof value === "number" ? value : Number(value);
                        if (Number.isFinite(n)) return Promise.resolve();
                        return Promise.reject(new Error("Please enter a valid number."));
                      }
                      return Promise.reject(
                        new Error('Market Order # is required when status is "Purchased".')
                      );
                    },
                  }),
                ]}
                validateTrigger={["onBlur", "onChange"]}
                hasFeedback
              >
                <InputNumber style={{ width: "100%" }} min={0} step={1} stringMode={false} placeholder="Required when Purchased" />
              </Form.Item>
            </Col>

            {/* Purchase Link — required & valid URL when Purchased */}
            <Col xs={24} md={12} lg={8}>
              <Form.Item
                name="purchase_link"
                label="Purchase Link"
                dependencies={["status"]}
                rules={[
                  ({ getFieldValue }) => ({
                    validator(_, value) {
                      const purchased = getFieldValue("status") === "Purchased";
                      const raw = (value || "").trim();
                      if (!purchased && !raw) return Promise.resolve();
                      if (purchased && !raw) {
                        return Promise.reject(new Error('Purchase Link is required when status is "Purchased".'));
                      }
                      try {
                        const u = new URL(ensureHttp(raw));
                        const okProtocol = u.protocol === "http:" || u.protocol === "https:";
                        const okHost = isLikelyFqdn(u.hostname);
                        if (okProtocol && okHost) return Promise.resolve();
                        return Promise.reject(new Error("Enter a full domain, e.g., https://example.com"));
                      } catch {
                        return Promise.reject(new Error("Enter a valid URL, e.g., https://example.com"));
                      }
                    },
                  }),
                ]}
                validateTrigger={["onBlur", "onChange"]}
                hasFeedback
              >
                <Input
                  placeholder="Required when Purchased"
                  onBlur={(e) => {
                    const v = e.target.value?.trim();
                    if (v && !/^https?:\/\//i.test(v)) {
                      toastInfo("Protocol added", "We'll treat it as https://");
                      form.setFieldsValue({ purchase_link: ensureHttp(v) });
                    }
                  }}
                />
              </Form.Item>
            </Col>

            <Col xs={24} md={12} lg={8}>
              <Form.Item name="destination_warehouse" label="Destination">
                <Select allowClear>
                  <Option value="US_CA">US_CA</Option>
                  <Option value="US_TX">US_TX</Option>
                </Select>
              </Form.Item>
            </Col>

            <Col xs={24} md={12} lg={8}>
              <Form.Item name="tracking_status" label="Tracking Status">
                <Select allowClear>
                  <Option value="LabelCreated">LabelCreated</Option>
                  <Option value="InTransit">InTransit</Option>
                  <Option value="Delivered">Delivered</Option>
                </Select>
              </Form.Item>
            </Col>

            <Col xs={24} md={12} lg={8}>
              <Form.Item name="carrier" label="Carrier">
                <Select allowClear>
                  <Option value="FedEx">FedEx</Option>
                  <Option value="USPS">USPS</Option>
                  <Option value="UPS">UPS</Option>
                </Select>
              </Form.Item>
            </Col>

            <Col xs={24} md={12} lg={8}>
              <Form.Item name="tracking_id" label="Tracking ID">
                <Input />
              </Form.Item>
            </Col>

            <Col xs={24} md={12} lg={8}>
              <Form.Item name="tracking_link" label="Tracking Link">
                <Input />
              </Form.Item>
            </Col>

            <Col xs={24} md={12} lg={8}>
              <Form.Item name="odoo_po_id" label="Odoo Purchase Order ID">
                <Input />
              </Form.Item>
            </Col>
          </Row>

          <Button type="primary" htmlType="submit" style={{ marginTop: 12 }}>
            Save All Changes
          </Button>
        </Card>
      </Form>

      <Card title="Items in this Request" style={{ marginTop: 16 }}>
        <Table
          columns={itemColumns}
          dataSource={request.items || []}
          rowKey={(r) => r._id || r.id || `${request._id}-row-${r.sku}-${r.product_name}`}
          pagination={false}
        />
      </Card>

      <div style={{ marginTop: 16 }}>
        <SourcingLogsTimeline
          targetId={request?._id || request?.id}
          refreshKey={logsTick}
          title="Activity Log"
        />
      </div>
    </div>
  );
}
