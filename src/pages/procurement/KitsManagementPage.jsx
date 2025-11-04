import React, { useState, useEffect } from "react";
import {
  Card,
  Table,
  Button,
  Space,
  Input,
  Modal,
  Form,
  Select,
  InputNumber,
  Switch,
  Tag,
  Popconfirm,
  message,
  Skeleton,
  Typography,
  Row,
  Col,
  Divider,
} from "antd";
import { Plus, Edit2, Trash2, Search, Package, CheckCircle, XCircle } from "lucide-react";
import { getKits, createKit, updateKit, deleteKit } from "../../api/procurement";
import apiClient from "../../api/client";
import Swal from "sweetalert2";

const { Title } = Typography;
const { Option } = Select;

/**
 * Kits Management Page
 * Create, edit, delete, and manage product kits
 */
const KitsManagementPage = () => {
  const [kits, setKits] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingKit, setEditingKit] = useState(null);
  const [form] = Form.useForm();
  const [searchText, setSearchText] = useState("");
  const [products, setProducts] = useState([]);
  const [productSearch, setProductSearch] = useState("");

  useEffect(() => {
    loadKits();
  }, [searchText]);

  const loadKits = async () => {
    setLoading(true);
    try {
      const response = await getKits({
        page: 1,
        limit: 100,
        search: searchText,
      });
      setKits(response?.data?.kits || []);
    } catch (error) {
      console.error("Failed to load kits:", error);
      message.error("Failed to load kits");
    } finally {
      setLoading(false);
    }
  };

  const searchProducts = async (searchValue) => {
    if (!searchValue || searchValue.trim().length < 2) {
      setProducts([]);
      return;
    }

    try {
      const { data } = await apiClient.get("/api/v1/products/all", {
        params: {
          page: 1,
          limit: 50,
          search: searchValue,
        },
      });
      const productsList = Array.isArray(data?.products) ? data.products : [];
      setProducts(productsList);
    } catch (error) {
      console.error("Failed to search products:", error);
      setProducts([]);
    }
  };

  const handleCreate = () => {
    setEditingKit(null);
    form.resetFields();
    setModalVisible(true);
  };

  const handleEdit = (kit) => {
    setEditingKit(kit);
    form.setFieldsValue({
      name: kit.name,
      kitId: kit.kitId,
      description: kit.description,
      isActive: kit.isActive,
      products: kit.products || [],
    });
    setModalVisible(true);
  };

  const handleDelete = async (kitId) => {
    try {
      await deleteKit(kitId);
      message.success("Kit deleted successfully");
      loadKits();
    } catch (error) {
      const errorMessage =
        error?.response?.data?.error?.message || "Failed to delete kit";
      Swal.fire({
        icon: "error",
        title: "Cannot Delete Kit",
        text: errorMessage,
      });
    }
  };

  const handleSubmit = async (values) => {
    try {
      if (editingKit) {
        await updateKit(editingKit._id || editingKit.id, values);
        message.success("Kit updated successfully");
      } else {
        await createKit(values);
        message.success("Kit created successfully");
      }
      setModalVisible(false);
      form.resetFields();
      loadKits();
    } catch (error) {
      const errorMessage =
        error?.response?.data?.error?.message || "Failed to save kit";
      message.error(errorMessage);
    }
  };

  const columns = [
    {
      title: "Kit ID",
      dataIndex: "kitId",
      key: "kitId",
      width: 120,
    },
    {
      title: "Name",
      dataIndex: "name",
      key: "name",
      width: 250,
    },
    {
      title: "Description",
      dataIndex: "description",
      key: "description",
      ellipsis: true,
    },
    {
      title: "Products",
      key: "products",
      width: 200,
      render: (_, record) => {
        const productsList = record.products || [];
        const mainProduct = productsList.find((p) => p.isMain);
        const freeItems = productsList.filter((p) => p.isFree);
        return (
          <div>
            <div className="text-sm">
              <Tag color="blue">{mainProduct ? "1 Main" : "No Main"}</Tag>
              {freeItems.length > 0 && (
                <Tag color="green">{freeItems.length} Free</Tag>
              )}
            </div>
          </div>
        );
      },
    },
    {
      title: "Status",
      dataIndex: "isActive",
      key: "isActive",
      width: 100,
      render: (isActive) => (
        <Tag color={isActive ? "green" : "red"}>
          {isActive ? "Active" : "Inactive"}
        </Tag>
      ),
    },
    {
      title: "Actions",
      key: "actions",
      width: 150,
      render: (_, record) => (
        <Space>
          <Button
            type="link"
            icon={<Edit2 size={16} />}
            onClick={() => handleEdit(record)}
            size="small"
          >
            Edit
          </Button>
          <Popconfirm
            title="Delete this kit?"
            description="This action cannot be undone if the kit is used in purchase orders."
            onConfirm={() => handleDelete(record._id || record.id)}
            okText="Yes"
            cancelText="No"
          >
            <Button
              type="link"
              danger
              icon={<Trash2 size={16} />}
              size="small"
            >
              Delete
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div className="p-4">
      <div className="max-w-7xl mx-auto">
        <Card>
          <div className="flex justify-between items-center mb-4">
            <Title level={4} className="mb-0">
              <Package className="inline-block mr-2" size={20} />
              Kits Management
            </Title>
            <Space>
              <Input.Search
                placeholder="Search kits..."
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                style={{ width: 250 }}
                size="middle"
              />
              <Button
                type="primary"
                icon={<Plus size={16} />}
                onClick={handleCreate}
                size="middle"
              >
                Create Kit
              </Button>
            </Space>
          </div>

          <Table
            columns={columns}
            dataSource={kits}
            rowKey={(record) => record._id || record.id}
            loading={loading}
            pagination={{
              pageSize: 20,
              showSizeChanger: true,
              showTotal: (total) => `Total ${total} kits`,
            }}
          />
        </Card>
      </div>

      {/* Create/Edit Kit Modal */}
      <KitModal
        visible={modalVisible}
        onCancel={() => {
          setModalVisible(false);
          form.resetFields();
        }}
        onFinish={handleSubmit}
        form={form}
        editingKit={editingKit}
        products={products}
        onProductSearch={searchProducts}
        productSearch={productSearch}
        setProductSearch={setProductSearch}
      />
    </div>
  );
};

/**
 * Kit Create/Edit Modal Component
 */
const KitModal = ({
  visible,
  onCancel,
  onFinish,
  form,
  editingKit,
  products,
  onProductSearch,
  productSearch,
  setProductSearch,
}) => {
  const [selectedProducts, setSelectedProducts] = useState([]);

  useEffect(() => {
    if (visible && editingKit) {
      setSelectedProducts(editingKit.products || []);
    } else if (visible && !editingKit) {
      setSelectedProducts([]);
    }
  }, [visible, editingKit]);

  const handleAddProduct = () => {
    if (!productSearch) {
      message.warning("Please search and select a product first");
      return;
    }
    const selected = products.find((p) => p._id === productSearch);
    if (!selected) {
      message.error("Product not found");
      return;
    }
    if (selectedProducts.find((p) => p.productId === selected._id)) {
      message.warning("Product already added");
      return;
    }

    // If no main product exists, make this the main product
    const hasMain = selectedProducts.some((p) => p.isMain);
    setSelectedProducts([
      ...selectedProducts,
      {
        productId: selected._id,
        name: selected.pro_title || selected.name,
        sku: selected.sku,
        quantity: 1,
        isMain: !hasMain, // First product is main if none exists
        isFree: hasMain, // Free if main already exists
      },
    ]);
    setProductSearch("");
  };

  const handleRemoveProduct = (index) => {
    const newProducts = selectedProducts.filter((_, i) => i !== index);
    setSelectedProducts(newProducts);
  };

  const handleProductChange = (index, field, value) => {
    const newProducts = [...selectedProducts];
    newProducts[index][field] = value;

    // Ensure only one main product
    if (field === "isMain" && value === true) {
      newProducts.forEach((p, i) => {
        if (i !== index) p.isMain = false;
      });
    }

    // If main is true, free should be false
    if (field === "isMain" && value === true) {
      newProducts[index].isFree = false;
    }

    // If free is true, main should be false
    if (field === "isFree" && value === true) {
      newProducts[index].isMain = false;
    }

    setSelectedProducts(newProducts);
  };

  const handleSubmit = () => {
    form.validateFields().then((values) => {
      if (selectedProducts.length === 0) {
        message.error("Please add at least one product to the kit");
        return;
      }

      const hasMain = selectedProducts.some((p) => p.isMain);
      if (!hasMain) {
        message.error("At least one product must be marked as main product");
        return;
      }

      onFinish({
        ...values,
        products: selectedProducts.map((p) => ({
          productId: p.productId,
          quantity: p.quantity,
          isMain: p.isMain,
          isFree: p.isFree,
        })),
      });
    });
  };

  return (
    <Modal
      title={editingKit ? "Edit Kit" : "Create New Kit"}
      open={visible}
      onCancel={onCancel}
      onOk={handleSubmit}
      width={800}
      okText={editingKit ? "Update" : "Create"}
    >
      <Form form={form} layout="vertical">
        <Form.Item
          name="name"
          label="Kit Name"
          rules={[
            { required: true, message: "Kit name is required" },
            { min: 3, message: "Kit name must be at least 3 characters" },
          ]}
        >
          <Input placeholder="e.g., Console Bundle" />
        </Form.Item>

        <Form.Item name="kitId" label="Kit ID (Optional)">
          <Input placeholder="Auto-generated if not provided" />
        </Form.Item>

        <Form.Item name="description" label="Description">
          <Input.TextArea rows={3} placeholder="Kit description..." />
        </Form.Item>

        <Divider>Products in Kit</Divider>

        {/* Add Product */}
        <div className="mb-4">
          <Row gutter={16}>
            <Col span={16}>
              <Select
                showSearch
                placeholder="Search and select a product..."
                style={{ width: "100%" }}
                value={productSearch}
                onChange={setProductSearch}
                onSearch={onProductSearch}
                filterOption={false}
                notFoundContent={
                  products.length === 0 && productSearch
                    ? "No products found"
                    : "Start typing to search products..."
                }
              >
                {products.map((product) => (
                  <Option key={product._id} value={product._id}>
                    {product.pro_title || product.name} ({product.sku})
                  </Option>
                ))}
              </Select>
            </Col>
            <Col span={8}>
              <Button
                type="dashed"
                icon={<Plus size={16} />}
                onClick={handleAddProduct}
                block
              >
                Add Product
              </Button>
            </Col>
          </Row>
        </div>

        {/* Selected Products List */}
        {selectedProducts.length > 0 && (
          <div className="mb-4">
            {selectedProducts.map((product, index) => (
              <Card
                key={index}
                size="small"
                className="mb-2"
                extra={
                  <Button
                    type="text"
                    danger
                    icon={<Trash2 size={14} />}
                    onClick={() => handleRemoveProduct(index)}
                    size="small"
                  />
                }
              >
                <Row gutter={16} align="middle">
                  <Col span={8}>
                    <div>
                      <div className="font-medium">{product.name}</div>
                      <div className="text-xs text-gray-500">SKU: {product.sku}</div>
                    </div>
                  </Col>
                  <Col span={4}>
                    <InputNumber
                      min={1}
                      value={product.quantity}
                      onChange={(value) =>
                        handleProductChange(index, "quantity", value)
                      }
                      style={{ width: "100%" }}
                    />
                  </Col>
                  <Col span={6}>
                    <Switch
                      checked={product.isMain}
                      onChange={(checked) =>
                        handleProductChange(index, "isMain", checked)
                      }
                      checkedChildren="Main"
                      unCheckedChildren="Not Main"
                    />
                  </Col>
                  <Col span={6}>
                    <Switch
                      checked={product.isFree}
                      onChange={(checked) =>
                        handleProductChange(index, "isFree", checked)
                      }
                      checkedChildren="Free"
                      unCheckedChildren="Paid"
                    />
                  </Col>
                </Row>
              </Card>
            ))}
          </div>
        )}

        <Form.Item
          name="isActive"
          label="Status"
          valuePropName="checked"
          initialValue={true}
        >
          <Switch checkedChildren="Active" unCheckedChildren="Inactive" />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default KitsManagementPage;

