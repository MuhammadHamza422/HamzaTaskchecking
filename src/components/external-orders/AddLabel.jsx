"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Modal,
  Button,
  Input,
  Select,
  Form,
  message,
  Spin,
  Divider,
} from "antd";
import {
  CheckOutlined,
  PlusOutlined,
  InboxOutlined,
  EnvironmentOutlined,
} from "@ant-design/icons";
import apiClient from "../../api/client";
import Swal from "sweetalert2";

const PLATFORMS = [
  { id: "shopify", label: "Shopify" },
  { id: "walmart", label: "Walmart" },
  { id: "woocommerce", label: "WooCommerce" },
];

const WEIGHT_UNITS = [
  { label: "Pounds", value: "pounds" },
  { label: "Ounces", value: "ounces" },
  { label: "Grams", value: "grams" },
];

const DIMENSION_UNITS = [
  { label: "Inches", value: "inch" },
  { label: "Centimeters", value: "centimeter" },
  { label: "Meters", value: "meter" },
];

// Cache for API data with timestamp
const cache = {
  warehouses: { data: null, timestamp: 0 },
  packages: { data: null, timestamp: 0 },
};

const CACHE_DURATION = 5 * 60 * 1000;

export default function AddLabelModal({
  order,
  activeTab,
  fetchProcessedOrders,
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(false);
  const [warehouses, setWarehouses] = useState([]);
  const [packages, setPackages] = useState([]);
  const [form] = Form.useForm();

  // Initial form data
  const initialFormData = useMemo(
    () => ({
      platform: activeTab ?? "shopify",
      warehouseId: "",
      packageCode: "",
      weight: { value: 0, units: "pounds" },
      dimensions: { length: 0, width: 0, height: 0, units: "inch" },
      packageName: "",
    }),
    [activeTab]
  );

  // Fetch warehouses with caching
  const fetchWarehouses = useCallback(async () => {
    const now = Date.now();

    // Return cached data if still valid
    if (
      cache.warehouses.data &&
      now - cache.warehouses.timestamp < CACHE_DURATION
    ) {
      setWarehouses(cache.warehouses.data);
      return;
    }

    try {
      const { data } = await apiClient.get("/api/v1/shipstation/warehouses");

      if (data.warehouses) {
        cache.warehouses = { data: data.warehouses, timestamp: now };
        setWarehouses(data.warehouses);
      } else {
        message.error("Failed to fetch warehouses");
      }
    } catch (err) {
      console.error("Error fetching warehouses:", err);
      message.error("Error fetching warehouses");
    }
  }, []);

  // Fetch packages with caching
  const fetchCustomPackages = useCallback(async () => {
    const now = Date.now();

    // Return cached data if still valid
    if (
      cache.packages.data &&
      now - cache.packages.timestamp < CACHE_DURATION
    ) {
      setPackages(cache.packages.data);
      return;
    }

    try {
      const { data } = await apiClient.get(
        "/api/v1/shipstation/packages/custom"
      );

      if (data?.packages) {
        cache.packages = { data: data.packages, timestamp: now };
        setPackages(data.packages);
      } else {
        message.error("Failed to fetch packages");
      }
    } catch (err) {
      console.error("Error fetching packages:", err);
      message.error("Error fetching packages");
    }
  }, []);

  // Load initial data only once when modal opens
  const loadInitialData = useCallback(async () => {
    setInitialLoading(true);
    try {
      await Promise.all([fetchWarehouses(), fetchCustomPackages()]);
    } finally {
      setInitialLoading(false);
    }
  }, [fetchWarehouses, fetchCustomPackages]);

  // Handle modal open
  const handleOpen = useCallback(() => {
    setOpen(true);

    // Set form values from order data
    const formValues = {
      platform: activeTab ?? "shopify",
      warehouseId: order?.warehouseId || "",
      packageCode: order?.packageCode || "",
      packageName: order?.packageName || "",
      weight: {
        value: order?.weight?.value || 0,
        units: order?.weight?.units || "pounds",
      },
      dimensions: {
        length: order?.dimensions?.length || 0,
        width: order?.dimensions?.width || 0,
        height: order?.dimensions?.height || 0,
        units: order?.dimensions?.units || "inch",
      },
    };

    form.setFieldsValue(formValues);
  }, [order, activeTab, form]);

  // Load data when modal opens
  useEffect(() => {
    if (open) {
      loadInitialData();
    }
  }, [open, loadInitialData]);

  // Handle package selection and auto-fill dimensions
  const handlePackageChange = useCallback(
    (packageCode) => {
      const selectedPackage = packages.find(
        (pkg) => pkg.package_id === packageCode
      );

      if (selectedPackage) {
        const newValues = {
          packageCode: selectedPackage.package_id,
          packageName: selectedPackage.name,
          dimensions: {
            length: selectedPackage.dimensions?.length || 0,
            width: selectedPackage.dimensions?.width || 0,
            height: selectedPackage.dimensions?.height || 0,
            units: selectedPackage.dimensions?.unit || "inch",
          },
        };

        form.setFieldsValue(newValues);
      }
    },
    [packages, form]
  );

  // Form validation
  const validateForm = useCallback(() => {
    const values = form.getFieldsValue();

    if (!values.warehouseId) {
      message.error("Please select a warehouse location");
      return false;
    }

    if (!values.packageCode) {
      message.error("Please select a package");
      return false;
    }

    if (!values.weight?.value || values.weight.value <= 0) {
      message.error("Please enter a valid weight");
      return false;
    }

    const { length, width, height } = values.dimensions || {};
    if (
      !length ||
      !width ||
      !height ||
      length <= 0 ||
      width <= 0 ||
      height <= 0
    ) {
      message.error("Please enter valid dimensions");
      return false;
    }

    return true;
  }, [form]);

  // Submit handler with validation
  const handleSubmit = useCallback(async () => {
    if (!validateForm()) return;

    setLoading(true);

    try {
      const values = form.getFieldsValue();

      // Ensure packageName is included - get from selected package if missing
      let packageName = values.packageName;
      if (!packageName && values.packageCode) {
        const selectedPackage = packages.find(
          (pkg) => pkg.package_id === values.packageCode
        );
        packageName = selectedPackage?.name || "";
      }

      console.log("values", values);

      const { data } = await apiClient.patch(
        `/api/v1/orders/shipstation/label/${order.order_key}`,
        {
          platform: values.platform,
          warehouseId: values.warehouseId,
          packageCode: values.packageCode,
          packageName: packageName,
          weight: {
            value: Number(values.weight.value),
            units: values.weight.units,
          },
          dimensions: {
            length: Number(values.dimensions.length),
            width: Number(values.dimensions.width),
            height: Number(values.dimensions.height),
            units: values.dimensions.units,
          },
        }
      );

      if (data) {
        message.success("Label added successfully!");

        Swal.fire({
          icon: "success",
          title: "Label Added",
          text: "Label has been added successfully!",
          toast: true,
          position: "top-end",
          showConfirmButton: false,
          timer: 3000,
          timerProgressBar: true,
          background: "#10b981",
          color: "#fff",
          customClass: { popup: "rounded-lg" },
        });

        fetchProcessedOrders();
        handleClose();
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "An error occurred";
      message.error(errorMessage);
      console.error("Error adding label:", errorMessage);
    } finally {
      setLoading(false);
    }
  }, [validateForm, form, order, fetchProcessedOrders, packages]);

  // Close handler with cleanup
  const handleClose = useCallback(() => {
    setOpen(false);
    form.resetFields();
  }, [form]);

  // Memoized warehouse options
  const warehouseOptions = useMemo(
    () =>
      warehouses.map((w) => ({
        label: (
          <div className="flex items-center gap-2">
            <EnvironmentOutlined className="text-blue-500" />
            <span>{w.warehouseName}</span>
          </div>
        ),
        value: w.warehouseId,
      })),
    [warehouses]
  );

  // Memoized package options
  const packageOptions = useMemo(
    () =>
      packages.map((pkg) => ({
        label: (
          <div className="flex items-center gap-2">
            <InboxOutlined className="text-green-500" />
            <span>{pkg.name}</span>
            <span className="text-gray-400 text-xs">({pkg.package_code})</span>
          </div>
        ),
        value: pkg.package_id,
      })),
    [packages]
  );

  return (
    <>
      <Button
        type="link"
        icon={
          order.packageCode ? (
            <CheckOutlined className="text-green-600" />
          ) : (
            <PlusOutlined className="text-blue-600" />
          )
        }
        onClick={handleOpen}
        size="small"
        className={`font-medium transition-all ${
          order.packageCode
            ? "text-green-600 hover:text-green-700"
            : "text-blue-600 hover:text-blue-700"
        }`}
      >
        {order.packageCode ? "Fulfilled" : "Fulfillment Info"}
      </Button>

      <Modal
        title={
          <div className="flex items-center gap-2 text-lg font-semibold">
            <InboxOutlined className="text-blue-500" />
            <span>Add Shipping Label</span>
          </div>
        }
        open={open}
        onCancel={handleClose}
        footer={[
          <Button
            key="cancel"
            onClick={handleClose}
            disabled={loading}
            size="large"
          >
            Cancel
          </Button>,
          <Button
            key="submit"
            type="primary"
            loading={loading}
            onClick={handleSubmit}
            size="large"
            className="bg-blue-600 hover:bg-blue-700"
          >
            Add Label
          </Button>,
        ]}
        width={700}
        destroyOnClose
      >
        <Divider className="mt-2 mb-6" />

        {initialLoading ? (
          <div className="flex justify-center items-center py-20">
            <Spin size="large" tip="Loading data..." />
          </div>
        ) : (
          <Form layout="vertical" form={form} className="space-y-1">
            {/* Platform */}
            <Form.Item
              label={<span className="font-semibold">Platform</span>}
              name="platform"
              rules={[{ required: true, message: "Platform is required" }]}
            >
              <Select
                size="large"
                disabled
                options={PLATFORMS}
                placeholder="Select platform"
              />
            </Form.Item>

            {/* Warehouse Location */}
            <Form.Item
              label={<span className="font-semibold">From Location</span>}
              name="warehouseId"
              rules={[{ required: true, message: "Please select a warehouse" }]}
            >
              <Select
                size="large"
                placeholder="Select warehouse location"
                options={warehouseOptions}
                showSearch
                optionFilterProp="children"
                filterOption={(input, option) =>
                  option.label.props.children[1].props.children
                    .toLowerCase()
                    .includes(input.toLowerCase())
                }
              />
            </Form.Item>

            {/* Package Selection */}
            <Form.Item
              label={<span className="font-semibold">Package</span>}
              name="packageCode"
              rules={[{ required: true, message: "Please select a package" }]}
            >
              <Select
                size="large"
                placeholder="Select a package"
                options={packageOptions}
                onChange={handlePackageChange}
                showSearch
                optionFilterProp="children"
                filterOption={(input, option) =>
                  option.label.props.children[1].props.children
                    .toLowerCase()
                    .includes(input.toLowerCase())
                }
              />
            </Form.Item>

            {/* Hidden field for packageName */}
            <Form.Item name="packageName" hidden>
              <Input type="hidden" />
            </Form.Item>

            <Divider className="my-6">Package Details</Divider>

            {/* Weight Section */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-semibold mb-4 text-gray-700">Weight</h4>
              <div className="grid grid-cols-2 gap-4">
                <Form.Item
                  label="Value"
                  name={["weight", "value"]}
                  rules={[
                    { required: true, message: "Required" },
                    { type: "number", min: 0.01, message: "Must be > 0" },
                  ]}
                >
                  <Input
                    size="large"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    min={0}
                  />
                </Form.Item>
                <Form.Item
                  label="Units"
                  name={["weight", "units"]}
                  rules={[{ required: true, message: "Required" }]}
                >
                  <Select size="large" options={WEIGHT_UNITS} />
                </Form.Item>
              </div>
            </div>

            {/* Dimensions Section */}
            <div className="bg-gray-50 p-4 rounded-lg mt-4">
              <h4 className="font-semibold mb-4 text-gray-700">Dimensions</h4>
              <div className="grid grid-cols-3 gap-3 mb-4">
                <Form.Item
                  label="Length"
                  name={["dimensions", "length"]}
                  rules={[
                    { required: true, message: "Required" },
                    { type: "number", min: 0.01, message: "Must be > 0" },
                  ]}
                >
                  <Input
                    size="large"
                    type="number"
                    step="0.01"
                    placeholder="0"
                    min={0}
                  />
                </Form.Item>
                <Form.Item
                  label="Width"
                  name={["dimensions", "width"]}
                  rules={[
                    { required: true, message: "Required" },
                    { type: "number", min: 0.01, message: "Must be > 0" },
                  ]}
                >
                  <Input
                    size="large"
                    type="number"
                    step="0.01"
                    placeholder="0"
                    min={0}
                  />
                </Form.Item>
                <Form.Item
                  label="Height"
                  name={["dimensions", "height"]}
                  rules={[
                    { required: true, message: "Required" },
                    { type: "number", min: 0.01, message: "Must be > 0" },
                  ]}
                >
                  <Input
                    size="large"
                    type="number"
                    step="0.01"
                    placeholder="0"
                    min={0}
                  />
                </Form.Item>
              </div>
              <Form.Item
                label="Units"
                name={["dimensions", "units"]}
                rules={[{ required: true, message: "Required" }]}
              >
                <Select size="large" options={DIMENSION_UNITS} />
              </Form.Item>
            </div>
          </Form>
        )}
      </Modal>
    </>
  );
}
