import React, { useState, useEffect } from "react";
import { useNavigate, Link, useParams } from "react-router-dom";
import {
  Card,
  Form,
  Input,
  Select,
  DatePicker,
  Button,
  Table,
  Space,
  Row,
  Col,
  InputNumber,
  message,
  Typography,
  Tag,
  Checkbox,
  Breadcrumb,
} from "antd";
import dayjs from "dayjs";
import { ArrowLeft, Plus, Trash2, Save, Search, Package } from "lucide-react";
import Skeleton from "react-loading-skeleton";
import "react-loading-skeleton/dist/skeleton.css";
import {
  createPurchaseOrder,
  updatePurchaseOrder,
  getPurchaseOrder,
  getVendors,
  getCompanies,
  getUsers,
} from "../../api/procurement";
import apiClient from "../../api/client";
import Swal from "sweetalert2";

const { Option } = Select;
const { TextArea } = Input;
const { Title } = Typography;

/**
 * Create Purchase Order Page
 * Add products and then add kit items to each product
 */
const CreatePurchaseOrderPage = () => {
  const navigate = useNavigate();
  const { poId } = useParams();
  const isEditMode = !!poId;
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [loadingDropdowns, setLoadingDropdowns] = useState(true);
  const [loadingOrder, setLoadingOrder] = useState(isEditMode);
  const [submitting, setSubmitting] = useState(false);
  const [canEdit, setCanEdit] = useState(true);

  // Dropdown data
  const [vendors, setVendors] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [buyers, setBuyers] = useState([]);
  const [products, setProducts] = useState([]);
  const [productSearch, setProductSearch] = useState("");
  const [searchingProducts, setSearchingProducts] = useState(false);

  // Selected products (can be standalone products or kits)
  const [selectedProducts, setSelectedProducts] = useState([]);

  // Checkbox selection for making kits
  const [selectedProductIndices, setSelectedProductIndices] = useState([]);

  // Load dropdown data and order data (if edit mode)
  useEffect(() => {
    loadDropdownData();
    if (isEditMode) {
      loadOrderData();
    }
  }, [poId]);

  const loadOrderData = async () => {
    if (!poId) return;
    setLoadingOrder(true);
    try {
      const order = await getPurchaseOrder(poId);

      // Check if order can be edited
      if (order.status !== "draft") {
        setCanEdit(false);
        Swal.fire({
          icon: "warning",
          title: "Cannot Edit Order",
          text:
            "Only draft orders can be edited. This order's status is: " +
            order.status,
          showConfirmButton: true,
        }).then(() => {
          navigate(`/procurement/orders/${poId}`);
        });
        return;
      }

      // Set form values
      form.setFieldsValue({
        vendor: order.vendor?.id || order.vendor?._id || order.vendor,
        company: order.company?.id || order.company?._id || order.company,
        buyer: order.buyer?.id || order.buyer?._id || order.buyer,
        orderDeadline: order.orderDeadline
          ? dayjs(order.orderDeadline)
          : undefined,
        shippingMethod: order.shippingMethod || undefined,
        deliverTo: order.deliverTo || undefined,
        currency: order.currency || "USD",
        vendorReference: Array.isArray(order.vendorReference)
          ? order.vendorReference
          : order.vendorReference
          ? [order.vendorReference]
          : [],
        termsAndConditions: order.termsAndConditions || undefined,
      });

      // Load existing products
      if (order.products && order.products.length > 0) {
        const mappedProducts = order.products.map((product) => {
          if (product.type === "kit") {
            return {
              type: "kit",
              name: product.name,
              quantity: product.quantity || 1,
              unitPrice: product.unitPrice || 0,
              taxes: product.taxes || 0,
              kitProducts: product.kitProducts || [],
              amount:
                (product.quantity || 1) * (product.unitPrice || 0) +
                (product.taxes || 0),
            };
          } else {
            return {
              type: "product",
              productId: product.productId || product._id,
              name: product.name,
              sku: product.sku,
              quantity: product.quantity || 0,
              unitPrice: product.unitPrice || 0,
              uom: product.uom || "Unit",
              taxes: product.taxes || 0,
              amount:
                (product.quantity || 0) * (product.unitPrice || 0) +
                (product.taxes || 0),
            };
          }
        });
        setSelectedProducts(mappedProducts);
      }
    } catch (error) {
      console.error("Failed to load order:", error);
      Swal.fire({
        icon: "error",
        title: "Failed to Load Order",
        text:
          error?.response?.data?.error?.message || "Failed to load order data",
        showConfirmButton: true,
      }).then(() => {
        navigate("/procurement/orders");
      });
    } finally {
      setLoadingOrder(false);
    }
  };

  const loadDropdownData = async () => {
    setLoadingDropdowns(true);
    try {
      const [vendorsData, companiesData, buyersData] = await Promise.all([
        getVendors({ page: 1, limit: 1000, q: "", sort: "-updatedAt" }),
        getCompanies(),
        getUsers(),
      ]);
      setVendors(vendorsData || []);
      setCompanies(companiesData || []);
      setBuyers(buyersData || []);
    } catch (error) {
      console.error("Failed to load dropdown data:", error);
      message.error("Failed to load form data");
    } finally {
      setLoadingDropdowns(false);
    }
  };

  // Search products
  const searchProducts = async (searchValue) => {
    if (!searchValue || searchValue.trim().length < 2) {
      setProducts([]);
      return;
    }

    setSearchingProducts(true);
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
    } finally {
      setSearchingProducts(false);
    }
  };

  const handleAddProduct = (product) => {
    // Check if product already exists (not in a kit)
    const exists = selectedProducts.some(
      (p) =>
        p.type === "product" &&
        (p.productId || p._id) === (product._id || product.id)
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
      unitPrice:
        product.price || product.sale_price || product.regular_price || 0,
      uom: "Unit",
      taxes: 0,
      amount: product.price || product.sale_price || product.regular_price || 0,
    };

    setSelectedProducts((prev) => [...prev, newProduct]);
    setProductSearch("");
    setProducts([]);
  };

  // Handle checkbox selection
  const handleCheckboxChange = (index, checked) => {
    if (checked) {
      setSelectedProductIndices((prev) => [...prev, index]);
    } else {
      setSelectedProductIndices((prev) => prev.filter((i) => i !== index));
    }
  };

  // Handle select all checkboxes
  const handleSelectAll = (checked) => {
    if (checked) {
      const allIndices = selectedProducts
        .map((p, idx) => (p.type === "product" ? idx : null))
        .filter((idx) => idx !== null);
      setSelectedProductIndices(allIndices);
    } else {
      setSelectedProductIndices([]);
    }
  };

  // Make kit from selected products
  const handleMakeKit = () => {
    if (selectedProductIndices.length < 2) {
      message.warning("Please select at least 2 products to create a kit");
      return;
    }

    // Get selected products (only standalone products, not kits)
    const selectedProductsList = selectedProductIndices
      .map((idx) => selectedProducts[idx])
      .filter((p) => p.type === "product");

    if (selectedProductsList.length < 2) {
      message.warning("Please select at least 2 standalone products");
      return;
    }

    // Calculate kit price (sum of all product prices)
    const kitUnitPrice = selectedProductsList.reduce(
      (sum, p) => sum + (p.unitPrice || 0),
      0
    );
    const kitTaxes = selectedProductsList.reduce(
      (sum, p) => sum + (p.taxes || 0),
      0
    );

    // Create kit products array
    const kitProducts = selectedProductsList.map((p) => ({
      productId: p.productId,
      name: p.name,
      sku: p.sku,
      quantity: p.quantity || 1,
      unitPrice: p.unitPrice || 0,
      taxes: p.taxes || 0,
      uom: p.uom || "Unit",
    }));

    // Generate kit name (combine product names or use default)
    const kitName =
      selectedProductsList.length === 2
        ? `${selectedProductsList[0].name} + ${selectedProductsList[1].name}`
        : `Kit of ${selectedProductsList.length} products`;

    // Create new kit
    const newKit = {
      type: "kit",
      name: kitName,
      quantity: 1, // Default quantity, user can change
      unitPrice: kitUnitPrice,
      taxes: kitTaxes,
      amount: kitUnitPrice, // Will be recalculated when quantity changes
      kitProducts: kitProducts,
    };

    // Remove selected products and add kit
    setSelectedProducts((prev) => {
      const updated = prev.filter(
        (_, idx) => !selectedProductIndices.includes(idx)
      );
      return [...updated, newKit];
    });

    // Clear selection
    setSelectedProductIndices([]);
    message.success("Kit created successfully");
  };

  const handleRemoveProduct = (index) => {
    setSelectedProducts((prev) => prev.filter((_, i) => i !== index));
    // Also remove from selection if selected
    setSelectedProductIndices((prev) => prev.filter((i) => i !== index));
  };

  const handleProductChange = (index, field, value) => {
    setSelectedProducts((prev) => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        [field]: value,
      };
      // Recalculate amount
      if (field === "quantity" || field === "unitPrice") {
        const qty = field === "quantity" ? value : updated[index].quantity;
        const price = field === "unitPrice" ? value : updated[index].unitPrice;
        updated[index].amount =
          (qty || 0) * (price || 0) + (updated[index].taxes || 0);
      }
      return updated;
    });
  };

  const calculateTotal = () => {
    return selectedProducts.reduce((sum, p) => {
      const amount = p.amount || 0;
      return sum + amount;
    }, 0);
  };

  const onFinish = async (values) => {
    setSubmitting(true);
    try {
      // Build products payload for API
      const productsPayload = [];

      selectedProducts.forEach((item) => {
        if (item.type === "product") {
          // Standalone product
          productsPayload.push({
            type: "product",
            productId: item.productId,
            name: item.name,
            sku: item.sku,
            quantity: Number(item.quantity) || 0,
            unitPrice: Number(item.unitPrice) || 0,
            uom: item.uom || "Unit",
            taxes: Number(item.taxes) || 0,
          });
        } else if (item.type === "kit") {
          // Kit
          const kitProductsPayload = (item.kitProducts || []).map((kp) => ({
            productId: kp.productId || kp._id,
            name: kp.name,
            sku: kp.sku,
            quantity: Number(kp.quantity) || 0,
            unitPrice: Number(kp.unitPrice) || 0,
            taxes: Number(kp.taxes) || 0,
            uom: kp.uom || "Unit",
          }));

          productsPayload.push({
            type: "kit",
            name: item.name,
            quantity: Number(item.quantity) || 1,
            unitPrice: Number(item.unitPrice) || 0,
            kitProducts: kitProductsPayload,
            taxes: Number(item.taxes) || 0,
          });
        }
      });

      const payload = {
        vendor: values.vendor,
        company: values.company,
        buyer: values.buyer,
        orderDeadline: values.orderDeadline
          ? dayjs(values.orderDeadline).toISOString()
          : undefined,
        shippingMethod: values.shippingMethod || undefined,
        deliverTo: values.deliverTo || undefined,
        currency: values.currency || "USD",
        vendorReference: Array.isArray(values.vendorReference)
          ? values.vendorReference.filter(Boolean)
          : values.vendorReference
          ? [values.vendorReference]
          : [],
        termsAndConditions: values.termsAndConditions || undefined,
        // Always send empty products array - products will be added in details page
        products: [],
      };

      if (isEditMode) {
        // Update existing order
        const response = await updatePurchaseOrder(poId, payload);
        Swal.fire({
          icon: "success",
          title: "Success!",
          text: "Draft updated successfully",
          showConfirmButton: true,
        }).then(() => {
          navigate(`/procurement/orders/${poId}`);
        });
      } else {
        // Create new order
        const response = await createPurchaseOrder(payload);
        Swal.fire({
          icon: "success",
          title: "Success!",
          text: "Draft created successfully. You can now add products in the Products tab.",
          showConfirmButton: true,
        }).then(() => {
          navigate(`/procurement/orders/${response._id || response.id}`);
        });
      }
    } catch (error) {
      console.error(
        `Failed to ${isEditMode ? "update" : "create"} purchase order:`,
        error
      );
      const errorMessage =
        error?.response?.data?.error?.message ||
        error?.response?.data?.message ||
        `Failed to ${isEditMode ? "update" : "create"} purchase order`;

      if (error?.response?.data?.error?.code === "EDIT_NOT_ALLOWED") {
        Swal.fire({
          icon: "warning",
          title: "Cannot Edit Order",
          text: errorMessage,
          showConfirmButton: true,
        }).then(() => {
          navigate(`/procurement/orders/${poId}`);
        });
      } else {
        Swal.fire({
          icon: "error",
          title: `Failed to ${isEditMode ? "Update" : "Create"} Order`,
          text: errorMessage,
          showConfirmButton: true,
        });
      }
    } finally {
      setSubmitting(false);
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

  // Build table data
  const buildTableData = () => {
    return selectedProducts.map((item, index) => ({
      key: item.type === "kit" ? `kit-${index}` : `product-${index}`,
      ...item,
      index,
    }));
  };

  const productColumns = [
    {
      title: (
        <Checkbox
          indeterminate={
            selectedProductIndices.length > 0 &&
            selectedProductIndices.length <
              selectedProducts.filter((p) => p.type === "product").length
          }
          checked={
            selectedProducts.filter((p) => p.type === "product").length > 0 &&
            selectedProductIndices.length ===
              selectedProducts.filter((p) => p.type === "product").length
          }
          onChange={(e) => handleSelectAll(e.target.checked)}
        />
      ),
      key: "checkbox",
      width: 50,
      render: (_, record) => {
        if (record.type === "kit") return null;
        return (
          <Checkbox
            checked={selectedProductIndices.includes(record.index)}
            onChange={(e) =>
              handleCheckboxChange(record.index, e.target.checked)
            }
          />
        );
      },
    },
    {
      title: "Product",
      key: "name",
      width: 300,
      render: (_, record) => {
        if (record.type === "kit") {
          return (
            <div>
              <div className="font-medium flex items-center gap-2 shrink-0">
                <Package size={16} className="text-blue-600 shrink-0" />
                {record.name}
              </div>
              <Tag color="blue" size="small" className="mt-1">
                Kit ({record.kitProducts?.length || 0} products)
              </Tag>
              {record.kitProducts && record.kitProducts.length > 0 && (
                <div className="text-xs text-gray-500 mt-1">
                  Contains: {record.kitProducts.map((p) => p.name).join(", ")}
                </div>
              )}
            </div>
          );
        }
        return (
          <div>
            <div className="font-medium">{record.name}</div>
            {record.sku && (
              <div className="text-xs text-gray-500 mt-1">
                SKU: {record.sku}
              </div>
            )}
          </div>
        );
      },
    },
    {
      title: "Quantity",
      dataIndex: "quantity",
      key: "quantity",
      width: 120,
      render: (qty, record) => {
        return (
          <InputNumber
            min={1}
            value={qty}
            onChange={(value) => {
              if (record.type === "kit") {
                // For kits, update quantity and recalculate amount
                setSelectedProducts((prev) => {
                  const updated = [...prev];
                  updated[record.index] = {
                    ...updated[record.index],
                    quantity: value || 1,
                    amount:
                      (updated[record.index].unitPrice || 0) * (value || 1) +
                      (updated[record.index].taxes || 0),
                  };
                  return updated;
                });
              } else {
                handleProductChange(record.index, "quantity", value);
              }
            }}
            style={{ width: "100%" }}
            size="small"
          />
        );
      },
    },
    {
      title: "Unit Price",
      dataIndex: "unitPrice",
      key: "unitPrice",
      width: 130,
      render: (price, record) => {
        if (record.type === "kit") {
          return (
            <span className="font-medium text-blue-600">
              {formatCurrency(price, form.getFieldValue("currency"))}
            </span>
          );
        }
        return (
          <InputNumber
            min={0}
            step={0.01}
            value={price}
            onChange={(value) =>
              handleProductChange(record.index, "unitPrice", value)
            }
            style={{ width: "100%" }}
            size="small"
          />
        );
      },
    },
    {
      title: "Amount",
      dataIndex: "amount",
      key: "amount",
      width: 120,
      align: "right",
      render: (amount, record) => {
        return (
          <span className="font-medium">
            {formatCurrency(amount, form.getFieldValue("currency"))}
          </span>
        );
      },
    },
    {
      title: "Action",
      key: "action",
      width: 100,
      render: (_, record) => {
        return (
          <Button
            type="text"
            danger
            icon={<Trash2 size={14} />}
            onClick={() => handleRemoveProduct(record.index)}
            size="small"
          />
        );
      },
    },
  ];

  if (loadingDropdowns || loadingOrder) {
    return (
      <div className="p-4">
        <div className="max-w-6xl mx-auto">
          <Skeleton height={24} width={60} style={{ marginBottom: 8 }} />
          <Skeleton height={32} width={300} style={{ marginBottom: 16 }} />
          <div className="space-y-4">
            <Card>
              <Skeleton height={20} width={150} style={{ marginBottom: 16 }} />
              <Row gutter={16}>
                {Array.from({ length: 6 }).map((_, i) => (
                  <Col xs={24} sm={12} key={i}>
                    <Skeleton
                      height={20}
                      width={100}
                      style={{ marginBottom: 4 }}
                    />
                    <Skeleton height={32} />
                  </Col>
                ))}
              </Row>
            </Card>
            <Card>
              <Skeleton height={32} width={150} style={{ marginBottom: 16 }} />
              <Skeleton height={200} />
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4">
      <div className="max-w-6xl mx-auto">
        {/* Breadcrumbs */}
        <Breadcrumb className="mb-4">
          <Breadcrumb.Item>
            <Link to="/">Home</Link>
          </Breadcrumb.Item>
          <Breadcrumb.Item>
            <Link to="/procurement">Procurement</Link>
          </Breadcrumb.Item>
          <Breadcrumb.Item>
            <Link to="/procurement/orders">Purchase Orders</Link>
          </Breadcrumb.Item>
          <Breadcrumb.Item>
            {isEditMode ? "Edit Draft" : "Create Draft"}
          </Breadcrumb.Item>
        </Breadcrumb>

        {/* Header */}
        <div className="mb-4">
          <button
            onClick={() =>
              navigate(
                isEditMode
                  ? `/procurement/orders/${poId}`
                  : "/procurement/orders"
              )
            }
            className="mb-2 bg-black text-white hover:bg-black flex items-center gap-2 p-1.5 rounded"
          >
            <ArrowLeft />
            Back
          </button>
          <Title level={3} className="mb-1">
            {isEditMode ? "Edit Draft" : "Create Draft"}
          </Title>
          <p className="text-gray-600 text-sm">
            {isEditMode
              ? "Update the details of the draft"
              : "Fill in the details to create a new draft. Products can be added after creating the draft."}
          </p>
        </div>

        <Form
          form={form}
          layout="vertical"
          onFinish={onFinish}
          initialValues={{
            currency: "USD",
          }}
        >
          {/* Basic Information */}
          <Card size="small" title="Basic Information" className="mb-4 bg-gray-100">
            <Row gutter={[16, 16]} className="mt-4">
              <Col xs={24} sm={12} md={8}>
                <Form.Item
                  name="vendor"
                  label="Vendor"
                  rules={[{ required: true, message: "Please select vendor" }]}
                >
                  <Select
                    showSearch
                    placeholder="Select Vendor"
                    filterOption={(input, option) =>
                      (option?.label ?? "")
                        .toLowerCase()
                        .includes(input.toLowerCase())
                    }
                    options={vendors.map((v) => ({
                      value: v.id,
                      label: v.name,
                    }))}
                    size="middle"
                  />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12} md={8}>
                <Form.Item
                  name="company"
                  label="Company"
                  rules={[{ required: true, message: "Please select company" }]}
                >
                  <Select
                    showSearch
                    placeholder="Select Company"
                    filterOption={(input, option) =>
                      (option?.label ?? "")
                        .toLowerCase()
                        .includes(input.toLowerCase())
                    }
                    options={companies.map((c) => ({
                      value: c.id,
                      label: c.name,
                    }))}
                    size="middle"
                  />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12} md={8}>
                <Form.Item
                  name="buyer"
                  label="Buyer"
                  rules={[{ required: true, message: "Please select buyer" }]}
                >
                  <Select
                    showSearch
                    placeholder="Select Buyer"
                    filterOption={(input, option) =>
                      (option?.label ?? "")
                        .toLowerCase()
                        .includes(input.toLowerCase())
                    }
                    options={buyers.map((b) => ({
                      value: b.id,
                      label: b.name,
                    }))}
                    size="middle"
                  />
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={[16, 16]} className="mt-4">
              <Col xs={24} sm={12} md={8}>
                <Form.Item name="orderDeadline" label="Order Deadline">
                  <DatePicker
                    style={{ width: "100%" }}
                    size="middle"
                    format="YYYY-MM-DD"
                    showNow
                  />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12} md={8}>
                <Form.Item name="shippingMethod" label="Shipping Method">
                  <Select placeholder="Select Method" size="middle">
                    <Option value="by_air">By Air</Option>
                    <Option value="by_sea">By Sea</Option>
                    <Option value="by_land">By Land</Option>
                    {/* <Option value="express">Express</Option> */}
                  </Select>
                </Form.Item>
              </Col>
              <Col xs={24} sm={12} md={8}>
                <Form.Item name="deliverTo" label="Deliver To">
                  <Select
                    placeholder="Select Country"
                    size="middle"
                    showSearch
                    filterOption={(input, option) =>
                      (option?.label ?? "")
                        .toLowerCase()
                        .includes(input.toLowerCase())
                    }
                  >
                    <Option value="USA">USA</Option>
                    <Option value="Colombia">Colombia</Option>
                    <Option value="Japan">Japan</Option>
                  </Select>
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={[16, 16]} className="mt-4">
              <Col xs={24} sm={12} md={8}>
                <Form.Item name="currency" label="Currency">
                  <Select size="middle">
                    <Option value="USD">USD (US Dollar)</Option>
                    <Option value="EUR">EUR (Euro)</Option>
                    <Option value="GBP">GBP (British Pound)</Option>
                    <Option value="CAD">CAD (Canadian Dollar)</Option>
                    <Option value="JPY">JPY (Japanese Yen)</Option>
                  </Select>
                </Form.Item>
              </Col>
              <Col xs={24} sm={12} md={8}>
                <Form.Item
                  name="vendorReference"
                  label="Vendor Reference (Tags)"
                >
                  <Select
                    mode="tags"
                    placeholder="Add vendor reference tags (press Enter to add)"
                    tokenSeparators={[","]}
                    style={{ width: "100%" }}
                    size="middle"
                    tagRender={(props) => {
                      const { label, value, closable, onClose } = props;
                      // Generate random color for each tag
                      const colors = [
                        "blue",
                        "green",
                        "orange",
                        "red",
                        "purple",
                        "cyan",
                        "magenta",
                        "geekblue",
                        "volcano",
                        "gold",
                      ];
                      const colorIndex = value
                        ? value.toString().length % colors.length
                        : 0;
                      const color = colors[colorIndex];

                      return (
                        <Tag
                          color={color}
                          closable={closable}
                          onClose={onClose}
                          style={{ marginRight: 3 }}
                        >
                          {label}
                        </Tag>
                      );
                    }}
                  />
                </Form.Item>
              </Col>
            </Row>
          </Card>

          {/* Terms and Conditions */}
          <Card size="small" title="Terms and Conditions" className="mb-4 bg-gray-100">
            <Form.Item name="termsAndConditions">
              <TextArea
                rows={4}
                placeholder="Define your terms and conditions..."
                size="middle"
              />
            </Form.Item>
          </Card>

          {/* Action Buttons */}
          <Space>
            <Button
              onClick={() => navigate("/procurement/orders")}
              size="middle"
            >
              Cancel
            </Button>
            <Button
              type="primary"
              htmlType="submit"
              icon={<Save size={16} />}
              loading={submitting}
              size="middle"
              disabled={!canEdit && isEditMode}
            >
              {isEditMode ? "Update Draft" : "Create Draft"}
            </Button>
          </Space>
        </Form>
      </div>
    </div>
  );
};

export default CreatePurchaseOrderPage;
