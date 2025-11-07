import React, { useState, useEffect } from "react";
import { Modal, Form, Input, Button, Card, Row, Col, Select, InputNumber, message } from "antd";
import { Plus, Trash2 } from "lucide-react";

/**
 * Edit Box Modal Component
 */
const EditBoxModal = ({
  visible,
  onCancel,
  onFinish,
  form,
  purchaseOrder,
  box,
  loading = false,
}) => {
  const [selectedItems, setSelectedItems] = useState([]);
  const products = purchaseOrder?.products || [];

  // Calculate available quantity for each product/kit
  // When editing, add back the current box's quantity since backend will restore it
  const getAvailableQuantity = (product, excludeCurrentBox = true) => {
    if (!product) return 0;
    
    let available = product.quantity || 0;
    
    // When editing a box, add back the quantity from current box items
    if (excludeCurrentBox && box && box.items) {
      const currentBoxQty = box.items.reduce((sum, item) => {
        if (product.type === "kit") {
          if (item.kitId === product.kitId) {
            return sum + (item.quantity || 0);
          }
        } else {
          if (item.productId === (product.productId || product._id)) {
            return sum + (item.quantity || 0);
          }
        }
        return sum;
      }, 0);
      
      available += currentBoxQty;
    }
    
    return available;
  };

  const handleAddItem = () => {
    const newItem = {
      itemId: null,
      itemType: null,
      quantity: 1,
      name: null,
      sku: null,
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
        name: selectedProduct?.name || null,
        sku: selectedProduct?.sku || null,
      };
    } else if (field === "quantity") {
      // InputNumber handles all validation via min/max props
      // Just store the value directly - InputNumber will enforce constraints
      // If value is null/undefined/empty, InputNumber will handle it
      if (value === null || value === undefined || value === "") {
        // Keep current value if input is cleared (don't reset to 1 while typing)
        updated[index] = { ...updated[index], quantity: updated[index]?.quantity || 1 };
      } else {
        // Store the value as-is - InputNumber already validated it
        updated[index] = { ...updated[index], quantity: value };
      }
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
      const validItems = selectedItems
        .filter((item) => {
          if (!item.itemId) return false;
          const qty = parseInt(item.quantity);
          return !isNaN(qty) && qty > 0;
        })
        .map((item) => {
          const product = products.find(
            (p) => {
              if (p.type === "kit") {
                return p.kitId === item.itemId || p._id === item.itemId;
              } else {
                return p.productId === item.itemId || p._id === item.itemId;
              }
            }
          );
          
          // Preserve exact quantity value
          const quantity = typeof item.quantity === "number" 
            ? Math.max(1, item.quantity) 
            : Math.max(1, parseInt(item.quantity) || 1);
          
          return {
            productId: item.itemType === "kit" ? null : item.itemId,
            kitId: item.itemType === "kit" ? item.itemId : null,
            quantity: quantity,
            sku: item.sku || product?.sku || null,
            name: item.name || product?.name || null,
          };
        });

      if (validItems.length === 0) {
        message.error("Box must have at least one item with quantity greater than 0");
        return;
      }

      onFinish({
        ...values,
        items: validItems,
      });
    });
  };

  // Initialize form when box data is loaded
  useEffect(() => {
    if (visible && box) {
      form.setFieldsValue({
        name: box.name || "",
      });

      // Populate items from existing box - preserve names from enriched API
      if (box.items && box.items.length > 0) {
        const mappedItems = box.items.map((item) => {
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
            quantity: typeof item.quantity === "number" ? item.quantity : (parseInt(item.quantity) || 1),
            name: item.name || null,
            sku: item.sku || null,
          };
        });
        setSelectedItems(mappedItems);
      } else {
        setSelectedItems([]);
      }
    } else if (visible && !box) {
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
        <Form.Item name="name" label="Box Description (Optional)">
          <Input placeholder="e.g., Box Description" disabled={loading} />
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
                
                // Use item.name from API response (enriched by backend) as primary display
                const displayName = item.name || selectedProduct?.name || 
                  (item.itemType === "kit" ? `Kit ${item.itemId}` : "Unknown Product");
                const displaySku = item.sku || selectedProduct?.sku || null;
                
                const availableQty = selectedProduct
                  ? getAvailableQuantity(selectedProduct, true)
                  : 0;
                
                const isQuantityExceeded = item.quantity > availableQty;
                
                // Build options list - include current item even if not in PO products
                const selectOptions = products.map((p) => {
                  const itemId = p.type === "kit" 
                    ? p.kitId 
                    : p.productId || p._id;
                  
                  const productName = p.name || 
                    (p.type === "kit" ? `Kit ${p.kitId}` : "Unknown Product");
                  const typeLabel = p.type === "kit" ? " [Kit]" : "";
                  const skuLabel = p.sku ? ` (${p.sku})` : "";
                  const available = getAvailableQuantity(p, true);
                  const availableLabel = available > 0 ? ` - ${available} available` : " - Out of stock";
                  
                  return {
                    value: itemId,
                    label: `${productName}${typeLabel}${skuLabel}${availableLabel}`,
                  };
                });
                
                // If current item is not in PO products list, add it to options with just the name
                if (item.itemId && !selectedProduct) {
                  const currentItemOption = {
                    value: item.itemId,
                    label: displayName, // Show full product name from API response, not "KIT-1"
                  };
                  selectOptions.unshift(currentItemOption);
                }
                
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
                          options={selectOptions}
                        />
                      </Col>
                      <Col xs={18} sm={8}>
                        <div className="flex flex-col">
                          <InputNumber
                            placeholder="Quantity"
                            min={1}
                            max={availableQty > 0 ? availableQty : undefined}
                            value={item.quantity}
                            onChange={(value) => {
                              // InputNumber can pass number, null, undefined, or empty string
                              // Pass value directly to handleItemChange which will handle validation
                              handleItemChange(index, "quantity", value);
                            }}
                            controls={true}
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

export default EditBoxModal;

