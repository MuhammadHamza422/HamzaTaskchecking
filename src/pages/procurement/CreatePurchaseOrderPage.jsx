import React, { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate, Link, useParams } from "react-router-dom";
import {
  Card,
  Form,
  Input,
  Select,
  DatePicker,
  Button,
  Space,
  Row,
  Col,
  Typography,
  Tag,
  Breadcrumb,
} from "antd";
import dayjs from "dayjs";
import { ArrowLeft, Plus, Trash2, Save } from "lucide-react";
import Skeleton from "react-loading-skeleton";
import "react-loading-skeleton/dist/skeleton.css";
import {
  createPurchaseOrder,
  updatePurchaseOrder,
  getPurchaseOrder,
  getDeliverToOptions,
  createDeliverTo,
  deleteDeliverTo,
} from "../../api/procurement";
import { useProcurementData } from "../../contexts/ProcurementDataContext";
import Swal from "sweetalert2";

const { Option } = Select;
const { TextArea } = Input;
const { Title } = Typography;

const CreatePurchaseOrderPage = () => {
  const navigate = useNavigate();
  const { poId } = useParams();
  const isEditMode = !!poId;
  const [form] = Form.useForm();
  const [loadingOrder, setLoadingOrder] = useState(isEditMode);
  const [submitting, setSubmitting] = useState(false);
  const [canEdit, setCanEdit] = useState(true);

  // Use shared dropdown data from context
  const { vendors, companies, buyers, loading: loadingDropdowns } = useProcurementData();
  
  // DeliverTo states
  const [deliverToOptions, setDeliverToOptions] = useState([]);
  const [deliverToLoading, setDeliverToLoading] = useState(false);
  const [deliverToSearch, setDeliverToSearch] = useState("");
  const [deliverToCreating, setDeliverToCreating] = useState(false);
  const lastDeliverToQuery = useRef("");

  // Selected products (can be standalone products or kits)
  const [selectedProducts, setSelectedProducts] = useState([]);

  // Load dropdown data and order data (if edit mode)
  useEffect(() => {
    if (isEditMode) {
      loadOrderData();
    }
  }, [poId]);

  // Load deliverTo options on mount
  useEffect(() => {
    loadDeliverToOptions();
  }, []);

  // Debounced deliverTo search
  useEffect(() => {
    if (deliverToSearch !== undefined) {
      lastDeliverToQuery.current = deliverToSearch;
      const timeoutId = setTimeout(() => {
        loadDeliverToOptions(deliverToSearch);
      }, 300);
      return () => clearTimeout(timeoutId);
    }
  }, [deliverToSearch]);

  // Delete deliverTo
  const handleDeleteDeliverTo = async (deliverToId, e) => {
    e.stopPropagation(); // Prevent dropdown from closing
    
    try {
      await deleteDeliverTo(deliverToId);
      
      // Remove from options
      setDeliverToOptions((prev) => prev.filter((opt) => (opt._id || opt.id) !== deliverToId));
      
      // Remove from form value if selected
      const currentValue = form.getFieldValue("deliverTo");
      if (currentValue === deliverToId) {
        form.setFieldsValue({
          deliverTo: undefined,
        });
      }

      Swal.fire({
        icon: "success",
        title: "Delivery Location Deleted",
        text: "Delivery location has been deleted successfully",
        toast: true,
        position: "top-end",
        showConfirmButton: false,
        timer: 3000,
        timerProgressBar: true,
      });
    } catch (error) {
      console.error("Failed to delete deliverTo:", error);
      const errorMessage = error?.response?.data?.error?.message || "Failed to delete delivery location";
      Swal.fire({
        icon: "error",
        title: "Deletion Failed",
        text: errorMessage,
        toast: true,
        position: "top-end",
        showConfirmButton: false,
        timer: 3000,
        timerProgressBar: true,
      });
    }
  };

  // DeliverTo options with create option
  const deliverToOptionsWithCreate = useMemo(() => {
    const q = String(deliverToSearch || "").trim();
    
    const baseOptions = deliverToOptions.map((option) => ({
      label: (
        <div className="flex items-center justify-between w-full">
          <span className="flex-1">{option.name || option.label}</span>
          <Button
            type="text"
            danger
            size="small"
            icon={<Trash2 size={12} />}
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              handleDeleteDeliverTo(option._id || option.id, e);
            }}
            className="ml-2 opacity-70 hover:opacity-100 shrink-0"
          />
        </div>
      ),
      value: option._id || option.id,
    }));
    
    if (!q) {
      return baseOptions;
    }
    
    // Check if exact match exists
    const exists = deliverToOptions.some(
      (o) => (o.name || "").toLowerCase() === q.toLowerCase()
    );
    
    return exists
      ? baseOptions
      : [
          ...baseOptions,
          {
            label: `Create "${q}"`,
            value: "__CREATE__",
          },
        ];
  }, [deliverToOptions, deliverToSearch]);

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
        vendor: order.vendor?._id,
        company: order.company?._id,
        buyer: order.buyer?._id,
        orderDeadline: order.orderDeadline
          ? dayjs(order.orderDeadline)
          : undefined,
        shippingMethod: order.shippingMethod || undefined,
        deliverTo: order.deliverTo
          ? (Array.isArray(order.deliverTo) && order.deliverTo.length > 0
              ? (typeof order.deliverTo[0] === "object" && order.deliverTo[0] !== null
                  ? (order.deliverTo[0]._id || order.deliverTo[0].id || order.deliverTo[0])
                  : order.deliverTo[0])
              : typeof order.deliverTo === "object" && order.deliverTo !== null
              ? (order.deliverTo._id || order.deliverTo.id || order.deliverTo)
              : order.deliverTo)
          : undefined,
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

  // Load deliverTo options
  const loadDeliverToOptions = async (search = "") => {
    setDeliverToLoading(true);
    try {
      const response = await getDeliverToOptions({
        search,
        page: 1,
        limit: 50,
      });
      const options = Array.isArray(response?.data) 
        ? response.data 
        : Array.isArray(response) 
        ? response 
        : [];
      setDeliverToOptions(options);
    } catch (error) {
      console.error("Failed to load deliverTo options:", error);
      setDeliverToOptions([]);
    } finally {
      setDeliverToLoading(false);
    }
  };

  // Handle deliverTo selection (including create)
  const handleDeliverToSelect = async (value, option) => {
    const id = value;
    if (id === "__CREATE__") {
      const name = option?.meta?.createName || lastDeliverToQuery.current || "Delivery Location";
      setDeliverToCreating(true);
      try {
        const response = await createDeliverTo({ name: name.trim() });
        const newOption = response?.data || response;
        const newId = newOption._id || newOption.id;
        
        // Add to options list
        setDeliverToOptions((prev) => {
          // Check if already exists
          if (prev.some((opt) => (opt._id || opt.id) === newId)) {
            return prev;
          }
          return [newOption, ...prev];
        });

        // Set form value to the newly created option
        form.setFieldsValue({
          deliverTo: newId,
        });

        // Clear search
        setDeliverToSearch("");

        Swal.fire({
          icon: "success",
          title: "Delivery Location Created",
          text: `${name} has been created successfully`,
          toast: true,
          position: "top-end",
          showConfirmButton: false,
          timer: 3000,
          timerProgressBar: true,
        });
      } catch (error) {
        console.error("Failed to create deliverTo:", error);
        const errorMessage = error?.response?.data?.error?.message || "Failed to create delivery location";
        Swal.fire({
          icon: "error",
          title: "Creation Failed",
          text: errorMessage,
          toast: true,
          position: "top-end",
          showConfirmButton: false,
          timer: 3000,
          timerProgressBar: true,
        });
      } finally {
        setDeliverToCreating(false);
      }
    }
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
        deliverTo: values.deliverTo && values.deliverTo !== "__CREATE__"
          ? [values.deliverTo]
          : [],
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
          title: "Order Updated",
          text: "Purchase order has been updated successfully",
          toast: true,
          position: "top-end",
          showConfirmButton: false,
          timer: 3000,
          timerProgressBar: true,
        }).then(() => {
          navigate(`/procurement/orders/${poId}`);
        });
      } else {
        // Create new order
        const response = await createPurchaseOrder(payload);
        Swal.fire({
          icon: "success",
          title: "Order Created",
          text: "Purchase order has been created successfully",
          toast: true,
          position: "top-end",
          showConfirmButton: false,
          timer: 3000,
          timerProgressBar: true,
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
            className="mb-2 bg-black text-white hover:bg-black flex items-center gap-2 p-1.5 rounded-md text-sm"
          >
            <ArrowLeft size={18} />
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
                    showSearch
                    placeholder="Search or select delivery location"
                    style={{ width: "100%" }}
                    size="middle"
                    loading={deliverToLoading}
                    filterOption={false}
                    onSearch={setDeliverToSearch}
                    onSelect={handleDeliverToSelect}
                    options={deliverToOptionsWithCreate.map((option) => {
                      if (option.value === "__CREATE__") {
                        return {
                          ...option,
                          meta: { createName: deliverToSearch.trim() },
                        };
                      }
                      return option;
                    })}
                    notFoundContent={deliverToLoading ? "Loading..." : "No delivery locations found"}
                    allowClear
                  />
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
