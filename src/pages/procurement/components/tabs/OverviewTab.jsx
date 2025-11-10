import React from "react";
import { Card, Row, Col, Tag, Divider } from "antd";
import {
  CalendarOutlined,
  ShopOutlined,
  DollarOutlined,
  EnvironmentOutlined,
  CarOutlined,
} from "@ant-design/icons";
import { SHIPPING_METHODS } from "../../constants/procurementConstants";
import StatusBadge from "../StatusBadge";

/**
 * Improved Overview Tab Component
 * Clean card-based design with better visual hierarchy
 */
const OverviewTab = ({ purchaseOrder }) => {
  const formatDate = (dateString) => {
    if (!dateString) return "-";
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return "-";
    }
  };

  const formatCurrency = (amount, currency = "USD") => {
    if (!amount && amount !== 0) {
      if (currency === "JPY") return "¥0";
      return "$0.00";
    }
    
    // JPY doesn't use decimal places
    if (currency === "JPY") {
      return new Intl.NumberFormat("ja-JP", {
        style: "currency",
        currency: "JPY",
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(amount);
    }
    
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency || "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const getVendorName = () => {
    if (purchaseOrder?.vendor?.name) return purchaseOrder.vendor.name;
    if (typeof purchaseOrder?.vendor === "string") return purchaseOrder.vendor;
    return purchaseOrder?.vendor?.id || purchaseOrder?.vendor?._id || "-";
  };

  const shippingMethod =
    SHIPPING_METHODS.find(
      (method) => method.value === purchaseOrder?.shippingMethod
    )?.label || purchaseOrder?.shippingMethod || "-";

  // Additional status tags
  const additionalTags = [];
  if (purchaseOrder?.partiallyShipped)
    additionalTags.push(
      <Tag color="orange" key="ps">
        Partially Shipped
      </Tag>
    );
  if (purchaseOrder?.fullyShipped)
    additionalTags.push(
      <Tag color="green" key="fs">
        Fully Shipped
      </Tag>
    );
  if (purchaseOrder?.partiallyPaid)
    additionalTags.push(
      <Tag color="orange" key="pp">
        Partially Paid
      </Tag>
    );
  if (purchaseOrder?.fullyPaid)
    additionalTags.push(
      <Tag color="green" key="fp">
        Fully Paid
      </Tag>
    );

  const InfoItem = ({ icon, label, value, valueClassName = "" }) => (
    <div className="mb-4">
      <div className="flex items-center gap-2 mb-1">
        {icon && <span className="text-gray-400">{icon}</span>}
        <span className="text-xs text-gray-500 uppercase tracking-wide">
          {label}
        </span>
      </div>
      <div className={`text-base font-medium text-gray-800 ${valueClassName}`}>
        {value}
      </div>
    </div>
  );

  return (
    <div>
      <Row gutter={[16, 16]}>
        {/* Vendor Information Card */}
        <Col xs={24} lg={12} >
          <Card
            title={
              <span className="flex items-center gap-2">
                <ShopOutlined /> Vendor Information
              </span>
            }
            bordered={false}
            className="h-full shadow-xl bg-gray-100"
          >
            <InfoItem label="Vendor Name" value={getVendorName()} />
            {/* vendor reference come in array like this  "vendorReference": [
        "NCL Ship",
        "COL"
    ], show it as a comma separated list */}
            <InfoItem
              label="Vendor Reference"
              value={purchaseOrder?.vendorReference?.join(", ") || "-"}
            />
            <InfoItem
              label="Currency"
              value={purchaseOrder?.currency || "USD"}
            />
          </Card>
        </Col>

        {/* Dates & Timeline Card */}
        <Col xs={24} lg={12}>
          <Card
            title={
              <span className="flex items-center gap-2">
                <CalendarOutlined /> Dates & Timeline
              </span>
            }
            bordered={false}
            className="h-full shadow-xl bg-gray-100"
          >
            <InfoItem
              icon={<CalendarOutlined />}
              label="Date Created"
              value={formatDate(
                purchaseOrder?.createdDate || purchaseOrder?.createdAt
              )}
            />
            <InfoItem
              icon={<CalendarOutlined />}
              label="Expected Arrival"
              value={formatDate(
                purchaseOrder?.expectedArrival || purchaseOrder?.orderDeadline
              )}
            />
            {purchaseOrder?.confirmationDate && (
              <InfoItem
                icon={<CalendarOutlined />}
                label="Confirmation Date"
                value={formatDate(purchaseOrder.confirmationDate)}
              />
            )}
          </Card>
        </Col>

        {/* Shipping & Delivery Card */}
        <Col xs={24} lg={12}>
          <Card
            title={
              <span className="flex items-center gap-2">
                <CarOutlined /> Shipping & Delivery
              </span>
            }
            bordered={false}
            className="h-full shadow-xl bg-gray-100"
          >
            <InfoItem
              icon={<CarOutlined />}
              label="Shipping Method"
              value={shippingMethod}
            />
            <InfoItem
              icon={<EnvironmentOutlined />}
              label="Deliver To"
              value={
                Array.isArray(purchaseOrder?.deliverTo)
                  ? purchaseOrder.deliverTo.join(", ")
                  : purchaseOrder?.deliverTo || "-"
              }
            />
            {purchaseOrder?.askConfirmation && (
              <InfoItem
                label="Confirmation Required"
                value={<Tag color="blue">Yes</Tag>}
              />
            )}
          </Card>
        </Col>

        {/* Status & Financial Summary Card */}
        <Col xs={24} lg={12}>
          <Card
            title={
              <span className="flex items-center gap-2">
                <DollarOutlined /> Financial Summary
              </span>
            }
            className="h-full shadow-xl bg-gray-100"
          >
            <div className="mb-4">
              <div className="text-xs text-gray-500 uppercase tracking-wide mb-2">
                Status
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <StatusBadge status={purchaseOrder?.status} />
                {additionalTags.length > 0 && (
                  <div className="flex flex-wrap gap-1">{additionalTags}</div>
                )}
              </div>
            </div>

            <Divider className="my-4" />

            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Untaxed Amount</span>
                <span className="text-base font-semibold text-gray-800">
                  {formatCurrency(
                    purchaseOrder?.untaxedAmount,
                    purchaseOrder?.currency
                  )}
                </span>
              </div>

              {purchaseOrder?.taxes > 0 && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Taxes</span>
                  <span className="text-base font-semibold text-gray-800">
                    {formatCurrency(
                      purchaseOrder.taxes,
                      purchaseOrder.currency
                    )}
                  </span>
                </div>
              )}

              <Divider className="my-3" />

              <div className="flex justify-between items-center bg-blue-50 p-3 rounded-lg">
                <span className="text-base font-semibold text-gray-700">
                  Total Amount
                </span>
                <span className="text-2xl font-bold text-blue-600">
                  {formatCurrency(
                    purchaseOrder?.total,
                    purchaseOrder?.currency
                  )}
                </span>
              </div>
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default OverviewTab;