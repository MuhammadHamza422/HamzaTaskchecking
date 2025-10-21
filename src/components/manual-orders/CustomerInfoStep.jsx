import React, { useState, useEffect } from "react";
import { Input, Select, Form, Checkbox } from "antd";
import { motion } from "framer-motion";
import apiClient from "../../api/client";

const { Option } = Select;

const CustomerInfoStep = ({ form, onNext }) => {
  const [platforms, setPlatforms] = useState([]);
  const [platformsLoading, setPlatformsLoading] = useState(false);

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
        <Form.Item
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
        </Form.Item>

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
          label="Request Shipping Service"
        >
          <Input
            placeholder="Enter Shipping Service"
            size="large"
            className="rounded-lg"
          />
        </Form.Item>
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
