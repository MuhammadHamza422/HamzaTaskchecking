import React, { useState, useEffect } from "react";
import { Input, Select, Form, Checkbox, InputNumber } from "antd";
import { motion } from "framer-motion";
import apiClient from "../../api/client";

const { Option } = Select;

const CustomerInfoStep = ({ form, onNext }) => {
  const [platforms, setPlatforms] = useState([]);
  const [platformsLoading, setPlatformsLoading] = useState(false);
  const [sameAsShipping, setSameAsShipping] = useState(false);

  // Fetch platforms
  const fetchPlatforms = async () => {
    try {
      setPlatformsLoading(true);
      const response = await apiClient.get("/api/v1/plateforms/all");
      if (response.data.success) {
        const sortedPlatforms = response.data.platforms.sort((a, b) => {
          const idA = parseInt(a.plt_id);
          const idB = parseInt(b.plt_id);
          return idA - idB;
        });
        setPlatforms(sortedPlatforms);
      }
    } catch (error) {
      console.error("Error fetching platforms:", error);
    } finally {
      setPlatformsLoading(false);
    }
  };

  useEffect(() => {
    fetchPlatforms();
  }, []);

  // Function to copy shipping to billing
  const copyShippingToBilling = () => {
    const allValues = form.getFieldsValue();
    const shipTo = allValues.shipTo || {};

    form.setFieldsValue({
      billTo: {
        name: shipTo.name || "",
        company: shipTo.company || "",
        street1: shipTo.street1 || "",
        street2: shipTo.street2 || null,
        street3: shipTo.street3 || null,
        city: shipTo.city || "",
        state: shipTo.state || "",
        postalCode: shipTo.postalCode || "",
        country: shipTo.country || "",
        phone: shipTo.phone || "",
        residential: shipTo.residential || false,
        addressVerified: shipTo.addressVerified || false,
      },
    });
  };

  // Handle same as shipping checkbox
  const handleSameAsShipping = (checked) => {
    setSameAsShipping(checked);
    if (checked) {
      copyShippingToBilling();
    }
  };

  const handleNext = async () => {
    try {
      const values = await form.validateFields();
      onNext(values);
    } catch (error) {
      console.error("Validation failed:", error);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-4"
    >
      <div className="text-center mb-4">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">
          Customer Information
        </h2>
        <p className="text-gray-600">
          Enter the basic customer and order details
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* <Form.Item
          name="customerId"
          label="Customer ID"
          rules={[{ required: false, message: "Please enter customer ID" }]}
          className="mb-0"
        >
          <Input
            placeholder="e.g., 12345"
            size="large"
            className="rounded-lg"
          />
        </Form.Item> */}

        <Form.Item
          name="orderNumber"
          label="Order Number"
          rules={[{ required: true, message: "Please enter order number" }]}
        >
          <Input
            placeholder="e.g., ORD-98765"
            size="large"
            className="rounded-lg"
          />
        </Form.Item>

        <Form.Item
          name="plateform"
          label="Platform"
          rules={[{ required: true, message: "Please select a platform" }]}
        >
          <Select
            placeholder="Select platform"
            loading={platformsLoading}
            size="large"
            className="rounded-lg"
          >
            {platforms.map((platform) => (
              <Option key={platform._id} value={platform._id}>
                {platform.plt_name} ({platform.plt_prefix})
              </Option>
            ))}
          </Select>
        </Form.Item>

        <Form.Item
          name="customerUsername"
          label="Customer Username"
          rules={[
            { required: true, message: "Please enter customer username" },
          ]}
        >
          <Input
            placeholder="e.g., john_doe"
            size="large"
            className="rounded-lg"
          />
        </Form.Item>

        <Form.Item
          name="customerEmail"
          label="Customer Email"
          rules={[
            { required: true, message: "Please enter customer email" },
            { type: "email", message: "Please enter a valid email" },
          ]}
        >
          <Input
            placeholder="e.g., john.doe@example.com"
            size="large"
            className="rounded-lg"
          />
        </Form.Item>
        <Form.Item
          name="requestShippingService"
          label="Requested Shipping Service"
        >
          <Input
            placeholder="Enter Shipping Service"
            size="large"
            className="rounded-lg"
          />
        </Form.Item>
        <Form.Item
          name="order_total"
          label="Order Total"
          rules={[{ required: true, message: "Please enter order total" }]}
          initialValue={0}
        >
          <InputNumber
            placeholder="0.00"
            min={0}
            step={0.01}
            size="large"
            className="w-full rounded-lg"
            formatter={(value) => `$ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}
            parser={(value) => value.replace(/\$\s?|(,*)/g, "")}
          />
        </Form.Item>
        <Form.Item name="shipping_amount" label="Shipping Amount" initialValue={0}>
          <InputNumber
            placeholder="0.00"
            min={0}
            step={0.01}
            size="large"
            className="w-full rounded-lg"
            formatter={(value) => `$ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}
            parser={(value) => value.replace(/\$\s?|(,*)/g, "")}
          />
        </Form.Item>
        <Form.Item name="tax_amount" label="Tax Amount" initialValue={0}>
          <InputNumber
            placeholder="0.00"
            min={0}
            step={0.01}
            size="large"
            className="w-full rounded-lg"
            formatter={(value) => `$ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}
            parser={(value) => value.replace(/\$\s?|(,*)/g, "")}
          />
        </Form.Item>
      </div>

      {/* Shipping Address */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 mt-2">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Shipping Address</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Form.Item
            name={["shipTo", "name"]}
            label="Full Name"
            rules={[{ required: true, message: "Please enter shipping name" }]}
          >
            <Input placeholder="John Doe" size="large" className="rounded-lg" />
          </Form.Item>
          <Form.Item name={["shipTo", "company"]} label="Company">
            <Input placeholder="Company Name" size="large" className="rounded-lg" />
          </Form.Item>
          <Form.Item
            name={["shipTo", "street1"]}
            label="Street Address 1"
            rules={[{ required: true, message: "Please enter street address" }]}
            className="md:col-span-2"
          >
            <Input placeholder="123 Main Street" size="large" className="rounded-lg" />
          </Form.Item>
          <Form.Item name={["shipTo", "street2"]} label="Street Address 2" className="md:col-span-2">
            <Input placeholder="Suite 456" size="large" className="rounded-lg" />
          </Form.Item>
          <Form.Item name={["shipTo", "street3"]} label="Street Address 3" className="md:col-span-2">
            <Input placeholder="Additional Info" size="large" className="rounded-lg" />
          </Form.Item>
          <Form.Item
            name={["shipTo", "city"]}
            label="City"
            rules={[{ required: true, message: "Please enter city" }]}
          >
            <Input placeholder="Los Angeles" size="large" className="rounded-lg" />
          </Form.Item>
          <Form.Item
            name={["shipTo", "state"]}
            label="State/Province"
            rules={[{ required: true, message: "Please select state" }]}
          >
            <Input placeholder="California" size="large" className="rounded-lg" />
          </Form.Item>
          <Form.Item
            name={["shipTo", "postalCode"]}
            label="Postal Code"
            rules={[{ required: true, message: "Please enter postal code" }]}
          >
            <Input placeholder="90001" size="large" className="rounded-lg" />
          </Form.Item>
          <Form.Item
            name={["shipTo", "country"]}
            label="Country"
            rules={[{ required: true, message: "Please select country" }]}
          >
            <Input placeholder="United States" size="large" className="rounded-lg" />
          </Form.Item>
          <Form.Item
            name={["shipTo", "phone"]}
            label="Phone"
            rules={[{ required: true, message: "Please enter phone number" }]}
          >
            <Input placeholder="+1-310-555-1234" size="large" className="rounded-lg" />
          </Form.Item>
          <Form.Item name={["shipTo", "residential"]} valuePropName="checked" className="md:col-span-2" initialValue={false}>
            <Checkbox>Residential Address</Checkbox>
          </Form.Item>
          <Form.Item name={["shipTo", "addressVerified"]} valuePropName="checked" className="md:col-span-2" initialValue={false}>
            <Checkbox>Address Verified</Checkbox>
          </Form.Item>
        </div>
      </div>

      {/* Same as Shipping */}
      <div className="bg-blue-50 p-4 rounded-lg mt-4">
        <div className="flex items-center justify-between">
          <Checkbox
            checked={sameAsShipping}
            onChange={(e) => handleSameAsShipping(e.target.checked)}
            className="text-lg font-medium"
          >
            Billing address same as shipping address
          </Checkbox>
          {sameAsShipping && (
            <button
              type="button"
              onClick={copyShippingToBilling}
              className="text-sm text-blue-600 hover:text-blue-800 underline"
            >
              Copy Now
            </button>
          )}
        </div>
      </div>

      {/* Billing Address */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 mt-4">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Billing Address</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Form.Item
            name={["billTo", "name"]}
            label="Full Name"
            rules={[{ required: true, message: "Please enter billing name" }]}
          >
            <Input placeholder="John Doe" size="large" className="rounded-lg" disabled={sameAsShipping} />
          </Form.Item>
          <Form.Item name={["billTo", "company"]} label="Company">
            <Input placeholder="Company Name" size="large" className="rounded-lg" disabled={sameAsShipping} />
          </Form.Item>
          <Form.Item
            name={["billTo", "street1"]}
            label="Street Address 1"
            rules={[{ required: true, message: "Please enter street address" }]}
            className="md:col-span-2"
          >
            <Input placeholder="123 Main Street" size="large" className="rounded-lg" disabled={sameAsShipping} />
          </Form.Item>
          <Form.Item name={["billTo", "street2"]} label="Street Address 2" className="md:col-span-2">
            <Input placeholder="Suite 456" size="large" className="rounded-lg" disabled={sameAsShipping} />
          </Form.Item>
          <Form.Item name={["billTo", "street3"]} label="Street Address 3" className="md:col-span-2">
            <Input placeholder="Additional Info" size="large" className="rounded-lg" disabled={sameAsShipping} />
          </Form.Item>
          <Form.Item
            name={["billTo", "city"]}
            label="City"
            rules={[{ required: true, message: "Please enter city" }]}
          >
            <Input placeholder="Los Angeles" size="large" className="rounded-lg" disabled={sameAsShipping} />
          </Form.Item>
          <Form.Item
            name={["billTo", "state"]}
            label="State/Province"
            rules={[{ required: true, message: "Please select state" }]}
          >
            <Input placeholder="California" size="large" className="rounded-lg" disabled={sameAsShipping} />
          </Form.Item>
          <Form.Item
            name={["billTo", "postalCode"]}
            label="Postal Code"
            rules={[{ required: true, message: "Please enter postal code" }]}
          >
            <Input placeholder="90001" size="large" className="rounded-lg" disabled={sameAsShipping} />
          </Form.Item>
          <Form.Item
            name={["billTo", "country"]}
            label="Country"
            rules={[{ required: true, message: "Please select country" }]}
          >
            <Input placeholder="United States" size="large" className="rounded-lg" disabled={sameAsShipping} />
          </Form.Item>
          <Form.Item
            name={["billTo", "phone"]}
            label="Phone"
            rules={[{ required: true, message: "Please enter phone number" }]}
          >
            <Input placeholder="+1-310-555-1234" size="large" className="rounded-lg" disabled={sameAsShipping} />
          </Form.Item>
          <Form.Item name={["billTo", "residential"]} valuePropName="checked" className="md:col-span-2" initialValue={false}>
            <Checkbox disabled={sameAsShipping}>Residential Address</Checkbox>
          </Form.Item>
          <Form.Item name={["billTo", "addressVerified"]} valuePropName="checked" className="md:col-span-2" initialValue={false}>
            <Checkbox disabled={sameAsShipping}>Address Verified</Checkbox>
          </Form.Item>
        </div>
      </div>

      <div className="flex justify-end pt-6">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleNext}
          className="px-8 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors duration-200 shadow-lg hover:shadow-xl"
        >
          Next: Products
        </motion.button>
      </div>
    </motion.div>
  );
};

export default CustomerInfoStep;
