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
  carriers: { data: null, timestamp: 0 },
  carrierPackages: {}, // Keyed by carrierCode
};

const CACHE_DURATION = 5 * 60 * 1000;

export default function AddLabelModal({
  order,
  activeTab,
  fetchProcessedOrders = () => {},
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(false);
  const [warehouses, setWarehouses] = useState([]);
  const [packages, setPackages] = useState([]);
  const [carriers, setCarriers] = useState([]);
  const [carrierPackages, setCarrierPackages] = useState([]);
  const [selectedCarrier, setSelectedCarrier] = useState(null);
  const [packageType, setPackageType] = useState("custom"); // "custom" or "carrier"
  const [loadingCarrierPackages, setLoadingCarrierPackages] = useState(false);
  const [form] = Form.useForm();

  // Get activeTab from localStorage if not provided as prop
  const getActiveTabFromStorage = useCallback(() => {
    if (activeTab) return activeTab;
    
    // Try different localStorage keys used in different pages
    const possibleKeys = [
      "processedOrdersActiveTab",
      "externalOrdersActiveTab", 
      "shippedOrdersActiveTab",
      "pendingOrdersActiveTab"
    ];
    
    for (const key of possibleKeys) {
      const storedTab = localStorage.getItem(key);
      if (storedTab && ["shopify", "woocommerce", "walmart", "amazon"].includes(storedTab)) {
        return storedTab;
      }
    }
    
    return null;
  }, [activeTab]);

  const resolvedActiveTab = getActiveTabFromStorage();



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

  // Fetch carriers with caching
  const fetchCarriers = useCallback(async () => {
    const now = Date.now();

    // Return cached data if still valid
    if (
      cache.carriers.data &&
      now - cache.carriers.timestamp < CACHE_DURATION
    ) {
      setCarriers(cache.carriers.data);
      return;
    }

    try {
      const { data } = await apiClient.get("/api/v1/shipstation/carriers");

      if (data?.carriers) {
        cache.carriers = { data: data.carriers, timestamp: now };
        setCarriers(data.carriers);
      } else {
        message.error("Failed to fetch carriers");
      }
    } catch (err) {
      console.error("Error fetching carriers:", err);
      message.error("Error fetching carriers");
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

  // Fetch carrier packages
  const fetchCarrierPackages = useCallback(async (carrierCode) => {
    if (!carrierCode) {
      setCarrierPackages([]);
      return;
    }

    const now = Date.now();

    // Return cached data if still valid
    if (
      cache.carrierPackages[carrierCode]?.data &&
      now - cache.carrierPackages[carrierCode].timestamp < CACHE_DURATION
    ) {
      setCarrierPackages(cache.carrierPackages[carrierCode].data);
      return;
    }

    setLoadingCarrierPackages(true);
    try {
      const { data } = await apiClient.get(
        `/api/v1/shipstation/packages?carrierCode=${carrierCode}`
      );

      if (data?.packages) {
        cache.carrierPackages[carrierCode] = {
          data: data.packages,
          timestamp: now,
        };
        setCarrierPackages(data.packages);
      } else {
        message.error("Failed to fetch carrier packages");
        setCarrierPackages([]);
      }
    } catch (err) {
      console.error("Error fetching carrier packages:", err);
      message.error("Error fetching carrier packages");
      setCarrierPackages([]);
    } finally {
      setLoadingCarrierPackages(false);
    }
  }, []);

  // Load initial data only once when modal opens
  const loadInitialData = useCallback(async () => {
    setInitialLoading(true);
    try {
      await Promise.all([
        fetchWarehouses(),
        fetchCustomPackages(),
        fetchCarriers(),
      ]);
    } finally {
      setInitialLoading(false);
    }
  }, [fetchWarehouses, fetchCustomPackages, fetchCarriers]);

  // Handle modal open
  const handleOpen = useCallback(() => {
    setOpen(true);
    setPackageType("custom");
    setSelectedCarrier(null);
    setCarrierPackages([]);

    // Set form values from order data
    const currentTab = resolvedActiveTab || activeTab || "shopify";
    const formValues = {
      platform: currentTab,
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
  }, [order, activeTab, resolvedActiveTab, form]);

  // Load data when modal opens
  useEffect(() => {
    if (open) {
      loadInitialData();
    }
  }, [open, loadInitialData]);

  // Handle carrier selection
  const handleCarrierChange = useCallback(
    (carrierCode) => {
      setSelectedCarrier(carrierCode);
      form.setFieldsValue({ packageCode: "", packageName: "" });
      if (carrierCode) {
        fetchCarrierPackages(carrierCode);
      } else {
        setCarrierPackages([]);
      }
    },
    [form, fetchCarrierPackages]
  );

  // Handle package type change
  const handlePackageTypeChange = useCallback(
    (type) => {
      setPackageType(type);
      setSelectedCarrier(null);
      setCarrierPackages([]);
      form.setFieldsValue({ packageCode: "", packageName: "" });
    },
    [form]
  );

  // Handle package selection and auto-fill dimensions
  const handlePackageChange = useCallback(
    (packageCode) => {
      let selectedPackage = null;

      if (packageType === "custom") {
        selectedPackage = packages.find(
          (pkg) => pkg.package_id === packageCode
        );
      } else if (packageType === "carrier") {
        selectedPackage = carrierPackages.find(
          (pkg) => pkg.code === packageCode || pkg.packageCode === packageCode
        );
      }

      if (selectedPackage) {
        const newValues = {
          packageCode:
            selectedPackage.package_id ||
            selectedPackage.code ||
            selectedPackage.packageCode,
          packageName:
            selectedPackage.name ||
            selectedPackage.packageName ||
            selectedPackage.description ||
            "",
          dimensions: {
            length:
              selectedPackage.dimensions?.length ||
              selectedPackage.length ||
              0,
            width:
              selectedPackage.dimensions?.width ||
              selectedPackage.width ||
              0,
            height:
              selectedPackage.dimensions?.height ||
              selectedPackage.height ||
              0,
            units:
              selectedPackage.dimensions?.unit ||
              selectedPackage.dimensions?.units ||
              "inch",
          },
        };

        form.setFieldsValue(newValues);
      }
    },
    [packages, carrierPackages, packageType, form]
  );

  // Form validation
  const validateForm = useCallback(() => {
    const values = form.getFieldsValue();

    if (!values.warehouseId) {
      message.error("Please select a warehouse location");
      return false;
    }

    if (packageType === "carrier" && !selectedCarrier) {
      message.error("Please select a carrier");
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
  }, [form, packageType, selectedCarrier]);

  // Submit handler with validation
  const handleSubmit = useCallback(async () => {
    if (!validateForm()) return;

    setLoading(true);

    try {
      const values = form.getFieldsValue();

      // Ensure packageName is included - get from selected package if missing
      let packageName = values.packageName;
      if (!packageName && values.packageCode) {
        let selectedPackage = null;
        if (packageType === "custom") {
          selectedPackage = packages.find(
            (pkg) => pkg.package_id === values.packageCode
          );
          packageName = selectedPackage?.name || "";
        } else if (packageType === "carrier") {
          selectedPackage = carrierPackages.find(
            (pkg) =>
              pkg.code === values.packageCode ||
              pkg.packageCode === values.packageCode
          );
          packageName =
            selectedPackage?.name ||
            selectedPackage?.packageName ||
            selectedPackage?.description ||
            "";
        }
      }

      // For Shopify orders, use order_key if available and not in GraphQL format
      // Otherwise use shopifyDetails.name (e.g., "RF2120") or extract from orderId
      let orderId;
      
      // Detect if this is a Shopify order (use resolvedActiveTab or fallback to detection)
      const isShopify = resolvedActiveTab === "shopify" || 
                       activeTab === "shopify" ||
                       order?.shopifyDetails || 
                       (order?.orderId && order.orderId.startsWith("gid://")) ||
                       (order?.order_key && order.order_key.startsWith("gid://"));
      
      if (isShopify) {
        // Priority 1: shopifyDetails.name (e.g., "RF2120") - most reliable
        if (order?.shopifyDetails?.name && order.shopifyDetails.name.trim() !== "") {
          orderId = order.shopifyDetails.name;
        }
        // Priority 2: order_key if it exists and is NOT a GraphQL ID
        else if (order?.order_key && !order.order_key.startsWith("gid://") && order.order_key.trim() !== "") {
          orderId = order.order_key;
        }
        // Priority 3: Extract numeric ID from GraphQL format orderId
        else if (order?.orderId && order.orderId.startsWith("gid://")) {
          const match = order.orderId.match(/\/(\d+)(?:"|$)/);
          orderId = match ? match[1] : order.orderId;
        }
        // Fallback
        else {
          orderId = order?.order_key || order?.orderId || "";
        }
      } else {
        orderId = order?.orderId || "";
      }
      
      console.log("AddLabel - orderId:", orderId, "activeTab (prop):", activeTab, "resolvedActiveTab:", resolvedActiveTab, "isShopify:", isShopify, "order:", {
        order_key: order?.order_key,
        orderId: order?.orderId,
        shopifyDetails_name: order?.shopifyDetails?.name,
      });

      const { data } = await apiClient.patch(
        `/api/v1/orders/shipstation/label/${orderId}`,
        {
          platform: resolvedActiveTab || activeTab || values.platform || "shopify",
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

        setOpen(false);
        form.resetFields();
        if (typeof fetchProcessedOrders === "function") {
          fetchProcessedOrders();
        }
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "An error occurred";
      message.error(errorMessage);
      console.error("Error adding label:", errorMessage);
    } finally {
      setLoading(false);
    }
  }, [
    validateForm,
    form,
    order,
    activeTab,
    resolvedActiveTab,
    fetchProcessedOrders,
    packages,
    carrierPackages,
    packageType,
  ]);

  // Close handler with cleanup
  const handleClose = useCallback(() => {
    setOpen(false);
    form.resetFields();
    setPackageType("custom");
    setSelectedCarrier(null);
    setCarrierPackages([]);
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

  // Memoized carrier options
  const carrierOptions = useMemo(
    () =>
      carriers.map((carrier) => ({
        label: (
          <div className="flex items-center gap-2">
            <span>{carrier.name || carrier.carrierName || carrier.code}</span>
            {carrier.code && (
              <span className="text-gray-400 text-xs">({carrier.code})</span>
            )}
          </div>
        ),
        value: carrier.code || carrier.carrierCode,
      })),
    [carriers]
  );

  // Memoized custom package options
  const customPackageOptions = useMemo(
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

  // Memoized carrier package options
  const carrierPackageOptions = useMemo(
    () =>
      carrierPackages.map((pkg) => ({
        label: (
          <div className="flex items-center gap-2">
            <InboxOutlined className="text-blue-500" />
            <span>
              {pkg.name ||
                pkg.packageName ||
                pkg.description ||
                pkg.code ||
                "Package"}
            </span>
            {(pkg.code || pkg.packageCode) && (
              <span className="text-gray-400 text-xs">
                ({pkg.code || pkg.packageCode})
              </span>
            )}
          </div>
        ),
        value: pkg.code || pkg.packageCode || pkg.package_id,
      })),
    [carrierPackages]
  );

  // Combined package options based on type
  const packageOptions = useMemo(() => {
    return packageType === "custom" ? customPackageOptions : carrierPackageOptions;
  }, [packageType, customPackageOptions, carrierPackageOptions]);

  // Check if label info is complete
  const hasLabelInfo =
    order?.packageCode &&
    order?.warehouseId &&
    order?.weight?.value &&
    order?.dimensions?.length &&
    order?.dimensions?.width &&
    order?.dimensions?.height;

  return (
    <>
      {hasLabelInfo ? (
        <button
          onClick={handleOpen}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-green-50 to-green-100/50 hover:from-green-100 hover:to-green-200 border border-green-300/50 text-green-700 font-semibold text-xs shadow-sm hover:shadow-md transition-all duration-200 group"
        >
          <CheckOutlined className="text-sm text-green-600 group-hover:rotate-12 transition-transform duration-200" />
          <span className="relative">
            Info Added
            <span className="absolute -top-1 -right-1 w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
          </span>
        </button>
      ) : (
        <button
          onClick={handleOpen}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-blue-50 to-blue-100/50 hover:from-blue-100 hover:to-blue-200 border border-blue-300/50 text-blue-700 font-semibold text-xs shadow-sm hover:shadow-md transition-all duration-200 group"
        >
          <PlusOutlined className="text-sm text-blue-600 group-hover:rotate-90 transition-transform duration-200" />
          <span>Add Info</span>
        </button>
      )}

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

            {/* Package Type Selection */}
            <Form.Item
              label={<span className="font-semibold">Package Type</span>}
            >
              <Select
                size="large"
                value={packageType}
                onChange={handlePackageTypeChange}
                options={[
                  {
                    label: (
                      <div className="flex items-center gap-2">
                        <InboxOutlined className="text-green-500" />
                        <span>Custom Packages</span>
                      </div>
                    ),
                    value: "custom",
                  },
                  {
                    label: (
                      <div className="flex items-center gap-2">
                        <InboxOutlined className="text-blue-500" />
                        <span>Carrier Packages</span>
                      </div>
                    ),
                    value: "carrier",
                  },
                ]}
              />
            </Form.Item>

            {/* Carrier Selection (only for carrier packages) */}
            {packageType === "carrier" && (
              <Form.Item
                label={<span className="font-semibold">Carrier</span>}
                rules={[
                  {
                    required: packageType === "carrier",
                    message: "Please select a carrier",
                  },
                ]}
              >
                <Select
                  size="large"
                  placeholder="Select a carrier"
                  value={selectedCarrier}
                  onChange={handleCarrierChange}
                  options={carrierOptions}
                  showSearch
                  optionFilterProp="children"
                  loading={initialLoading}
                />
              </Form.Item>
            )}

            {/* Package Selection */}
            <Form.Item
              label={<span className="font-semibold">Package</span>}
              name="packageCode"
              rules={[{ required: true, message: "Please select a package" }]}
            >
              <Select
                size="large"
                placeholder={
                  packageType === "carrier" && !selectedCarrier
                    ? "Select a carrier first"
                    : "Select a package"
                }
                options={packageOptions}
                onChange={handlePackageChange}
                showSearch
                optionFilterProp="children"
                disabled={packageType === "carrier" && !selectedCarrier}
                loading={packageType === "carrier" && loadingCarrierPackages}
                filterOption={(input, option) => {
                  const labelText =
                    typeof option.label === "string"
                      ? option.label
                      : option.label?.props?.children?.[1]?.props?.children ||
                        "";
                  return labelText.toLowerCase().includes(input.toLowerCase());
                }}
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
