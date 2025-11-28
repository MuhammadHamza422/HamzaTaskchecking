import { useState, useEffect } from "react";
import { Modal, Form, Input, Tabs } from "antd";

const { TextArea } = Input;
const { TabPane } = Tabs;

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
  const [activeTab, setActiveTab] = useState("japan"); // Default to Japan tab

  useEffect(() => {
    if (open) {
      form.resetFields();
      setErrors({});
      setActiveTab("japan"); // Reset to Japan tab when modal opens
    }
  }, [open, form]);

  const validateTrackingLink = (_, value) => {
    // Only validate if marketplace tab is active
    if (activeTab !== "marketplace") {
      return Promise.resolve();
    }
    if (!value) {
      return Promise.reject(new Error("Tracking link is required"));
    }
    const urlPattern = /^https?:\/\/.+/;
    if (!urlPattern.test(value)) {
      return Promise.reject(new Error("Tracking link must be a valid URL (http:// or https://)"));
    }
    return Promise.resolve();
  };

  const handleTabChange = (key) => {
    setActiveTab(key);
    // Update fulfillmentType in form when tab changes
    form.setFieldsValue({ fulfillmentType: key });
    // Clear errors when switching tabs
    setErrors({});
    
    // Clear fields from the inactive tab to avoid confusion
    if (key === "japan") {
      // Clear marketplace fields when switching to Japan tab
      form.setFieldsValue({
        marketplaceName: undefined,
        marketplaceOrderNumber: undefined,
        trackingLink: undefined,
      });
    } else {
      // Clear Japan fields when switching to Marketplace tab
      form.setFieldsValue({
        courierService: undefined,
      });
    }
  };

  const handleSubmit = async () => {
    try {
      // Only validate fields relevant to the active tab
      const fieldsToValidate = activeTab === "japan" 
        ? ["trackingId", "courierService"] // Only Japan fields
        : ["marketplaceName", "trackingId", "trackingLink"]; // Only Marketplace fields
      
      const values = await form.validateFields(fieldsToValidate);
      
      // Ensure fulfillmentType is set based on active tab
      const fulfillmentType = activeTab;
      
      // Clean up fields based on fulfillmentType
      if (fulfillmentType === "japan") {
        // For Japan, only send trackingId, courierService, and optional notes
        onSubmit({
          fulfillmentType: "japan",
          trackingId: values.trackingId,
          courierService: values.courierService,
          notes: values.notes || null,
        });
      } else {
        // For Marketplace, send all marketplace fields
        onSubmit({
          fulfillmentType: "marketplace",
          marketplaceName: values.marketplaceName,
          marketplaceOrderNumber: values.marketplaceOrderNumber || null,
          trackingId: values.trackingId,
          trackingLink: values.trackingLink,
          notes: values.notes || null,
        });
      }
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
        initialValues={{ fulfillmentType: "japan" }}
      >
        {/* Hidden field to track fulfillmentType */}
        <Form.Item name="fulfillmentType" hidden>
          <Input />
        </Form.Item>

        <Tabs
          activeKey={activeTab}
          onChange={handleTabChange}
          className="mb-4"
        >
          {/* Japan Tab */}
          <TabPane tab="Japan" key="japan">
            <Form.Item
              name="trackingId"
              label="Tracking ID"
              rules={[
                { 
                  required: activeTab === "japan", 
                  message: "Tracking ID is required" 
                },
                { max: 100, message: "Tracking ID cannot exceed 100 characters" },
              ]}
              validateStatus={errors.trackingId ? "error" : ""}
              help={errors.trackingId}
            >
              <Input
                placeholder="e.g., JP123456789"
                maxLength={100}
                disabled={submitting}
              />
            </Form.Item>

            <Form.Item
              name="courierService"
              label="Courier Service"
              rules={[
                { 
                  required: activeTab === "japan", 
                  message: "Courier service is required" 
                },
                { max: 100, message: "Courier service cannot exceed 100 characters" },
              ]}
              validateStatus={errors.courierService ? "error" : ""}
              help={errors.courierService || "e.g., Japan Post, Yamato Transport, etc."}
            >
              <Input
                placeholder="Enter courier service name"
                maxLength={100}
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
                placeholder="Additional notes (optional)"
                showCount
                maxLength={1000}
                disabled={submitting}
              />
            </Form.Item>
          </TabPane>

          {/* Marketplace Tab */}
          <TabPane tab="Marketplace" key="marketplace">
            <Form.Item
              name="marketplaceName"
              label="Marketplace Name"
              rules={[
                { 
                  required: activeTab === "marketplace", 
                  message: "Marketplace name is required" 
                },
                { max: 100, message: "Marketplace name cannot exceed 100 characters" },
              ]}
              validateStatus={errors.marketplaceName ? "error" : ""}
              help={errors.marketplaceName}
            >
              <Input
                placeholder="e.g., Shopify, WooCommerce, Amazon"
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
                { 
                  required: activeTab === "marketplace", 
                  message: "Tracking ID is required" 
                },
                { max: 100, message: "Tracking ID cannot exceed 100 characters" },
              ]}
              validateStatus={errors.trackingId ? "error" : ""}
              help={errors.trackingId}
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
                { 
                  required: activeTab === "marketplace", 
                  message: "Tracking link is required" 
                },
                { validator: validateTrackingLink },
                { max: 500, message: "Tracking link cannot exceed 500 characters" },
              ]}
              validateStatus={errors.trackingLink ? "error" : ""}
              help={errors.trackingLink}
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
          </TabPane>
        </Tabs>
      </Form>
    </Modal>
  );
}

