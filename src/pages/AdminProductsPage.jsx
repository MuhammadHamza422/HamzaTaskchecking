import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
} from "react";
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
import { getProducts } from "../api/warehouse";

const { Search } = Input;
const { Title, Text } = Typography;
const { Option } = Select;

const typeOptions = ["CON", "HAN", "GAM", "ACC"];
const TYPE_CODE_LABELS = {
  CON: "Consoles",
  HAN: "Handhelds",
  ACC: "Accessories",
  GAM: "Games",
};
const brandOptions = [
  "NIN",
  "SNY",
  "MSF",
  "SEG",
  "RET",
  "COL",
  "ATR",
  "INT",
  "SNV",
  "NEC",
];

const AdminProductsPage = () => {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [search, setSearch] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);
  const [page, setPage] = useState(1); // current page (1-based)
  const [limit, setLimit] = useState(30); // items per page

  // Filter states
  const [filters, setFilters] = useState({
    type: null,
    brand: null,
  });

  // Responsive breakpoint
  const isMobile = useMediaQuery({ maxWidth: 768 });

  // Create debounced search function
  const debouncedSearch = useCallback(
    debounce((searchValue) => {
      setSearch(searchValue);
      setPage(1); // Reset to first page when searching
    }, 300),
    []
  );

  // Handle search change
  const handleSearchChange = (e) => {
    const value = e.target.value;
    debouncedSearch(value);
  };

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["products", page, limit, search, filters.type, filters.brand],
    queryFn: () =>
      getProducts({
        page,
        limit,
        search,
        type: filters.type,
        brand: filters.brand,
      }),
    keepPreviousData: true,
  });

  const products = useMemo(() => {
    if (!data) return [];
    const list = Array.isArray(data?.products) ? data.products : [];
    return list.map((p) => {
      const rawType = String(p?.type_code || "").toUpperCase();
      return {
        id: p._id || p?.id,
        _id: p._id || p?.id, // Ensure _id is available for rowKey
        pro_title: p?.pro_title,
        sku: p?.sku,
        model_code: p?.model_code,
        type_code: p?.type_code,
        type_name: TYPE_CODE_LABELS[rawType] || p?.type_code || "",
        brnd_code: p?.brnd_code,
        sale_price: p?.sale_price,
        regular_price: p?.regular_price,
        cnd_code: p?.cnd_code,
        is_storable: p?.is_storable,
      };
    });
  }, [data]);

  const total = data?.totalProducts || 0;
  const totalPages = Math.max(1, Math.ceil(total / limit));

  // Handle filter changes
  const handleFilterChange = (filterType, value) => {
    setFilters((prev) => ({
      ...prev,
      [filterType]: value,
    }));
    setPage(1); // Reset to first page when filtering
  };

  // Handle filter reset
  const handleFilterReset = () => {
    setFilters({
      type: null,
      brand: null,
    });
    setPage(1);
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
      sorter: (a, b) => (a?.pro_title || "").localeCompare(b?.pro_title || ""),
      render: (text) => (
        <p
          title={text}
          className="text-base w-[300px] font-semibold text-gray-900"
        >
          {text || "N/A"}
        </p>
      ),
      width: 400,
    },
    {
      title: "SKU",
      dataIndex: "sku",
      key: "sku",
      sorter: (a, b) => (a?.sku || "").localeCompare(b?.sku || ""),
      render: (text) => (
        <span title={text} className="text-gray-600 text-sm whitespace-nowrap">
          {text || "N/A"}
        </span>
      ),
    },
    {
      title: "Type",
      dataIndex: "type_code",
      key: "type_code",
      render: (text) => (
        <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-medium">
          {TYPE_CODE_LABELS[text] || text || "N/A"}
        </span>
      ),
    },
    {
      title: "Brand",
      dataIndex: "brnd_code",
      key: "brnd_code",
      render: (text) => <span className="text-gray-600">{text || "N/A"}</span>,
    },
    {
      title: "Model",
      dataIndex: "model_code",
      key: "model_code",
      render: (text) => <span className="text-gray-600">{text || "N/A"}</span>,
    },
    {
      title: "Sale Price",
      dataIndex: "sale_price",
      key: "sale_price",
      render: (price) => (
        <span className="font-semibold text-green-600">
          ${price ? parseFloat(price).toFixed(2) : "0.00"}
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
          {text === "R" ? "Refurbished" : text === "N" ? "New" : text || "N/A"}
        </span>
      ),
    },
  ];

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
            placeholder="Search by Name..."
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
                onChange={(value) => handleFilterChange("type", value)}
                allowClear
                className="w-full"
                size="large"
              >
                {typeOptions.map((type) => (
                  <Option key={type} value={type}>
                    {TYPE_CODE_LABELS[type] || type}
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
                onChange={(value) => handleFilterChange("brand", value)}
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
                  onClose={() => handleFilterChange("type", null)}
                  className="text-sm"
                >
                  Type: {TYPE_CODE_LABELS[filters.type] || filters.type}
                </Tag>
              )}
              {filters.brand && (
                <Tag
                  color="green"
                  closable
                  onClose={() => handleFilterChange("brand", null)}
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
        {/* Desktop Table View */}
        <Table
          dataSource={products}
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
        {/* Pagination Section */}
        {total > 0 && (
          <div className="mt-6 bg-white rounded-2xl shadow-sm border border-gray-100 p-4 md:p-6">
            {/* Results Info */}
            <div className="text-center sm:text-left text-sm text-gray-600 font-medium mb-4 sm:mb-2">
              Showing{" "}
              <span className="font-semibold text-gray-900">
                {Math.min((page - 1) * limit + 1, total)}
              </span>{" "}
              to{" "}
              <span className="font-semibold text-gray-900">
                {Math.min(page * limit, total)}
              </span>{" "}
              of <span className="font-semibold text-gray-900">{total}</span>{" "}
              products
            </div>

            {/* Desktop Pagination */}
            <div className="hidden lg:flex items-center justify-between">
              <div className="flex items-center gap-2">
                {/* First & Previous */}
                <button
                  onClick={() => setPage(1)}
                  disabled={page === 1}
                  className="px-3 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  First
                </button>
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Previous
                </button>

                {/* Page Numbers */}
                {(() => {
                  const nums = [];
                  const windowSize = 2;
                  const start = Math.max(1, page - windowSize);
                  const end = Math.min(totalPages, page + windowSize);

                  if (start > 1) {
                    nums.push(1);
                    if (start > 2) nums.push("...");
                  }

                  for (let n = start; n <= end; n++) nums.push(n);

                  if (end < totalPages) {
                    if (end < totalPages - 1) nums.push("...");
                    nums.push(totalPages);
                  }

                  return nums.map((n, idx) =>
                    n === "..." ? (
                      <span
                        key={`ellipsis-${idx}`}
                        className="px-3 py-2 text-sm text-gray-400"
                      >
                        ...
                      </span>
                    ) : (
                      <button
                        key={n}
                        onClick={() => setPage(n)}
                        className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                          n === page
                            ? "bg-blue-600 text-white border border-blue-600 shadow-lg"
                            : "text-gray-600 bg-white border border-gray-300 hover:bg-gray-50"
                        }`}
                      >
                        {n}
                      </button>
                    )
                  );
                })()}

                {/* Next & Last */}
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="px-3 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Next
                </button>
                <button
                  onClick={() => setPage(totalPages)}
                  disabled={page >= totalPages}
                  className="px-3 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Last
                </button>
              </div>

              {/* Items per page - Desktop */}
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">Show:</span>
                <select
                  value={limit}
                  onChange={(e) => {
                    setPage(1);
                    setLimit(Number(e.target.value));
                  }}
                  className="px-3 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
                >
                  {[10, 20, 30, 50, 100, 200, 500].map((n) => (
                    <option key={n} value={n}>
                      {n} per page
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Tablet Pagination */}
            <div className="hidden sm:flex lg:hidden flex-col gap-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    ← Previous
                  </button>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page >= totalPages}
                    className="px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Next →
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">
                    Page {page} of {totalPages}
                  </span>
                </div>
              </div>

              {/* Page selector and items per page - Tablet */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">Go to page:</span>
                  <select
                    value={page}
                    onChange={(e) => setPage(Number(e.target.value))}
                    className="px-3 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
                  >
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                      (n) => (
                        <option key={n} value={n}>
                          Page {n}
                        </option>
                      )
                    )}
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">Show:</span>
                  <select
                    value={limit}
                    onChange={(e) => {
                      setPage(1);
                      setLimit(Number(e.target.value));
                    }}
                    className="px-3 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
                  >
                    {[10, 20, 30, 50, 100, 200, 500].map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Mobile Pagination */}
            <div className="flex sm:hidden flex-col gap-3 mt-4">
              {/* Page info and navigation */}
              <div className="flex items-center justify-between">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <span>←</span>
                  <span className="hidden xs:inline">Previous</span>
                </button>

                <div className="text-sm text-gray-600 font-medium">
                  Page {page} of {totalPages}
                </div>

                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <span className="hidden xs:inline">Next</span>
                  <span>→</span>
                </button>
              </div>

              {/* Quick page jump and items per page */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-600">Jump to:</span>
                  <select
                    value={page}
                    onChange={(e) => setPage(Number(e.target.value))}
                    className="px-2 py-1 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded focus:border-blue-500 focus:ring-1 focus:ring-blue-100 outline-none"
                  >
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                      (n) => (
                        <option key={n} value={n}>
                          {n}
                        </option>
                      )
                    )}
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-600">Show:</span>
                  <select
                    value={limit}
                    onChange={(e) => {
                      setPage(1);
                      setLimit(Number(e.target.value));
                    }}
                    className="px-2 py-1 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded focus:border-blue-500 focus:ring-1 focus:ring-blue-100 outline-none"
                  >
                    {[10, 20, 30, 50, 100].map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
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
