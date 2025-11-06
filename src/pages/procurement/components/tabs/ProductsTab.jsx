import React, { useState, useEffect } from "react";
import { Table, Button, Tag, Checkbox, Space, Card, Input, InputNumber, message, Select } from "antd";
import { Package, QrCode, Printer, Search, Plus, Trash2 } from "lucide-react";
import { getProductQRCode, updatePurchaseOrder } from "../../../../api/procurement";
import QRCodeModal from "../QRCodeModal";
import BulkQRCodeModal from "../BulkQRCodeModal";
import apiClient from "../../../../api/client";
import Swal from "sweetalert2";

/**
 * Products Tab Component
 * Shows products and kits with checkboxes and QR code buttons
 * Allows adding/removing products when order is in draft status
 */
const ProductsTab = ({ purchaseOrder, poId, onReload }) => {
  const [selectedProductIndices, setSelectedProductIndices] = useState([]);
  const [qrModalVisible, setQrModalVisible] = useState(false);
  const [qrData, setQrData] = useState(null);
  const [loadingQR, setLoadingQR] = useState(false);
  const [bulkQRModalVisible, setBulkQRModalVisible] = useState(false);
  const [localProducts, setLocalProducts] = useState([]);
  const [editingProducts, setEditingProducts] = useState({}); // Track which products are in edit mode: { index: editedProduct }
  const [productSearch, setProductSearch] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [saving, setSaving] = useState(false);

  const isDraft = purchaseOrder?.status === "draft";

  useEffect(() => {
    setLocalProducts(purchaseOrder?.products || []);
    setEditingProducts({}); // Clear editing state when purchase order changes
  }, [purchaseOrder]);

  // Search products
  useEffect(() => {
    if (productSearch.trim().length >= 2) {
      const timeoutId = setTimeout(() => {
        searchProducts(productSearch);
      }, 300);
      return () => clearTimeout(timeoutId);
    } else {
      setSearchResults([]);
    }
  }, [productSearch]);

  const searchProducts = async (search) => {
    setSearching(true);
    try {
      const { data } = await apiClient.get("/api/v1/products/all", {
        params: { page: 1, limit: 50, search },
      });
      setSearchResults(Array.isArray(data?.products) ? data.products : []);
    } catch (error) {
      console.error("Failed to search products:", error);
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  };

  const handleAddProduct = (product) => {
    const exists = localProducts.some(
      (p) => p.type === "product" && (p.productId || p._id) === (product._id || product.id)
    );
    if (exists) {
      message.warning("Product already added");
      return;
    }

    const newProduct = {
      type: "product",
      productId: product._id || product.id,
      name: product.pro_title || product.name || "Unknown Product",
      sku: product.sku || "",
      quantity: 1,
      unitPrice: 0,
      uom: "Unit",
      taxes: 0,
    };

    const updated = [...localProducts, newProduct];
    setLocalProducts(updated);
    saveProducts(updated);
    setProductSearch("");
    setSearchResults([]);
  };

  const handleRemoveProduct = async (index) => {
    const updated = localProducts.filter((_, i) => i !== index);
    setLocalProducts(updated);
    setSelectedProductIndices((prev) => prev.filter((i) => i !== index).map(i => i > index ? i - 1 : i));
    await saveProducts(updated);
  };

  const handleMakeKit = async () => {
    if (selectedProductIndices.length < 2) {
      message.warning("Please select at least 2 products to create a kit");
      return;
    }

    const selectedProductsList = selectedProductIndices
      .map((idx) => localProducts[idx])
      .filter((p) => p.type === "product");

    if (selectedProductsList.length < 2) {
      message.warning("Please select at least 2 standalone products");
      return;
    }

    setSaving(true);
    try {
    const kitProducts = selectedProductsList.map((p) => ({
      productId: p.productId,
      name: p.name,
      sku: p.sku,
      quantity: p.quantity || 1,
      unitPrice: 0,
      taxes: 0,
      uom: p.uom || "Unit",
    }));

    const kitName =
      selectedProductsList.length === 2
        ? `${selectedProductsList[0].name} + ${selectedProductsList[1].name}`
        : `Kit of ${selectedProductsList.length} products`;

    const newKit = {
      type: "kit",
      name: kitName,
      quantity: 1,
      unitPrice: 0,
      taxes: 0,
      kitProducts: kitProducts,
    };

    const updated = localProducts
      .filter((_, idx) => !selectedProductIndices.includes(idx))
      .concat([newKit]);

    setLocalProducts(updated);
    setSelectedProductIndices([]);
    await saveProducts(updated);
    message.success("Kit created successfully");
    } catch (error) {
      console.error("Failed to create kit:", error);
      message.error("Failed to create kit");
    } finally {
      setSaving(false);
    }
  };

  const saveProducts = async (productsToSave) => {
    if (!isDraft || !poId) return;

    setSaving(true);
    try {
      const productsPayload = productsToSave.map((item) => {
        if (item.type === "product") {
          return {
            type: "product",
            productId: item.productId,
            name: item.name,
            sku: item.sku,
            quantity: Number(item.quantity) || 0,
            unitPrice: Number(item.unitPrice) || 0,
            uom: item.uom || "Unit",
            taxes: Number(item.taxes) || 0,
          };
        } else {
          return {
            type: "kit",
            name: item.name,
            quantity: Number(item.quantity) || 1,
            unitPrice: Number(item.unitPrice) || 0,
            kitProducts: (item.kitProducts || []).map((kp) => ({
              productId: kp.productId || kp._id,
              name: kp.name,
              sku: kp.sku,
              quantity: Number(kp.quantity) || 0,
              unitPrice: Number(kp.unitPrice) || 0,
              taxes: Number(kp.taxes) || 0,
              uom: kp.uom || "Unit",
            })),
            taxes: Number(item.taxes) || 0,
          };
        }
      });

      await updatePurchaseOrder(poId, { products: productsPayload });
      if (onReload) onReload();
      message.success("Products updated successfully");
    } catch (error) {
      console.error("Failed to save products:", error);
      const errorMessage = error?.response?.data?.error?.message || "Failed to update products";
      if (error?.response?.data?.error?.code === "EDIT_NOT_ALLOWED") {
        Swal.fire({
          icon: "warning",
          title: "Cannot Update Products",
          text: errorMessage,
        });
      } else {
        message.error(errorMessage);
      }
      // Revert on error
      setLocalProducts(purchaseOrder?.products || []);
    } finally {
      setSaving(false);
    }
  };

  const formatCurrency = (amount, currency = "USD") => {
    if (!amount && amount !== 0) {
      if (currency === "JPY") return "¥0";
      return "$0.00";
    }
    
    // JPY doesn't use decimal places
    if (currency === "JPY") {
      return new Intl.NumberFormat("ja-JP", {
        style: "currency",
        currency: "JPY",
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(amount);
    }
    
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency || "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const products = localProducts;
  const selectedProducts = selectedProductIndices.map((index) => products[index]).filter(Boolean);

  // Handle bulk print labels
  const handleBulkPrintLabels = () => {
    if (selectedProducts.length === 0) {
      return;
    }
    setBulkQRModalVisible(true);
  };

  // Handle QR code button click
  const handleQRCodeClick = async (product) => {
    if (!purchaseOrder?._id) return;

    setLoadingQR(true);
    try {
      // Use productId for products, kitId for kits
      const productId = product.type === "kit" ? product.kitId : product.productId || product._id;
      const response = await getProductQRCode(
        purchaseOrder._id,
        productId,
        { format: "json" }
      );
      
      if (response?.success && response?.data) {
        setQrData({
          qrCode: response.data.qrCode,
          qrData: response.data.qrData,
          product: response.data.product || response.data.kit,
          type: product.type || "product",
        });
        setQrModalVisible(true);
      }
    } catch (error) {
      console.error("Failed to load QR code:", error);
    } finally {
      setLoadingQR(false);
    }
  };

  // Handle checkbox selection
  const handleCheckboxChange = (index, checked) => {
    if (checked) {
      setSelectedProductIndices((prev) => [...prev, index]);
    } else {
      setSelectedProductIndices((prev) => prev.filter((i) => i !== index));
    }
  };

  // Handle select all
  const handleSelectAll = (checked) => {
    if (checked) {
      setSelectedProductIndices(products.map((_, idx) => idx));
    } else {
      setSelectedProductIndices([]);
    }
  };

  // Handle product field update (only updates local editing state, doesn't save)
  const handleProductFieldChange = (index, field, value) => {
    const currentEditing = editingProducts[index] || { ...localProducts[index] };
    setEditingProducts({
      ...editingProducts,
      [index]: {
        ...currentEditing,
        [field]: value,
      },
    });
  };

  // Enable edit mode for a product
  const handleStartEdit = (index) => {
    setEditingProducts({
      ...editingProducts,
      [index]: { ...localProducts[index] },
    });
  };

  // Cancel editing for a product
  const handleCancelEdit = (index) => {
    const updated = { ...editingProducts };
    delete updated[index];
    setEditingProducts(updated);
  };

  // Update a single product
  const handleUpdateProduct = async (index) => {
    if (!editingProducts[index]) return;

    const editedProduct = editingProducts[index];
    const updated = [...localProducts];
    updated[index] = editedProduct;
    
    setLocalProducts(updated);
    
    // Remove from editing state
    const updatedEditing = { ...editingProducts };
    delete updatedEditing[index];
    setEditingProducts(updatedEditing);

    // Save to API
    await saveProducts(updated);
  };

  const columns = [
    {
      title: (
        <Checkbox
          indeterminate={
            selectedProductIndices.length > 0 &&
            selectedProductIndices.length < products.length
          }
          checked={
            products.length > 0 &&
            selectedProductIndices.length === products.length
          }
          onChange={(e) => handleSelectAll(e.target.checked)}
        />
      ),
      key: "checkbox",
      width: 50,
      render: (_, record, index) => (
        <Checkbox
          checked={selectedProductIndices.includes(index)}
          onChange={(e) => handleCheckboxChange(index, e.target.checked)}
        />
      ),
    },
    {
      title: "Product",
      key: "product",
      width: 300,
      render: (_, record) => {
        if (record.type === "kit") {
          return (
            <div>
              <div className="font-medium text-gray-900 flex items-center gap-2 shrink-0">
                <Package size={16} className="text-blue-600 shrink-0" />
                {record.name || "N/A"}
              </div>
              <Tag color="blue" size="small" className="mt-1">
                Kit ({record.kitProducts?.length || 0} products)
              </Tag>
              {record.kitProducts && record.kitProducts.length > 0 && (
                <div className="text-xs text-gray-500 mt-1">
                  Contains: {record.kitProducts.slice(0, 2).map((p) => p.name).join(", ")}
                  {record.kitProducts.length > 2 && ` +${record.kitProducts.length - 2} more`}
                </div>
              )}
            </div>
          );
        }
        return (
          <div>
            <div className="font-medium text-gray-900">{record.name || "N/A"}</div>
            <div className="text-xs text-gray-500 mt-1">
              SKU: {record.sku || "N/A"}
            </div>
          </div>
        );
      },
    },
    {
      title: "Quantity",
      dataIndex: "quantity",
      key: "quantity",
      width: 120,
      align: "right",
      render: (quantity, record, index) => {
        if (isDraft) {
          const isEditing = editingProducts[index] !== undefined;
          const displayValue = isEditing ? (editingProducts[index]?.quantity || 1) : (quantity || 1);
          return (
            <InputNumber
              min={1}
              value={displayValue}
              onChange={(value) => handleProductFieldChange(index, "quantity", value || 1)}
              size="small"
              style={{ width: "100%" }}
              disabled={!isEditing || saving}
            />
          );
        }
        return <span>{quantity || 0}</span>;
      },
    },
    {
      title: "Unit Price",
      dataIndex: "unitPrice",
      key: "unitPrice",
      width: 120,
      align: "right",
      render: (unitPrice, record, index) => {
        if (isDraft) {
          const isEditing = editingProducts[index] !== undefined;
          const displayValue = isEditing ? (editingProducts[index]?.unitPrice || 0) : (unitPrice || 0);
          return (
            <InputNumber
              min={0}
              step={0.01}
              value={displayValue}
              onChange={(value) => handleProductFieldChange(index, "unitPrice", value || 0)}
              size="small"
              style={{ width: "100%" }}
              disabled={!isEditing || saving}
            />
          );
        }
        return <span>{formatCurrency(unitPrice || 0, purchaseOrder?.currency)}</span>;
      },
    },
    // {
    //   title: "Taxes",
    //   dataIndex: "taxes",
    //   key: "taxes",
    //   width: 120,
    //   align: "right",
    //   render: (taxes, record, index) => {
    //     if (isDraft) {
    //       return (
    //         <InputNumber
    //           min={0}
    //           step={0.01}
    //           value={taxes || 0}
    //           onChange={(value) => handleProductFieldChange(index, "taxes", value || 0)}
    //           size="small"
    //           style={{ width: "100%" }}
    //           disabled={saving}
    //         />
    //       );
    //     }
    //     return <span>{taxes ? formatCurrency(taxes, purchaseOrder?.currency) : "-"}</span>;
    //   },
    // },
    // {
    //   title: "UoM",
    //   dataIndex: "uom",
    //   key: "uom",
    //   width: 100,
    //   render: (uom, record, index) => {
    //     if (isDraft) {
    //       const isEditing = editingProducts[index] !== undefined;
    //       const displayValue = isEditing ? (editingProducts[index]?.uom || "Unit") : (uom || "Unit");
    //       const uomOptions = ["Unit", "Piece", "Box", "Case", "Pallet", "Kg", "Lb", "L", "Gal"];
    //       return (
    //         <Select
    //           value={displayValue}
    //           onChange={(value) => handleProductFieldChange(index, "uom", value)}
    //           size="small"
    //           style={{ width: "100%" }}
    //           disabled={!isEditing || saving}
    //           options={uomOptions.map((opt) => ({ value: opt, label: opt }))}
    //         />
    //       );
    //     }
    //     return <span>{uom || "Unit"}</span>;
    //   },
    // },
    {
      title: "Total",
      key: "total",
      width: 120,
      align: "right",
      render: (_, record, index) => {
        const isEditing = editingProducts[index] !== undefined;
        const product = isEditing ? editingProducts[index] : record;
        const quantity = Number(product.quantity) || 0;
        const unitPrice = Number(product.unitPrice) || 0;
        const taxes = Number(product.taxes) || 0;
        const total = (quantity * unitPrice) + taxes;
        return (
          <span className="font-medium">
            {formatCurrency(total, purchaseOrder?.currency)}
          </span>
        );
      },
    },
    {
      title: "QR Code",
      key: "qrCode",
      width: 100,
      render: (_, record, index) => (
        <Button
          type="link"
          icon={<QrCode size={16} />}
          onClick={() => handleQRCodeClick(record)}
          loading={loadingQR}
          size="small"
        >
          QR
        </Button>
      ),
    },
    ...(isDraft
      ? [
          {
            title: "Actions",
            key: "actions",
            width: 180,
            render: (_, record, index) => {
              const isEditing = editingProducts[index] !== undefined;
              return (
                <Space size="small">
                  {!isEditing ? (
                    <>
                      <Button
                        type="link"
                        size="small"
                        onClick={() => handleStartEdit(index)}
                        disabled={saving}
                      >
                        Edit
                      </Button>
              <Button
                type="text"
                danger
                icon={<Trash2 size={14} />}
                onClick={() => handleRemoveProduct(index)}
                size="small"
                loading={saving}
              />
                    </>
                  ) : (
                    <>
                      <Button
                        type="primary"
                        size="small"
                        onClick={() => handleUpdateProduct(index)}
                        loading={saving}
                        disabled={saving}
                      >
                        Update
                      </Button>
                      <Button
                        type="text"
                        size="small"
                        onClick={() => handleCancelEdit(index)}
                        disabled={saving}
                      >
                        Cancel
                      </Button>
                    </>
                  )}
                </Space>
              );
            },
          },
        ]
      : []),
  ];

  return (
    <>
      {/* Product Search - Only for draft orders */}
      {isDraft && (
        <Card size="small" className="mb-4 bg-gray-100">
          <div className="mb-4">
            <Input
              placeholder="Search products by name or SKU..."
              prefix={<Search size={16} />}
              value={productSearch}
              onChange={(e) => setProductSearch(e.target.value)}
              size="large"
              allowClear
              loading={searching}
            />

            {productSearch.trim().length > 1 && searchResults.length > 0 && (
              <Card className="mt-2 shadow-lg bg-gray-100" size="small">
                <div className="max-h-60 overflow-y-auto space-y-2">
                  {searchResults.map((product) => (
                    <div
                      key={product._id || product.id}
                      onClick={() => handleAddProduct(product)}
                      className="p-2 hover:bg-blue-50 cursor-pointer border-b border-gray-100 last:border-b-0 transition-colors rounded"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <p className="font-medium text-sm mb-0">
                            {product.pro_title || product.name || "Unknown Product"}
                          </p>
                          <p className="text-xs text-gray-500 mb-0">
                            SKU: {product.sku || "N/A"}
                          </p>
                        </div>
                        <Plus className="text-blue-600" size={16} />
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </div>

          {/* Create Kit Button */}
          {selectedProductIndices.length >= 2 && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center justify-between">
              <span className="text-sm text-blue-700">
                {selectedProductIndices.length} product(s) selected
              </span>
              <Button
                type="primary"
                icon={<Package size={16} />}
                onClick={handleMakeKit}
                size="small"
                loading={saving}
                disabled={saving}
              >
                Create Kit
              </Button>
            </div>
          )}
        </Card>
      )}

      {/* Bulk Actions Bar */}
      {selectedProducts.length > 0 && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
          <span className="text-sm font-medium text-blue-900">
            {selectedProducts.length} item{selectedProducts.length > 1 ? "s" : ""} selected
          </span>
          <Button
            type="primary"
            icon={<Printer size={16} />}
            onClick={handleBulkPrintLabels}
            size="small"
            className="w-full sm:w-auto"
          >
            Print Labels ({selectedProducts.length})
          </Button>
        </div>
      )}

      {/* Empty State for Draft Orders */}
      {isDraft && products.length === 0 && (
        <Card size="small" className="text-center py-8">
          <Package size={48} className="text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-700 mb-2">No Products Added</h3>
          <p className="text-sm text-gray-500 mb-4">
            Start by searching and adding products to this purchase order
          </p>
        </Card>
      )}

      {/* Desktop Table View */}
      {products.length > 0 && (
      <div className="hidden md:block">
        <Table
          columns={columns}
          dataSource={products}
          rowKey={(record, index) => record.productId || record.kitId || record._id || index}
          pagination={false}
          size="small"
            scroll={{ x: 1000 }}
        />
      </div>
      )}

      {/* Mobile Card View */}
      {products.length > 0 && (
      <div className="md:hidden space-y-3">
        {products.map((product, index) => (
          <Card
            key={product.productId || product.kitId || product._id || index}
            size="small"
            className="shadow-sm"
          >
            <div className="flex items-start justify-between gap-3 mb-3">
              <Checkbox
                checked={selectedProductIndices.includes(index)}
                onChange={(e) => handleCheckboxChange(index, e.target.checked)}
              />
              <div className="flex-1 min-w-0">
                {product.type === "kit" ? (
                  <>
                    <div className="font-medium text-gray-900 flex items-center gap-2 mb-1">
                      <Package size={16} className="text-blue-600 shrink-0" />
                      <span className="truncate">{product.name || "N/A"}</span>
                    </div>
                    <Tag color="blue" size="small" className="mb-1">
                      Kit ({product.kitProducts?.length || 0} products)
                    </Tag>
                    {product.kitProducts && product.kitProducts.length > 0 && (
                      <div className="text-xs text-gray-500 mt-1">
                        Contains: {product.kitProducts.slice(0, 2).map((p) => p.name).join(", ")}
                        {product.kitProducts.length > 2 && ` +${product.kitProducts.length - 2} more`}
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <div className="font-medium text-gray-900 mb-1">{product.name || "N/A"}</div>
                    <div className="text-xs text-gray-500">SKU: {product.sku || "N/A"}</div>
                  </>
                )}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm pt-3 border-t">
              <div>
                <div className="text-gray-400 text-xs mb-1">Quantity</div>
                {isDraft ? (
                  (() => {
                    const isEditing = editingProducts[index] !== undefined;
                    const displayValue = isEditing ? (editingProducts[index]?.quantity || 1) : (product.quantity || 1);
                    return (
                      <InputNumber
                        min={1}
                        value={displayValue}
                        onChange={(value) => handleProductFieldChange(index, "quantity", value || 1)}
                        size="small"
                        style={{ width: "100%" }}
                        disabled={!isEditing || saving}
                      />
                    );
                  })()
                ) : (
                <div className="font-medium text-gray-900">{product.quantity || 0}</div>
                )}
              </div>
              <div>
                <div className="text-gray-400 text-xs mb-1">UoM</div>
                {isDraft ? (
                  (() => {
                    const isEditing = editingProducts[index] !== undefined;
                    const displayValue = isEditing ? (editingProducts[index]?.uom || "Unit") : (product.uom || "Unit");
                    return (
                      <Select
                        value={displayValue}
                        onChange={(value) => handleProductFieldChange(index, "uom", value)}
                        size="small"
                        style={{ width: "100%" }}
                        disabled={!isEditing || saving}
                        options={[
                          { value: "Unit", label: "Unit" },
                          { value: "Piece", label: "Piece" },
                          { value: "Box", label: "Box" },
                          { value: "Case", label: "Case" },
                          { value: "Pallet", label: "Pallet" },
                          { value: "Kg", label: "Kg" },
                          { value: "Lb", label: "Lb" },
                          { value: "L", label: "L" },
                          { value: "Gal", label: "Gal" },
                        ]}
                      />
                    );
                  })()
                ) : (
                <div className="font-medium text-gray-900">{product.uom || "-"}</div>
                )}
              </div>
              <div>
                <div className="text-gray-400 text-xs mb-1">Unit Price</div>
                {isDraft ? (
                  (() => {
                    const isEditing = editingProducts[index] !== undefined;
                    const displayValue = isEditing ? (editingProducts[index]?.unitPrice || 0) : (product.unitPrice || 0);
                    return (
                      <InputNumber
                        min={0}
                        step={0.01}
                        value={displayValue}
                        onChange={(value) => handleProductFieldChange(index, "unitPrice", value || 0)}
                        size="small"
                        style={{ width: "100%" }}
                        disabled={!isEditing || saving}
                        formatter={(value) => formatCurrency(value || 0, purchaseOrder?.currency).replace(/[^\d.-]/g, "")}
                        parser={(value) => value.replace(/[^\d.-]/g, "")}
                      />
                    );
                  })()
                ) : (
                  <div className="font-medium text-gray-900">
                    {formatCurrency(product.unitPrice || 0, purchaseOrder?.currency)}
                  </div>
                )}
              </div>
                <div>
                  <div className="text-gray-400 text-xs mb-1">Taxes</div>
                {isDraft ? (
                  (() => {
                    const isEditing = editingProducts[index] !== undefined;
                    const displayValue = isEditing ? (editingProducts[index]?.taxes || 0) : (product.taxes || 0);
                    return (
                      <InputNumber
                        min={0}
                        step={0.01}
                        value={displayValue}
                        onChange={(value) => handleProductFieldChange(index, "taxes", value || 0)}
                        size="small"
                        style={{ width: "100%" }}
                        disabled={!isEditing || saving}
                        formatter={(value) => formatCurrency(value || 0, purchaseOrder?.currency).replace(/[^\d.-]/g, "")}
                        parser={(value) => value.replace(/[^\d.-]/g, "")}
                      />
                    );
                  })()
                ) : (
                  <div className="font-medium text-gray-900">
                    {product.taxes ? formatCurrency(product.taxes, purchaseOrder?.currency) : "-"}
                  </div>
                )}
              </div>
              <div className="col-span-2">
                <div className="text-gray-400 text-xs mb-1">Total</div>
                <div className="font-bold text-gray-900">
                  {(() => {
                    const isEditing = editingProducts[index] !== undefined;
                    const p = isEditing ? editingProducts[index] : product;
                    return formatCurrency(
                      ((p.quantity || 0) * (p.unitPrice || 0)) + (p.taxes || 0),
                      purchaseOrder?.currency
                    );
                  })()}
                  </div>
                </div>
              <div className="col-span-2 flex justify-between items-center gap-2 pt-2 border-t">
                <div className="flex gap-2">
                  {isDraft && (
                    <>
                      {editingProducts[index] === undefined ? (
                        <Button
                          type="link"
                          size="small"
                          onClick={() => handleStartEdit(index)}
                          disabled={saving}
                        >
                          Edit
                        </Button>
                      ) : (
                        <>
                          <Button
                            type="primary"
                            size="small"
                            onClick={() => handleUpdateProduct(index)}
                            loading={saving}
                            disabled={saving}
                          >
                            Update
                          </Button>
                          <Button
                            type="text"
                            size="small"
                            onClick={() => handleCancelEdit(index)}
                            disabled={saving}
                          >
                            Cancel
                          </Button>
                        </>
                      )}
                    </>
                  )}
                </div>
                <div className="flex gap-2">
                <Button
                  type="link"
                  icon={<QrCode size={16} />}
                  onClick={() => handleQRCodeClick(product)}
                  loading={loadingQR}
                  size="small"
                  className="p-0"
                >
                  QR Code
                </Button>
                {isDraft && (
                  <Button
                    type="text"
                    danger
                    icon={<Trash2 size={14} />}
                    onClick={() => handleRemoveProduct(index)}
                    size="small"
                    loading={saving}
                  />
                )}
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>
      )}
      
      {/* Single QR Code Modal */}
      {qrData && (
        <QRCodeModal
          visible={qrModalVisible}
          onCancel={() => {
            setQrModalVisible(false);
            setQrData(null);
          }}
          qrData={qrData}
        />
      )}

      {/* Bulk QR Code Modal */}
      {purchaseOrder?._id && (
        <BulkQRCodeModal
          visible={bulkQRModalVisible}
          onCancel={() => setBulkQRModalVisible(false)}
          items={selectedProducts}
          poId={purchaseOrder._id}
          getQRCodeFunction={getProductQRCode}
        />
      )}
    </>
  );
};

export default ProductsTab;