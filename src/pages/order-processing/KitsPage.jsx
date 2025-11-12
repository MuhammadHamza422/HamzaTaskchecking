import React, { useState } from "react";
import {
  Typography,
  Table,
  Button,
  Tag,
  Card,
  Space,
  Spin,
  Drawer,
  Modal,
  Form,
  Input,
  message,
} from "antd";
import { motion } from "framer-motion";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  EyeOutlined,
  ShoppingOutlined,
  CalendarOutlined,
  EditOutlined,
} from "@ant-design/icons";
import Swal from "sweetalert2";
import apiClient from "../../api/client";
import useFullscreen from "../../components/useFullscreen";

const { Text, Title } = Typography;

const showErrorToast = (message) => {
  Swal.fire({
    icon: "error",
    title: "Failed to load kits",
    text: message,
    toast: true,
    position: "top-end",
    showConfirmButton: false,
    timer: 4000,
    timerProgressBar: true,
    background: "#ef4444",
    color: "#fff",
    customClass: {
      popup: "rounded-lg",
    },
  });
};

export default function KitsPage() {
  const [selectedKit, setSelectedKit] = useState(null);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingKit, setEditingKit] = useState(null);
  const [form] = Form.useForm();
  const queryClient = useQueryClient();
  const { ref: fullscreenRef, isFullscreen, getContainer } = useFullscreen();
  // Fetch kits
  const fetchKits = async () => {
    const response = await apiClient.get("/api/v1/kit/all");
    return response.data;
  };

  const {
    data: kitsData,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["kits"],
    queryFn: fetchKits,
    refetchInterval: 30000, // Refetch every 30 seconds
    refetchIntervalInBackground: true,
  });

  // Handle view details
  const handleViewDetails = (kit) => {
    setSelectedKit(kit);
    setDrawerVisible(true);
  };

  // Handle edit kit name
  const handleEditKit = (kit) => {
    setEditingKit(kit);
    form.setFieldsValue({
      product_title: kit.product_title,
    });
    setEditModalVisible(true);
  };

  // Handle update kit name
  const handleUpdateKitName = async (values) => {
    if (!editingKit?._id) {
      message.error("Kit ID is required");
      return;
    }

    try {
      const response = await apiClient.patch(
        `/api/v1/kit/update/${editingKit._id}`,
        {
          product_title: values.product_title,
        }
      );

      if (response.data.success) {
        Swal.fire({
          icon: "success",
          title: "Kit Updated",
          text: "Kit name has been updated successfully!",
          toast: true,
          position: "top-end",
          showConfirmButton: false,
          timer: 3000,
          timerProgressBar: true,
          background: "#10b981",
          color: "#fff",
          customClass: {
            popup: "rounded-lg",
          },
        });

        // Invalidate and refetch kits
        queryClient.invalidateQueries({ queryKey: ["kits"] });
        await refetch();

        // Update selected kit if it's the same one
        if (selectedKit?._id === editingKit._id) {
          setSelectedKit({
            ...selectedKit,
            product_title: values.product_title,
          });
        }

        setEditModalVisible(false);
        setEditingKit(null);
        form.resetFields();
      } else {
        throw new Error(response.data.message || "Failed to update kit name");
      }
    } catch (error) {
      console.error("Error updating kit name:", error);
      Swal.fire({
        icon: "error",
        title: "Update Failed",
        text: error.response?.data?.message || error.message || "Failed to update kit name",
        toast: true,
        position: "top-end",
        showConfirmButton: false,
        timer: 4000,
        timerProgressBar: true,
        background: "#ef4444",
        color: "#fff",
        customClass: {
          popup: "rounded-lg",
        },
      });
    }
  };

  // Handle cancel edit
  const handleCancelEdit = () => {
    setEditModalVisible(false);
    setEditingKit(null);
    form.resetFields();
  };

  // Calculate total value of kit
  const calculateKitValue = (skus) => {
    return skus.reduce((total, sku) => {
      return total + parseFloat(sku?.price) * sku?.quantity;
    }, 0);
  };

  // Calculate total quantity of kit
  const calculateKitQuantity = (skus) => {
    return skus.reduce((total, sku) => {
      return total + sku.quantity;
    }, 0);
  };

  // Format date
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Table columns
  const columns = [
    {
      title: "Kit ID",
      dataIndex: "kit_id",
      key: "kit_id",
      render: (kitId) => (
        <Tag color="blue" className="font-mono text-xs">
          {kitId}
        </Tag>
      ),
      width: 90,
    },
    {
      title: "Product Title",
      dataIndex: "product_title",
      key: "product_title",
      render: (title) => (
        <div className="">
          <p
            title={title}
            className="text-sm font-medium text-gray-900 line-clamp-3"
          >
            {title}
          </p>
        </div>
      ),
      width: 300,
    },
    // {
    //   title: "Platform",
    //   dataIndex: ["plateform_id", "plt_name"],
    //   key: "platform",
    //   render: (platformName, record) => (
    //     <div>
    //       <Tag title={platformName} color="green" className="text-xs">
    //         {platformName}
    //       </Tag>
    //       <div
    //         title={record.plateform_id?.plt_prefix}
    //         className="text-sm text-gray-700 mt-1"
    //       >
    //         <span className="text-[10px] text-gray-500 mt-1">plt_id:</span>
    //         <span className="pl-1">{record.plateform_id?.plt_prefix}</span>
    //       </div>
    //     </div>
    //   ),
    //   width: 200,
    // },
    {
      title: "Products",
      key: "products",
      render: (_, record) => (
        <div className="text-center">
          <div className="text-lg font-semibold text-gray-900">
            {record.skus?.length || 0}
          </div>
          <div className="text-xs text-gray-500">Items</div>
        </div>
      ),
      width: 80,
    },
    {
      title: "Total Qty",
      key: "totalQuantity",
      render: (_, record) => (
        <div className="text-center">
          <div className="text-lg font-semibold text-blue-600">
            {calculateKitQuantity(record.skus)}
          </div>
          <div className="text-xs text-gray-500">Units</div>
        </div>
      ),
      width: 100,
    },
    {
      title: "Total Value",
      key: "totalValue",
      render: (_, record) => (
        <div className="text-center">
          <div className="text-lg font-semibold text-green-600">
            ${calculateKitValue(record.skus).toFixed(2)}
          </div>
          <div className="text-xs text-gray-500">Value</div>
        </div>
      ),
      width: 120,
    },
    {
      title: "Created",
      dataIndex: "createdAt",
      key: "createdAt",
      render: (date) => (
        <div className="text-xs text-gray-600">
          <CalendarOutlined className="mr-1" />
          {formatDate(date)}
        </div>
      ),
      width: 140,
    },
    {
      title: "Actions",
      key: "actions",
      render: (_, record) => (
        <Space size="small">
          <Button
            type="primary"
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleEditKit(record)}
            className="bg-orange-500 border-orange-500 hover:bg-orange-600"
          >
            Edit
          </Button>
          <Button
            type="primary"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => handleViewDetails(record)}
            className="bg-blue-600 border-blue-600 hover:bg-blue-700"
          >
            View
          </Button>
        </Space>
      ),
      width: 160,
      fixed: "right",
    },
  ];

  // Error handling
  React.useEffect(() => {
    if (error) {
      showErrorToast(error.message);
    }
  }, [error]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="bg-gray-50 min-h-screen"
    >
      <div className="max-w-[1550px] mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex sm:flex-row flex-col justify-between items-start max-md:gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-black mb-2">
                Kits Management
              </h1>
              <p className="text-black text-sm sm:text-base">
                View and manage product kits across all platforms
              </p>
            </div>
            <div className="flex items-center gap-2">
              <ShoppingOutlined className="text-2xl text-blue-600" />
              <div className="text-right">
                <p className="text-lg font-semibold text-gray-900">
                  {kitsData?.totalCount || 0}
                </p>
                <p className="text-sm text-gray-600">Total Kits</p>
              </div>
            </div>
          </div>
        </div>

        {/* Kits Table */}
        <div className="shadow-sm rounded-lg">
          <div className="overflow-x-auto">
            <Table
              columns={columns}
              dataSource={kitsData?.allKits || []}
              loading={isLoading}
              rowKey="_id"
              pagination={{
                pageSize: 30,
                showSizeChanger: true,
                showQuickJumper: true,
                showTotal: (total, range) =>
                  `${range[0]}-${range[1]} of ${total} kits`,
              }}
              scroll={{ x: 1200 }}
            />
          </div>
        </div>

        {/* Edit Kit Name Modal */}
        <Modal
          title="Edit Kit Name"
          open={editModalVisible}
          onCancel={handleCancelEdit}
          footer={null}
          centered
          width={500}
        >
          <Form
            form={form}
            layout="vertical"
            onFinish={handleUpdateKitName}
            initialValues={{
              product_title: "",
            }}
          >
            <Form.Item
              label="Product Title"
              name="product_title"
              rules={[
                {
                  required: true,
                  message: "Please enter product title",
                },
                {
                  min: 3,
                  message: "Product title must be at least 3 characters",
                },
              ]}
            >
              <Input.TextArea
                placeholder="Enter product title"
                rows={4}
                showCount
                maxLength={500}
              />
            </Form.Item>

            <div className="flex justify-end gap-2 mt-4">
              <Button onClick={handleCancelEdit}>Cancel</Button>
              <Button type="primary" htmlType="submit">
                Update Kit Name
              </Button>
            </div>
          </Form>
        </Modal>

        {/* Kit Details Drawer */}
        <div ref={fullscreenRef}>
          <Drawer
            getContainer={getContainer}
            key={String(isFullscreen)}
            title={
              <div>
                <Title level={4} className="mb-0">
                  Kit Details
                </Title>
                <Text className="text-gray-500">
                  {selectedKit?.kit_id} - {selectedKit?.plateform_id?.plt_name}
                </Text>
              </div>
            }
            placement="right"
            width={700}
            open={drawerVisible}
            onClose={() => setDrawerVisible(false)}
            footer={
              <div className="flex justify-end">
                <Button onClick={() => setDrawerVisible(false)}>Close</Button>
              </div>
            }
          >
            {selectedKit && (
              <div className="space-y-6">
                {/* Kit Summary */}
                <Card size="small" className="bg-blue-50 border-blue-200">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-blue-600">
                        {selectedKit?.skus?.length}
                      </p>
                      <p className="text-sm text-gray-600">Products</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-green-600">
                        {calculateKitQuantity(selectedKit?.skus)}
                      </p>
                      <p className="text-sm text-gray-600">Total Qty</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-purple-600">
                        ${calculateKitValue(selectedKit?.skus).toFixed(2)}
                      </p>
                      <p className="text-sm text-gray-600">Total Value</p>
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-semibold text-gray-800">
                        {selectedKit?.plateform_id?.plt_prefix}
                      </p>
                      <p className="text-sm text-gray-600">Platform</p>
                    </div>
                  </div>
                </Card>
                {/* Kit Information */}
                <Card
                  size="small"
                  title="Kit Information"
                  className="border-gray-200"
                >
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="font-semibold text-gray-700">
                        Kit ID:
                      </span>
                      <span className="font-mono text-sm">
                        {selectedKit?.kit_id}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-semibold text-gray-700">
                        Product ID:
                      </span>
                      <span className="font-mono text-sm">
                        {selectedKit?.productId}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-semibold text-gray-700">
                        Platform:
                      </span>
                      <span className="text-sm">
                        {selectedKit?.plateform_id?.plt_name}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-semibold text-gray-700">
                        Created By:
                      </span>
                      <span className="text-sm">
                        {selectedKit?.user?.firstName}{" "}
                        {selectedKit?.user?.lastName}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-semibold text-gray-700">
                        Created At:
                      </span>
                      <span className="text-sm">
                        {formatDate(selectedKit?.createdAt)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-semibold text-gray-700">
                        Updated At:
                      </span>
                      <span className="text-sm">
                        {formatDate(selectedKit?.updatedAt)}
                      </span>
                    </div>
                  </div>
                </Card>

                {/* Product Title */}
                <Card
                  size="small"
                  title="Product Title"
                  className="border-gray-200"
                >
                  <Text className="text-gray-900">
                    {selectedKit?.product_title}
                  </Text>
                </Card>

                {/* SKUs Details */}
                <Card
                  size="small"
                  title="Products in Kit"
                  className="border-gray-200"
                >
                  <div className="space-y-4">
                    {selectedKit?.skus?.map((sku, index) => (
                      <div
                        key={sku._id}
                        className="border border-gray-200 rounded-lg p-4 bg-gray-50"
                      >
                        <div className="flex justify-between items-start mb-3">
                          <div className="flex-1">
                            <h4 className="font-semibold text-gray-900 mb-1">
                              {sku?.pId?.pro_title}
                            </h4>
                            <div className="flex items-center gap-4 text-sm text-gray-600">
                              <span className="font-mono">{sku?.pId?.sku}</span>
                              <Tag color="blue" size="small">
                                {sku?.pId?.type_code}
                              </Tag>
                              <Tag color="green" size="small">
                                {sku?.pId?.brnd_code}
                              </Tag>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-lg font-semibold text-green-600">
                              ${parseFloat(sku?.price).toFixed(2)}
                            </p>
                            <p className="text-sm text-gray-500">
                              Qty: {sku?.quantity}
                            </p>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <span className="font-semibold text-gray-700">
                              Sale Price:
                            </span>
                            <p className="text-green-600">
                              ${sku?.pId?.sale_price}
                            </p>
                          </div>
                          <div>
                            <span className="font-semibold text-gray-700">
                              Model:
                            </span>
                            <p className="text-gray-900">
                              {sku?.pId?.model_code}
                            </p>
                          </div>
                          <div>
                            <span className="font-semibold text-gray-700">
                              Storage:
                            </span>
                            <p className="text-gray-900">
                              {sku?.pId?.storage_code}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              </div>
            )}
          </Drawer>
        </div>
      </div>
    </motion.div>
  );
}
