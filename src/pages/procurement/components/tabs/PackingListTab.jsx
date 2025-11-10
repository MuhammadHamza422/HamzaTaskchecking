import React, { useState, useEffect } from "react";
import {
  Card,
  Button,
  Space,
  Table,
  Form,
  Tag,
  message,
  Skeleton,
  Checkbox,
  Dropdown,
  Descriptions,
} from "antd";
import Swal from "sweetalert2";
import {
  Plus,
  Trash2,
  Printer,
  QrCode,
  Package,
  MoreVertical,
  Edit as EditIcon,
} from "lucide-react";
import {
  getBoxes,
  getBox,
  createBox,
  updateBox,
  deleteBox,
  getBoxQRCode,
  printBoxLabels,
  printPackingList,
} from "../../../../api/procurement";
import QRCodeModal from "../QRCodeModal";
import BulkQRCodeModal from "../BulkQRCodeModal";
import CreateBoxModal from "./CreateBoxModal";
import EditBoxModal from "./EditBoxModal";

/**
 * Packing List Tab Component
 * Manage boxes, QR codes, and print labels
 */
const PackingListTab = ({ purchaseOrder, poId, onReload, onUnsavedChangesChange }) => {
  const [boxes, setBoxes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creatingBox, setCreatingBox] = useState(false);
  const [updatingBox, setUpdatingBox] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [boxQRVisible, setBoxQRVisible] = useState(false);
  const [boxQRCode, setBoxQRCode] = useState(null);
  const [selectedBoxIndices, setSelectedBoxIndices] = useState([]);
  const [bulkQRModalVisible, setBulkQRModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingBox, setEditingBox] = useState(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [expandedRowKeys, setExpandedRowKeys] = useState([]);
  const [form] = Form.useForm();
  const [editForm] = Form.useForm();

  const isDraft = purchaseOrder?.status === "draft";

  // Sync unsaved changes with parent
  useEffect(() => {
    if (onUnsavedChangesChange) {
      onUnsavedChangesChange(hasUnsavedChanges);
    }
  }, [hasUnsavedChanges, onUnsavedChangesChange]);

  useEffect(() => {
    if (poId) {
      loadBoxes();
    }
  }, [poId]);

  const loadBoxes = async () => {
    setLoading(true);
    try {
      const response = await getBoxes(poId, { includeItems: true });
      const boxesData = response?.data?.boxes || [];
      setBoxes(boxesData);
      // Clear unsaved changes when boxes are loaded
      setHasUnsavedChanges(false);
    } catch (error) {
      console.error("Failed to load boxes:", error);
      message.error("Failed to load boxes");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateBox = async (values) => {
    setCreatingBox(true);
    setLoading(true); // Show loading in this tab
    try {
      // Call createBox API immediately
      await createBox(poId, {
        name: values.name,
        items: values.items,
      });
      
      Swal.fire({
        icon: "success",
        title: "Box Created",
        text: "Box has been created successfully",
        toast: true,
        position: "top-end",
        showConfirmButton: false,
        timer: 3000,
        timerProgressBar: true,
      });
      setModalVisible(false);
      form.resetFields();
      
      // Automatically reload PO to update product quantities (this will also refresh boxes if PO includes them)
      if (onReload) {
        await onReload();
      }
      
      // Reload boxes from server to get the box ID and latest data
      await loadBoxes();
      
      // Clear unsaved changes since we auto-updated PO
      setHasUnsavedChanges(false);
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
      setLoading(false); // Clear loading in this tab
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
      Swal.fire({
        icon: "success",
        title: "Box Updated",
        text: "Box has been updated successfully",
        toast: true,
        position: "top-end",
        showConfirmButton: false,
        timer: 3000,
        timerProgressBar: true,
      });
      setEditModalVisible(false);
      setEditingBox(null);
      editForm.resetFields();
      // Reload boxes to get latest data
      await loadBoxes();
      
      // Automatically reload PO to update product quantities
      if (onReload) {
        await onReload();
      }
      
      // Clear unsaved changes since we auto-updated PO
      setHasUnsavedChanges(false);
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
      setLoading(false); // Clear loading in this tab
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
      setLoading(true); // Show loading in this tab
      try {
        await deleteBox(boxId);
        Swal.fire({
          icon: "success",
          title: "Box Deleted",
          text: "Box has been deleted successfully",
          toast: true,
          position: "top-end",
          showConfirmButton: false,
          timer: 3000,
          timerProgressBar: true,
        });
        
        // Automatically reload PO to update product quantities
        if (onReload) {
          await onReload();
        }
        
        // Reload boxes
        await loadBoxes();
        
        // Clear unsaved changes since we auto-updated PO
        setHasUnsavedChanges(false);
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
      } finally {
        setLoading(false); // Clear loading in this tab
      }
    }
  };


  // Helper function to filter out fallback box names
  const getCleanBoxName = (boxName) => {
    if (!boxName) return "";
    // Filter out generated fallback names (e.g., "Box P00014-box-3")
    if (boxName.trim().match(/^Box\s+P\d+-box-\d+/i)) return "";
    return boxName.trim();
  };

  const handleShowQRCode = async (boxId) => {
    try {
      const response = await getBoxQRCode(boxId, { format: "json" });
      // Find the box from the boxes list to get the name
      const box = boxes.find((b) => b.boxId === boxId || b._id === boxId);
      
      // Get clean box name (no fallbacks)
      const cleanBoxName = getCleanBoxName(
        box?.name || response?.data?.box?.name || response?.data?.name
      );
      
      // Merge QR code response with box data to include name (only if it's a real name)
      setBoxQRCode({
        ...response?.data,
        box: box ? {
          ...box,
          name: cleanBoxName,
        } : response?.data?.box ? {
          ...response?.data?.box,
          name: cleanBoxName,
        } : response?.data?.box,
        name: cleanBoxName,
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
      title: "Description",
      dataIndex: "name",
      key: "name",
      width: 200,
      render: (text) => {
        // Filter out fallback names like "Box P00014-box-3"
        if (!text) return "-";
        const cleanName = text.trim().match(/^Box\s+P\d+-box-\d+/i) ? "" : text.trim();
        return cleanName || "-";
      },
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
            key: "edit",
            label: (
              <Space>
                <EditIcon size={14} />
                <span>Edit</span>
              </Space>
            ),
            onClick: () => handleEditBox(record.boxId),
            disabled: !isDraft, // Disable edit when not draft
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
          // {
          //   key: "print",
          //   label: (
          //     <Space>
          //       <Printer size={14} />
          //       <span>Print Labels</span>
          //     </Space>
          //   ),
          //   onClick: () => handlePrintLabels([record.boxId]),
          // },
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
            disabled: !isDraft, // Disable delete when not draft
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
          disabled={!isDraft} // Disable create box when not draft
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
            disabled={!isDraft} // Disable create box when not draft
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
              expandable={{
                expandedRowKeys,
                onExpand: (expanded, record) => {
                  if (expanded) {
                    setExpandedRowKeys([...expandedRowKeys, record._id || record.boxId]);
                  } else {
                    setExpandedRowKeys(expandedRowKeys.filter(key => key !== (record._id || record.boxId)));
                  }
                },
                expandedRowRender: (record) => {
                  const items = record.items || [];
                  return (
                    <div className="p-4 bg-gray-50">
                      <Descriptions title="Box Items" bordered size="small" column={1}>
                        {items.map((item, index) => (
                          <Descriptions.Item key={index} label={`Item ${index + 1}`}>
                            <div>
                              <div className="font-medium">{item.name || "Unknown Product"}</div>
                              {item.sku && <div className="text-xs text-gray-500">SKU: {item.sku}</div>}
                              <div className="text-sm mt-1">
                                Quantity: <span className="font-semibold">{item.quantity}</span> {item.uom || "Unit"}
                              </div>
                              {item.unitPrice && (
                                <div className="text-sm text-gray-600">
                                  Unit Price: ${item.unitPrice}
                                </div>
                              )}
                            </div>
                          </Descriptions.Item>
                        ))}
                      </Descriptions>
                    </div>
                  );
                },
                expandIcon: ({ expanded, onExpand, record }) => (
                  <Button
                    type="text"
                    onClick={(e) => {
                      e.stopPropagation();
                      onExpand(record, e);
                    }}
                    size="small"
                    style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      width: '30px',
                      height: '30px',
                    }}
                  >
                    <Plus 
                      size={24} 
                      style={{ 
                        transform: expanded ? 'rotate(45deg)' : 'rotate(0deg)', 
                        transition: 'transform 0.2s' 
                      }} 
                    />
                  </Button>
                ),
              }}
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
                      {(() => {
                        // Filter out fallback names like "Box P00014-box-3"
                        const cleanName = box.name && !box.name.trim().match(/^Box\s+P\d+-box-\d+/i)
                          ? box.name.trim()
                          : "";
                        return cleanName ? (
                          <div className="font-medium text-gray-900 mb-1">{cleanName}</div>
                        ) : null;
                      })()}
                    </div>
                    <Dropdown
                      menu={{
                        items: [
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
                          // {
                          //   key: "print",
                          //   label: (
                          //     <Space>
                          //       <Printer size={14} />
                          //       <span>Print Labels</span>
                          //     </Space>
                          //   ),
                          //   onClick: () => handlePrintLabels([box.boxId]),
                          // },
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
        loading={creatingBox}
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
        items={selectedBoxes.map((box) => {
          // Filter out fallback names before passing to BulkQRCodeModal
          const cleanName = box.name && !box.name.trim().match(/^Box\s+P\d+-box-\d+/i)
            ? box.name.trim()
            : "";
          return { 
            ...box, 
            type: "box", 
            boxId: box.boxId,
            name: cleanName, // Only pass clean name, no fallbacks
          };
        })}
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
        box={editingBox}
        loading={updatingBox}
      />
    </div>
  );
};

export default PackingListTab;

