import { useState, useEffect } from "react";
import { Modal, Form, Input, message } from "antd";

const { TextArea } = Input;

export default function ItemFulfillmentModal({
  open,
  onCancel,
  item,
  missingProduct = null,
  onSubmit,
  submitting,
}) {
  const [form] = Form.useForm();
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (open) {
      form.resetFields();
      setErrors({});
    }
  }, [open, form]);

  const validateTrackingLink = (_, value) => {
    if (!value) {
      return Promise.reject(new Error("Tracking link is required"));
    }
    const urlPattern = /^https?:\/\/.+/;
    if (!urlPattern.test(value)) {
      return Promise.reject(new Error("Tracking link must be a valid URL (http:// or https://)"));
    }
    return Promise.resolve();
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      onSubmit(values);
    } catch (error) {
      if (error.errorFields) {
        const fieldErrors = {};
        error.errorFields.forEach((field) => {
          fieldErrors[field.name[0]] = field.errors[0];
        });
        setErrors(fieldErrors);
      }
    }
  };

  const modalTitle = missingProduct 
    ? `Fulfill Missing Product: ${missingProduct.productName || "N/A"}`
    : `Fulfill Item: ${item?.name || "N/A"}`;
  
  const okText = missingProduct ? "Fulfill Missing Product" : "Fulfill Item";

  return (
    <Modal
      title={modalTitle}
      open={open}
      onCancel={onCancel}
      onOk={handleSubmit}
      confirmLoading={submitting}
      okText={okText}
      cancelText="Cancel"
      width={600}
      destroyOnClose
    >
      <Form
        form={form}
        layout="vertical"
        className="mt-4"
      >
        <Form.Item
          name="marketplaceName"
          label="Marketplace Name"
          rules={[
            { required: !missingProduct, message: "Marketplace name is required" },
            { max: 100, message: "Marketplace name cannot exceed 100 characters" },
          ]}
          validateStatus={errors.marketplaceName ? "error" : ""}
          help={errors.marketplaceName || (missingProduct ? "Optional for missing products" : "")}
        >
          <Input
            placeholder="e.g., Shopify, WooCommerce"
            maxLength={100}
            disabled={submitting}
          />
        </Form.Item>

        <Form.Item
          name="marketplaceOrderNumber"
          label="Marketplace Order Number (Optional)"
          rules={[
            { max: 100, message: "Marketplace order number cannot exceed 100 characters" },
          ]}
          validateStatus={errors.marketplaceOrderNumber ? "error" : ""}
          help={errors.marketplaceOrderNumber}
        >
          <Input
            placeholder="e.g., SH-12345"
            maxLength={100}
            disabled={submitting}
          />
        </Form.Item>

        <Form.Item
          name="trackingId"
          label="Tracking ID"
          rules={[
            { required: !missingProduct, message: "Tracking ID is required" },
            { max: 100, message: "Tracking ID cannot exceed 100 characters" },
          ]}
          validateStatus={errors.trackingId ? "error" : ""}
          help={errors.trackingId || (missingProduct ? "Optional for missing products" : "")}
        >
          <Input
            placeholder="e.g., 1Z999AA10123456784"
            maxLength={100}
            disabled={submitting}
          />
        </Form.Item>

        <Form.Item
          name="trackingLink"
          label="Tracking Link"
          rules={[
            { required: !missingProduct, message: "Tracking link is required" },
            { validator: missingProduct ? undefined : validateTrackingLink },
            { max: 500, message: "Tracking link cannot exceed 500 characters" },
          ]}
          validateStatus={errors.trackingLink ? "error" : ""}
          help={errors.trackingLink || (missingProduct ? "Optional for missing products" : "")}
        >
          <Input
            placeholder="https://tracking.example.com/1Z999AA10123456784"
            maxLength={500}
            disabled={submitting}
          />
        </Form.Item>

        <Form.Item
          name="notes"
          label="Notes (Optional)"
          rules={[
            { max: 1000, message: "Notes cannot exceed 1000 characters" },
          ]}
          validateStatus={errors.notes ? "error" : ""}
          help={errors.notes}
        >
          <TextArea
            rows={4}
            placeholder="e.g., Order fulfilled via Shopify"
            showCount
            maxLength={1000}
            disabled={submitting}
          />
        </Form.Item>
      </Form>
    </Modal>
  );
}

