import React, { useState, useEffect } from "react";
import {
  Card,
  Button,
  Space,
  Table,
  Modal,
  Form,
  Input,
  InputNumber,
  Tag,
  message,
  Skeleton,
  Row,
  Col,
  Select,
  Checkbox,
  Dropdown,
} from "antd";
import Swal from "sweetalert2";
import {
  Plus,
  Trash2,
  Printer,
  QrCode,
  Package,
  Eye,
  MoreVertical,
  Edit as EditIcon,
} from "lucide-react";
import {
  getBoxes,
  createBox,
  updateBox,
  deleteBox,
  getBox,
  getBoxQRCode,
  printBoxLabels,
  printPackingList,
  scanBox,
} from "../../../../api/procurement";
import QRCodeModal from "../QRCodeModal";
import BulkQRCodeModal from "../BulkQRCodeModal";

const { Option } = Select;

/**
 * Packing List Tab Component
 * Manage boxes, QR codes, and print labels
 */
const PackingListTab = ({ purchaseOrder, poId, onReload }) => {
  const [boxes, setBoxes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creatingBox, setCreatingBox] = useState(false);
  const [updatingBox, setUpdatingBox] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [viewBoxVisible, setViewBoxVisible] = useState(false);
  const [selectedBox, setSelectedBox] = useState(null);
  const [boxQRVisible, setBoxQRVisible] = useState(false);
  const [boxQRCode, setBoxQRCode] = useState(null);
  const [selectedBoxIndices, setSelectedBoxIndices] = useState([]);
  const [bulkQRModalVisible, setBulkQRModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingBox, setEditingBox] = useState(null);
  const [form] = Form.useForm();
  const [editForm] = Form.useForm();

  useEffect(() => {
    if (poId) {
      loadBoxes();
    }
  }, [poId]);

  const loadBoxes = async () => {
    setLoading(true);
    try {
      const response = await getBoxes(poId, { includeItems: true });
      setBoxes(response?.data?.boxes || []);
    } catch (error) {
      console.error("Failed to load boxes:", error);
      message.error("Failed to load boxes");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateBox = async (values) => {
    setCreatingBox(true);
    try {
      await createBox(poId, {
        name: values.name,
        items: values.items,
      });
      message.success("Box created successfully");
      setModalVisible(false);
      form.resetFields();
      await loadBoxes();
      // Reload purchase order to update product quantities in ProductsTab
      if (onReload) {
        await onReload();
      }
    } catch (error) {
      console.error("Failed to create box:", error);
      const errorResponse = error?.response?.data?.error;
      const errorMessage = errorResponse?.message || "Failed to create box";
      const shortMessage = errorResponse?.details?.shortMessage;
      const details = errorResponse?.details || {};
      
      // Show SweetAlert toast with the improved error message
      Swal.fire({
        icon: "error",
        title: "Cannot Create Box",
        text: shortMessage || errorMessage,
        html: details.shortMessage 
          ? `<p><strong>${shortMessage}</strong></p>${details.kitName || details.productName ? `<p class="text-sm text-gray-600 mt-2"><strong>${details.kitName || details.productName}</strong>: Only ${details.available} available (requested: ${details.requested})</p>` : ''}`
          : errorMessage,
        toast: true,
        position: "top-end",
        showConfirmButton: false,
        timer: 5000,
        timerProgressBar: true,
      });
    } finally {
      setCreatingBox(false);
    }
  };

  const handleEditBox = async (boxId) => {
    try {
      const response = await getBox(boxId);
      const box = response?.data;
      setEditingBox(box);
      setEditModalVisible(true);
      
      // Pre-populate form with box data
      editForm.setFieldsValue({
        name: box.name || "",
      });
    } catch (error) {
      console.error("Failed to load box for editing:", error);
      message.error("Failed to load box details");
    }
  };

  const handleUpdateBox = async (values) => {
    if (!editingBox) return;
    
    setUpdatingBox(true);
    try {
      await updateBox(editingBox.boxId, {
        name: values.name,
        items: values.items,
      });
      message.success("Box updated successfully");
      setEditModalVisible(false);
      setEditingBox(null);
      editForm.resetFields();
      await loadBoxes();
      // Reload purchase order to update product quantities in ProductsTab
      if (onReload) {
        await onReload();
      }
    } catch (error) {
      console.error("Failed to update box:", error);
      const errorResponse = error?.response?.data?.error;
      const errorMessage = errorResponse?.message || "Failed to update box";
      const shortMessage = errorResponse?.details?.shortMessage;
      const details = errorResponse?.details || {};
      
      // Show SweetAlert toast with the improved error message
      Swal.fire({
        icon: "error",
        title: "Cannot Update Box",
        text: shortMessage || errorMessage,
        html: details.shortMessage 
          ? `<p><strong>${shortMessage}</strong></p>${details.kitName || details.productName ? `<p class="text-sm text-gray-600 mt-2"><strong>${details.kitName || details.productName}</strong>: Only ${details.available} available (requested: ${details.requested})</p>` : ''}`
          : errorMessage,
        toast: true,
        position: "top-end",
        showConfirmButton: false,
        timer: 5000,
        timerProgressBar: true,
      });
    } finally {
      setUpdatingBox(false);
    }
  };

  const handleDeleteBox = async (boxId) => {
    const box = boxes.find((b) => b.boxId === boxId || b._id === boxId);
    const boxName = box?.name || box?.boxId || "this box";

    const result = await Swal.fire({
      title: "Delete Box?",
      text: `Are you sure you want to delete ${boxName}? This action cannot be undone.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "Yes, delete it",
      cancelButtonText: "Cancel",
    });

    if (result.isConfirmed) {
      try {
        await deleteBox(boxId);
        message.success("Box deleted successfully");
        loadBoxes();
      } catch (error) {
        console.error("Failed to delete box:", error);
        const errorMessage =
          error?.response?.data?.error?.message || "Failed to delete box";
        message.error(errorMessage);
        Swal.fire({
          icon: "error",
          title: "Delete Failed",
          text: errorMessage,
        });
      }
    }
  };

  const handleViewBox = async (boxId) => {
    try {
      const response = await getBox(boxId);
      setSelectedBox(response?.data);
      setViewBoxVisible(true);
    } catch (error) {
      console.error("Failed to load box:", error);
      message.error("Failed to load box details");
    }
  };

  const handleShowQRCode = async (boxId) => {
    try {
      const response = await getBoxQRCode(boxId, { format: "json" });
      // Find the box from the boxes list to get the name
      const box = boxes.find((b) => b.boxId === boxId || b._id === boxId);
      
      // Merge QR code response with box data to include name
      setBoxQRCode({
        ...response?.data,
        box: box ? {
          ...box,
          name: box.name,
        } : response?.data?.box,
        name: box?.name || response?.data?.box?.name || response?.data?.name,
      });
      setBoxQRVisible(true);
    } catch (error) {
      console.error("Failed to load QR code:", error);
      message.error("Failed to load QR code");
    }
  };

  const handlePrintLabels = async (boxIds) => {
    try {
      const blob = await printBoxLabels({
        boxIds,
        format: "pdf",
        template: "standard",
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `box-labels-${Date.now()}.pdf`;
      link.click();
      window.URL.revokeObjectURL(url);
      message.success("Labels printed successfully");
    } catch (error) {
      console.error("Failed to print labels:", error);
      message.error("Failed to print labels");
    }
  };

  const handlePrintPackingList = async () => {
    try {
      const blob = await printPackingList(poId, { format: "pdf" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `packing-list-${purchaseOrder?.reference || poId}.pdf`;
      link.click();
      window.URL.revokeObjectURL(url);
      message.success("Packing list printed successfully");
    } catch (error) {
      console.error("Failed to print packing list:", error);
      message.error("Failed to print packing list");
    }
  };

  // Get selected boxes
  const selectedBoxes = selectedBoxIndices.map((index) => boxes[index]).filter(Boolean);

  // Handle bulk print labels
  const handleBulkPrintLabels = () => {
    if (selectedBoxes.length === 0) {
      return;
    }
    setBulkQRModalVisible(true);
  };

  // Handle checkbox selection
  const handleCheckboxChange = (index, checked) => {
    if (checked) {
      setSelectedBoxIndices((prev) => [...prev, index]);
    } else {
      setSelectedBoxIndices((prev) => prev.filter((i) => i !== index));
    }
  };

  // Handle select all
  const handleSelectAll = (checked) => {
    if (checked) {
      setSelectedBoxIndices(boxes.map((_, idx) => idx));
    } else {
      setSelectedBoxIndices([]);
    }
  };

  const columns = [
    {
      title: (
        <Checkbox
          indeterminate={
            selectedBoxIndices.length > 0 && selectedBoxIndices.length < boxes.length
          }
          checked={boxes.length > 0 && selectedBoxIndices.length === boxes.length}
          onChange={(e) => handleSelectAll(e.target.checked)}
        />
      ),
      key: "checkbox",
      width: 50,
      render: (_, record, index) => (
        <Checkbox
          checked={selectedBoxIndices.includes(index)}
          onChange={(e) => handleCheckboxChange(index, e.target.checked)}
        />
      ),
    },
    {
      title: "Box Number",
      dataIndex: "boxId",
      key: "boxId",
      width: 150,
      render: (text) => <Tag color="blue">{text}</Tag>,
    },
    {
      title: "Name",
      dataIndex: "name",
      key: "name",
      width: 200,
    },
    {
      title: "Items Count",
      key: "itemsCount",
      width: 120,
      render: (_, record) => (
        <span>{record.items?.length || record.itemsCount || 0} items</span>
      ),
    },
    {
      title: "Total Quantity",
      key: "totalItems",
      width: 130,
      render: (_, record) => {
        const total = record.items?.reduce(
          (sum, item) => sum + (item.quantity || 0),
          0
        );
        return <span>{total || record.totalItems || 0}</span>;
      },
    },
    {
      title: "Actions",
      key: "actions",
      width: 80,
      align: "center",
      render: (_, record) => {
        const menuItems = [
          {
            key: "view",
            label: (
              <Space>
                <Eye size={14} />
                <span>View</span>
              </Space>
            ),
            onClick: () => handleViewBox(record.boxId),
          },
          {
            key: "edit",
            label: (
              <Space>
                <EditIcon size={14} />
                <span>Edit</span>
              </Space>
            ),
            onClick: () => handleEditBox(record.boxId),
          },
          {
            key: "qrCode",
            label: (
              <Space>
                <QrCode size={14} />
                <span>QR Code</span>
              </Space>
            ),
            onClick: () => handleShowQRCode(record.boxId),
          },
          {
            key: "print",
            label: (
              <Space>
                <Printer size={14} />
                <span>Print Labels</span>
              </Space>
            ),
            onClick: () => handlePrintLabels([record.boxId]),
          },
          {
            type: "divider",
          },
          {
            key: "delete",
            label: (
              <Space>
                <Trash2 size={14} />
                <span style={{ color: "#ff4d4f" }}>Delete</span>
              </Space>
            ),
            danger: true,
            onClick: () => handleDeleteBox(record.boxId),
          },
        ];

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
              onClick={(e) => e.stopPropagation()}
            />
          </Dropdown>
        );
      },
    },
  ];

  if (loading) {
    return <Skeleton active paragraph={{ rows: 5 }} />;
  }

  return (
    <div>
      <div className="mb-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
        <Button
          type="primary"
          icon={<Plus size={16} />}
          onClick={() => setModalVisible(true)}
          size="middle"
          className="w-full sm:w-auto"
        >
          Add Box
        </Button>
        {/* <Button
          icon={<Printer size={16} />}
          onClick={handlePrintPackingList}
          size="middle"
        >
          Print Packing List
        </Button> */}
      </div>

      {/* Bulk Actions Bar */}
      {selectedBoxes.length > 0 && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
          <span className="text-sm font-medium text-blue-900">
            {selectedBoxes.length} box{selectedBoxes.length > 1 ? "es" : ""} selected
          </span>
          <Button
            type="primary"
            icon={<Printer size={16} />}
            onClick={handleBulkPrintLabels}
            size="small"
            className="w-full sm:w-auto"
          >
            Print Labels ({selectedBoxes.length})
          </Button>
        </div>
      )}

      {boxes.length === 0 ? (
        <div className="text-center py-12 text-gray-500 bg-gray-100">
          <Package className="mx-auto mb-4" size={48} />
          <p>No boxes created yet</p>
          <Button
            type="primary"
            icon={<Plus size={16} />}
            onClick={() => setModalVisible(true)}
            className="mt-4"
            size="middle"
          >
            Create First Box
          </Button>
        </div>
      ) : (
        <>
          {/* Desktop Table View */}
          <div className="hidden md:block">
            <Table
              columns={columns}
              dataSource={boxes}
              rowKey={(record) => record._id || record.boxId}
              pagination={false}
              size="small"
            />
          </div>

          {/* Mobile Card View */}
          <div className="md:hidden space-y-3">
            {boxes.map((box, index) => {
              const itemsCount = box.items?.length || box.itemsCount || 0;
              const totalQuantity = box.items?.reduce(
                (sum, item) => sum + (item.quantity || 0),
                0
              ) || box.totalItems || 0;

              return (
                <Card
                  key={box._id || box.boxId}
                  size="small"
                  className="shadow-md bg-gray-100"
                >
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <Checkbox
                      checked={selectedBoxIndices.includes(index)}
                      onChange={(e) => handleCheckboxChange(index, e.target.checked)}
                    />
                    <div className="flex-1 min-w-0">
                      <Tag color="blue" className="mb-2">
                        {box.boxId}
                      </Tag>
                      {box.name && (
                        <div className="font-medium text-gray-900 mb-1">{box.name}</div>
                      )}
                    </div>
                    <Dropdown
                      menu={{
                        items: [
                          {
                            key: "view",
                            label: (
                              <Space>
                                <Eye size={14} />
                                <span>View</span>
                              </Space>
                            ),
                            onClick: () => handleViewBox(box.boxId),
                          },
                          {
                            key: "edit",
                            label: (
                              <Space>
                                <EditIcon size={14} />
                                <span>Edit</span>
                              </Space>
                            ),
                            onClick: () => handleEditBox(box.boxId),
                          },
                          {
                            key: "qrCode",
                            label: (
                              <Space>
                                <QrCode size={14} />
                                <span>QR Code</span>
                              </Space>
                            ),
                            onClick: () => handleShowQRCode(box.boxId),
                          },
                          {
                            key: "print",
                            label: (
                              <Space>
                                <Printer size={14} />
                                <span>Print Labels</span>
                              </Space>
                            ),
                            onClick: () => handlePrintLabels([box.boxId]),
                          },
                          {
                            type: "divider",
                          },
                          {
                            key: "delete",
                            label: (
                              <Space>
                                <Trash2 size={14} />
                                <span style={{ color: "#ff4d4f" }}>Delete</span>
                              </Space>
                            ),
                            danger: true,
                            onClick: () => handleDeleteBox(box.boxId),
                          },
                        ],
                      }}
                      trigger={["click"]}
                      placement="bottomRight"
                    >
                      <Button
                        type="text"
                        icon={<MoreVertical size={16} />}
                        size="small"
                      />
                    </Dropdown>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm pt-3 border-t">
                    <div>
                      <span className="text-gray-500">Items:</span>
                      <span className="ml-2 font-medium">{itemsCount}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Total Qty:</span>
                      <span className="ml-2 font-medium">{totalQuantity}</span>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </>
      )}

      {/* Create Box Modal */}
      <CreateBoxModal
        visible={modalVisible}
        onCancel={() => {
          setModalVisible(false);
          form.resetFields();
        }}
        onFinish={handleCreateBox}
        form={form}
        purchaseOrder={purchaseOrder}
        boxes={boxes}
        loading={creatingBox}
      />

      {/* View Box Modal */}
      <ViewBoxModal
        visible={viewBoxVisible}
        onCancel={() => setViewBoxVisible(false)}
        box={selectedBox}
      />

      {/* Single QR Code Modal */}
      {boxQRCode && (
        <QRCodeModal
          visible={boxQRVisible}
          onCancel={() => {
            setBoxQRVisible(false);
            setBoxQRCode(null);
          }}
          qrData={{
            ...boxQRCode,
            type: "box",
          }}
        />
      )}

      {/* Bulk QR Code Modal */}
      <BulkQRCodeModal
        visible={bulkQRModalVisible}
        onCancel={() => setBulkQRModalVisible(false)}
        items={selectedBoxes.map((box) => ({ ...box, type: "box", boxId: box.boxId }))}
        poId={poId}
        getQRCodeFunction={getBoxQRCode}
        isBox={true}
      />

      {/* Edit Box Modal */}
      <EditBoxModal
        visible={editModalVisible}
        onCancel={() => {
          setEditModalVisible(false);
          setEditingBox(null);
          editForm.resetFields();
        }}
        onFinish={handleUpdateBox}
        form={editForm}
        purchaseOrder={purchaseOrder}
        boxes={boxes}
        box={editingBox}
        loading={updatingBox}
      />
    </div>
  );
};

/**
 * Create Box Modal Component
 */
const CreateBoxModal = ({
  visible,
  onCancel,
  onFinish,
  form,
  purchaseOrder,
  boxes = [],
  loading = false,
}) => {
  const [selectedItems, setSelectedItems] = useState([]);
  const products = purchaseOrder?.products || [];

  // Calculate available quantity for each product/kit
  const getAvailableQuantity = (product) => {
    if (!product) return 0;
    
    const totalInPO = product.quantity || 0;
    
    // Calculate how many are already assigned to boxes
    let alreadyAssigned = 0;
    boxes.forEach((box) => {
      if (box.items) {
        box.items.forEach((item) => {
          if (product.type === "kit") {
            // For kits, check kitId
            if (item.kitId === product.kitId) {
              alreadyAssigned += item.quantity || 0;
            }
          } else {
            // For products, check productId
            if (item.productId === (product.productId || product._id)) {
              alreadyAssigned += item.quantity || 0;
            }
          }
        });
      }
    });
    
    return Math.max(0, totalInPO - alreadyAssigned);
  };

  const handleAddItem = () => {
    const newItem = {
      itemId: null, // Can be productId or kitId
      itemType: null, // "product" or "kit"
      quantity: 1,
    };
    setSelectedItems([...selectedItems, newItem]);
  };

  const handleRemoveItem = (index) => {
    setSelectedItems(selectedItems.filter((_, i) => i !== index));
  };

  const handleItemChange = (index, field, value) => {
    const updated = [...selectedItems];
    
    // If changing the item selection, also update the itemType
    if (field === "itemId") {
      const selectedProduct = products.find(
        (p) => {
          if (p.type === "kit") {
            return p.kitId === value || p._id === value;
          } else {
            return p.productId === value || p._id === value;
          }
        }
      );
      
      updated[index] = {
        ...updated[index],
        itemId: value,
        itemType: selectedProduct?.type || "product",
      };
    } else {
      updated[index] = { ...updated[index], [field]: value };
    }
    
    setSelectedItems(updated);
  };

  const handleSubmit = () => {
    if (selectedItems.length === 0) {
      message.error("Please add at least one item to the box");
      return;
    }

    form.validateFields().then((values) => {
      const payloadItems = selectedItems.map((item) => {
        const product = products.find(
          (p) => {
            if (p.type === "kit") {
              return p.kitId === item.itemId || p._id === item.itemId;
            } else {
              return p.productId === item.itemId || p._id === item.itemId;
            }
          }
        );
        
        const payloadItem = {
          productId: item.itemType === "kit" ? null : item.itemId,
          kitId: item.itemType === "kit" ? item.itemId : null,
          quantity: item.quantity,
          sku: product?.sku || null,
        };

        // Debug logging
        console.log("=== Frontend Box Creation Debug ===");
        console.log("Selected Item:", item);
        console.log("Found Product/Kit:", product);
        console.log("Payload Item:", payloadItem);
        console.log("Available Products in PO:", products.map(p => ({
          type: p.type,
          kitId: p.kitId,
          productId: p.productId,
          name: p.name
        })));
        
        return payloadItem;
      });

      console.log("=== Final Payload ===");
      console.log("Items:", payloadItems);
      
      onFinish({
        ...values,
        items: payloadItems,
      });
    });
  };

  useEffect(() => {
    if (visible) {
      setSelectedItems([]);
      form.resetFields();
    }
  }, [visible]);

  return (
    <Modal
      title="Create Box"
      open={visible}
      onCancel={onCancel}
      onOk={handleSubmit}
      width="90%"
      style={{ maxWidth: 700 }}
      okText="Create"
      confirmLoading={loading}
      okButtonProps={{ disabled: loading }}
      cancelButtonProps={{ disabled: loading }}
    >
      <Form form={form} layout="vertical">
        <Form.Item name="name" label="Box Name (Optional)">
          <Input placeholder="e.g., Box 1"  />
        </Form.Item>

        <div className="mb-4">
          <div className="flex justify-between items-center my-2">
            <span className="font-medium">Items</span>
            <Button
              type="dashed"
              icon={<Plus size={14} />}
              onClick={handleAddItem}
              size="small"
              disabled={loading}
            >
              Add Item
            </Button>
          </div>

          {selectedItems.length === 0 ? (
            <div className="text-center py-4 text-gray-400 text-sm">
              Click "Add Item" to add products to this box
            </div>
          ) : (
            <div className="space-y-2">
              {selectedItems.map((item, index) => {
                // Find the selected product/kit to get available quantity
                const selectedProduct = products.find((p) => {
                  const itemId = p.type === "kit" ? p.kitId : p.productId || p._id;
                  return itemId === item.itemId;
                });
                
                const availableQty = selectedProduct
                  ? getAvailableQuantity(selectedProduct)
                  : 0;
                
                const isQuantityExceeded = item.quantity > availableQty;
                
                return (
                  <Card key={index} size="small" className="mb-2 bg-gray-100">
                    <Row gutter={[16, 12]} align="middle">
                      <Col xs={24} sm={12}>
                        <Select
                          placeholder="Select Product or Kit"
                          style={{ width: "100%" }}
                          value={item.itemId}
                          onChange={(value) =>
                            handleItemChange(index, "itemId", value)
                          }
                          showSearch
                          disabled={loading}
                          filterOption={(input, option) =>
                            (option?.label ?? "")
                              .toLowerCase()
                              .includes(input.toLowerCase())
                          }
                          options={products.map((p) => {
                            // Use productId for products, kitId for kits, or _id as fallback
                            const itemId = p.type === "kit" 
                              ? p.kitId 
                              : p.productId || p._id;
                            
                            // Build label with type indicator
                            const typeLabel = p.type === "kit" ? " [Kit]" : "";
                            const skuLabel = p.sku ? ` (${p.sku})` : "";
                            const available = getAvailableQuantity(p);
                            const availableLabel = available > 0 ? ` - ${available} available` : " - Out of stock";
                            
                            return {
                              value: itemId,
                              label: `${p.name}${typeLabel}${skuLabel}${availableLabel}`,
                            };
                          })}
                        />
                      </Col>
                      <Col xs={18} sm={8}>
                        <div className="flex flex-col">
                          <InputNumber
                            placeholder="Quantity"
                            min={1}
                            max={availableQty}
                            value={item.quantity}
                            onChange={(value) =>
                              handleItemChange(index, "quantity", value)
                            }
                            style={{ width: "100%" }}
                            status={isQuantityExceeded ? "error" : ""}
                            disabled={loading}
                          />
                          {selectedProduct && (
                            <div className="text-xs mt-2 mb-0">
                              <span className={isQuantityExceeded ? "text-red-600" : "text-gray-500"}>
                                {availableQty} available
                                {isQuantityExceeded && (
                                  <span className="ml-1 font-semibold">
                                    (Requested: {item.quantity})
                                  </span>
                                )}
                              </span>
                            </div>
                          )}
                        </div>
                      </Col>
                      <Col xs={6} sm={4}>
                        <Button
                          type="text"
                          danger
                          icon={<Trash2 size={14} />}
                          onClick={() => handleRemoveItem(index)}
                          size="small"
                          disabled={loading}
                        />
                      </Col>
                    </Row>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </Form>
    </Modal>
  );
};

/**
 * Edit Box Modal Component
 */
const EditBoxModal = ({
  visible,
  onCancel,
  onFinish,
  form,
  purchaseOrder,
  boxes = [],
  box,
  loading = false,
}) => {
  const [selectedItems, setSelectedItems] = useState([]);
  const products = purchaseOrder?.products || [];

  // Calculate available quantity for each product/kit
  // When editing, we need to account for items already in this box
  const getAvailableQuantity = (product, excludeCurrentBox = true) => {
    if (!product) return 0;
    
    const totalInPO = product.quantity || 0;
    
    // Calculate how many are already assigned to boxes
    let alreadyAssigned = 0;
    boxes.forEach((b) => {
      // Skip current box when calculating available quantity
      if (excludeCurrentBox && box && (b.boxId === box.boxId || b._id === box._id)) {
        return;
      }
      
      if (b.items) {
        b.items.forEach((item) => {
          if (product.type === "kit") {
            // For kits, check kitId
            if (item.kitId === product.kitId) {
              alreadyAssigned += item.quantity || 0;
            }
          } else {
            // For products, check productId
            if (item.productId === (product.productId || product._id)) {
              alreadyAssigned += item.quantity || 0;
            }
          }
        });
      }
    });
    
    return Math.max(0, totalInPO - alreadyAssigned);
  };

  const handleAddItem = () => {
    const newItem = {
      itemId: null,
      itemType: null,
      quantity: 1,
    };
    setSelectedItems([...selectedItems, newItem]);
  };

  const handleRemoveItem = (index) => {
    setSelectedItems(selectedItems.filter((_, i) => i !== index));
  };

  const handleItemChange = (index, field, value) => {
    const updated = [...selectedItems];
    
    if (field === "itemId") {
      const selectedProduct = products.find(
        (p) => {
          if (p.type === "kit") {
            return p.kitId === value || p._id === value;
          } else {
            return p.productId === value || p._id === value;
          }
        }
      );
      
      updated[index] = {
        ...updated[index],
        itemId: value,
        itemType: selectedProduct?.type || "product",
      };
    } else {
      updated[index] = { ...updated[index], [field]: value };
    }
    
    setSelectedItems(updated);
  };

  const handleSubmit = () => {
    if (selectedItems.length === 0) {
      message.error("Please add at least one item to the box");
      return;
    }

    form.validateFields().then((values) => {
      const payloadItems = selectedItems.map((item) => {
        const product = products.find(
          (p) => {
            if (p.type === "kit") {
              return p.kitId === item.itemId || p._id === item.itemId;
            } else {
              return p.productId === item.itemId || p._id === item.itemId;
            }
          }
        );
        
        const payloadItem = {
          productId: item.itemType === "kit" ? null : item.itemId,
          kitId: item.itemType === "kit" ? item.itemId : null,
          quantity: item.quantity,
          sku: product?.sku || null,
        };

        return payloadItem;
      });

      onFinish({
        ...values,
        items: payloadItems,
      });
    });
  };

  // Initialize form when box data is loaded
  useEffect(() => {
    if (visible && box) {
      // Populate form with existing box data
      form.setFieldsValue({
        name: box.name || "",
      });

      // Populate items from existing box
      if (box.items && box.items.length > 0) {
        const mappedItems = box.items.map((item) => {
          // Determine itemId and itemType from the item
          let itemId = null;
          let itemType = "product";

          if (item.kitId) {
            itemId = item.kitId;
            itemType = "kit";
          } else if (item.productId) {
            itemId = item.productId;
            itemType = "product";
          }

          return {
            itemId,
            itemType,
            quantity: item.quantity || 1,
          };
        });
        setSelectedItems(mappedItems);
      } else {
        setSelectedItems([]);
      }
    } else if (visible && !box) {
      // Reset if modal is opened without box data
      setSelectedItems([]);
      form.resetFields();
    }
  }, [visible, box, form]);

  return (
    <Modal
      title={`Edit Box: ${box?.boxId || ""}`}
      open={visible}
      onCancel={onCancel}
      onOk={handleSubmit}
      width="90%"
      style={{ maxWidth: 700 }}
      okText="Update"
      confirmLoading={loading}
      okButtonProps={{ disabled: loading }}
      cancelButtonProps={{ disabled: loading }}
    >
      <Form form={form} layout="vertical">
        <Form.Item name="name" label="Box Name (Optional)">
          <Input placeholder="e.g., Box 1" disabled={loading} />
        </Form.Item>

        <div className="mb-4">
          <div className="flex justify-between items-center my-2">
            <span className="font-medium">Items</span>
            <Button
              type="dashed"
              icon={<Plus size={14} />}
              onClick={handleAddItem}
              size="small"
              disabled={loading}
            >
              Add Item
            </Button>
          </div>

          {selectedItems.length === 0 ? (
            <div className="text-center py-4 text-gray-400 text-sm">
              Click "Add Item" to add products to this box
            </div>
          ) : (
            <div className="space-y-2">
              {selectedItems.map((item, index) => {
                const selectedProduct = products.find((p) => {
                  const itemId = p.type === "kit" ? p.kitId : p.productId || p._id;
                  return itemId === item.itemId;
                });
                
                const availableQty = selectedProduct
                  ? getAvailableQuantity(selectedProduct, true) // Exclude current box
                  : 0;
                
                // For existing items, we need to account for current quantity in the box
                const currentBoxQty = box?.items?.find((bi) => {
                  if (item.itemType === "kit") {
                    return bi.kitId === item.itemId;
                  } else {
                    return bi.productId === item.itemId;
                  }
                })?.quantity || 0;
                
                // Add current box quantity to available (since we're editing this box)
                const totalAvailable = availableQty + currentBoxQty;
                const isQuantityExceeded = item.quantity > totalAvailable;
                
                return (
                  <Card key={index} size="small" className="mb-2">
                    <Row gutter={[16, 12]} align="middle">
                      <Col xs={24} sm={12}>
                        <Select
                          placeholder="Select Product or Kit"
                          style={{ width: "100%" }}
                          value={item.itemId}
                          onChange={(value) =>
                            handleItemChange(index, "itemId", value)
                          }
                          showSearch
                          disabled={loading}
                          filterOption={(input, option) =>
                            (option?.label ?? "")
                              .toLowerCase()
                              .includes(input.toLowerCase())
                          }
                          options={products.map((p) => {
                            const itemId = p.type === "kit" 
                              ? p.kitId 
                              : p.productId || p._id;
                            
                            const typeLabel = p.type === "kit" ? " [Kit]" : "";
                            const skuLabel = p.sku ? ` (${p.sku})` : "";
                            const available = getAvailableQuantity(p, true);
                            const availableLabel = available > 0 ? ` - ${available} available` : " - Out of stock";
                            
                            return {
                              value: itemId,
                              label: `${p.name}${typeLabel}${skuLabel}${availableLabel}`,
                            };
                          })}
                        />
                      </Col>
                      <Col xs={18} sm={8}>
                        <div className="flex flex-col">
                          <InputNumber
                            placeholder="Quantity"
                            min={1}
                            max={totalAvailable}
                            value={item.quantity}
                            onChange={(value) =>
                              handleItemChange(index, "quantity", value)
                            }
                            style={{ width: "100%" }}
                            status={isQuantityExceeded ? "error" : ""}
                            disabled={loading}
                          />
                          {selectedProduct && (
                            <div className="text-xs mt-2 mb-0">
                              <span className={isQuantityExceeded ? "text-red-600" : "text-gray-500"}>
                                {totalAvailable} available
                                {isQuantityExceeded && (
                                  <span className="ml-1 font-semibold">
                                    (Requested: {item.quantity})
                                  </span>
                                )}
                              </span>
                            </div>
                          )}
                        </div>
                      </Col>
                      <Col xs={6} sm={4}>
                        <Button
                          type="text"
                          danger
                          icon={<Trash2 size={14} />}
                          onClick={() => handleRemoveItem(index)}
                          size="small"
                          disabled={loading}
                        />
                      </Col>
                    </Row>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </Form>
    </Modal>
  );
};

/**
 * View Box Modal Component
 */
const ViewBoxModal = ({ visible, onCancel, box }) => {
  if (!box) return null;

  const columns = [
    {
      title: "Product",
      dataIndex: "name",
      key: "name",
      width: 250,
    },
    {
      title: "SKU",
      dataIndex: "sku",
      key: "sku",
      width: 150,
    },
    {
      title: "Quantity",
      dataIndex: "quantity",
      key: "quantity",
      width: 100,
      align: "right",
    },
    // {
    //   title: "UOM",
    //   dataIndex: "uom",
    //   key: "uom",
    //   width: 80,
    // },
  ];

  return (
    <Modal
      title={`Box Details: ${box.boxId}`}
      open={visible}
      onCancel={onCancel}
      footer={[
        <Button key="close" onClick={onCancel}>
          Close
        </Button>,
      ]}
      width={800}
    >
      <div className="mb-4">
        <p>
          <strong>Box ID:</strong> {box.boxId}
        </p>
        {box.name && (
          <p>
            <strong>Name:</strong> {box.name}
          </p>
        )}
        <p>
          <strong>Purchase Order:</strong> {box.poReference}
        </p>
      </div>

      <Table
        columns={columns}
        dataSource={box.items || []}
        rowKey={(record, index) => record.productId || index}
        pagination={false}
        size="small"
      />
    </Modal>
  );
};


export default PackingListTab;

