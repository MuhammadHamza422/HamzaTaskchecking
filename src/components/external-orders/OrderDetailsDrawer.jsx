import React, { useState, useEffect } from "react";
import {
  Drawer,
  Typography,
  Space,
  Button,
  Card,
  Spin,
  Row,
  Col,
  Tag,
  Modal,
  Input,
  Select,
  Table,
  Empty,
  List,
  Badge,
} from "antd";
import {
  SearchOutlined,
  CheckOutlined,
  PlusOutlined,
  MinusOutlined,
  DeleteOutlined,
} from "@ant-design/icons";
import { useQuery } from "@tanstack/react-query";
import apiClient from "../../api/client";
import Swal from "sweetalert2";

const { Text, Title } = Typography;
const { Search } = Input;
const { Option } = Select;

export default function OrderDetailsDrawer({
  open,
  onClose,
  selectedOrder,
  orderDetails,
  orderDetailsLoading,
  activeTab,
  tabConfig,
  refetch,
}) {
  const [addProductModalVisible, setAddProductModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedPlatformId, setSelectedPlatformId] = useState("");
  const [platforms, setPlatforms] = useState([]);
  const [platformsLoading, setPlatformsLoading] = useState(false);
  const [selectedLineItemId, setSelectedLineItemId] = useState("");

  // Helper function to format date
  const formatDate = (dateString) => {
    if (!dateString) return "—";
    return (
      dateString.split("T")[0] + ", " + dateString.split("T")[1].split(".")[0]
    );
  };

  // Helper function to format timestamp
  const formatTimestamp = (timestamp) => {
    if (!timestamp) return "—";
    const date = new Date(timestamp);
    return date.toLocaleString();
  };

  // Fetch platforms for the modal
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

        // Set default platform based on active tab
        let defaultPlatformId = "";
        if (activeTab === "woocommerce") {
          // Find WooCommerce platform
          const wcPlatform = sortedPlatforms.find(
            (p) =>
              p.plt_name.toLowerCase().includes("woocommerce") ||
              p.plt_prefix.toLowerCase().includes("wc")
          );
          defaultPlatformId = wcPlatform?._id || "";
        } else if (activeTab === "walmart") {
          // Find Walmart platform
          const wmPlatform = sortedPlatforms.find(
            (p) =>
              p.plt_name.toLowerCase().includes("walmart") ||
              p.plt_prefix.toLowerCase().includes("wm")
          );
          defaultPlatformId = wmPlatform?._id || "";
        } else if (activeTab === "shopify") {
          // Find Shopify platform
          const spPlatform = sortedPlatforms.find(
            (p) =>
              p.plt_name.toLowerCase().includes("shopify") ||
              p.plt_prefix.toLowerCase().includes("sp")
          );
          defaultPlatformId = spPlatform?._id || "";
        } else if (activeTab === "amazon") {
          // Find Amazon platform
          const amPlatform = sortedPlatforms.find(
            (p) =>
              p.plt_name.toLowerCase().includes("amazon") ||
              p.plt_prefix.toLowerCase().includes("am")
          );
          defaultPlatformId = amPlatform?._id || "";
        }

        // If no platform found for active tab, use the first platform or order's platform
        if (!defaultPlatformId) {
          defaultPlatformId =
            selectedOrder?.plateform_id || sortedPlatforms[0]?._id || "";
        }

        setSelectedPlatformId(defaultPlatformId);
      }
    } catch (error) {
      console.error("Error fetching platforms:", error);
    } finally {
      setPlatformsLoading(false);
    }
  };

  // Fetch products for the modal
  const fetchProducts = async ({ queryKey }) => {
    const [_, search] = queryKey;
    const params = new URLSearchParams();

    if (search) {
      params.append("search", search);
    }

    const response = await apiClient.get(`/api/v1/products?${params}`);
    return response.data;
  };

  // Fetch existing mapped products for editing
  const fetchExistingMappedProducts = async (productId) => {
    try {
      const response = await apiClient.get(`/api/v1/kit/details/${productId}`);
      if (response.data.success) {
        // Transform the response to match the selectedProducts format
        const mappedProducts =
          response.data.kit?.skus?.map((sku) => ({
            _id: sku.pId._id,
            pro_title: sku?.pId?.pro_title || "Product",
            quantity: parseInt(sku.quantity) || 1,
            sale_price: sku?.pId?.sale_price || 0,
            // price: sku?.price || 0,
          })) || [];
        setSelectedProducts(mappedProducts);
      }
    } catch (error) {
      console.error("Error fetching existing mapped products:", error);
    }
  };

  const { data: productsData, isLoading: productsLoading } = useQuery({
    queryKey: ["products", searchQuery],
    queryFn: fetchProducts,
    enabled: addProductModalVisible && searchQuery.length > 0,
  });

  // Handle product selection
  const handleProductSelect = (product) => {
    const isAlreadySelected = selectedProducts.find(
      (p) => p._id === product._id
    );
    if (!isAlreadySelected) {
      setSelectedProducts([...selectedProducts, { ...product, quantity: 1 }]);
    }
    setSearchQuery("");
  };

  // Handle quantity change
  const handleQuantityChange = (productId, newQuantity) => {
    if (newQuantity < 1) return;
    setSelectedProducts((prev) =>
      prev.map((product) =>
        product._id === productId
          ? { ...product, quantity: newQuantity }
          : product
      )
    );
  };

  // Handle product removal
  const handleRemoveProduct = (productId) => {
    setSelectedProducts((prev) =>
      prev.filter((product) => product._id !== productId)
    );
  };

  // Handle platform change
  const handlePlatformChange = (platformId) => {
    setSelectedPlatformId(platformId);
  };

  // Handle submit
  const handleSubmit = async () => {
    if (selectedProducts.length === 0) {
      Swal.fire({
        icon: "warning",
        title: "No Products Selected",
        text: "Please select at least one product to add to the order.",
        toast: true,
        position: "top-end",
        showConfirmButton: false,
        timer: 3000,
        timerProgressBar: true,
        background: "#f59e0b",
        color: "#fff",
        customClass: {
          popup: "rounded-lg",
        },
      });
      return;
    }

    if (!selectedPlatformId) {
      Swal.fire({
        icon: "warning",
        title: "No Platform Selected",
        text: "Please select a platform for the products.",
        toast: true,
        position: "top-end",
        showConfirmButton: false,
        timer: 3000,
        timerProgressBar: true,
        background: "#f59e0b",
        color: "#fff",
        customClass: {
          popup: "rounded-lg",
        },
      });
      return;
    }

    if (!selectedLineItemId) {
      Swal.fire({
        icon: "warning",
        title: "No Line Item Selected",
        text: "Please select a line item to add products to.",
        toast: true,
        position: "top-end",
        showConfirmButton: false,
        timer: 3000,
        timerProgressBar: true,
        background: "#f59e0b",
        color: "#fff",
        customClass: {
          popup: "rounded-lg",
        },
      });
      return;
    }

    setIsSubmitting(true);
    try {
      // Create a unique product title to avoid duplicate key errors
      const timestamp = new Date().getTime();
      const uniqueProductTitle = `${
        selectedProducts[0]?.pro_title || "Product"
      } - ${timestamp}`;

      const payload = {
        plateform_id: selectedPlatformId,
        productId: selectedLineItemId,
        orderId: selectedOrder?.orderId || "",
        product_title: uniqueProductTitle,
        skus: selectedProducts.map((product) => ({
          pId: product._id,
          quantity: product.quantity.toString(),
          price: handlePrice(product.sale_price).toFixed(2),
        })),
      };
      console.log("selectedLineItemId", selectedLineItemId);
      console.log("payload", payload);
      const response = await apiClient.post("/api/v1/kit/add", payload);
      console.log("response", response?.data);
      if (response?.data?.success) {
        console.log("refetching...");
        refetch();
      }

      if (response?.data?.success) {
        Swal.fire({
          icon: "success",
          title: "Products Added Successfully",
          text: `${selectedProducts.length} product(s) have been added to the order!`,
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

        setAddProductModalVisible(false);
        setSelectedProducts([]);
        setSearchQuery("");
        setSelectedPlatformId("");
        setSelectedLineItemId("");
      } else {
        throw new Error(response?.data?.message || "Failed to add products");
      }
    } catch (error) {
      console.error("Error adding products:", error);
      Swal.fire({
        icon: "error",
        title: "Failed to Add Products",
        text:
          error.response?.data?.message ||
          error.message ||
          "Failed to add products to order",
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
      setIsSubmitting(false);
    }
  };

  // Handle modal close
  const handleModalClose = () => {
    setAddProductModalVisible(false);
    setSelectedProducts([]);
    setSearchQuery("");
    setSelectedPlatformId("");
    setSelectedLineItemId("");
  };

  const handlePrice = (sale_price) => {
    // Ensure sale_price is a number
    const price = sale_price || 0;

    if (activeTab === "woocommerce") {
      const order = orderDetails?.order;
      const lineItem = order?.line_items?.find(
        (item) => (item.product_id || item.id) === selectedLineItemId
      );
      const lineItemTotal = lineItem?.total || 0;
      console.log("lineItemTotal", lineItemTotal);

      const totalSalePriceOfSelectedProducts = selectedProducts.reduce(
        (acc, product) => acc + (product.sale_price || 0) * product.quantity,
        0
      );
      console.log(
        "totalSalePriceOfSelectedProducts",
        totalSalePriceOfSelectedProducts
      );
      if (totalSalePriceOfSelectedProducts > 0) {
        return (lineItemTotal / totalSalePriceOfSelectedProducts) * price;
      }
    }
    console.log("sale_price", price);
    return price;
  };

  // Fetch platforms when modal opens
  useEffect(() => {
    if (addProductModalVisible) {
      fetchPlatforms();
    }
  }, [addProductModalVisible, activeTab, selectedOrder?.plateform_id]);

  // Platform-specific rendering functions
  const renderWooCommerceDetails = () => {
    const order = orderDetails?.order;

    return (
      <div className="space-y-6">
        {/* Order Summary */}
        <Card size="small" className="bg-blue-50 border-blue-200">
          <Row gutter={16}>
            <Col span={8} className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                ${order?.total}
              </div>
              <div className="text-sm text-gray-600">Total</div>
            </Col>
            <Col span={8} className="text-center">
              <div className="text-lg font-semibold text-gray-800">
                {order?.line_items?.length}
              </div>
              <div className="text-sm text-gray-600">Items</div>
            </Col>
            <Col span={8} className="text-center">
              <Tag color="blue" className="capitalize">
                {order?.status}
              </Tag>
              <div className="text-sm text-gray-600 mt-1">Status</div>
            </Col>
          </Row>
        </Card>

        {/* Payment Information */}
        <Card
          size="small"
          title="Payment Information"
          className="border border-green-200 rounded-lg shadow-sm"
        >
          <div className="grid grid-cols-1 md:grid-cols-2">
            <dl className="space-y-2">
              <div className="flex">
                <dt className="w-20 font-semibold text-gray-800">Payment:</dt>
                <dd className="text-gray-700">{order?.payment_method_title}</dd>
              </div>
              <div className="flex">
                <dt className="w-20 font-semibold text-gray-800">Method:</dt>
                <dd className="text-gray-700">{order?.payment_method}</dd>
              </div>
            </dl>
            <dl className="space-y-2">
              <div className="flex">
                <dt className="w-20 font-semibold text-gray-800">Txn ID:</dt>
                <dd className="text-gray-700 font-mono text-sm">
                  {order?.transaction_id}
                </dd>
              </div>
              <div className="flex">
                <dt className="w-20 font-semibold text-gray-800">Date:</dt>
                <dd className="text-gray-700">
                  {formatDate(order?.date_created)}
                </dd>
              </div>
            </dl>
          </div>
        </Card>

        {/* Billing Address */}
        <Card
          size="small"
          title="Billing Address"
          className="border border-blue-200 rounded-lg shadow-sm"
        >
          <div className="text-gray-700 space-y-2">
            <div>
              <span className="font-semibold">Name:</span>{" "}
              {order?.billing?.first_name} {order?.billing?.last_name}
            </div>
            <div>
              <span className="font-semibold">Address:</span>{" "}
              {[
                order?.billing?.address_1,
                order?.billing?.address_2,
                order?.billing?.city,
                order?.billing?.state,
                order?.billing?.postcode,
                order?.billing?.country,
              ]
                .filter(Boolean)
                .join(", ")}
            </div>
            {order?.billing?.phone && (
              <div>
                <span className="font-semibold">Phone:</span>{" "}
                {order.billing.phone}
              </div>
            )}
          </div>
        </Card>

        {/* Shipping Address */}
        <Card
          size="small"
          title="Shipping Address"
          className="border border-purple-200 rounded-lg shadow-sm"
        >
          <div className="text-gray-700 space-y-2">
            <div>
              <span className="font-semibold">Name:</span>{" "}
              {order?.shipping?.first_name} {order?.shipping?.last_name}
            </div>
            <div>
              <span className="font-semibold">Address:</span>{" "}
              {[
                order?.shipping?.address_1,
                order?.shipping?.address_2,
                order?.shipping?.city,
                order?.shipping?.state,
                order?.shipping?.postcode,
                order?.shipping?.country,
              ]
                .filter(Boolean)
                .join(", ")}
            </div>
            {order?.shipping?.phone && (
              <div>
                <span className="font-semibold">Phone:</span>{" "}
                {order.shipping.phone}
              </div>
            )}
          </div>
        </Card>

        {/* Order Items */}
        <Card size="small" title="Order Items" className="border-orange-200">
          <div className="space-y-3">
            {order?.line_items?.map((item) => (
              <div
                key={item?.id}
                className="flex justify-between p-3 bg-gray-50 rounded"
              >
                <div className="flex-1">
                  <div className="font-medium text-gray-900">{item?.name}</div>
                  <div className="text-sm text-gray-600">
                    SKU: {item?.sku} | Qty: {item?.quantity}
                  </div>
                  {item?.image?.src && (
                    <img
                      src={item.image.src}
                      alt={item.name}
                      className="w-12 h-12 object-cover rounded mt-2"
                    />
                  )}
                </div>
                <div className="text-right">
                  {/* Check if this specific line item has mapped products */}
                  {(() => {
                    const lineItemId = item?.product_id || item?.id;
                    const hasMappedProducts =
                      selectedOrder?.mapped_products &&
                      selectedOrder.mapped_products.includes(
                        lineItemId?.toString()
                      );

                    if (hasMappedProducts) {
                      return (
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs font-medium">
                            Mapped
                          </span>
                          <button
                            className="text-sm text-blue-600 p-1.5 rounded-md bg-blue-100 hover:bg-blue-200 transition-colors"
                            onClick={async () => {
                              setSelectedLineItemId(lineItemId);
                              setAddProductModalVisible(true);
                              // Fetch existing mapped products for editing
                              await fetchExistingMappedProducts(lineItemId);
                            }}
                          >
                            Edit
                          </button>
                        </div>
                      );
                    } else {
                      return (
                        <button
                          className="text-sm text-gray-600 p-1.5 rounded-md bg-gray-200 hover:bg-gray-300 transition-colors"
                          onClick={() => {
                            setSelectedLineItemId(lineItemId);
                            setSelectedProducts([]); // Clear any existing products
                            setAddProductModalVisible(true);
                          }}
                        >
                          Add Product
                        </button>
                      );
                    }
                  })()}
                  <div className="font-semibold text-gray-900">
                    ${item?.total}
                  </div>
                  <div className="text-sm text-gray-600">
                    ${item?.price} each
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Order Notes */}
        {order?.meta_data?.find((m) => m.key === "_aftership_order_notes")
          ?.value && (
          <Card
            size="small"
            title="Activities"
            className="border-yellow-200 text-base"
          >
            <div className="space-y-2">
              {order.meta_data
                .find((m) => m.key === "_aftership_order_notes")
                .value.map((note, i) => (
                  <div key={i} className="p-2 bg-yellow-50 rounded text-sm">
                    <div className="flex justify-between items-start">
                      <div className="text-gray-700">{note?.note}</div>
                      <div className="text-xs text-gray-500">
                        {new Date(note?.date_created_gmt).toLocaleString()}
                      </div>
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      By: {note?.author}
                    </div>
                  </div>
                ))}
            </div>
          </Card>
        )}
      </div>
    );
  };

  const renderWalmartDetails = () => {
    const order = orderDetails?.order?.order;

    return (
      <div className="space-y-6">
        {/* Order Summary */}
        <Card size="small" className="bg-green-50 border-green-200">
          <Row gutter={16}>
            <Col span={8} className="text-center">
              <div className="text-2xl font-bold text-green-600">
                $
                {order?.orderLines?.orderLine
                  ?.reduce((total, line) => {
                    const charge = line?.charges?.charge?.find(
                      (c) => c?.chargeType === "PRODUCT"
                    );
                    return total + (charge?.chargeAmount?.amount || 0);
                  }, 0)
                  .toFixed(2)}
              </div>
              <div className="text-sm text-gray-600">Total</div>
            </Col>
            <Col span={8} className="text-center">
              <div className="text-lg font-semibold text-gray-800">
                {order?.orderLines?.orderLine?.length}
              </div>
              <div className="text-sm text-gray-600">Items</div>
            </Col>
            <Col span={8} className="text-center">
              <Tag color="green" className="capitalize">
                {order?.orderLines?.orderLine?.[0]?.orderLineStatuses
                  ?.orderLineStatus?.[0]?.status || "N/A"}
              </Tag>
              <div className="text-sm text-gray-600 mt-1">Status</div>
            </Col>
          </Row>
        </Card>

        {/* Customer Information */}
        <Card
          size="small"
          title="Customer Information"
          className="border border-blue-200 rounded-lg shadow-sm"
        >
          <div className="grid grid-cols-1 md:grid-cols-2">
            <dl className="space-y-2">
              <div className="flex">
                <dt className="w-24 font-semibold text-gray-800">Order ID:</dt>
                <dd className="text-gray-700 font-mono text-sm">
                  {order?.purchaseOrderId}
                </dd>
              </div>
              <div className="flex">
                <dt className="w-24 font-semibold text-gray-800">
                  Customer ID:
                </dt>
                <dd className="text-gray-700 font-mono text-sm">
                  {order?.customerOrderId}
                </dd>
              </div>
            </dl>
            <dl className="space-y-2">
              <div className="flex">
                <dt className="w-24 font-semibold text-gray-800">Email:</dt>
                <dd className="text-gray-700">{order?.customerEmailId}</dd>
              </div>
              <div className="flex">
                <dt className="w-24 font-semibold text-gray-800">
                  Order Date:
                </dt>
                <dd className="text-gray-700">
                  {formatTimestamp(order?.orderDate)}
                </dd>
              </div>
            </dl>
          </div>
        </Card>

        {/* Shipping Information */}
        <Card
          size="small"
          title="Shipping Information"
          className="border border-purple-200 rounded-lg shadow-sm"
        >
          <div className="space-y-4">
            <div>
              <div className="font-semibold text-gray-800 mb-2">
                Shipping Address
              </div>
              <div className="text-gray-700 space-y-1">
                <div>{order?.shippingInfo?.postalAddress?.name}</div>
                <div>{order?.shippingInfo?.postalAddress?.address1}</div>
                {order?.shippingInfo?.postalAddress?.address2 && (
                  <div>{order.shippingInfo.postalAddress.address2}</div>
                )}
                <div>
                  {order?.shippingInfo?.postalAddress?.city},{" "}
                  {order?.shippingInfo?.postalAddress?.state}{" "}
                  {order?.shippingInfo?.postalAddress?.postalCode}
                </div>
                <div>{order?.shippingInfo?.postalAddress?.country}</div>
                <div className="mt-2">
                  <span className="font-semibold">Phone:</span>{" "}
                  {order?.shippingInfo?.phone}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <div className="font-semibold text-gray-800 mb-1">
                  Shipping Method
                </div>
                <div className="text-gray-700">
                  {order?.shippingInfo?.carrierMethodName} (
                  {order?.shippingInfo?.methodCode})
                </div>
              </div>
              <div>
                <div className="font-semibold text-gray-800 mb-1">
                  Delivery Estimates
                </div>
                <div className="text-gray-700 text-sm">
                  <div>
                    Ship:{" "}
                    {formatTimestamp(order?.shippingInfo?.estimatedShipDate)}
                  </div>
                  <div>
                    Delivery:{" "}
                    {formatTimestamp(
                      order?.shippingInfo?.estimatedDeliveryDate
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Order Items */}
        <Card size="small" title="Order Items" className="border-orange-200">
          <div className="space-y-3">
            {order?.orderLines?.orderLine?.map((line, i) => (
              <div
                key={i}
                className="flex items-center justify-between p-3 bg-gray-50 rounded"
              >
                <div className="flex-1">
                  <div className="font-medium text-gray-900">
                    {line?.item?.productName}
                  </div>
                  <div className="text-sm text-gray-600">
                    SKU: {line?.item?.sku} | Condition: {line?.item?.condition}
                  </div>
                  <div className="text-sm text-gray-600">
                    Qty: {line?.orderLineQuantity?.amount}{" "}
                    {line?.orderLineQuantity?.unitOfMeasurement}
                  </div>
                </div>
                <div className="text-right">
                  {/* Check if this specific line item has mapped products */}
                  {(() => {
                    const lineItemId = line?.orderLineId || line?.id;
                    const hasMappedProducts =
                      selectedOrder?.mapped_products &&
                      selectedOrder.mapped_products.includes(
                        lineItemId?.toString()
                      );

                    if (hasMappedProducts) {
                      return (
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs font-medium">
                            Mapped
                          </span>
                          <span className="text-xs text-gray-500">
                            (1 product)
                          </span>
                        </div>
                      );
                    } else {
                      return (
                        <button
                          className="text-sm text-gray-600 p-1.5 rounded-md bg-gray-200 hover:bg-gray-300 transition-colors"
                          onClick={() => {
                            setSelectedLineItemId(lineItemId);
                            setAddProductModalVisible(true);
                          }}
                        >
                          Add Product
                        </button>
                      );
                    }
                  })()}
                  {line?.charges?.charge?.map((charge, j) => (
                    <div key={j} className="text-sm">
                      <div className="font-semibold text-gray-900">
                        ${charge?.chargeAmount?.amount}{" "}
                        {charge?.chargeAmount?.currency}
                      </div>
                      <div className="text-xs text-gray-600">
                        {charge?.chargeName}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Fulfillment Information */}
        <Card
          size="small"
          title="Fulfillment Information"
          className="border border-green-200 rounded-lg shadow-sm"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <div className="font-semibold text-gray-800 mb-1">Ship Node</div>
              <div className="text-gray-700">
                <div>
                  {order?.shipNode?.name} ({order?.shipNode?.type})
                </div>
                <div className="text-sm text-gray-600">
                  ID: {order?.shipNode?.id}
                </div>
              </div>
            </div>
            <div>
              <div className="font-semibold text-gray-800 mb-1">
                Fulfillment
              </div>
              <div className="text-gray-700">
                <div>
                  {
                    order?.orderLines?.orderLine?.[0]?.fulfillment
                      ?.fulfillmentOption
                  }
                </div>
                <div className="text-sm text-gray-600">
                  {order?.orderLines?.orderLine?.[0]?.fulfillment?.shipMethod} -{" "}
                  {
                    order?.orderLines?.orderLine?.[0]?.fulfillment
                      ?.shippingProgramType
                  }
                </div>
              </div>
            </div>
          </div>
        </Card>
      </div>
    );
  };

  if (orderDetailsLoading) {
    return (
      <Drawer
        width={700}
        open={open}
        onClose={onClose}
        title="Order Details"
        footer={
          <Space className="w-full justify-end">
            <Button onClick={onClose}>Close</Button>
          </Space>
        }
      >
        <div className="flex justify-center items-center h-full">
          <Spin size="large" />
        </div>
      </Drawer>
    );
  }

  return (
    <>
      <Drawer
        width={700}
        open={open}
        onClose={onClose}
        title={
          <div>
            <Title level={4} className="mb-0">
              Order Details
            </Title>
            <Text className="text-gray-500">
              {selectedOrder?.orderId} - {tabConfig?.label}
            </Text>
          </div>
        }
        footer={
          <Space className="w-full justify-end">
            <Button onClick={onClose}>Close</Button>
          </Space>
        }
      >
        {orderDetails?.order ? (
          <div className="space-y-6">
            {/* Platform-specific content */}
            {activeTab === "woocommerce" && renderWooCommerceDetails()}
            {activeTab === "walmart" && renderWalmartDetails()}
          </div>
        ) : (
          <div className="text-center text-gray-500">
            No order details available
          </div>
        )}
      </Drawer>

      {/* Add Product Modal */}
      <Modal
        title="Add Products to Order"
        open={addProductModalVisible}
        onCancel={handleModalClose}
        footer={
          <div className="flex justify-end gap-2">
            <Button onClick={handleModalClose}>Cancel</Button>
            <Button
              type="primary"
              onClick={handleSubmit}
              loading={isSubmitting}
              disabled={selectedProducts.length === 0}
              className="bg-green-600 hover:bg-green-700 border-green-600"
            >
              {isSubmitting ? "Adding..." : "Add Products"}
            </Button>
          </div>
        }
        width={800}
        destroyOnClose
        centered
        // className="max-h-[99vh] overflow-y-auto"
      >
        <div className="space-y-4">
          {/* Platform ID Display */}
          <div className="bg-blue-50 p-3 rounded-lg">
            <div className="text-sm font-medium text-blue-800">
              Platform ID:{" "}
              <span className="font-mono">
                {selectedOrder?.plateform_id || "N/A"}
              </span>
            </div>
            <div className="text-xs text-blue-600 mt-1">
              Order ID: {selectedOrder?.orderId}
            </div>
          </div>

          {/* Platform Selection Dropdown */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Platform
            </label>
            <Select
              placeholder="Select Platform"
              value={selectedPlatformId}
              onChange={handlePlatformChange}
              loading={platformsLoading}
              style={{ width: "100%" }}
              size="large"
            >
              {platforms.map((platform) => (
                <Option key={platform._id} value={platform._id}>
                  {platform.plt_name} (ID: {platform.plt_id})
                </Option>
              ))}
            </Select>
          </div>

          {/* Search Dropdown */}
          <div className="relative">
            <Search
              placeholder="Search products by name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              allowClear
              size="large"
              prefix={<SearchOutlined />}
            />

            {/* Dropdown Results */}
            {searchQuery.length > 0 && (
              <div className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-lg shadow-lg z-10 max-h-60 overflow-y-auto">
                {productsLoading ? (
                  <div className="p-4 text-center">
                    <Spin size="small" />
                  </div>
                ) : productsData?.products?.length > 0 ? (
                  <div>
                    {productsData.products.map((product) => {
                      const isSelected = selectedProducts.find(
                        (p) => p._id === product._id
                      );
                      return (
                        <div
                          key={product._id}
                          className={`p-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0 ${
                            isSelected ? "bg-blue-50" : ""
                          }`}
                          onClick={() => handleProductSelect(product)}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="font-medium text-gray-900">
                                {product.pro_title}
                              </div>
                              <div className="text-xs text-gray-500">
                                ${product?.sale_price}
                              </div>
                            </div>
                            {isSelected && (
                              <CheckOutlined className="text-blue-600 text-lg" />
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-4 text-center text-gray-500">
                    No products found
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Selected Products List */}
          {selectedProducts.length > 0 && (
            <div>
              <div className="font-medium text-gray-800 mb-3">
                Selected Products ({selectedProducts.length})
              </div>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {selectedProducts.map((product) => (
                  <div
                    key={product?._id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">
                        {product?.pro_title}
                      </div>
                      <p className="text-xs text-gray-500">
                        Sale Price: ${(product?.sale_price || 0).toFixed(2)}
                      </p>
                      <p className="text-xs text-gray-500">
                        Calculated Price: $
                        {handlePrice(product?.sale_price || 0).toFixed(2)}
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      {/* Quantity Controls */}
                      <div className="flex items-center gap-2">
                        <Button
                          size="small"
                          icon={<MinusOutlined />}
                          onClick={() =>
                            handleQuantityChange(
                              product._id,
                              product.quantity - 1
                            )
                          }
                          disabled={product.quantity <= 1}
                        />
                        <span className="w-8 text-center font-medium">
                          {product.quantity}
                        </span>
                        <Button
                          size="small"
                          icon={<PlusOutlined />}
                          onClick={() =>
                            handleQuantityChange(
                              product._id,
                              product.quantity + 1
                            )
                          }
                        />
                      </div>

                      {/* Remove Button */}
                      <Button
                        size="small"
                        danger
                        icon={<DeleteOutlined />}
                        onClick={() => handleRemoveProduct(product._id)}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </Modal>
    </>
  );
}
