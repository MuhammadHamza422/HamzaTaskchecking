import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  Table,
  Button,
  Input,
  Typography,
  Pagination,
  Empty,
  message,
  Card,
  Tag,
  Space,
  Spin,
  Select,
  Row,
  Col,
} from "antd";
import { debounce } from "lodash";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import Swal from "sweetalert2";
import apiClient from "../api/client";
import { useMediaQuery } from "react-responsive";
import { importCSV } from "../api/products";

const { Search } = Input;
const { Title, Text } = Typography;
const { Option } = Select;

const typeOptions = ["CON", "HAN", "GAM", "ACC"];
const brandOptions = ["NIN", "SNY", "MSF", "SEG","RET","COL","ATR","INT","SNV","NEC"];

const AdminProductsPage = () => {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [search, setSearch] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  // Filter states
  const [filters, setFilters] = useState({
    type: null,
    brand: null,
  });

  // Responsive breakpoint
  const isMobile = useMediaQuery({ maxWidth: 768 });

  // Fetch products with TanStack Query
  const fetchProducts = async ({ queryKey }) => {
    const [_, page, limit, searchQuery] = queryKey;

    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });

    if (searchQuery) {
      params.append("search", searchQuery);
    }

    const response = await apiClient.get(`/api/v1/products/all?${params}`);
    return response.data;
  };

  const {
    data: productsData,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["products", currentPage, pageSize, search],
    queryFn: fetchProducts,
    keepPreviousData: true,
  });

  // Filter products based on current filters
  const getFilteredProducts = () => {
    if (!productsData?.products) return [];

    let filteredProducts = [...productsData.products];

    // Filter by type
    if (filters.type) {
      filteredProducts = filteredProducts.filter(
        (product) => product.type_code === filters.type
      );
    }

    // Filter by brand
    if (filters.brand) {
      filteredProducts = filteredProducts.filter(
        (product) => product.brnd_code === filters.brand
      );
    }

    return filteredProducts;
  };

  const filteredProducts = getFilteredProducts();

  // Use server-side pagination when no filters are applied
  const hasActiveFilters = filters.type || filters.brand;
  
  // When filters are active, paginate the filtered results on frontend
  const getPaginatedFilteredProducts = () => {
    if (!hasActiveFilters) return productsData?.products || [];
    
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    return filteredProducts.slice(startIndex, endIndex);
  };

  const displayProducts = getPaginatedFilteredProducts();
  const totalProducts = hasActiveFilters ? filteredProducts.length : (productsData?.totalProducts || 0);

  // Debounced search
  const debouncedSearch = useCallback(
    debounce((value) => {
      setSearch(value);
      setCurrentPage(1);
    }, 500),
    []
  );

  // Handle search change
  const handleSearchChange = (e) => {
    debouncedSearch(e.target.value);
  };

  // Handle filter changes
  const handleFilterChange = (filterType, value) => {
    setFilters(prev => ({
      ...prev,
      [filterType]: value
    }));
    setCurrentPage(1);
  };

  // Handle filter reset
  const handleFilterReset = () => {
    setFilters({
      type: null,
      brand: null,
    });
    setCurrentPage(1);
  };

  // Handle pagination change
  const handlePageChange = (page, size) => {
    setCurrentPage(page);
    setPageSize(size);
  };

  // Handle CSV file upload
  const handleCSVUpload = async (event) => {
    const file = event.target.files[0];

    if (!file) {
      return;
    }

    // Validate file type
    if (!file.name.toLowerCase().endsWith(".csv")) {
      message.error("Please select a CSV file");
      return;
    }

    setUploading(true);

    try {
      const result = await importCSV(file);
      console.log("result", result);
      // Show success message
      Swal.fire({
        icon: "success",
        title: "CSV Import Successful!",
        text: result.message || "Products have been imported successfully",
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

      // Refresh the product list
      refetch();
    } catch (error) {
      Swal.fire({
        icon: "error",
        title: "Import Failed",
        text:
          error.response?.data?.message ||
          error.message ||
          "Failed to import CSV file",
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
    } finally {
      setUploading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  // Handle Import CSV button click
  const handleImportCSVClick = () => {
    fileInputRef.current?.click();
  };

  // Error handling
  useEffect(() => {
    if (error) {
      Swal.fire({
        icon: "error",
        title: "Failed to load products",
        text: error.message || "An error occurred while fetching products",
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
  }, [error]);

  const columns = [
    {
      title: "Product Title",
      dataIndex: "pro_title",
      key: "pro_title",
      sorter: (a, b) => a?.pro_title?.localeCompare(b?.pro_title),
      render: (text) => (
        <span
          title={text}
          className="text-base font-semibold text-gray-900 line-clamp-2"
        >
          {text}
        </span>
      ),
      width: 300,
    },
    {
      title: "SKU",
      dataIndex: "sku",
      key: "sku",
      sorter: (a, b) => a?.sku?.localeCompare(b?.sku),
      render: (text) => (
        <span title={text} className="text-gray-600 text-sm">
          {text}
        </span>
      ),
    },
    {
      title: "Type",
      dataIndex: "type_code",
      key: "type_code",
      render: (text) => (
        <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-medium">
          {text}
        </span>
      ),
    },
    {
      title: "Brand",
      dataIndex: "brnd_code",
      key: "brnd_code",
      render: (text) => <span className="text-gray-600">{text}</span>,
    },
    {
      title: "Model",
      dataIndex: "model_code",
      key: "model_code",
      render: (text) => <span className="text-gray-600">{text}</span>,
    },
    {
      title: "Sale Price",
      dataIndex: "sale_price",
      key: "sale_price",
      render: (price) => (
        <span className="font-semibold text-green-600">
          ${parseFloat(price).toFixed(2)}
        </span>
      ),
    },
    {
      title: "Condition",
      dataIndex: "cnd_code",
      key: "cnd_code",
      render: (text) => (
        <span
          className={`px-2 py-1 rounded text-xs font-medium ${
            text === "R"
              ? "bg-green-100 text-green-800"
              : text === "N"
              ? "bg-blue-100 text-blue-800"
              : "bg-gray-100 text-gray-800"
          }`}
        >
          {text === "R" ? "Refurbished" : text === "N" ? "New" : text}
        </span>
      ),
    },
  ];

  // Mobile Product Card Component
  const ProductCard = ({ product }) => (
    <Card
      className="mb-4 shadow-sm hover:shadow-md transition-shadow"
      bodyStyle={{ padding: "16px" }}
    >
      <div className="space-y-3">
        {/* Header */}
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <Text strong className="text-lg text-gray-900 block">
              {product?.sku}
            </Text>
            <Text className="text-gray-600 text-sm block mt-1">
              {product?.pro_title}
            </Text>
          </div>
          <Tag color="blue" className="ml-2">
            {product?.type_code}
          </Tag>
        </div>

        {/* Details Grid */}
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <Text type="secondary" className="block text-xs">
              Brand
            </Text>
            <Text className="text-gray-700">{product?.brnd_code}</Text>
          </div>
          <div>
            <Text type="secondary" className="block text-xs">
              Model
            </Text>
            <Text className="text-gray-700">{product?.model_code}</Text>
          </div>
        </div>

        {/* Pricing */}
        <div className="flex justify-between items-center">
          <div>
            <Text delete className="text-gray-500 text-sm">
              ${parseFloat(product?.regular_price).toFixed(2)}
            </Text>
            <Text strong className="text-green-600 text-lg block">
              ${parseFloat(product?.sale_price).toFixed(2)}
            </Text>
          </div>
          <div className="flex gap-2">
            <Tag
              color={
                product?.cnd_code === "R"
                  ? "green"
                  : product?.cnd_code === "N"
                  ? "blue"
                  : "default"
              }
              className="text-xs"
            >
              {product?.cnd_code === "R"
                ? "Refurbished"
                : product?.cnd_code === "N"
                ? "New"
                : product?.cnd_code}
            </Tag>
            <Tag
              color={product?.is_storable ? "green" : "red"}
              className="text-xs"
            >
              {product?.is_storable ? "Storable" : "Not Storable"}
            </Tag>
          </div>
        </div>
      </div>
    </Card>
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="bg-white rounded-lg p-4 md:p-6 mb-4 shadow-lg border border-gray-200 bg-gradient-to-t from-blue-50 to-blue-100">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <Title level={3} style={{ margin: 0 }}>
            Manage Master Products
          </Title>
          <motion.div whileHover={{ scale: 1.05 }}>
            <Button
              type="primary"
              onClick={handleImportCSVClick}
              loading={uploading}
              className="bg-green-600 hover:bg-green-700 border-green-600 w-full md:w-auto"
            >
              {uploading ? "Uploading..." : "Import CSV"}
            </Button>
          </motion.div>
        </div>
        <div className="mt-4">
          <Search
            placeholder="Search by SKU or Name..."
            onChange={handleSearchChange}
            className="w-full md:w-80"
            allowClear
            size="large"
          />
        </div>
      </div>

      {/* Filters Section */}
      <div className="bg-white rounded-lg p-4 mb-4 shadow-sm border border-gray-200">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
          <Title level={4} style={{ margin: 0 }} className="text-gray-700">
            Filters
          </Title>
          <Button 
            onClick={handleFilterReset}
            size="small"
            className="text-gray-600 hover:text-gray-800"
          >
            Reset Filters
          </Button>
        </div>
        
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} md={8} lg={6}>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Type
              </label>
              <Select
                placeholder="Select Type"
                value={filters.type}
                onChange={(value) => handleFilterChange('type', value)}
                allowClear
                className="w-full"
                size="large"
              >
                {typeOptions.map((type) => (
                  <Option key={type} value={type}>
                    {type}
                  </Option>
                ))}
              </Select>
            </div>
          </Col>
          
          <Col xs={24} sm={12} md={8} lg={6}>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Brand
              </label>
              <Select
                placeholder="Select Brand"
                value={filters.brand}
                onChange={(value) => handleFilterChange('brand', value)}
                allowClear
                className="w-full"
                size="large"
              >
                {brandOptions.map((brand) => (
                  <Option key={brand} value={brand}>
                    {brand}
                  </Option>
                ))}
              </Select>
            </div>
          </Col>
        </Row>

        {/* Active Filters Display */}
        {(filters.type || filters.brand) && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="flex flex-wrap gap-2">
              {filters.type && (
                <Tag 
                  color="blue" 
                  closable 
                  onClose={() => handleFilterChange('type', null)}
                  className="text-sm"
                >
                  Type: {filters.type}
                </Tag>
              )}
              {filters.brand && (
                <Tag 
                  color="green" 
                  closable 
                  onClose={() => handleFilterChange('brand', null)}
                  className="text-sm"
                >
                  Brand: {filters.brand}
                </Tag>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="bg-white rounded-lg">
        {isMobile ? (
          // Mobile Cards View
          <div className="p-4">
            {isLoading ? (
              <div className="flex justify-center items-center h-64">
                <Spin size="large" />
              </div>
            ) : displayProducts.length > 0 ? (
              <div className="space-y-4">
                {displayProducts.map((product) => (
                  <ProductCard key={product?._id} product={product} />
                ))}
              </div>
            ) : (
              <Empty
                description="No products found"
                className="py-12 text-xl font-semibold text-gray-500"
              />
            )}
          </div>
        ) : (
          // Desktop Table View
          <Table
            dataSource={displayProducts}
            columns={columns}
            rowKey="_id"
            loading={isLoading}
            pagination={false}
            locale={{
              emptyText: (
                <Empty
                  description="No products found"
                  className="py-12 text-xl font-semibold text-gray-500"
                />
              ),
            }}
            className="w-full overflow-x-auto"
          />
        )}

        {/* Custom Pagination */}
        {productsData && (
          <div className="flex justify-center mt-6 p-4">
            <Pagination
              current={currentPage}
              total={totalProducts}
              pageSize={pageSize}
              showSizeChanger={!isMobile}
              showQuickJumper={!isMobile}
              showTotal={
                !isMobile
                  ? (total, range) => {
                      if (hasActiveFilters) {
                        return `${range[0]}-${range[1]} of ${total} filtered products`;
                      }
                      return `${range[0]}-${range[1]} of ${total} products`;
                    }
                  : undefined
              }
              onChange={handlePageChange}
              onShowSizeChange={handlePageChange}
              size={isMobile ? "small" : "default"}
              responsive={true}
            />
          </div>
        )}
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv"
        onChange={handleCSVUpload}
        style={{ display: "none" }}
      />
    </motion.div>
  );
};

export default AdminProductsPage;
