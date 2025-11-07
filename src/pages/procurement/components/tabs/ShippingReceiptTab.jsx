import React, { useState, useEffect } from "react";
import {
  Card,
  Button,
  Form,
  Input,
  DatePicker,
  Space,
  Table,
  message,
  Modal,
  Skeleton,
  Tag,
  Typography,
  Row,
  Col,
  InputNumber,
  Select,
  Dropdown,
} from "antd";
import {
  Plus,
  Edit,
  Trash2,
  Save,
  Truck,
  DollarSign,
  MoreVertical,
} from "lucide-react";
import {
  getShippingDetails,
  updateShippingDetails,
  getCosts,
  addCost,
  updateCost,
  deleteCost,
} from "../../../../api/procurement";
import dayjs from "dayjs";

const { Option } = Select;
const { Title } = Typography;

/**
 * Shipping & Receipt Tab Component
 * Two sections: Shipping Details and Cost Management
 */
const ShippingReceiptTab = ({ purchaseOrder, poId, onShippingDetailsUpdated }) => {
  const [shippingDetails, setShippingDetails] = useState(null);
  const [costs, setCosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [shippingForm] = Form.useForm();
  const [costForm] = Form.useForm();
  const [shippingModalVisible, setShippingModalVisible] = useState(false);
  const [costModalVisible, setCostModalVisible] = useState(false);
  const [editingCost, setEditingCost] = useState(null);
  const [savingShipping, setSavingShipping] = useState(false);
  const [savingCost, setSavingCost] = useState(false);
  const [costSummary, setCostSummary] = useState({});

  useEffect(() => {
    if (poId) {
      loadData();
    }
  }, [poId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [shippingResponse, costsResponse] = await Promise.all([
        getShippingDetails(poId),
        getCosts(poId),
      ]);

      const shipping = shippingResponse?.data || null;
      setShippingDetails(shipping);
      if (shipping) {
        shippingForm.setFieldsValue({
          bookingDate: shipping.bookingDate
            ? dayjs(shipping.bookingDate)
            : null,
          crd: shipping.crd ? dayjs(shipping.crd) : null,
          trackingId: shipping.trackingId || "",
          trackingLink: shipping.trackingLink || "",
        });
      }

      const costsList = costsResponse?.data?.costs || [];
      setCosts(costsList);
      setCostSummary(costsResponse?.data?.summary || {});
    } catch (error) {
      console.error("Failed to load data:", error);
      message.error("Failed to load shipping and cost data");
    } finally {
      setLoading(false);
    }
  };

  const handleShippingSubmit = async (values) => {
    setSavingShipping(true);
    try {
      const payload = {
        bookingDate: values.bookingDate
          ? values.bookingDate.toISOString()
          : null,
        crd: values.crd ? values.crd.toISOString() : null,
        trackingId: values.trackingId || null,
        trackingLink: values.trackingLink || null,
      };

      const response = await updateShippingDetails(poId, payload);
      setShippingDetails(response?.data);
      message.success("Shipping details saved successfully");
      setShippingModalVisible(false);
      // Notify parent to reload shipping details
      if (onShippingDetailsUpdated) {
        onShippingDetailsUpdated();
      }
    } catch (error) {
      console.error("Failed to save shipping details:", error);
      message.error(
        error?.response?.data?.error?.message ||
          "Failed to save shipping details"
      );
    } finally {
      setSavingShipping(false);
    }
  };

  const handleCostSubmit = async (values) => {
    setSavingCost(true);
    try {
      if (editingCost) {
        // Update existing cost
        await updateCost(poId, editingCost._id, values);
        message.success("Cost updated successfully");
      } else {
        // Add new cost
        await addCost(poId, values);
        message.success("Cost added successfully");
      }
      setCostModalVisible(false);
      costForm.resetFields();
      setEditingCost(null);
      loadData();
    } catch (error) {
      console.error("Failed to save cost:", error);
      message.error(
        error?.response?.data?.error?.message || "Failed to save cost"
      );
    } finally {
      setSavingCost(false);
    }
  };

  const handleEditCost = (cost) => {
    setEditingCost(cost);
    costForm.setFieldsValue({
      item: cost.item,
      cost: cost.cost,
      currency: cost.currency,
    });
    setCostModalVisible(true);
  };

  const handleDeleteCost = async (costId) => {
    const cost = costs.find((c) => c._id === costId);
    const costName = cost?.item || "this cost item";

    const result = await Swal.fire({
      title: "Delete Cost Item?",
      text: `Are you sure you want to delete ${costName}? This action cannot be undone.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "Yes, delete it",
      cancelButtonText: "Cancel",
    });

    if (result.isConfirmed) {
      try {
        await deleteCost(poId, costId);
        message.success("Cost deleted successfully");
        loadData();
      } catch (error) {
        console.error("Failed to delete cost:", error);
        const errorMessage =
          error?.response?.data?.error?.message || "Failed to delete cost";
        message.error(errorMessage);
        Swal.fire({
          icon: "error",
          title: "Delete Failed",
          text: errorMessage,
        });
      }
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

  const currencies = [
    "USD",
    "EUR",
    "GBP",
    "JPY",
    "CNY",
    "CAD",
    "AUD",
    "CHF",
    "HKD",
    "SGD",
    "INR",
    "KRW",
    "MXN",
    "BRL",
    "ZAR",
    "RUB",
    "NZD",
    "SEK",
    "NOK",
    "DKK",
    "PLN",
    "THB",
    "MYR",
    "IDR",
    "PHP",
    "VND",
    "AED",
    "SAR",
    "ILS",
    "TRY",
  ];

  const costColumns = [
    {
      title: "Item",
      dataIndex: "item",
      key: "item",
      width: 250,
    },
    {
      title: "Cost",
      dataIndex: "cost",
      key: "cost",
      width: 150,
      align: "right",
      render: (cost, record) => (
        <span className="font-medium">
          {formatCurrency(cost, record.currency)}
        </span>
      ),
    },
    {
      title: "Currency",
      dataIndex: "currency",
      key: "currency",
      width: 100,
      render: (currency) => <Tag color="blue">{currency}</Tag>,
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
                <Edit size={14} />
                <span>Edit</span>
              </Space>
            ),
            onClick: () => handleEditCost(record),
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
            onClick: () => handleDeleteCost(record._id),
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
    return <Skeleton active paragraph={{ rows: 8 }} />;
  }

  return (
    <div className="space-y-6">
      {/* Shipping Details Section */}
      <Card className="bg-gray-100"
        size="small"
        title={
          <Space>
            <Truck size={18} />
            <span>Shipping Details</span>
          </Space>
        }
        extra={
          <Button
            type="link"
            icon={<Edit size={14} />}
            onClick={() => setShippingModalVisible(true)}
            size="small"
          >
            {shippingDetails ? "Edit" : "Add"}
          </Button>
        }
      >
        {shippingDetails ? (
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={12} md={6}>
              <div>
                <div className="text-xs text-gray-500 mb-1">Booking Date</div>
                <div className="font-medium">
                  {shippingDetails.bookingDate
                    ? dayjs(shippingDetails.bookingDate).format(
                        "MMM DD, YYYY"
                      )
                    : "-"}
                </div>
              </div>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <div>
                <div className="text-xs text-gray-500 mb-1">CRD (Cargo Ready Date)</div>
                <div className="font-medium">
                  {shippingDetails.crd
                    ? dayjs(shippingDetails.crd).format("MMM DD, YYYY")
                    : "-"}
                </div>
              </div>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <div>
                <div className="text-xs text-gray-500 mb-1">Tracking ID</div>
                <div className="font-medium">
                  {shippingDetails.trackingId || "-"}
                </div>
              </div>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <div>
                <div className="text-xs text-gray-500 mb-1">Tracking Link</div>
                <div>
                  {shippingDetails.trackingLink ? (
                    <a
                      href={shippingDetails.trackingLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline"
                    >
                      View Tracking
                    </a>
                  ) : (
                    <span className="text-gray-400">-</span>
                  )}
                </div>
              </div>
            </Col>
          </Row>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <p>No shipping details added yet</p>
            <Button
              type="link"
              icon={<Plus size={16} />}
              onClick={() => setShippingModalVisible(true)}
              className="mt-2"
            >
              Add Shipping Details
            </Button>
          </div>
        )}
      </Card>

      {/* Cost Management Section */}
      <Card className="bg-gray-100"
        size="small"
        title={
          <Space>
            <DollarSign size={18} />
            <span>Cost Management</span>
          </Space>
        }
        extra={
          <Button
            type="primary"
            icon={<Plus size={14} />}
            onClick={() => {
              setEditingCost(null);
              costForm.resetFields();
              setCostModalVisible(true);
            }}
            size="small"
          >
            Add Cost
          </Button>
        }
      >
        {costs.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p>No costs added yet</p>
            <Button
              type="primary"
              icon={<Plus size={16} />}
              onClick={() => {
                setEditingCost(null);
                costForm.resetFields();
                setCostModalVisible(true);
              }}
              className="mt-4"
              size="middle"
            >
              Add First Cost
            </Button>
          </div>
        ) : (
          <>
            <Table
              columns={costColumns}
              dataSource={costs}
              rowKey={(record) => record._id}
              pagination={false}
              size="small"
              summary={() => {
                const totals = costSummary?.totalByCurrency || {};
                return (
                  <Table.Summary fixed>
                    <Table.Summary.Row>
                      <Table.Summary.Cell index={0} colSpan={2} align="right">
                        <span className="font-semibold">Total by Currency:</span>
                      </Table.Summary.Cell>
                      <Table.Summary.Cell index={1} colSpan={2}>
                        <Space direction="vertical" size={4}>
                          {Object.entries(totals).map(([currency, total]) => (
                            <span key={currency} className="font-bold">
                              {formatCurrency(total, currency)}
                            </span>
                          ))}
                        </Space>
                      </Table.Summary.Cell>
                    </Table.Summary.Row>
                  </Table.Summary>
                );
              }}
            />
          </>
        )}
      </Card>

      {/* Shipping Details Modal */}
      <Modal
        title="Shipping Details"
        open={shippingModalVisible}
        onCancel={() => {
          setShippingModalVisible(false);
          shippingForm.resetFields();
        }}
        footer={[
          <Button
            key="cancel"
            onClick={() => {
              setShippingModalVisible(false);
              shippingForm.resetFields();
            }}
          >
            Cancel
          </Button>,
          <Button
            key="save"
            type="primary"
            onClick={() => shippingForm.submit()}
            loading={savingShipping}
            icon={<Save size={16} />}
          >
            Save
          </Button>,
        ]}
        width={600}
      >
        <Form
          form={shippingForm}
          layout="vertical"
          onFinish={handleShippingSubmit}
        >
          <Form.Item name="bookingDate" label="Booking Date">
            <DatePicker
              style={{ width: "100%" }}
              format="YYYY-MM-DD"
              showTime={false}
            />
          </Form.Item>

          <Form.Item name="crd" label="CRD (Cargo Ready Date)">
            <DatePicker
              style={{ width: "100%" }}
              format="YYYY-MM-DD"
              showTime={false}
            />
          </Form.Item>

          <Form.Item name="trackingId" label="Tracking ID">
            <Input placeholder="Enter tracking ID" />
          </Form.Item>

          <Form.Item
            name="trackingLink"
            label="Tracking Link"
            rules={[
              {
                type: "url",
                message: "Please enter a valid URL",
              },
            ]}
          >
            <Input placeholder="https://tracking.example.com/track/..." />
          </Form.Item>
        </Form>
      </Modal>

      {/* Cost Modal */}
      <Modal
        title={editingCost ? "Edit Cost" : "Add Cost"}
        open={costModalVisible}
        onCancel={() => {
          setCostModalVisible(false);
          costForm.resetFields();
          setEditingCost(null);
        }}
        footer={[
          <Button
            key="cancel"
            onClick={() => {
              setCostModalVisible(false);
              costForm.resetFields();
              setEditingCost(null);
            }}
          >
            Cancel
          </Button>,
          <Button
            key="save"
            type="primary"
            onClick={() => costForm.submit()}
            loading={savingCost}
            icon={<Save size={16} />}
          >
            {editingCost ? "Update" : "Add"}
          </Button>,
        ]}
        width={500}
      >
        <Form
          form={costForm}
          layout="vertical"
          onFinish={handleCostSubmit}
          initialValues={{
            currency: "USD",
          }}
        >
          <Form.Item
            name="item"
            label="Item"
            rules={[
              { required: true, message: "Please enter item name" },
              { max: 200, message: "Item name must be less than 200 characters" },
            ]}
          >
            <Input placeholder="e.g., Vessel Charges, Customs Broker" />
          </Form.Item>

          <Form.Item
            name="cost"
            label="Cost"
            rules={[
              { required: true, message: "Please enter cost amount" },
              { type: "number", min: 0, message: "Cost must be greater than or equal to 0" },
            ]}
          >
            <InputNumber
              style={{ width: "100%" }}
              min={0}
              step={0.01}
              placeholder="0.00"
            />
          </Form.Item>

          <Form.Item
            name="currency"
            label="Currency"
            rules={[{ required: true, message: "Please select currency" }]}
          >
            <Select placeholder="Select currency" showSearch>
              {currencies.map((curr) => (
                <Option key={curr} value={curr}>
                  {curr}
                </Option>
              ))}
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default ShippingReceiptTab;

