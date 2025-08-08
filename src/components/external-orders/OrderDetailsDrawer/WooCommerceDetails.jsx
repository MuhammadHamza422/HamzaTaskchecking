import React, { useState } from "react";
import { Card, Row, Col, Tag, Button, Checkbox, message } from "antd";
import apiClient from "../../../api/client";
import Swal from "sweetalert2";

export default function WooCommerceDetails({
  order,
  selectedOrder,
  onAddProduct,
  onEditProduct,
  refetchOrderDetails,
  onProductMappingSuccess,
}) {
  const [selectedItems, setSelectedItems] = useState([]);
  const [isMerging, setIsMerging] = useState(false);
  const [localMergedIds, setLocalMergedIds] = useState([]);

  // Helper function to format date
  const formatDate = (dateString) => {
    if (!dateString) return "—";
    return (
      dateString.split("T")[0] + ", " + dateString.split("T")[1].split(".")[0]
    );
  };

  // Smart function to detect and extract product attributes from names
  const extractProductAttributes = (itemsToMerge) => {
    let storageCode = "DEFAULT";
    let colorCode = "DEFAULT";
    let typeCode = "CON";
    let brandCode = "NIN";
    let modelCode = "DEFAULT";
    let conditionCode = "N";

    // Common storage patterns
    const storagePatterns = [
      { pattern: /(\d+)\s*GB/i, code: "GB" },
      { pattern: /(\d+)\s*TB/i, code: "TB" },
      { pattern: /(\d+)\s*MB/i, code: "MB" },
      { pattern: /(\d+)\s*KB/i, code: "KB" },
      { pattern: /(\d+)\s*G/i, code: "GB" },
      { pattern: /(\d+)\s*T/i, code: "TB" },
      { pattern: /(\d+)\s*M/i, code: "MB" },
      // Handle cases without spaces
      { pattern: /^(\d+)GB$/i, code: "GB" },
      { pattern: /^(\d+)TB$/i, code: "TB" },
      { pattern: /^(\d+)MB$/i, code: "MB" },
      { pattern: /^(\d+)KB$/i, code: "KB" },
      { pattern: /^(\d+)G$/i, code: "GB" },
      { pattern: /^(\d+)T$/i, code: "TB" },
      { pattern: /^(\d+)M$/i, code: "MB" },
      // Handle cases with different formats
      { pattern: /^(\d+)\s*Gigabytes?$/i, code: "GB" },
      { pattern: /^(\d+)\s*Terabytes?$/i, code: "TB" },
      { pattern: /^(\d+)\s*Megabytes?$/i, code: "MB" },
      { pattern: /^(\d+)\s*Kilobytes?$/i, code: "KB" },
    ];

    // Common color patterns
    const colorPatterns = [
      { pattern: /^black$/i, code: "BLK" },
      { pattern: /^white$/i, code: "WHT" },
      { pattern: /^blue$/i, code: "BLU" },
      { pattern: /^red$/i, code: "RED" },
      { pattern: /^green$/i, code: "GRN" },
      { pattern: /^yellow$/i, code: "YLW" },
      { pattern: /^pink$/i, code: "PNK" },
      { pattern: /^purple$/i, code: "PUR" },
      { pattern: /^orange$/i, code: "ORG" },
      { pattern: /^brown$/i, code: "BRN" },
      { pattern: /^gray$|^grey$/i, code: "GRY" },
      { pattern: /^silver$/i, code: "SLV" },
      { pattern: /^gold$/i, code: "GLD" },
      { pattern: /^transparent$/i, code: "TRN" },
      { pattern: /^clear$/i, code: "CLR" },
      // Also check for colors within text
      { pattern: /black/i, code: "BLK" },
      { pattern: /white/i, code: "WHT" },
      { pattern: /blue/i, code: "BLU" },
      { pattern: /red/i, code: "RED" },
      { pattern: /green/i, code: "GRN" },
      { pattern: /yellow/i, code: "YLW" },
      { pattern: /pink/i, code: "PNK" },
      { pattern: /purple/i, code: "PUR" },
      { pattern: /orange/i, code: "ORG" },
      { pattern: /brown/i, code: "BRN" },
      { pattern: /gray|grey/i, code: "GRY" },
      { pattern: /silver/i, code: "SLV" },
      { pattern: /gold/i, code: "GLD" },
      { pattern: /transparent/i, code: "TRN" },
      { pattern: /clear/i, code: "CLR" },
    ];

    // Common brand patterns
    const brandPatterns = [
      { pattern: /nintendo/i, code: "NIN" },
      { pattern: /sony/i, code: "SNY" },
      { pattern: /microsoft/i, code: "MSF" },
      { pattern: /sega/i, code: "SEG" },
      { pattern: /retro/i, code: "RET" },
      { pattern: /coleco/i, code: "COL" },
      { pattern: /atari/i, code: "ATR" },
      { pattern: /intellivision/i, code: "INT" },
      { pattern: /snk/i, code: "SNV" },
      { pattern: /nec/i, code: "NEC" },
    ];

    // Common type patterns
    const typePatterns = [
      { pattern: /console/i, code: "CON" },
      { pattern: /handheld/i, code: "HAN" },
      { pattern: /game/i, code: "GAM" },
      { pattern: /accessory|controller|adapter/i, code: "ACC" },
    ];

    // Common condition patterns
    const conditionPatterns = [
      { pattern: /new/i, code: "N" },
      { pattern: /used/i, code: "U" },
      { pattern: /refurbished|refurb/i, code: "R" },
      { pattern: /complete\s*in\s*box|cib/i, code: "CIB" },
      { pattern: /loose/i, code: "L" },
      { pattern: /sealed/i, code: "S" },
      { pattern: /mint/i, code: "M" },
      { pattern: /good/i, code: "G" },
      { pattern: /acceptable/i, code: "A" },
      { pattern: /fair/i, code: "F" },
      { pattern: /poor/i, code: "P" },
      { pattern: /complete/i, code: "C" },
      { pattern: /incomplete/i, code: "I" },
      { pattern: /missing\s*manual/i, code: "MM" },
      { pattern: /missing\s*box/i, code: "MB" },
      { pattern: /missing\s*inserts/i, code: "MI" },
    ];

    // First, identify the main product (the one with the most descriptive name)
    let maxLength = 0;
    let mainProduct = null;
    
    // Keywords that indicate this is a main product
    const mainProductKeywords = [
      'console', 'system', 'game', 'controller', 'adapter', 'accessory', 
      'nintendo', 'sony', 'microsoft', 'sega', 'playstation', 'xbox', 'switch', 'wii', 'gamecube', 'genesis', 'dreamcast',
      'zelda', 'mario', 'pokemon', 'metroid', 'donkey kong', 'kirby', 'star fox', 'fire emblem',
      'final fantasy', 'resident evil', 'metal gear', 'grand theft auto', 'call of duty', 'fifa', 'madden',
      'gamecube game', 'nintendo game', 'playstation game', 'xbox game', 'sega game'
    ];
    
    itemsToMerge.forEach((item) => {
      const itemName = item.name.toLowerCase();
      
      // Check if this item contains main product keywords
      const hasMainProductKeywords = mainProductKeywords.some(keyword => 
        itemName.includes(keyword)
      );
      
      // If this item has main product keywords, prioritize it
      if (hasMainProductKeywords && !mainProduct) {
        mainProduct = item;
      }
      // If no main product found yet, use the longest name
      else if (!mainProduct && item.name.length > maxLength) {
        maxLength = item.name.length;
        mainProduct = item;
      }
    });
    
    // If still no main product found, use the first item
    if (!mainProduct && itemsToMerge.length > 0) {
      mainProduct = itemsToMerge[0];
    }
    
    console.log(`Main product identified: "${mainProduct?.name}"`);
    console.log(`Total items to process: ${itemsToMerge.length}`);

    // Process each item to extract specific attributes
    itemsToMerge.forEach((item) => {
      const itemName = item.name.toLowerCase().trim();
      
      console.log(`Processing item: "${item.name}" (${item === mainProduct ? 'MAIN PRODUCT' : 'ATTRIBUTE'})`);
      
      // Skip if this is the main product (we'll process it separately)
      if (item === mainProduct) {
        console.log(`Skipping main product: "${item.name}"`);
        return;
      }

      // Check if this item is a storage specification
      let isStorage = false;
      for (const storagePattern of storagePatterns) {
        if (storagePattern.pattern.test(itemName)) {
          const match = itemName.match(storagePattern.pattern);
          if (match) {
            storageCode = `${match[1]}${storagePattern.code}`;
            isStorage = true;
            console.log(`Detected storage: "${item.name}" -> ${storageCode}`);
            break;
          }
        }
      }

      // Check if this item is a color specification
      let isColor = false;
      for (const colorPattern of colorPatterns) {
        if (colorPattern.pattern.test(itemName)) {
          colorCode = colorPattern.code;
          isColor = true;
          console.log(`Detected color: "${item.name}" -> ${colorCode}`);
          break;
        }
      }

      // If this item is neither storage nor color, it might be a condition
      if (!isStorage && !isColor) {
        for (const conditionPattern of conditionPatterns) {
          if (conditionPattern.pattern.test(itemName)) {
            conditionCode = conditionPattern.code;
            console.log(`Detected condition: "${item.name}" -> ${conditionCode}`);
            break;
          }
        }
      }
    });

    // Now process the main product to extract brand, type, and model
    if (mainProduct) {
      const mainName = mainProduct.name.toLowerCase();
      console.log(`Processing main product: "${mainProduct.name}"`);
      
      // Check for brand patterns
      for (const brandPattern of brandPatterns) {
        if (brandPattern.pattern.test(mainName)) {
          brandCode = brandPattern.code;
          console.log(`Detected brand from main product: "${mainProduct.name}" -> ${brandCode}`);
          break;
        }
      }

      // Check for type patterns
      for (const typePattern of typePatterns) {
        if (typePattern.pattern.test(mainName)) {
          typeCode = typePattern.code;
          console.log(`Detected type from main product: "${mainProduct.name}" -> ${typeCode}`);
          break;
        }
      }

      // Check for condition patterns in main product
      for (const conditionPattern of conditionPatterns) {
        if (conditionPattern.pattern.test(mainName)) {
          conditionCode = conditionPattern.code;
          console.log(`Detected condition from main product: "${mainProduct.name}" -> ${conditionCode}`);
          break;
        }
      }

      // Try to extract model from main product name
      const modelPatterns = [
        /(\d+ds)/i, // Nintendo 3DS, 2DS
        /(ps\d+)/i, // PlayStation 1, 2, 3, 4, 5
        /(xbox\s*\d+)/i, // Xbox 360, Xbox One, Xbox Series
        /(switch)/i, // Nintendo Switch
        /(wii)/i, // Nintendo Wii
        /(gamecube)/i, // Nintendo GameCube
        /(n64)/i, // Nintendo 64
        /(snes)/i, // Super Nintendo
        /(nes)/i, // Nintendo Entertainment System
        /(genesis)/i, // Sega Genesis
        /(dreamcast)/i, // Sega Dreamcast
        /(saturn)/i, // Sega Saturn
        /(mega\s*drive)/i, // Sega Mega Drive
      ];

      for (const modelPattern of modelPatterns) {
        if (modelPattern.test(mainName)) {
          const match = mainName.match(modelPattern);
          if (match) {
            modelCode = match[1].toUpperCase();
            console.log(`Detected model from main product: "${mainProduct.name}" -> ${modelCode}`);
            break;
          }
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

  // Handle checkbox selection
  const handleItemSelect = (itemId, checked) => {
    if (checked) {
      setSelectedItems((prev) => [...prev, itemId]);
    } else {
      setSelectedItems((prev) => prev.filter((id) => id !== itemId));
    }
  };

  // Handle merge selected items
  const handleMergeItems = async () => {
    if (selectedItems.length < 2) {
      message.warning("Please select at least 2 items to merge");
      return;
    }

    setIsMerging(true);
    try {
      // Get selected items data
      const itemsToMerge = order?.line_items?.filter((item) =>
        selectedItems.includes(item?.product_id || item?.id)
      );

      if (!itemsToMerge || itemsToMerge.length < 2) {
        message.error("Invalid items selected for merging");
        return;
      }

      // Extract attributes from product names
      const extractedAttributes = extractProductAttributes(itemsToMerge);

      console.log("Items to merge:", itemsToMerge.map(item => item.name));
      console.log("Extracted attributes:", extractedAttributes);

      // Calculate combined data
      const combinedData = {
        wc_id: itemsToMerge[0]?.product_id || itemsToMerge[0]?.id,
        pro_title: itemsToMerge.map((item) => item.name).join(" + "),
        sku: itemsToMerge
          .map((item) => item.sku)
          .filter(Boolean)
          .join("_"),
        type_code: extractedAttributes.typeCode,
        brnd_code: extractedAttributes.brandCode,
        model_code: extractedAttributes.modelCode,
        storage_code: extractedAttributes.storageCode,
        color_code: extractedAttributes.colorCode,
        cnd_code: extractedAttributes.conditionCode,
        regular_price: itemsToMerge
          .reduce((sum, item) => sum + parseFloat(item.price || 0), 0)
          .toFixed(2),
        price: itemsToMerge
          .reduce((sum, item) => sum + parseFloat(item.price || 0), 0)
          .toFixed(2),
        sale_price: itemsToMerge
          .reduce((sum, item) => sum + parseFloat(item.price || 0), 0)
          .toFixed(2),
        order_Id: selectedOrder?.orderId,
        plateformId: selectedOrder?.plateform_id || "N/A",
      };

      console.log("combinedData", combinedData);

      const response = await apiClient.post(
        "/api/v1/products/mapped/add",
        combinedData
      );

      console.log("response", response);

      if (response.data.success) {
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
          customClass: {
            popup: "rounded-lg",
          },
        });

        // Clear selection
        setSelectedItems([]);

        // Optimistically mark merged items locally for immediate UI update
        setLocalMergedIds((prev) => {
          const next = new Set(prev.map((i) => i?.toString()));
          selectedItems.forEach((id) => next.add(id?.toString()));
          return Array.from(next);
        });

        // Refresh order details
        if (refetchOrderDetails) {
          refetchOrderDetails();
        }
        if (onProductMappingSuccess) {
          onProductMappingSuccess();
        }
      } else {
        throw new Error(response.data.message || "Failed to merge items");
      }
    } catch (error) {
      console.error("Error merging items:", error);
      Swal.fire({
        icon: "error",
        title: "Failed to Merge Items",
        text:
          error.response?.data?.message ||
          error.message ||
          "Failed to merge selected items",
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
      setIsMerging(false);
    }
  };

  // Calculate total price of selected items
  const selectedItemsTotal =
    order?.line_items
      ?.filter((item) => selectedItems.includes(item?.product_id || item?.id))
      ?.reduce((sum, item) => sum + parseFloat(item.total || 0), 0) || 0;

  // Merged products helpers
  const mergedLineItemIds = new Set([
    ...(Array.isArray(selectedOrder?.merged_products)
      ? selectedOrder.merged_products.map((id) => id?.toString())
      : []),
    ...localMergedIds.map((id) => id?.toString()),
  ]);
  const mergedLineItems = Array.isArray(order?.line_items)
    ? order.line_items.filter((item) =>
        mergedLineItemIds.has((item?.product_id || item?.id)?.toString())
      )
    : [];

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
        {/* Merged summary (only when merged_products exists and has ids) */}
        {mergedLineItems.length > 0 && (
          <div className="mb-3 p-3 rounded-lg bg-purple-50 border border-purple-200">
            <div className="text-sm font-medium text-purple-800">Merged Status</div>
            <div className="text-xs text-purple-700 mt-1">
              {mergedLineItems.length} item{mergedLineItems.length > 1 ? "s" : ""} merged in this order
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              {mergedLineItems.map((it) => (
                <span
                  key={it?.id || it?.product_id}
                  className="text-xs px-2 py-1 rounded bg-white border border-purple-200 text-purple-800"
                  title={(it?.name || "").toString()}
                >
                  {(it?.name || "").toString().slice(0, 40)}{(it?.name || "").length > 40 ? "…" : ""}
                </span>
              ))}
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
                  Total: ${selectedItemsTotal.toFixed(2)}
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
            
            {/* Attribute Preview */}
            {selectedItems.length >= 2 && (
              <div className="mt-3 pt-3 border-t border-blue-200">
                <div className="text-xs font-medium text-blue-700 mb-2">
                  Detected Attributes:
                </div>
                {(() => {
                  const itemsToMerge = order?.line_items?.filter((item) =>
                    selectedItems.includes(item?.product_id || item?.id)
                  );
                  const extractedAttributes = extractProductAttributes(itemsToMerge);
                  
                  return (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs">
                      <div className="bg-white p-2 rounded border">
                        <span className="text-gray-500">Storage:</span> {extractedAttributes.storageCode}
                      </div>
                      <div className="bg-white p-2 rounded border">
                        <span className="text-gray-500">Color:</span> {extractedAttributes.colorCode}
                      </div>
                      <div className="bg-white p-2 rounded border">
                        <span className="text-gray-500">Brand:</span> {extractedAttributes.brandCode}
                      </div>
                      <div className="bg-white p-2 rounded border">
                        <span className="text-gray-500">Type:</span> {extractedAttributes.typeCode}
                      </div>
                      <div className="bg-white p-2 rounded border">
                        <span className="text-gray-500">Model:</span> {extractedAttributes.modelCode}
                      </div>
                      <div className="bg-white p-2 rounded border">
                        <span className="text-gray-500">Condition:</span> {extractedAttributes.conditionCode}
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}
          </div>
        )}

        <div className="space-y-3">
          {order?.line_items?.map((item) => {
            const itemId = item?.product_id || item?.id;
            const isSelected = selectedItems.includes(itemId);

            return (
              <div
                key={item?.id}
                className={`flex justify-between p-3 rounded border-2 transition-all duration-200 ${
                  isSelected
                    ? "bg-blue-50 border-blue-300"
                    : "bg-gray-50 border-transparent"
                }`}
              >
                <div className="flex items-start gap-3 flex-1">
                  {/* Checkbox */}
                  <Checkbox
                    checked={isSelected}
                    onChange={(e) => handleItemSelect(itemId, e.target.checked)}
                    className="mt-1"
                  />

                  {/* Item Details */}
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">
                      {item?.name}
                    </div>
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
                </div>

                <div className="text-right">
                  {/* Check if this specific line item has mapped products */}
                  {(() => {
                    const lineItemId = item?.product_id || item?.id;
                    const idStr = lineItemId?.toString();
                    const isMerged = mergedLineItemIds.has(idStr);
                    const hasMappedProducts =
                      selectedOrder?.kit_products &&
                      selectedOrder.kit_products.includes(idStr);

                    if (hasMappedProducts) {
                      return (
                        <div className="flex items-center gap-2 flex-wrap justify-end">
                          {isMerged && (
                            <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded text-xs font-medium">
                              Merged
                            </span>
                          )}
                          <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs font-medium">
                            Mapped
                          </span>
                          <button
                            className="text-sm text-blue-600 p-1.5 rounded-md bg-blue-100 hover:bg-blue-200 transition-colors"
                            onClick={() => onEditProduct(lineItemId)}
                          >
                            Edit
                          </button>
                        </div>
                      );
                    } else {
                      return (
                        <div className="flex items-center gap-2 flex-wrap justify-end">
                          {isMerged && (
                            <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded text-xs font-medium">
                              Merged
                            </span>
                          )}
                          <button
                            className="text-sm text-gray-600 p-1.5 rounded-md bg-gray-200 hover:bg-gray-300 transition-colors"
                            onClick={() => onAddProduct(lineItemId)}
                          >
                            Add Picking
                          </button>
                        </div>
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
            );
          })}
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
}

