import React, { useState, useEffect } from "react";
import {
  Modal,
  Form,
  Input,
  Select,
  Button,
  Divider,
  message,
  Spin,
} from "antd";
import apiClient from "../../api/client";
import { getPlatformConfig } from "../../config/platforms";
import Swal from "sweetalert2";
import useFullscreen from "../useFullscreen";

const { Option } = Select;

export default function OrderEditModal({
  visible,
  onCancel,
  order,
  activeTab,
  onSuccess,
}) {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const { ref: fullscreenRef, isFullscreen, getContainer } = useFullscreen();
  const platformConfig = getPlatformConfig(activeTab);
  const token = localStorage.getItem("token");

  // Initialize form when order changes
  useEffect(() => {
    if (visible && order) {
      form.setFieldsValue({
        tracking_number: order?.tracking_number || "",
        app_id: order?.app_id || "",
        wc_status: order?.wc_status || "",
        wm_status: order?.wm_status || "",
        status: order?.status || "",
        kits: order?.kits || [],
      });
    }
  }, [visible, order, form]);

  const handleSubmit = async (values) => {
    if (!order?.orderId) {
      message.error("Order ID is required");
      return;
    }

    setSubmitting(true);
    try {
      // Prepare update data based on platform - only include fields that have values
      const updateData = {};

      if (
        platformConfig?.editableFields?.includes("tracking_number") &&
        values.tracking_number
      ) {
        updateData.tracking_number = values.tracking_number;
      }
      if (platformConfig?.editableFields?.includes("app_id") && values.app_id) {
        updateData.app_id = values.app_id;
      }
      if (
        platformConfig?.editableFields?.includes("wc_status") &&
        values.wc_status
      ) {
        updateData.wc_status = values.wc_status;
      }
      if (
        platformConfig?.editableFields?.includes("wm_status") &&
        values.wm_status
      ) {
        updateData.wm_status = values.wm_status;
      }
      if (platformConfig?.editableFields?.includes("status") && values.status) {
        updateData.status = values.status;
      }
      if (
        platformConfig?.editableFields?.includes("kits") &&
        values.kits &&
        values.kits.length > 0
      ) {
        // Format kits properly - each kit should have kit_id and skus array
        updateData.kits = values.kits.map((kit) => ({
          kit_id: kit?.kit_id || "",
          skus: Array.isArray(kit?.skus) ? kit.skus : [],
        }));
      }
      const response = await apiClient.patch(
        `${platformConfig?.updateApi}/${order.orderId}`,
        updateData,
        {
          headers: {
            Authorization: `${token}`,
          },
        }
      );

      if (response?.data?.success) {
        Swal.fire({
          icon: "success",
          title: "Order Updated",
          text: "Order has been updated successfully!",
          toast: true,
          position: "top-end",
          showConfirmButton: false,
          timer: 3000,
          timerProgressBar: true,
          background: "#10b981",
          color: "#fff",
          customClass: {
            popup: "rounded-lg",
          },
        });

        onSuccess();
        onCancel();
      } else {
        throw new Error(response?.data?.message || "Failed to update order");
      }
    } catch (error) {
      console.error("Error updating order:", error);
      console.error("Error response:", error.response);
      console.error("Error status:", error.response?.status);
      console.error("Error data:", error.response?.data);

      Swal.fire({
        icon: "error",
        title: "Update Failed",
        text:
          error.response?.data?.message ||
          error.message ||
          "Failed to update order",
        toast: true,
        position: "top-end",
        showConfirmButton: false,
        timer: 4000,
        timerProgressBar: true,
        background: "#ef4444",
        color: "#fff",
        customClass: {
          popup: "rounded-lg",
        },
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = () => {
    form.resetFields();
    onCancel();
  };

  // WC Status options for WooCommerce
  const wcStatusOptions = [
    "pending",
    "failed",
    "processing",
    "on-hold",
    "completed",
    "cancelled",
    "refunded",
  ];

  // WM Status options for Walmart
  const wmStatusOptions = [
    "Acknowledged",
    "Shipped",
    "Cancelled",
    "Delivered",
    "Returned",
  ];

  // General status options
  const statusOptions = ["processed", "unprocessed"];

  return (
    <div ref={fullscreenRef}>
      <Modal
        getContainer={getContainer}
        key={String(isFullscreen)}
        title={`Edit Order - ${activeTab === "shopify" && order?.orderId?.includes('gid://shopify/Order/') ? order?.orderId?.replace('gid://shopify/Order/', '') : order?.orderId}`}
        open={visible}
        onCancel={handleCancel}
        centered
        footer={null}
        width={600}
        destroyOnClose
        className="max-h-[90vh] overflow-y-auto"
      >
        {loading ? (
          <div className="flex justify-center items-center h-32">
            <Spin size="large" />
          </div>
        ) : (
          <Form
            form={form}
            layout="vertical"
            onFinish={handleSubmit}
            initialValues={{
              tracking_number: "",
              app_id: "",
              wc_status: "",
              status: "",
              kits: [],
            }}
          >
            {/* Tracking Number */}
            {platformConfig?.editableFields?.includes("tracking_number") && (
              <Form.Item
                label="Tracking Number"
                name="tracking_number"
                rules={[
                  {
                    required: false,
                    message: "Please enter tracking number",
                  },
                ]}
              >
                <Input placeholder="Enter tracking number" />
              </Form.Item>
            )}

            {/* App ID */}
            {platformConfig?.editableFields?.includes("app_id") && (
              <Form.Item
                label="App ID"
                name="app_id"
                rules={[
                  {
                    required: false,
                    message: "Please enter app ID",
                  },
                ]}
              >
                <Input placeholder="Enter app ID" />
              </Form.Item>
            )}

            {/* WC Status (WooCommerce only) */}
            {platformConfig?.editableFields?.includes("wc_status") && (
              <Form.Item
                label="WC Status"
                name="wc_status"
                rules={[
                  {
                    required: false,
                    message: "Please select WC status",
                  },
                ]}
              >
                <Select placeholder="Select WC status" allowClear>
                  {wcStatusOptions.map((status) => (
                    <Option key={status} value={status}>
                      {status?.charAt(0)?.toUpperCase() + status?.slice(1)}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            )}

            {/* WM Status (Walmart only) */}
            {platformConfig?.editableFields?.includes("wm_status") && (
              <Form.Item
                label="WM Status"
                name="wm_status"
                rules={[
                  {
                    required: false,
                    message: "Please select WM status",
                  },
                ]}
              >
                <Select placeholder="Select WM status" allowClear>
                  {wmStatusOptions.map((status) => (
                    <Option key={status} value={status}>
                      {status}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            )}

            {/* Status */}
            {platformConfig?.editableFields?.includes("status") && (
              <Form.Item
                label="Status"
                name="status"
                rules={[
                  {
                    required: false,
                    message: "Please select status",
                  },
                ]}
              >
                <Select placeholder="Select status" allowClear>
                  {statusOptions.map((status) => (
                    <Option key={status} value={status}>
                      {status.charAt(0).toUpperCase() + status.slice(1)}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            )}

            <Divider />

            {/* Action Buttons */}
            <div className="flex justify-end gap-2">
              <Button onClick={handleCancel}>Cancel</Button>
              <Button type="primary" htmlType="submit" loading={submitting}>
                Update Order
              </Button>
            </div>
          </Form>
        )}
      </Modal>
    </div>
  );
}
