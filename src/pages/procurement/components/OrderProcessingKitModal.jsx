import React, { useState, useEffect } from "react";
import { Modal, Button, Input, InputNumber, Table, Tag, Space, message, Card, Divider, Spin } from "antd";
import { Search, X, Package, Check } from "lucide-react";
import { getOrderProcessingKits, addOrderProcessingKitToPO } from "../../../api/procurement";
import Swal from "sweetalert2";

/**
 * Order Processing Kit Modal
 * Allows users to select and add kits from the Order Processing module to Purchase Orders
 */
const OrderProcessingKitModal = ({ visible, onCancel, poId, onSuccess, isDraft }) => {
  const [kits, setKits] = useState([]);
  const [filteredKits, setFilteredKits] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedKit, setSelectedKit] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  
  // Form fields for selected kit
  const [kitQuantity, setKitQuantity] = useState(1);
  const [kitUnitPrice, setKitUnitPrice] = useState(0);
  const [kitTaxes, setKitTaxes] = useState(0);
  const [productOverrides, setProductOverrides] = useState({});

  // Fetch kits when modal opens
  useEffect(() => {
    if (visible) {
      loadKits();
    } else {
      // Reset state when modal closes
      setKits([]);
      setFilteredKits([]);
      setSearch("");
      setSelectedKit(null);
      setKitQuantity(1);
      setKitUnitPrice(0);
      setKitTaxes(0);
      setProductOverrides({});
    }
  }, [visible]);

  // Filter kits based on search
  useEffect(() => {
    if (!search.trim()) {
      setFilteredKits(kits);
    } else {
      const searchLower = search.toLowerCase();
      setFilteredKits(
        kits.filter(
          (kit) =>
            kit.kit_id?.toLowerCase().includes(searchLower) ||
            kit.product_title?.toLowerCase().includes(searchLower) ||
            kit.plateform_id?.plt_name?.toLowerCase().includes(searchLower)
        )
      );
    }
  }, [search, kits]);

  // Auto-recalculate kit unit price when product overrides change
  useEffect(() => {
    if (!selectedKit) return;

    // Calculate kit price from current product overrides or default values
    const calculatedPrice = selectedKit.skus?.reduce((sum, sku) => {
      const productId = sku.pId?._id;
      const override = productOverrides[productId];
      
      // Use override values if available, otherwise use default from kit
      const qty = override?.quantity !== undefined 
        ? (override.quantity || 0)
        : (parseInt(sku.quantity) || 1);
      const price = override?.unitPrice !== undefined 
        ? (override.unitPrice || 0)
        : (parseFloat(sku.price) || 0);
      
      return sum + (qty * price);
    }, 0) || 0;

    // Update kit unit price with calculated value
    setKitUnitPrice(calculatedPrice);
  }, [productOverrides, selectedKit]);

  const loadKits = async () => {
    setLoading(true);
    try {
      const response = await getOrderProcessingKits();
      const kitsList = response?.allKits || response?.data || response || [];
      setKits(Array.isArray(kitsList) ? kitsList : []);
      setFilteredKits(Array.isArray(kitsList) ? kitsList : []);
    } catch (error) {
      console.error("Failed to load kits:", error);
      message.error("Failed to load kits");
      Swal.fire({
        icon: "error",
        title: "Error",
        text: error?.response?.data?.error?.message || "Failed to load kits",
        toast: true,
        position: "top-end",
        showConfirmButton: false,
        timer: 3000,
        timerProgressBar: true,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSelectKit = (kit) => {
    setSelectedKit(kit);
    
    // Calculate default kit price from products
    const defaultPrice = kit.skus?.reduce((sum, sku) => {
      const price = parseFloat(sku.price) || 0;
      const qty = parseInt(sku.quantity) || 1;
      return sum + (price * qty);
    }, 0) || 0;
    
    setKitUnitPrice(defaultPrice);
    
    // Initialize product overrides
    const overrides = {};
    kit.skus?.forEach((sku) => {
      if (sku.pId?._id) {
        overrides[sku.pId._id] = {
          quantity: parseInt(sku.quantity) || 1,
          unitPrice: parseFloat(sku.price) || 0,
          taxes: 0,
        };
      }
    });
    setProductOverrides(overrides);
  };

  const handleProductOverride = (productId, field, value) => {
    setProductOverrides((prev) => ({
      ...prev,
      [productId]: {
        ...prev[productId],
        [field]: value,
      },
    }));
  };

  const handleSubmit = async () => {
    if (!selectedKit) {
      message.warning("Please select a kit");
      return;
    }

    if (!isDraft) {
      Swal.fire({
        icon: "error",
        title: "Cannot Add Kit",
        text: "Kits can only be added when purchase order is in draft status",
        toast: true,
        position: "top-end",
        showConfirmButton: false,
        timer: 3000,
        timerProgressBar: true,
      });
      return;
    }

    if (kitQuantity <= 0) {
      message.warning("Kit quantity must be greater than 0");
      return;
    }

    if (kitUnitPrice < 0) {
      message.warning("Kit unit price must be >= 0");
      return;
    }

    // if (kitTaxes < 0) {
    //   message.warning("Kit taxes must be >= 0");
    //   return;
    // }

    setSubmitting(true);
    try {
      // Build request payload
      const payload = {
        orderProcessingKitId: selectedKit._id,
        kitQuantity: kitQuantity,
        kitUnitPrice: kitUnitPrice,
        kitTaxes: kitTaxes || 0,
      };

      // Add product overrides if any were changed
      const hasOverrides = Object.values(productOverrides).some(
        (override) => override.quantity !== undefined || override.unitPrice !== undefined
      );

      if (hasOverrides) {
        payload.kitProducts = Object.entries(productOverrides).map(([productId, override]) => ({
          productId,
          ...(override.quantity !== undefined && { quantity: override.quantity }),
          ...(override.unitPrice !== undefined && { unitPrice: override.unitPrice }),
          ...(override.taxes !== undefined && { taxes: override.taxes }),
          ...(override.uom && { uom: override.uom }),
        }));
      }

      const response = await addOrderProcessingKitToPO(poId, payload);

      if (response?.success) {
        Swal.fire({
          icon: "success",
          title: "Kit Added",
          text: `Kit "${selectedKit.product_title}" has been added successfully`,
          toast: true,
          position: "top-end",
          showConfirmButton: false,
          timer: 3000,
          timerProgressBar: true,
        });

        // Call success callback to refresh data
        if (onSuccess) {
          onSuccess();
        }

        // Close modal
        onCancel();
      } else {
        throw new Error(response?.error?.message || "Failed to add kit");
      }
    } catch (error) {
      console.error("Failed to add kit:", error);
      const errorMessage =
        error?.response?.data?.error?.message ||
        error?.message ||
        "Failed to add kit to purchase order";

      Swal.fire({
        icon: "error",
        title: "Failed to Add Kit",
        text: errorMessage,
        toast: true,
        position: "top-end",
        showConfirmButton: false,
        timer: 4000,
        timerProgressBar: true,
      });
    } finally {
      setSubmitting(false);
    }
  };

  const kitColumns = [
    {
      title: "Kit ID",
      dataIndex: "kit_id",
      key: "kit_id",
      width: 120,
      render: (kitId) => <Tag color="blue">{kitId || "N/A"}</Tag>,
    },
    {
      title: "Kit Name",
      dataIndex: "product_title",
      key: "product_title",
      width: 250,
      render: (title) => <span className="font-medium">{title || "N/A"}</span>,
    },
    {
      title: "Platform",
      key: "platform",
      width: 150,
      render: (_, kit) => (
        <Tag color="green">{kit.plateform_id?.plt_name || kit.plateform_id?.plt_prefix || "N/A"}</Tag>
      ),
    },
    {
      title: "Products",
      key: "products",
      width: 100,
      render: (_, kit) => (
        <span className="text-gray-600">{kit.skus?.length || 0} items</span>
      ),
    },
    {
      title: "Action",
      key: "action",
      width: 100,
      render: (_, kit) => (
        <Button
          type="primary"
          size="small"
          onClick={() => handleSelectKit(kit)}
          icon={<Check size={14} />}
        >
          Select
        </Button>
      ),
    },
  ];

  const productColumns = [
    {
      title: "Product Name",
      key: "name",
      width: 200,
      render: (_, sku) => (
        <span className="font-medium">{sku.pId?.pro_title || "N/A"}</span>
      ),
    },
    {
      title: "SKU",
      key: "sku",
      width: 180,
      render: (_, sku) => <span className="text-gray-600">{sku.pId?.sku || "N/A"}</span>,
    },
    {
      title: "Quantity",
      key: "quantity",
      width: 120,
      render: (_, sku) => {
        const productId = sku.pId?._id;
        const override = productOverrides[productId];
        const defaultValue = parseInt(sku.quantity) || 1;
        const value = override?.quantity !== undefined ? override.quantity : defaultValue;

        return (
          <InputNumber
            min={1}
            value={value}
            onChange={(val) => handleProductOverride(productId, "quantity", val)}
            size="small"
            style={{ width: "100%" }}
          />
        );
      },
    },
    {
      title: "Unit Price",
      key: "unitPrice",
      width: 120,
      render: (_, sku) => {
        const productId = sku.pId?._id;
        const override = productOverrides[productId];
        const defaultValue = parseFloat(sku.price) || 0;
        const value = override?.unitPrice !== undefined ? override.unitPrice : defaultValue;

        return (
          <InputNumber
            min={0}
            step={0.01}
            value={value}
            onChange={(val) => handleProductOverride(productId, "unitPrice", val)}
            size="small"
            style={{ width: "100%" }}
            prefix="$"
          />
        );
      },
    },
    {
      title: "Total",
      key: "total",
      width: 100,
      render: (_, sku) => {
        const productId = sku.pId?._id;
        const override = productOverrides[productId];
        const qty = override?.quantity !== undefined ? override.quantity : (parseInt(sku.quantity) || 1);
        const price = override?.unitPrice !== undefined ? override.unitPrice : (parseFloat(sku.price) || 0);
        const total = qty * price;

        return <span className="font-medium">${total.toFixed(2)}</span>;
      },
    },
  ];

  return (
    <Modal
      open={visible}
      onCancel={onCancel}
      footer={null}
      width={1000}
      title={
        <div className="flex items-center gap-2">
          <Package size={20} className="text-blue-600" />
          <span>Add Kit from Order Processing</span>
        </div>
      }
      closeIcon={<X size={20} />}
    >
      <div className="space-y-4">
        {!selectedKit ? (
          // Kit Selection View
          <>
            <div className="flex items-center gap-2 mb-4">
              <Input
                placeholder="Search kits by ID, name, or platform..."
                prefix={<Search size={16} />}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                allowClear
                size="large"
              />
            </div>

            {loading ? (
              <div className="flex justify-center items-center py-12">
                <Spin size="large" />
              </div>
            ) : filteredKits.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <Package size={48} className="mx-auto mb-4 text-gray-400" />
                <p>No kits found</p>
              </div>
            ) : (
              <Table
                columns={kitColumns}
                dataSource={filteredKits}
                rowKey={(record) => record._id}
                pagination={{ pageSize: 10 }}
                size="small"
                scroll={{ y: 400 }}
              />
            )}
          </>
        ) : (
          // Kit Details and Form View
          <>
            <Card size="small" className="bg-blue-50">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-lg mb-1">{selectedKit.product_title}</h3>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Tag color="blue">{selectedKit.kit_id}</Tag>
                    <Tag color="green">{selectedKit.plateform_id?.plt_name || "N/A"}</Tag>
                    <span>{selectedKit.skus?.length || 0} products</span>
                  </div>
                </div>
                <Button onClick={() => setSelectedKit(null)} size="small">
                  Change Kit
                </Button>
              </div>
            </Card>

            <Divider />

            <div className="space-y-4">
              <h4 className="font-semibold">Kit Information</h4>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Kit Quantity <span className="text-red-500">*</span>
                  </label>
                  <InputNumber
                    min={1}
                    value={kitQuantity}
                    onChange={(val) => setKitQuantity(val || 1)}
                    style={{ width: "100%" }}
                    size="large"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Kit Unit Price <span className="text-red-500">*</span>
                  </label>
                  <InputNumber
                    min={0}
                    step={0.01}
                    value={kitUnitPrice}
                    onChange={(val) => setKitUnitPrice(val || 0)}
                    prefix="$"
                    style={{ width: "100%" }}
                    size="large"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Total Kit Price
                  </label>
                  <div className="w-full px-3 py-2 border border-gray-300 rounded bg-gray-50 text-lg font-semibold text-gray-900" style={{ height: '40px', display: 'flex', alignItems: 'center' }}>
                    ${((kitQuantity || 0) * (kitUnitPrice || 0)).toFixed(2)}
                  </div>
                </div>
                {/* <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Kit Taxes
                  </label>
                  <InputNumber
                    min={0}
                    step={0.01}
                    value={kitTaxes}
                    onChange={(val) => setKitTaxes(val || 0)}
                    prefix="$"
                    style={{ width: "100%" }}
                    size="large"
                  />
                </div> */}
              </div>

              <Divider />

              <div>
                <h4 className="font-semibold mb-2">Products in Kit (Optional Overrides)</h4>
                <Table
                  columns={productColumns}
                  dataSource={selectedKit.skus || []}
                  rowKey={(record) => record.pId?._id || record._id}
                  pagination={false}
                  size="small"
                />
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button onClick={() => setSelectedKit(null)}>Back</Button>
                <Button
                  type="primary"
                  onClick={handleSubmit}
                  loading={submitting}
                  disabled={!isDraft}
                >
                  Add Kit to Purchase Order
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
};

export default OrderProcessingKitModal;

