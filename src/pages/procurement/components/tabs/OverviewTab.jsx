import React from "react";
import {
  CalendarOutlined,
  ShopOutlined,
  DollarOutlined,
  EnvironmentOutlined,
  CarOutlined,
} from "@ant-design/icons";
import { SHIPPING_METHODS } from "../../constants/procurementConstants";
import StatusBadge from "../StatusBadge";

// Tailwind-based, modern replacement for OverviewTab
export default function OverviewTab({ purchaseOrder = {} }) {
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
    if (amount === null || amount === undefined) {
      if (currency === "JPY") return "¥0";
      return "$0.00";
    }

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
    )?.label ||
    purchaseOrder?.shippingMethod ||
    "-";

  const additionalTags = [];
  if (purchaseOrder?.partiallyShipped)
    additionalTags.push(
      <span
        key="ps"
        className="px-2 py-0.5 rounded text-xs bg-orange-100 text-orange-800"
      >
        Partially Shipped
      </span>
    );
  if (purchaseOrder?.fullyShipped)
    additionalTags.push(
      <span
        key="fs"
        className="px-2 py-0.5 rounded text-xs bg-green-100 text-green-800"
      >
        Fully Shipped
      </span>
    );
  if (purchaseOrder?.partiallyPaid)
    additionalTags.push(
      <span
        key="pp"
        className="px-2 py-0.5 rounded text-xs bg-orange-100 text-orange-800"
      >
        Partially Paid
      </span>
    );
  if (purchaseOrder?.fullyPaid)
    additionalTags.push(
      <span
        key="fp"
        className="px-2 py-0.5 rounded text-xs bg-green-100 text-green-800"
      >
        Fully Paid
      </span>
    );

  const InfoItem = ({ icon, label, value, valueClassName = "" }) => (
    <div className="mb-4">
      <div className="flex items-center gap-3 mb-1">
        {icon && (
          <div className="w-9 h-9 flex items-center justify-center rounded-full bg-white/60 ring-1 ring-white/30 shadow-sm">
            <div className="text-gray-600 text-lg">{icon}</div>
          </div>
        )}
        <div>
          <div className="text-xs text-gray-400 uppercase tracking-wide">
            {label}
          </div>
          <div
            className={`text-base font-semibold text-gray-900 ${valueClassName}`}
          >
            {value}
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <section className="space-y-6">
      {/* Page background container - keep it subtle */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Vendor Card */}
        <div className="bg-gradient-to-br from-white to-slate-50 rounded-2xl shadow-md p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-gradient-to-br from-indigo-600 to-blue-500 text-white shadow">
                <ShopOutlined />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">
                Vendor Information
              </h3>
            </div>
            <div className="text-sm text-gray-500">
              {purchaseOrder?.purchaseOrderNumber}
            </div>
          </div>

          <div className="mt-2">
            <InfoItem label="Vendor Name" value={getVendorName()} />
            <InfoItem
              label="Vendor Reference"
              value={purchaseOrder?.vendorReference?.join(", ") || "-"}
            />
            <InfoItem
              label="Currency"
              value={purchaseOrder?.currency || "USD"}
            />
          </div>
        </div>

        {/* Dates Card */}
        <div className="bg-gradient-to-br from-white to-slate-50 rounded-2xl shadow-md p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-gradient-to-br from-emerald-600 to-green-500 text-white shadow">
                <CalendarOutlined />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">
                Dates & Timeline
              </h3>
            </div>
            <div className="text-sm text-gray-500">{purchaseOrder?.status}</div>
          </div>

          <div className="mt-2">
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
          </div>
        </div>

        {/* Shipping Card */}
        <div className="bg-gradient-to-br from-white to-slate-50 rounded-2xl shadow-md p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-gradient-to-br from-yellow-600 to-orange-400 text-white shadow">
                <CarOutlined />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">
                Shipping & Delivery
              </h3>
            </div>
            <div className="text-sm text-gray-500">{shippingMethod}</div>
          </div>

          <div className="mt-2">
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
              <div className="mt-2">
                <span className="inline-flex items-center px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-sm">
                  Confirmation Required
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Financial Card */}
        <div className="bg-gradient-to-br from-white to-slate-50 rounded-2xl shadow-md p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-gradient-to-br from-sky-600 to-indigo-500 text-white shadow">
                <DollarOutlined />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">
                Financial Summary
              </h3>
            </div>
            <div className="flex items-center gap-2">
              <StatusBadge status={purchaseOrder?.status} />
              {additionalTags.length > 0 && (
                <p className="flex gap-2">{additionalTags}</p>
              )}
            </div>
          </div>

          <div className="mt-2 space-y-3">
            <div className="flex justify-between items-center">
              <p className="text-sm text-gray-500">Untaxed Amount</p>
              <p className="text-base font-semibold text-gray-900">
                {formatCurrency(
                  purchaseOrder?.untaxedAmount,
                  purchaseOrder?.currency
                )}
              </p>
            </div>

            {purchaseOrder?.taxes > 0 && (
              <div className="flex justify-between items-center">
                <p className="text-sm text-gray-500">Taxes</p>
                <p className="text-base font-semibold text-gray-900">
                  {formatCurrency(purchaseOrder.taxes, purchaseOrder.currency)}
                </p>
              </div>
            )}

            <div className="border-t pt-3">
              <div className="flex justify-between items-center bg-gradient-to-r from-white/60 to-slate-50 p-3 rounded-lg">
                <p  className="text-base font-semibold text-gray-700">
                  Total Amount
                </p>
                <p className="text-2xl font-bold text-indigo-600">
                  {formatCurrency(
                    purchaseOrder?.total,
                    purchaseOrder?.currency
                  )}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <p className="text-sm text-gray-500">
          Updated: {formatDate(purchaseOrder?.updatedAt)}
        </p>
      </div>
    </section>
  );
}
