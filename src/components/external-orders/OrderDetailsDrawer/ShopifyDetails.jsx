import React, { useEffect, useMemo, useState } from "react";
import { Card, Row, Col, Tag, Button, Checkbox, message } from "antd";
import apiClient from "../../../api/client";
import Swal from "sweetalert2";

export default function ShopifyDetails({
  order,
  selectedOrder,
  onAddProduct,
  onEditProduct,
  refetchOrderDetails,
  onProductMappingSuccess,
  localKitProducts = [],
}) {
  const [selectedItems, setSelectedItems] = useState([]);
  const [isMerging, setIsMerging] = useState(false);
  const [mergedProducts, setMergedProducts] = useState([]);


  // Load merged products for this order
  const loadMergedProducts = async () => {
    if (!selectedOrder?.orderId) return;
    try {
      const mergedRes = await apiClient.get(
        `/api/v1/products/mapped/product/${encodeURIComponent(
          selectedOrder.orderId
        )}`
      );
      setMergedProducts(
        Array.isArray(mergedRes.data?.product) ? mergedRes.data.product : []
      );
    } catch (err) {
      console.error("Failed to fetch merged products", err);
    }
  };

  useEffect(() => {
    loadMergedProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedOrder?.orderId]);

  // Compute hidden line item ids from merged productIds
  const hiddenLineItemIds = useMemo(() => {
    const set = new Set();
    if (Array.isArray(mergedProducts)) {
      mergedProducts.forEach((mp) => {
        (mp?.productIds || []).forEach((id) => set.add(String(id)));
      });
    }
    return set;
  }, [mergedProducts]);

  // Helper function to format date
  const formatDate = (dateString) => {
    if (!dateString) return "—";
    return (
      dateString.split("T")[0] + ", " + dateString.split("T")[1].split(".")[0]
    );
  };

  // Helper function to format currency
  const formatCurrency = (amount, currencyCode = "USD") => {
    if (!amount) return "$0.00";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currencyCode,
    }).format(parseFloat(amount));
  };

  // Get order status message with background highlighting
  const getOrderStatusMessage = (selectedOrder) => {
    const shopifyDetails = selectedOrder?.shopifyDetails;
    if (!shopifyDetails) return null;

    // Check for fraud
    if (shopifyDetails.cancel_reason === "fraud") {
      return {
        message:
          "⚠️ This order has a high risk of fraud and should be reviewed carefully.",
        bgColor: "bg-red-50 border-red-200",
        textColor: "text-red-800",
        icon: "🚨",
      };
    }

    // Check for cancelled orders
    if (shopifyDetails.cancelled_at) {
      const cancelReason = shopifyDetails.cancel_reason;
      const reasonText =
        {
          customer: "Customer requested cancellation",
          staff: "Cancelled by staff",
          inventory: "Cancelled due to inventory issues",
          fraud: "Cancelled due to fraud detection",
        }[cancelReason] || `Cancelled: ${cancelReason || "Unknown reason"}`;

      return {
        message: `❌ Order cancelled: ${reasonText}`,
        bgColor: "bg-orange-50 border-orange-200",
        textColor: "text-orange-800",
        icon: "⚠️",
      };
    }

    // Check for refunded orders
    // if (shopifyDetails.financial_status === "refunded") {
    //   return {
    //     message: "💸 This order has been refunded.",
    //     bgColor: "bg-blue-50 border-blue-200",
    //     textColor: "text-blue-800",
    //     icon: "💰"
    //   };
    // }

    return null;
  };

  // Helper function to resolve product URL
  const resolveProductUrl = (node) => {
    if (!node) return null;
    
    // Try to get onlineStoreUrl from product
    if (node?.product?.onlineStoreUrl) {
      return node.product.onlineStoreUrl;
    }
    
    // Fallback: construct URL from handle
    const handle = node?.product?.handle;
    if (handle) {
      return `https://retrofam.com/products/${handle}`;
    }
    
    // If product is null or doesn't have handle, return null
    return null;
  };

  // Handle checkbox selection
  const handleItemSelect = (itemId, checked) => {
    if (checked) {
      setSelectedItems((prev) => [...prev, itemId]);
    } else {
      setSelectedItems((prev) => prev.filter((id) => id !== itemId));
    }
  };

  // Handle merge items
  const handleMergeItems = async () => {
    if (selectedItems.length < 2) {
      message.warning("Please select at least 2 items to merge");
      return;
    }

    setIsMerging(true);
    try {
      // Build items to merge from selected nodes
      // Check both product.id and node.id for backward compatibility
      const itemsToMerge =
        order?.lineItems?.edges
          ?.filter((edge) => 
            selectedItems.includes(edge.node?.product?.id) ||
            selectedItems.includes(edge.node?.id)
          )
          ?.map((edge) => edge.node) || [];

      if (!itemsToMerge || itemsToMerge.length < 2) {
        message.error("Invalid items selected for merging");
        return;
      }

      // Attribute extraction (enhanced similar to WooCommerce)
      const extractProductAttributes = (items) => {
        let storageCode = "DEFAULT";
        let colorCode = "DEFAULT";
        let typeCode = "CON";
        let brandCode = "NIN";
        let modelCode = "DEFAULT";
        let conditionCode = "N";

        const storagePatterns = [
          { pattern: /(\d+)\s*GB/i, code: "GB" },
          { pattern: /(\d+)\s*TB/i, code: "TB" },
          { pattern: /^\d+GB$/i, code: "GB" },
          { pattern: /^\d+TB$/i, code: "TB" },
        ];
        const colorPatterns = [
          { pattern: /black/i, code: "BLK" },
          { pattern: /white/i, code: "WHT" },
          { pattern: /blue/i, code: "BLU" },
          { pattern: /red/i, code: "RED" },
          { pattern: /green/i, code: "GRN" },
          { pattern: /silver/i, code: "SLV" },
          { pattern: /gold/i, code: "GLD" },
        ];
        const brandPatterns = [
          { pattern: /nintendo/i, code: "NIN" },
          { pattern: /sony/i, code: "SNY" },
          { pattern: /play\s*station|playstation|ps\s*\d+/i, code: "SNY" },
          { pattern: /microsoft|xbox/i, code: "MSF" },
          { pattern: /sega/i, code: "SEG" },
        ];
        const typePatterns = [
          { pattern: /console|system/i, code: "CON" },
          { pattern: /game/i, code: "GAM" },
          {
            pattern:
              /accessory|controller|adapter|cable|memory\s*card|hdmi|av\s*to\s*hdmi/i,
            code: "ACC",
          },
        ];
        const conditionPatterns = [
          { pattern: /new/i, code: "N" },
          { pattern: /used|pre[-\s]*owned|preowned/i, code: "U" },
          { pattern: /refurb/i, code: "R" },
          { pattern: /sealed/i, code: "S" },
        ];

        let mainProduct = items[0];
        items.forEach((it) => {
          const nm = (it?.name || "").toLowerCase();
          if (!mainProduct || nm.length > (mainProduct?.name || "").length) {
            mainProduct = it;
          }
        });

        items.forEach((it) => {
          const nm = (it?.name || "").toLowerCase();
          let matched = false;
          for (const p of storagePatterns) {
            const m = nm.match(p.pattern);
            if (m) {
              storageCode = `${m[1]}${p.code}`;
              matched = true;
              break;
            }
          }
          if (matched) return;
          for (const p of colorPatterns) {
            if (p.pattern.test(nm)) {
              colorCode = p.code;
              matched = true;
              break;
            }
          }
          if (matched) return;
          for (const p of conditionPatterns) {
            if (p.pattern.test(nm)) {
              conditionCode = p.code;
              break;
            }
          }
        });

        if (mainProduct) {
          const mainNm = (mainProduct?.name || "").toLowerCase();
          for (const p of brandPatterns) {
            if (p.pattern.test(mainNm)) {
              brandCode = p.code;
              break;
            }
          }
          for (const p of typePatterns) {
            if (p.pattern.test(mainNm)) {
              typeCode = p.code;
              break;
            }
          }

          // model detection similar to WooCommerce
          const modelPatterns = [
            /(ps\s*5|ps5)/i,
            /(ps\s*4|ps4)/i,
            /(ps\s*3|ps3)/i,
            /(ps\s*2|ps2)/i,
            /(ps\s*1|psx|psone)/i,
            /(xbox\s*series\s*x|xbox\s*series\s*s|xbox\s*one|xbox\s*360)/i,
            /(switch)/i,
            /(wii\s*u|wii)/i,
            /(gamecube)/i,
            /(n64)/i,
            /(snes)/i,
            /(nes)/i,
            /(genesis)/i,
            /(dreamcast)/i,
            /(saturn)/i,
            /(mega\s*drive)/i,
          ];
          for (const mp of modelPatterns) {
            const m = mainNm.match(mp);
            if (m) {
              modelCode = m[0].toUpperCase().replace(/\s+/g, "");
              break;
            }
          }
        }

        return {
          storageCode,
          colorCode,
          typeCode,
          brandCode,
          modelCode,
          conditionCode,
        };
      };

      const attrs = extractProductAttributes(itemsToMerge);

      // Use product.id as primary ID, fallback to node.id for backward compatibility
      const productIdsList = itemsToMerge.map((it) => 
        String(it?.product?.id || it?.id)
      );
      let skuString =
        itemsToMerge
          .map((it) => it?.sku)
          .filter(Boolean)
          .join("_") || productIdsList.join("_");

      // Fallback SKU synthesis if still empty (should not happen)
      if (!skuString || skuString.trim().length === 0) {
        const safe = [
          attrs.typeCode,
          attrs.brandCode,
          attrs.modelCode,
          attrs.storageCode,
          attrs.colorCode,
          attrs.conditionCode,
        ]
          .map((s) =>
            String(s || "STD")
              .toUpperCase()
              .replace(/[^A-Z0-9]+/g, "")
          )
          .filter(Boolean)
          .join("-");
        skuString = safe || productIdsList.join("_");
      }

      const sumAmount = (arr) =>
        arr.reduce((sum, it) => {
          const unit = parseFloat(
            it?.originalUnitPriceSet?.shopMoney?.amount || 0
          );
          const qty = Number(it?.quantity || 1);
          return sum + unit * qty;
        }, 0);

      // Ensure minimally required fields are populated
      const safeType = attrs.typeCode || "CON";
      const safeBrand = attrs.brandCode || "SNY"; // default to SNY when PlayStation-like
      const safeModel =
        attrs.modelCode && attrs.modelCode !== "DEFAULT"
          ? attrs.modelCode
          : "STD";
      const safeStorage = attrs.storageCode || "STD";
      const safeColor = attrs.colorCode || "STD";
      const safeCond = attrs.conditionCode || "U";

      const combinedData = {
        // Use product.id as primary ID, fallback to node.id for backward compatibility
        wc_id: itemsToMerge?.[0]?.product?.id || itemsToMerge?.[0]?.id, // align with WooCommerce payload key expected by API
        pro_title: itemsToMerge.map((it) => it?.name).join(" + "),
        sku: skuString,
        type_code: safeType,
        brnd_code: safeBrand,
        model_code: safeModel,
        storage_code: safeStorage,
        color_code: safeColor,
        cnd_code: safeCond,
        regular_price: sumAmount(itemsToMerge).toFixed(2),
        price: sumAmount(itemsToMerge).toFixed(2),
        sale_price: sumAmount(itemsToMerge).toFixed(2),
        order_Id: selectedOrder?.orderId,
        plateformId:
          selectedOrder?.plateform_id || selectedOrder?.platform_id || "N/A",
        productIds: productIdsList,
      };

      // Basic client-side validation to avoid backend "required field missing"
      const requiredKeys = [
        "wc_id",
        "pro_title",
        "sku",
        "type_code",
        "brnd_code",
        "model_code",
        "cnd_code",
        "price",
        "order_Id",
        "plateformId",
        "productIds",
      ];
      for (const k of requiredKeys) {
        if (
          combinedData[k] === undefined ||
          combinedData[k] === null ||
          (typeof combinedData[k] === "string" &&
            combinedData[k].toString().trim() === "") ||
          (Array.isArray(combinedData[k]) && combinedData[k].length === 0)
        ) {
          throw new Error(`Missing required field: ${k}`);
        }
      }

      const response = await apiClient.post(
        "/api/v1/products/mapped/add",
        combinedData
      );

      if (response?.data?.success) {
        Swal.fire({
          icon: "success",
          title: "Items Merged Successfully!",
          text: `${selectedItems.length} items have been merged into a single product.`,
          toast: true,
          position: "top-end",
          showConfirmButton: false,
          timer: 3000,
          timerProgressBar: true,
          background: "#10b981",
          color: "#fff",
          customClass: { popup: "rounded-lg" },
        });

        setSelectedItems([]);
        await loadMergedProducts();

        if (refetchOrderDetails) refetchOrderDetails();
        if (onProductMappingSuccess) onProductMappingSuccess();
      } else {
        throw new Error(response?.data?.message || "Failed to merge items");
      }
    } catch (error) {
      console.error("Error merging items:", error);
      message.error(error.response?.data?.message || "Failed to merge items");
    } finally {
      setIsMerging(false);
    }
  };

  // Calculate selected items total
  const selectedItemsTotal = useMemo(() => {
    if (!order?.lineItems?.edges) return 0;

    return order.lineItems.edges
      .filter((edge) => 
        selectedItems.includes(edge.node?.product?.id) ||
        selectedItems.includes(edge.node?.id)
      )
      .reduce((total, edge) => {
        const price = parseFloat(
          edge.node.originalUnitPriceSet?.shopMoney?.amount || "0"
        );
        const quantity = edge.node.quantity || 1;
        return total + price * quantity;
      }, 0);
  }, [selectedItems, order?.lineItems?.edges]);

  // Get all line items as array
  // Use product.id as the primary identifier, fallback to node.id for backward compatibility
  const lineItems = useMemo(() => {
    if (!order?.lineItems?.edges) return [];
    return order.lineItems.edges.map((edge) => ({
      ...edge.node,
      id: edge.node?.product?.id || edge.node?.id, // Use product.id as primary ID
      originalNodeId: edge.node?.id, // Keep original for reference
    }));
  }, [order?.lineItems?.edges]);

  // Get line items (excluding merged ones)
  // Use product.id as the primary identifier, fallback to node.id for backward compatibility
  const visibleLineItems = useMemo(() => {
    if (!order?.lineItems?.edges) return [];

    return order.lineItems.edges
      .map((edge) => ({
        ...edge.node,
        id: edge.node?.product?.id || edge.node?.id, // Use product.id as primary ID
        originalNodeId: edge.node?.id, // Keep original for reference
      }))
      .filter((item) => 
        !hiddenLineItemIds.has(item.id) && 
        !hiddenLineItemIds.has(item.originalNodeId)
      );
  }, [order?.lineItems?.edges, hiddenLineItemIds]);

  const statusMessage = getOrderStatusMessage(selectedOrder);

  return (
    <div className="space-y-4">
      {/* Status Message */}
      {statusMessage && (
        <div className={`p-4 rounded-lg border-2 ${statusMessage.bgColor}`}>
          <div className="flex items-center gap-2">
            <span className="text-lg">{statusMessage.icon}</span>
            <span className={`font-medium ${statusMessage.textColor}`}>
              {statusMessage.message}
            </span>
          </div>
        </div>
      )}

  

      {/* Order Information */}
      <Card
        size="small"
        title="Order Information"
        className="border border-blue-200 rounded-lg shadow-sm"
      >
        <div className="text-gray-700 space-y-2">
          <dl className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <div className="flex">
              <dt className="w-20 font-semibold text-gray-800">Order ID:</dt>
              <dd className="text-gray-700">
                {order?.id?.replace("gid://shopify/Order/", "") || order?.id}
              </dd>
            </div>
            <div className="flex">
              <dt className="w-20 font-semibold text-gray-800">Name:</dt>
              <dd className="text-gray-700">{order?.name}</dd>
            </div>
            <div className="flex">
              <dt className="w-20 font-semibold text-gray-800">Email:</dt>
              <dd className="text-gray-700">{order?.email || "—"}</dd>
            </div>
            <div className="flex">
              <dt className="w-20 font-semibold text-gray-800">Phone:</dt>
              <dd className="text-gray-700">{order?.phone || "—"}</dd>
            </div>
            <div className="flex">
              <dt className="w-20 font-semibold text-gray-800">Total:</dt>
              <dd className="text-gray-700">
                {formatCurrency(
                  order?.totalPriceSet?.shopMoney?.amount,
                  order?.totalPriceSet?.shopMoney?.currencyCode
                )}
              </dd>
            </div>
            <div className="flex">
              <dt className="w-20 font-semibold text-gray-800">Status:</dt>
              <dd className="text-gray-700">
                <Tag color="blue">{order?.displayFinancialStatus}</Tag>
              </dd>
            </div>
            <div className="flex">
              <dt className="w-20 font-semibold text-gray-800">Fulfillment:</dt>
              <dd className="text-gray-700">
                <Tag color="orange">{order?.displayFulfillmentStatus}</Tag>
              </dd>
            </div>
            <div className="flex">
              <dt className="w-20 font-semibold text-gray-800">Date:</dt>
              <dd className="text-gray-700">{formatDate(order?.createdAt)}</dd>
            </div>
          </dl>
        </div>
      </Card>

      {/* Payment & Totals */}
      <Card
        size="small"
        title="Payment & Totals"
        className="border border-green-200 rounded-lg shadow-sm"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-gray-700">
          <dl className="space-y-2">
            <div className="flex">
              <dt className="w-28 font-semibold text-gray-800">Payment:</dt>
              <dd className="text-gray-700">
                {(order?.paymentGatewayNames || []).join(", ") || "—"}
              </dd>
            </div>
            <div className="flex">
              <dt className="w-28 font-semibold text-gray-800">Confirm #:</dt>
              <dd className="text-gray-700">
                {order?.confirmationNumber || "—"}
              </dd>
            </div>
            <div className="flex">
              <dt className="w-28 font-semibold text-gray-800">Locale:</dt>
              <dd className="text-gray-700">{order?.customerLocale || "—"}</dd>
            </div>
          </dl>
          <dl className="space-y-2">
            <div className="flex">
              <dt className="w-28 font-semibold text-gray-800">Subtotal:</dt>
              <dd className="text-gray-700">
                {formatCurrency(
                  order?.subtotalPriceSet?.shopMoney?.amount,
                  order?.subtotalPriceSet?.shopMoney?.currencyCode ||
                    order?.totalPriceSet?.shopMoney?.currencyCode
                )}
              </dd>
            </div>
            <div className="flex">
              <dt className="w-28 font-semibold text-gray-800">Discounts:</dt>
              <dd className="text-gray-700">
                {formatCurrency(
                  order?.totalDiscountsSet?.shopMoney?.amount,
                  order?.totalDiscountsSet?.shopMoney?.currencyCode ||
                    order?.totalPriceSet?.shopMoney?.currencyCode
                )}
              </dd>
            </div>
            <div className="flex">
              <dt className="w-28 font-semibold text-gray-800">Tax:</dt>
              <dd className="text-gray-700">
                {formatCurrency(
                  order?.totalTaxSet?.shopMoney?.amount,
                  order?.totalTaxSet?.shopMoney?.currencyCode ||
                    order?.totalPriceSet?.shopMoney?.currencyCode
                )}
              </dd>
            </div>
          </dl>
        </div>
      </Card>

      {/* Billing Address */}
      {/* <Card
        size="small"
        title="Billing Address"
        className="border border-blue-200 rounded-lg shadow-sm"
      >
        <div className="text-gray-700 space-y-2">
          <div>
            <span className="font-semibold">Name:</span>{" "}
            {order?.billingAddress?.firstName} {order?.billingAddress?.lastName}
          </div>
          <div>
            <span className="font-semibold">Address:</span>{" "}
            {[
              order?.billingAddress?.address1,
              order?.billingAddress?.address2,
              order?.billingAddress?.city,
              order?.billingAddress?.province,
              order?.billingAddress?.zip,
              order?.billingAddress?.country,
            ]
              .filter(Boolean)
              .join(", ")}
          </div>
          {order?.billingAddress?.phone && (
            <div>
              <span className="font-semibold">Phone:</span>{" "}
              {order.billingAddress.phone}
            </div>
          )}
        </div>
      </Card> */}

      {/* Shipping Address */}
      {/* <Card
        size="small"
        title="Shipping Address"
        className="border border-purple-200 rounded-lg shadow-sm"
      >
        <div className="text-gray-700 space-y-2">
          <div>
            <span className="font-semibold">Name:</span>{" "}
            {order?.shippingAddress?.firstName}{" "}
            {order?.shippingAddress?.lastName}
          </div>
          <div>
            <span className="font-semibold">Address:</span>{" "}
            {[
              order?.shippingAddress?.address1,
              order?.shippingAddress?.address2,
              order?.shippingAddress?.city,
              order?.shippingAddress?.province,
              order?.shippingAddress?.zip,
              order?.shippingAddress?.country,
            ]
              .filter(Boolean)
              .join(", ")}
          </div>
          {order?.shippingAddress?.phone && (
            <div>
              <span className="font-semibold">Phone:</span>{" "}
              {order.shippingAddress.phone}
            </div>
          )}
        </div>
      </Card> */}
      {/* Label Info */}
      {/* <Card
        size="small"
        title="Label Info"
        className="border border-green-200 rounded-lg shadow-sm"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-gray-700">
          <dl className="space-y-2">
            <div className="flex">
              <dt className="w-28 font-semibold text-gray-800">
                Carrier Code:
              </dt>
              <dd className="text-gray-700">
                {order?.dbInfo?.carrierCode || "—"}
              </dd>
            </div>
            <div className="flex">
              <dt className="w-28 font-semibold text-gray-800">
                Package Code:
              </dt>
              <dd className="text-gray-700">
                {order?.dbInfo?.packageCode || "—"}
              </dd>
            </div>
            <div className="flex">
              <dt className="w-28 font-semibold text-gray-800">Weight:</dt>
              <dd className="text-gray-700 capitalize">
                {order?.dbInfo?.weight?.value}, {order?.dbInfo?.weight?.units}
              </dd>
            </div>
            <div className="flex">
              <dt className="w-28 font-semibold text-gray-800">Dimensions:</dt>
              <dd className="text-gray-700 capitalize">
                Length: {order?.dbInfo?.dimensions?.length} <br />
                Width: {order?.dbInfo?.dimensions?.width} <br />
                Height: {order?.dbInfo.dimensions?.height} <br />
                Units: {order?.dbInfo?.dimensions?.units}
              </dd>
            </div>
          </dl>
        </div>
      </Card> */}

      {/* Order Items */}
      <Card size="small" title="Order Items" className="border-orange-200">
        {/* Show merged products from order.merged_products_data if present */}
        {Array.isArray(mergedProducts) && mergedProducts.length > 0 && (
          <div className="mb-4">
            <div className="text-sm font-semibold text-purple-700 mb-2">
              Merged Product(s)
            </div>
            <div className="space-y-2">
              {mergedProducts.map((mp) => {
                const actionId = String(
                  mp?.productIds?.[0] || mp?.shopify_id || ""
                );
                const firstProductId = mp?.productIds?.[0];
                const firstNode = lineItems.find(
                  (n) => String(n?.id) === String(firstProductId)
                );
                const hasMappedProducts =
                  !!actionId &&
                  ((Array.isArray(selectedOrder?.kit_products) &&
                    selectedOrder?.kit_products.includes(actionId)) ||
                    (Array.isArray(localKitProducts) &&
                      localKitProducts.includes(actionId)));
                return (
                  <div
                    key={mp._id}
                    className="flex justify-between items-center p-3 rounded border-2 border-purple-200 bg-purple-50"
                  >
                    <div>
                      <div className="font-bold text-purple-900">
                        {mp?.pro_title}
                      </div>
                      <div className="text-xs text-gray-700">
                        SKU: {mp?.sku}
                      </div>
                    </div>
                    <div className="space-y-1">
                      <div className="text-right ml-2">
                        <div className="font-semibold text-purple-900">
                          ${mp?.price}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <p className="px-2 py-1 bg-purple-200 text-purple-800 rounded text-xs font-medium">
                          Merged
                        </p>
                        {hasMappedProducts && (
                          <p className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs font-medium">
                            Mapped
                          </p>
                        )}
                        {resolveProductUrl(firstNode) && (
                          <Button
                            size="small"
                            type="link"
                            href={resolveProductUrl(firstNode)}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            View Listing
                          </Button>
                        )}
                        {actionId &&
                          (hasMappedProducts ? (
                            <button
                              className="text-sm text-blue-600 p-1.5 rounded-md bg-blue-100 hover:bg-blue-200 transition-colors"
                              onClick={() => onEditProduct(actionId)}
                            >
                              Edit
                            </button>
                          ) : (
                            <button
                              className="text-sm whitespace-nowrap text-gray-600 p-1.5 rounded-md bg-gray-200 hover:bg-gray-300 transition-colors"
                              onClick={() => onAddProduct(actionId)}
                            >
                              Add Picking
                            </button>
                          ))}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Merge Button */}
        {selectedItems.length > 0 && (
          <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-blue-800">
                  {selectedItems.length} item(s) selected
                </span>
                <span className="text-sm text-blue-600">
                  Total:{" "}
                  {formatCurrency(
                    selectedItemsTotal,
                    order?.totalPriceSet?.shopMoney?.currencyCode || "USD"
                  )}
                </span>
              </div>
              <Button
                type="primary"
                onClick={handleMergeItems}
                loading={isMerging}
                className="bg-green-600 hover:bg-green-700 border-green-600"
                size="small"
              >
                {isMerging ? "Merging..." : "Merge Selected Items"}
              </Button>
            </div>
          </div>
        )}

        {/* Line Items */}
        <div className="space-y-3">
          {visibleLineItems.map((item) => {
            const isSelected = selectedItems.includes(item.id);
            const hasMappedProducts =
              Array.isArray(selectedOrder?.kit_products) &&
              selectedOrder?.kit_products.includes(item.id);
            const hasLocalMappedProducts =
              Array.isArray(localKitProducts) &&
              localKitProducts.includes(item.id);

            return (
              <div
                key={item.id}
                className={`p-3 rounded-lg border-2 transition-all ${
                  isSelected
                    ? "border-blue-300 bg-blue-50"
                    : "border-gray-200 bg-white hover:border-gray-300"
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3 flex-1">
                    <Checkbox
                      checked={isSelected}
                      onChange={(e) =>
                        handleItemSelect(item.id, e.target.checked)
                      }
                      className="mt-1"
                    />
                    <div className="flex-1">
                      <div className="font-semibold text-gray-900 mb-1">
                        {item.name}
                      </div>
                      <div className="text-sm text-gray-600 space-y-1">
                        <div>Quantity: {item.quantity}</div>
                        {item.sku && <div>SKU: {item.sku}</div>}
                        {item.vendor && <div>Vendor: {item.vendor}</div>}
                        <div>
                          Price:{" "}
                          {formatCurrency(
                            item.originalUnitPriceSet?.shopMoney?.amount,
                            item.originalUnitPriceSet?.shopMoney?.currencyCode
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <div className="text-right">
                      <div className="font-semibold text-gray-900">
                        {formatCurrency(
                          parseFloat(
                            item.originalUnitPriceSet?.shopMoney?.amount || "0"
                          ) * item.quantity,
                          item.originalUnitPriceSet?.shopMoney?.currencyCode
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {(hasMappedProducts || hasLocalMappedProducts) && (
                        <p className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs font-medium">
                          Mapped
                        </p>
                      )}
                      {resolveProductUrl(item) && (
                        <Button
                          size="small"
                          type="link"
                          href={resolveProductUrl(item)}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          View Listing
                        </Button>
                      )}
                      {hasMappedProducts || hasLocalMappedProducts ? (
                        <button
                          className="text-sm text-blue-600 p-1.5 rounded-md bg-blue-100 hover:bg-blue-200 transition-colors"
                          onClick={() => onEditProduct(item.id)}
                        >
                          Edit
                        </button>
                      ) : (
                        <button
                          className="text-sm whitespace-nowrap text-gray-600 p-1.5 rounded-md bg-gray-200 hover:bg-gray-300 transition-colors"
                          onClick={() => onAddProduct(item.id)}
                        >
                          Add Picking
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {visibleLineItems.length === 0 && (
          <div className="text-center text-gray-500 py-8">
            No items available
          </div>
        )}
      </Card>
    </div>
  );
}
