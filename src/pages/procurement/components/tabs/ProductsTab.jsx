import React, { useState, useEffect } from "react";
import { Table, Button, Tag, Checkbox, Space, Card, Input, InputNumber, message, Select, Dropdown } from "antd";
import { Package, QrCode, Printer, Search, Plus, Trash2, MoreVertical } from "lucide-react";
import { getProductQRCode, updatePurchaseOrder } from "../../../../api/procurement";
import QRCodeModal from "../QRCodeModal";
import BulkQRCodeModal from "../BulkQRCodeModal";
import apiClient from "../../../../api/client";
import Swal from "sweetalert2";
import { PO_STATUS_LABELS } from "../../constants/procurementConstants";

/**
 * Products Tab Component
 * Shows products and kits with checkboxes and QR code buttons
 * Allows adding/removing products when order is in draft status
 */
const ProductsTab = ({ purchaseOrder, poId, onReload, onValidate, onUnsavedChangesChange }) => {
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
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false); // Track if there are unsaved changes

  const isDraft = purchaseOrder?.status === "draft";

  // Sync unsaved changes with parent
  useEffect(() => {
    if (onUnsavedChangesChange) {
      onUnsavedChangesChange(hasUnsavedChanges);
    }
  }, [hasUnsavedChanges, onUnsavedChangesChange]);

  // Save products function
  const saveProducts = async (productsToSave) => {
    if (!isDraft || !poId) return;

    setSaving(true);
    try {
      // Validate kits before saving
      const invalidKits = productsToSave.filter(
        (item) => item.type === "kit" && (!item.kitProducts || item.kitProducts.length === 0)
      );
      
      if (invalidKits.length > 0) {
        const kitNames = invalidKits.map(k => k.name || 'Unnamed Kit').join(', ');
        throw new Error(`The following kit(s) have no products: ${kitNames}. Please add products to kits before saving.`);
      }

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
          // For kits, ensure kitProducts exists and is not empty
          const kitProducts = item.kitProducts || item.components || [];
          
          if (kitProducts.length === 0) {
            throw new Error(`Kit "${item.name || 'Unnamed Kit'}" must have at least one product.`);
          }
          
          return {
            type: "kit",
            name: item.name,
            quantity: Number(item.quantity) || 1,
            unitPrice: Number(item.unitPrice) || 0,
            kitProducts: kitProducts.map((kp) => ({
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
      
      // Refetch the purchase order to get updated data (needed for box modal to show latest products)
      if (onReload) {
        await onReload();
      }
      
      // Clear unsaved changes flag after successful save
      setHasUnsavedChanges(false);
      
      message.success("Products updated successfully");
    } catch (error) {
      console.error("Failed to save products:", error);
      
      // Handle validation errors for kits
      if (error?.response?.data?.error?.code === "VALIDATION_ERROR" || 
          error?.message?.includes("kitProducts") ||
          error?.message?.includes("kit")) {
        const errorMessage = error?.response?.data?.error?.message || error?.message || "Kit validation failed";
        Swal.fire({
          icon: "error",
          title: "Kit Validation Error",
          text: errorMessage,
        });
      } else {
        const errorMessage = error?.response?.data?.error?.message || error?.message || "Failed to update products";
        if (error?.response?.data?.error?.code === "EDIT_NOT_ALLOWED") {
          Swal.fire({
            icon: "warning",
            title: "Cannot Update Products",
            text: errorMessage,
          });
        } else {
          message.error(errorMessage);
        }
      }
      
      // Revert on error
      setLocalProducts(purchaseOrder?.products || []);
      setEditingProducts({});
      setHasUnsavedChanges(false);
    } finally {
      setSaving(false);
    }
  };

  // Expose save function to parent via onValidate
  const handleValidate = React.useCallback(async () => {
    if (hasUnsavedChanges) {
      await saveProducts(localProducts);
    }
  }, [hasUnsavedChanges, localProducts, isDraft, poId, onReload, purchaseOrder]);

  useEffect(() => {
    if (onValidate) {
      // Store the validate handler
      onValidate.current = handleValidate;
    }
  }, [onValidate, handleValidate]);

  useEffect(() => {
    // Normalize products - ensure kits have kitProducts array
    const normalizedProducts = (purchaseOrder?.products || []).map((item) => {
      if (item.type === "kit") {
        // Ensure kitProducts exists (some APIs might use 'components')
        return {
          ...item,
          kitProducts: item.kitProducts || item.components || [],
        };
      }
      return item;
    });
    setLocalProducts(normalizedProducts);
    setEditingProducts({}); // Clear editing state when purchase order changes
    setHasUnsavedChanges(false); // Reset unsaved changes when purchase order changes
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

  const handleAddProduct = async (product) => {
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
    const newIndex = updated.length - 1;
    
    setLocalProducts(updated);
    // Auto-enable edit mode for newly added product
    setEditingProducts({
      ...editingProducts,
      [newIndex]: { ...newProduct },
    });
    
    // Call API immediately when adding a product
    setSaving(true);
    try {
      await saveProducts(updated);
      message.success("Product added successfully");
      setProductSearch("");
      setSearchResults([]);
    } catch (error) {
      console.error("Failed to add product:", error);
      // Revert on error
      setLocalProducts(purchaseOrder?.products || []);
      setEditingProducts({});
      setHasUnsavedChanges(false);
      const errorMessage = error?.response?.data?.error?.message || "Failed to add product";
      message.error(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveProduct = async (index) => {
    const updated = localProducts.filter((_, i) => i !== index);
    
    // Update local state immediately
    setLocalProducts(updated);
    setSelectedProductIndices((prev) => prev.filter((i) => i !== index).map(i => i > index ? i - 1 : i));
    
    // Remove from editing state
    const updatedEditing = { ...editingProducts };
    delete updatedEditing[index];
    // Adjust indices for editing state
    const adjustedEditing = {};
    Object.keys(updatedEditing).forEach(key => {
      const keyNum = parseInt(key);
      if (keyNum > index) {
        adjustedEditing[keyNum - 1] = updatedEditing[key];
      } else if (keyNum < index) {
        adjustedEditing[keyNum] = updatedEditing[key];
      }
    });
    setEditingProducts(adjustedEditing);
    
    // Call API immediately when deleting a product
    setSaving(true);
    try {
      await saveProducts(updated);
      message.success("Product removed successfully");
    } catch (error) {
      console.error("Failed to remove product:", error);
      // Revert on error
      setLocalProducts(purchaseOrder?.products || []);
      setEditingProducts({});
      setHasUnsavedChanges(false);
      const errorMessage = error?.response?.data?.error?.message || "Failed to remove product";
      message.error(errorMessage);
    } finally {
      setSaving(false);
    }
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
    
    // Auto-enable edit mode for newly created kit
    const newKitIndex = updated.length - 1;
    setEditingProducts({
      ...editingProducts,
      [newKitIndex]: { ...newKit },
    });
    
    // Mark as having unsaved changes
    setHasUnsavedChanges(true);
    message.success("Kit created successfully");
    } catch (error) {
      console.error("Failed to create kit:", error);
      message.error("Failed to create kit");
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

  // Handle product field update (only updates local editing state, doesn't save immediately)
  const handleProductFieldChange = (index, field, value) => {
    const currentEditing = editingProducts[index] || { ...localProducts[index] };
    const originalProduct = localProducts[index];
    
    // For kits, preserve kitProducts array when updating other fields
    const updatedEditing = {
      ...editingProducts,
      [index]: {
        ...currentEditing,
        [field]: value,
        // Preserve kitProducts for kits (don't lose them when editing quantity/price)
        ...(originalProduct?.type === "kit" && originalProduct?.kitProducts 
          ? { kitProducts: originalProduct.kitProducts } 
          : {}),
        // Also preserve components if it exists (API might use this)
        ...(originalProduct?.type === "kit" && originalProduct?.components 
          ? { components: originalProduct.components } 
          : {}),
      },
    };
    setEditingProducts(updatedEditing);
    
    // Update local products immediately for UI responsiveness
    const updated = [...localProducts];
    updated[index] = {
      ...updatedEditing[index],
      // Ensure kitProducts is preserved in local state too
      ...(originalProduct?.type === "kit" && originalProduct?.kitProducts 
        ? { kitProducts: originalProduct.kitProducts } 
        : {}),
    };
    setLocalProducts(updated);
    
    // Mark as having unsaved changes
    setHasUnsavedChanges(true);
  };

  // Enable edit mode for a product (for non-draft or manual edit)
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

  // Update a single product (manual save button - for non-draft orders or explicit save)
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

    // Save immediately (no debounce for manual save)
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
      fixed: "left",
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
      width: 280,
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
            {/* <div className="text-xs text-gray-500 mt-1">
              SKU: {record.sku || "N/A"}
            </div> */}
          </div>
        );
      },
    },
    {
      title: "Quantity",
      dataIndex: "quantity",
      key: "quantity",
      width: 100,
      align: "right",
      render: (quantity, record, index) => {
        if (isDraft) {
          // Always editable in draft mode - use editingProducts if available, otherwise use record value
          const displayValue = editingProducts[index]?.quantity !== undefined 
            ? (editingProducts[index]?.quantity || 1) 
            : (quantity || 1);
          return (
            <InputNumber
              min={1}
              value={displayValue}
              onChange={(value) => {
                // Auto-enable edit mode if not already editing
                if (editingProducts[index] === undefined) {
                  setEditingProducts({
                    ...editingProducts,
                    [index]: { ...localProducts[index] },
                  });
                }
                handleProductFieldChange(index, "quantity", value || 1);
              }}
              size="small"
              style={{ width: "100%" }}
              disabled={saving}
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
      width: 110,
      align: "right",
      render: (unitPrice, record, index) => {
        if (isDraft) {
          // Always editable in draft mode - use editingProducts if available, otherwise use record value
          const displayValue = editingProducts[index]?.unitPrice !== undefined 
            ? (editingProducts[index]?.unitPrice || 0) 
            : (unitPrice || 0);
          return (
            <InputNumber
              min={0}
              step={0.01}
              value={displayValue}
              onChange={(value) => {
                // Auto-enable edit mode if not already editing
                if (editingProducts[index] === undefined) {
                  setEditingProducts({
                    ...editingProducts,
                    [index]: { ...localProducts[index] },
                  });
                }
                handleProductFieldChange(index, "unitPrice", value || 0);
              }}
              size="small"
              style={{ width: "100%" }}
              disabled={saving}
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
      width: 100,
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
      title: "Actions",
      key: "actions",
      width: 70,
      align: "center",
      fixed: "right",
      render: (_, record, index) => {
        const menuItems = [
          {
            key: "qrCode",
            label: (
              <Space>
                <QrCode size={16} />
                <span>View QR Code</span>
              </Space>
            ),
            onClick: () => handleQRCodeClick(record),
          },
        ];

        // Add delete option only for draft orders
        if (isDraft) {
          menuItems.push({
            key: "delete",
            label: (
              <Space>
                <Trash2 size={16} />
                <span>Delete</span>
              </Space>
            ),
            danger: true,
            onClick: () => handleRemoveProduct(index),
          });
        }

        return (
          <Dropdown
            menu={{ items: menuItems }}
            trigger={["click"]}
            placement="bottomRight"
          >
            <Button
              type="text"
              icon={<MoreVertical size={16} />}
              size="small"
              loading={loadingQR || saving}
            />
          </Dropdown>
        );
      },
    },
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

      {/* Empty State for Non-Draft Orders */}
      {!isDraft && products.length === 0 && (
        <Card size="small" className="text-center py-8">
          <Package size={48} className="text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-700 mb-2">No Products in This Order</h3>
          <p className="text-sm text-gray-500 mb-4">
            This purchase order was moved to "{PO_STATUS_LABELS[purchaseOrder?.status] || purchaseOrder?.status || "Confirmed"}" status without any products added.
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
          scroll={{ x: 710 }}
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
                    const displayValue = editingProducts[index]?.quantity !== undefined 
                      ? (editingProducts[index]?.quantity || 1) 
                      : (product.quantity || 1);
                    return (
                      <InputNumber
                        min={1}
                        value={displayValue}
                        onChange={(value) => {
                          // Auto-enable edit mode if not already editing
                          if (editingProducts[index] === undefined) {
                            setEditingProducts({
                              ...editingProducts,
                              [index]: { ...localProducts[index] },
                            });
                          }
                          handleProductFieldChange(index, "quantity", value || 1);
                        }}
                        size="small"
                        style={{ width: "100%" }}
                        disabled={saving}
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
                    const displayValue = editingProducts[index]?.uom !== undefined 
                      ? (editingProducts[index]?.uom || "Unit") 
                      : (product.uom || "Unit");
                    return (
                      <Select
                        value={displayValue}
                        onChange={(value) => {
                          // Auto-enable edit mode if not already editing
                          if (editingProducts[index] === undefined) {
                            setEditingProducts({
                              ...editingProducts,
                              [index]: { ...localProducts[index] },
                            });
                          }
                          handleProductFieldChange(index, "uom", value);
                        }}
                        size="small"
                        style={{ width: "100%" }}
                        disabled={saving}
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
                    const displayValue = editingProducts[index]?.unitPrice !== undefined 
                      ? (editingProducts[index]?.unitPrice || 0) 
                      : (product.unitPrice || 0);
                    return (
                      <InputNumber
                        min={0}
                        step={0.01}
                        value={displayValue}
                        onChange={(value) => {
                          // Auto-enable edit mode if not already editing
                          if (editingProducts[index] === undefined) {
                            setEditingProducts({
                              ...editingProducts,
                              [index]: { ...localProducts[index] },
                            });
                          }
                          handleProductFieldChange(index, "unitPrice", value || 0);
                        }}
                        size="small"
                        style={{ width: "100%" }}
                        disabled={saving}
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
                    const displayValue = editingProducts[index]?.taxes !== undefined 
                      ? (editingProducts[index]?.taxes || 0) 
                      : (product.taxes || 0);
                    return (
                      <InputNumber
                        min={0}
                        step={0.01}
                        value={displayValue}
                        onChange={(value) => {
                          // Auto-enable edit mode if not already editing
                          if (editingProducts[index] === undefined) {
                            setEditingProducts({
                              ...editingProducts,
                              [index]: { ...localProducts[index] },
                            });
                          }
                          handleProductFieldChange(index, "taxes", value || 0);
                        }}
                        size="small"
                        style={{ width: "100%" }}
                        disabled={saving}
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
              <div className="col-span-2 flex justify-end items-center gap-2 pt-2 border-t">
                <Dropdown
                  menu={{
                    items: [
                      {
                        key: "qrCode",
                        label: (
                          <Space>
                            <QrCode size={16} />
                            <span>View QR Code</span>
                          </Space>
                        ),
                        onClick: () => handleQRCodeClick(product),
                      },
                      ...(isDraft
                        ? [
                            {
                              key: "delete",
                              label: (
                                <Space>
                                  <Trash2 size={16} />
                                  <span>Delete</span>
                                </Space>
                              ),
                              danger: true,
                              onClick: () => handleRemoveProduct(index),
                            },
                          ]
                        : []),
                    ],
                  }}
                  trigger={["click"]}
                  placement="bottomRight"
                >
                  <Button
                    type="text"
                    icon={<MoreVertical size={16} />}
                    size="small"
                    loading={loadingQR || saving}
                  />
                </Dropdown>
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