import React, { useState, useEffect } from "react";
import { Modal, Input, Select, Button, Spin, Space } from "antd";
import {
  SearchOutlined,
  CheckOutlined,
  PlusOutlined,
  MinusOutlined,
  DeleteOutlined,
} from "@ant-design/icons";
import { useQuery } from "@tanstack/react-query";
import apiClient from "../../../api/client";
import Swal from "sweetalert2";
import useFullscreen from "../../useFullscreen";

const { Search } = Input;
const { Option } = Select;

function useDebounce(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

export default function AddProductModal({
  visible,
  onCancel,
  selectedOrder,
  activeTab,
  orderDetails,
  selectedLineItemId,
  onSuccess,
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedPlatformId, setSelectedPlatformId] = useState("");
  const [platforms, setPlatforms] = useState([]);
  const [platformsLoading, setPlatformsLoading] = useState(false);
  const [mergedProducts, setMergedProducts] = useState([]);
  const { ref: fullscreenRef, isFullscreen, getContainer } = useFullscreen();
  const [productType, setProductType] = useState("");

  const debouncedSearchTerm = useDebounce(searchQuery, 500);

  const productTypes = [
    { label: "Consoles", code: "CON" },
    { label: "Handhelds", code: "HAN" },
    { label: "Accessories", code: "ACC" },
    { label: "Games", code: "GAM" },
  ];

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
          const wcPlatform = sortedPlatforms.find(
            (p) =>
              p.plt_name.toLowerCase().includes("woocommerce") ||
              p.plt_prefix.toLowerCase().includes("wc")
          );
          defaultPlatformId = wcPlatform?._id || "";
        } else if (activeTab === "walmart") {
          const wmPlatform = sortedPlatforms.find(
            (p) =>
              p.plt_name.toLowerCase().includes("walmart") ||
              p.plt_prefix.toLowerCase().includes("wm")
          );
          defaultPlatformId = wmPlatform?._id || "";
        } else if (activeTab === "shopify") {
          const sfPlatform = sortedPlatforms.find(
            (p) =>
              p.plt_name.toLowerCase().includes("shopify") ||
              p.plt_prefix.toLowerCase().includes("sf")
          );
          defaultPlatformId = sfPlatform?._id || "";
        } else if (activeTab === "amazon") {
          const amPlatform = sortedPlatforms.find(
            (p) =>
              p.plt_name.toLowerCase().includes("amazon") ||
              p.plt_prefix.toLowerCase().includes("am")
          );
          defaultPlatformId = amPlatform?._id || "";
        }

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

  // Fetch merged products for the order (used to compute base total for merged items)
  const fetchMergedProducts = async () => {
    try {
      if (!selectedOrder?.orderId) return;
      const res = await apiClient.get(
        `/api/v1/products/mapped/product/${encodeURIComponent(
          selectedOrder.orderId
        )}`
      );
      setMergedProducts(
        Array.isArray(res.data?.product) ? res.data.product : []
      );
    } catch (err) {
      // Not fatal for the modal; just log
      console.error("Error fetching merged products:", err);
    }
  };

  // Fetch products for the modal
  const fetchProducts = async ({ queryKey }) => {
    const [_, search, productType] = queryKey;

    const response = await apiClient.get(
      `/api/v1/products/all?type=${productType}`,
      {
        params: {
          search,
        },
      }
    );
    return response.data;
  };

  // Fetch existing mapped products for editing
  const fetchExistingMappedProducts = async (productId) => {
    try {
      // For Walmart, we need to use the SKU for the API call
      let productIdToSend = productId;
      if (activeTab === "walmart") {
        const order = orderDetails?.order?.order;
        const lineItem = order?.orderLines?.orderLine?.find(
          (line) => (line.lineNumber || line.orderLineId) === productId
        );
        productIdToSend = lineItem?.item?.sku || productId;
      }

      const response = await apiClient.get(
        `/api/v1/kit/details/${encodeURIComponent(productIdToSend)}`
      );
      if (response.data.success) {
        const mappedProducts =
          response.data.kit?.skus?.map((sku) => ({
            _id: sku.pId._id,
            pro_title: sku?.pId?.pro_title || "Product",
            quantity: parseInt(sku.quantity) || 1,
            sale_price: sku?.pId?.sale_price || 0,
          })) || [];
        setSelectedProducts(mappedProducts);
      }
    } catch (error) {
      // Only log error if it's not a 404 (which is expected when adding new products)
      if (error.response?.status !== 404) {
        console.error("Error fetching existing mapped products:", error);
      }
    }
  };

  const { data: productsData, isLoading: productsLoading } = useQuery({
    queryKey: ["products", debouncedSearchTerm, productType],
    queryFn: fetchProducts,
    enabled:
      visible &&
      ((debouncedSearchTerm && debouncedSearchTerm.length > 0) ||
        !!productType),
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

  // Helper: get base total for the current line (supports merged products)
  const getWooCommerceLineTotal = () => {
    const order = orderDetails?.order;
    const selId = String(selectedLineItemId || "");

    // Find by either Woo line item id or product_id, comparing as strings
    const lineItem = (order?.line_items || []).find((item) => {
      const byId = String(item?.id ?? "") === selId;
      const byProdId = String(item?.product_id ?? "") === selId;
      return byId || byProdId;
    });

    // Prefer Woo's total if present; it's usually a string
    let lineItemTotal = Number.parseFloat(lineItem?.total);

    // Fallback to price * quantity if total is missing/zero/NaN
    if (!Number.isFinite(lineItemTotal) || lineItemTotal <= 0) {
      const unitPrice = Number.parseFloat(lineItem?.price);
      const qty = Number(lineItem?.quantity || 1);
      if (Number.isFinite(unitPrice) && qty > 0) {
        lineItemTotal = unitPrice * qty;
      }
    }

    // Final fallback: use merged mapping price when applicable
    if (
      (!Number.isFinite(lineItemTotal) || lineItemTotal <= 0) &&
      Array.isArray(mergedProducts) &&
      mergedProducts.length > 0
    ) {
      const idStr = String(selectedLineItemId || "");
      const foundMerged = mergedProducts.find((mp) =>
        (mp?.productIds || []).map(String).includes(idStr)
      );
      if (foundMerged) {
        const mergedPrice = Number.parseFloat(foundMerged.price);
        if (Number.isFinite(mergedPrice)) lineItemTotal = mergedPrice;
      }
    }

    return Number.isFinite(lineItemTotal) ? lineItemTotal : 0;
  };

  const handlePrice = (sale_price) => {
    const price = sale_price || 0;

    if (activeTab === "woocommerce") {
      const lineItemTotal = getWooCommerceLineTotal();

      const totalSalePriceOfSelectedProducts = selectedProducts.reduce(
        (acc, product) => acc + (product.sale_price || 0) * product.quantity,
        0
      );
      if (totalSalePriceOfSelectedProducts > 0) {
        return (lineItemTotal / totalSalePriceOfSelectedProducts) * price;
      }
    } else if (activeTab === "walmart") {
      const order = orderDetails?.order?.order;
      const lineItem = order?.orderLines?.orderLine?.find(
        (line) => (line.lineNumber || line.orderLineId) === selectedLineItemId
      );

      const productCharge = lineItem?.charges?.charge?.find(
        (charge) => charge?.chargeType === "PRODUCT"
      );
      const lineItemTotal = productCharge?.chargeAmount?.amount || 0;

      const totalSalePriceOfSelectedProducts = selectedProducts.reduce(
        (acc, product) => acc + (product.sale_price || 0) * product.quantity,
        0
      );
      if (totalSalePriceOfSelectedProducts > 0) {
        return (lineItemTotal / totalSalePriceOfSelectedProducts) * price;
      }
    } else if (activeTab === "shopify") {
      // For Shopify, compute line item total from GraphQL line item (price x qty)
      const order = orderDetails?.order;
      const node = order?.lineItems?.edges?.find(
        (edge) => edge?.node?.id === selectedLineItemId
      )?.node;
      let lineItemTotal = 0;
      if (node) {
        const unitAmount = parseFloat(
          node?.originalUnitPriceSet?.shopMoney?.amount || 0
        );
        const qty = node?.quantity || 1;
        lineItemTotal = unitAmount * qty;
      }

      // If not found or zero, try merged products price
      if (
        !lineItemTotal &&
        Array.isArray(mergedProducts) &&
        mergedProducts.length > 0
      ) {
        const idStr = String(selectedLineItemId || "");
        const foundMerged = mergedProducts.find((mp) =>
          (mp?.productIds || []).map(String).includes(idStr)
        );
        if (foundMerged) {
          lineItemTotal = parseFloat(foundMerged.price || 0);
        }
      }

      const totalSalePriceOfSelectedProducts = selectedProducts.reduce(
        (acc, product) => acc + (product.sale_price || 0) * product.quantity,
        0
      );
      if (totalSalePriceOfSelectedProducts > 0) {
        return (lineItemTotal / totalSalePriceOfSelectedProducts) * price;
      }
    }
    return price;
  };

  // Get the selected line item's quantity based on platform
  const getSelectedLineItemQuantity = () => {
    try {
      if (!selectedLineItemId) return 1;

      if (activeTab === "woocommerce") {
        const order = orderDetails?.order;
        const lineItem = order?.line_items?.find(
          (item) =>
            String(item?.id) === String(selectedLineItemId) ||
            String(item?.product_id) === String(selectedLineItemId)
        );
        const qty = Number(lineItem?.quantity || 1);
        return Number.isFinite(qty) && qty > 0 ? qty : 1;
      }

      if (activeTab === "walmart") {
        const order = orderDetails?.order?.order;
        const lineItem = order?.orderLines?.orderLine?.find(
          (line) =>
            String(line?.lineNumber || line?.orderLineId) ===
            String(selectedLineItemId)
        );
        const qty = Number(lineItem?.orderLineQuantity?.amount || 1);
        return Number.isFinite(qty) && qty > 0 ? qty : 1;
      }

      if (activeTab === "shopify") {
        const order = orderDetails?.order;
        const node = order?.lineItems?.edges?.find(
          (edge) => String(edge?.node?.id) === String(selectedLineItemId)
        )?.node;
        const qty = Number(node?.quantity || 1);
        return Number.isFinite(qty) && qty > 0 ? qty : 1;
      }
    } catch (e) {
      console.error("Failed to get selected line item quantity", e);
    }
    return 1;
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
      const timestamp = new Date().getTime();
      const uniqueProductTitle = `${
        selectedProducts[0]?.pro_title || "Product"
      } - ${timestamp}`;

      let productIdToSend = selectedLineItemId;
      if (activeTab === "walmart") {
        const order = orderDetails?.order?.order;
        const lineItem = order?.orderLines?.orderLine?.find(
          (line) => (line.lineNumber || line.orderLineId) === selectedLineItemId
        );
        productIdToSend = lineItem?.item?.sku || selectedLineItemId;
      }

      // Get the total number of line items/orders in the order
      let orderQty = "1"; // Default value

      if (activeTab === "woocommerce") {
        let lineItems = [...(orderDetails?.order?.line_items || [])];

        // Loop over each merged product
        (mergedProducts || []).forEach((mp) => {
          const mpIds = (mp?.productIds || []).map(String);

          const allMatch = mpIds.every((pid) =>
            lineItems.some((li) => String(li.product_id) === pid)
          );

          if (allMatch) {
            lineItems = lineItems.filter(
              (li) => !mpIds.includes(String(li.product_id))
            );

            lineItems.push({
              id: `merged-${mpIds.join("-")}`,
              name: mp.pro_title || "Merged Product",
              price: mp.price || 0,
              quantity: 1,
              product_id: mpIds.join(","),
              mergedFrom: mpIds,
            });
          }
        });

        orderQty = String(lineItems.length || 1);
      } else if (activeTab === "walmart") {
        // Count total order lines in Walmart order
        orderQty =
          orderDetails?.order?.order?.orderLines?.orderLine?.length?.toString() ||
          "1";
      } else if (activeTab === "shopify") {
        // Compute number of effective line items (accounting for merged products)
        let nodes = [
          ...(orderDetails?.order?.lineItems?.edges || []).map((e) => e.node),
        ];
        (mergedProducts || []).forEach((mp) => {
          const mpIds = (mp?.productIds || []).map(String);
          const allMatch = mpIds.every((pid) =>
            nodes.some((li) => String(li.id) === pid)
          );
          if (allMatch) {
            nodes = nodes.filter((li) => !mpIds.includes(String(li.id)));
            nodes.push({
              id: `merged-${mpIds.join("-")}`,
              name: mp.pro_title || "Merged Product",
            });
          }
        });
        orderQty = String(nodes.length || 1);
      }
      console.log("orderQty", orderQty);

      // Multiply picking quantities by the selected line item's quantity
      const lineQty = getSelectedLineItemQuantity();

      const payload = {
        plateform_id: selectedPlatformId,
        productId: productIdToSend,
        orderId: selectedOrder?.orderId || "",
        product_title: uniqueProductTitle,
        skus: selectedProducts.map((product) => ({
          pId: product._id,
          quantity: String(Number(product.quantity || 1) * lineQty),
          price: handlePrice(product.sale_price).toFixed(2),
        })),
        orderQty: orderQty,
      };
      console.log("payload", payload);

      const response = await apiClient.post("/api/v1/kit/add", payload);
      console.log("response", response);
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

        onSuccess(productIdToSend);
        // Auto-link same kit to remaining merged product ids so backend marks all mapped
        try {
          if (
            activeTab === "woocommerce" &&
            Array.isArray(mergedProducts) &&
            mergedProducts.length > 0
          ) {
            const selIdStr = String(selectedLineItemId);
            const merged = mergedProducts.find((mp) =>
              (mp?.productIds || []).map(String).includes(selIdStr)
            );
            if (merged) {
              const remainingIds = (merged.productIds || [])
                .map(String)
                .filter((id) => id !== String(productIdToSend));
              for (const otherId of remainingIds) {
                const extraPayload = {
                  ...payload,
                  productId: otherId,
                  orderQty: "1",
                };
                try {
                  const linkRes = await apiClient.post(
                    "/api/v1/kit/add",
                    extraPayload
                  );
                  if (linkRes?.data?.success) {
                    onSuccess(otherId);
                  }
                } catch (linkErr) {
                  console.error(
                    "Failed to link kit to merged id",
                    otherId,
                    linkErr
                  );
                }
              }
            }
          }
        } catch (mergeLinkErr) {
          console.error("Merged linking pass failed", mergeLinkErr);
        }

        handleModalClose();
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
    setSelectedProducts([]);
    setSearchQuery("");
    setSelectedPlatformId("");
    onCancel();
  };

  // Fetch platforms when modal opens
  useEffect(() => {
    if (visible) {
      fetchPlatforms();
      fetchMergedProducts();
      if (selectedLineItemId) {
        // Check if this line item already has mapped products
        let productIdToCheck = selectedLineItemId;

        // For Walmart, we need to check using the SKU since that's what's stored in mapped_products
        if (activeTab === "walmart") {
          const order = orderDetails?.order?.order;
          const lineItem = order?.orderLines?.orderLine?.find(
            (line) =>
              (line.lineNumber || line.orderLineId) === selectedLineItemId
          );
          productIdToCheck = lineItem?.item?.sku || selectedLineItemId;
        }

        const isEditing = selectedOrder?.kit_products?.includes(
          productIdToCheck?.toString()
        );
        if (isEditing) {
          fetchExistingMappedProducts(selectedLineItemId);
        }
      }
    }
  }, [visible, activeTab, selectedOrder?.plateform_id, selectedLineItemId]);

  return (
    <div ref={fullscreenRef}>
      <Modal
        getContainer={getContainer}
        key={String(isFullscreen)}
        title="Add Products to Order"
        open={visible}
        onCancel={handleModalClose}
        footer={
          <div className="flex justify-end gap-2">
            <Button onClick={handleModalClose}>Cancel</Button>
            <Button
              type="primary"
              onClick={handleSubmit}
              loading={isSubmitting}
              disabled={selectedProducts.length === 0}
              className="bg-green-600 border-green-600"
            >
              {isSubmitting ? "Creating..." : "Create"}
            </Button>
          </div>
        }
        width={800}
        destroyOnClose
        centered
      >
        <div className="space-y-4">
          {/* Platform Selection Dropdown */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Platform
            </label>
            <Select
              placeholder="Select Platform"
              value={selectedPlatformId}
              onChange={handlePlatformChange}
              loading={platformsLoading}
              style={{ width: "100%" }}
              size="large"
              disabled={true}
              className="text-black"
            >
              {platforms.map((platform) => (
                <Option key={platform._id} value={platform._id}>
                  {platform.plt_name}
                </Option>
              ))}
            </Select>
          </div>

          {/* Categories */}
          <div className="relative">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Product Type
            </label>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {productTypes.map((type) => (
                <button
                  key={type.code}
                  type="button"
                  onClick={() => {
                    setProductType(type.code);
                  }}
                  className={`
                              p-2 rounded-lg border text-sm font-medium transition-all duration-200
                              ${
                                productType === type.code
                                  ? "border-blue-500 bg-blue-50 text-blue-700 shadow-sm"
                                  : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                              }
                            `}
                >
                  {type.label}
                </button>
              ))}
            </div>
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
                        Sale Price: ${product?.sale_price || 0}
                      </p>
                      <p className="text-xs text-gray-500">
                        Calculated Price: $
                        {Math.floor(
                          handlePrice(product?.sale_price || 0) * 100
                        ) / 100}
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
    </div>
  );
}
