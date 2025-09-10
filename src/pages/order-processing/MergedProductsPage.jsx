import React, {
  useCallback,
  useMemo,
  useRef,
  useState,
  useEffect,
} from "react";
import { useQuery } from "@tanstack/react-query";
import { debounce } from "lodash";
import { motion } from "framer-motion";
import Swal from "sweetalert2";
import {
  Table,
  Input,
  Typography,
  Empty,
  Pagination,
  Drawer,
  Tag,
  Spin,
} from "antd";
import { fetchMappedProducts } from "../../api/products";
import useFullscreen from "../../components/useFullscreen";

const { Search } = Input;
const { Title, Text } = Typography;

const MergedProductsPage = () => {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [search, setSearch] = useState("");

  const [openDrawer, setOpenDrawer] = useState(false);
  const [selectedRow, setSelectedRow] = useState(null);
  const { ref: fullscreenRef, isFullscreen, getContainer } = useFullscreen();
  const { data, isLoading, error } = useQuery({
    queryKey: ["mapped-products", currentPage, pageSize, search],
    queryFn: async ({ queryKey }) => {
      const [, page, limit, s] = queryKey;
      return fetchMappedProducts({ page, limit, search: s });
    },
    keepPreviousData: true,
  });

  useEffect(() => {
    if (error) {
      Swal.fire({
        icon: "error",
        title: "Failed to load merged products",
        text: error.message || "An error occurred while fetching data",
        toast: true,
        position: "top-end",
        showConfirmButton: false,
        timer: 4000,
        timerProgressBar: true,
        background: "#ef4444",
        color: "#fff",
        customClass: { popup: "rounded-lg" },
      });
    }
  }, [error]);

  const debouncedSearch = useMemo(
    () =>
      debounce((value) => {
        setSearch(value);
        setCurrentPage(1);
      }, 500),
    []
  );

  const handleSearchChange = (e) => {
    debouncedSearch(e.target.value);
  };

  const handlePageChange = (page, size) => {
    setCurrentPage(page);
    setPageSize(size);
  };

  const openDetails = (row) => {
    setSelectedRow(row);
    setOpenDrawer(true);
  };

  const closeDetails = () => {
    setOpenDrawer(false);
    setSelectedRow(null);
  };

  // Guess common fields from mapped/merged products; adjust to your API shape
  const columns = useMemo(() => {
    const formatMoney = (val) => {
      const num = Number(val);
      if (Number.isNaN(num)) return "-";
      return `$${num.toFixed(2)}`;
    };

    return [
      {
        title: "Title",
        dataIndex: "pro_title",
        key: "pro_title",
        width: 400,
        render: (_, row) => (
          <span
            title={row?.pro_title}
            className="text-base max-sm:whitespace-nowrap font-semibold text-gray-900"
          >
            {row?.pro_title}
          </span>
        ),
      },
      {
        title: "SKU",
        dataIndex: "sku",
        key: "sku",
        width: 220,
        render: (_, row) => <span className="text-gray-700"> {row?.sku}</span>,
      },
      {
        title: "Type",
        dataIndex: "type_code",
        key: "type_code",
        width: 100,
        render: (_, row) => (
          <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-medium">
            {row?.type_code}
          </span>
        ),
      },
      {
        title: "Model",
        dataIndex: "model_code",
        key: "model_code",
        width: 120,
        render: (_, row) => (
          <span className="text-gray-700">{row?.model_code}</span>
        ),
      },
      {
        title: "Storage",
        dataIndex: "storage_code",
        key: "storage_code",
        width: 120,
        render: (_, row) => (
          <span className="text-gray-700">{row?.storage_code}</span>
        ),
      },
      {
        title: "Color",
        dataIndex: "color_code",
        key: "color_code",
        width: 100,
        render: (_, row) => (
          <span className="text-gray-700">{row?.color_code}</span>
        ),
      },

      {
        title: "Prices",
        key: "sale_price",
        width: 200,
        render: (_, row) => (
          <div className="leading-tight">
            <div className="text-sm font-semibold text-green-600">
              {formatMoney(row?.sale_price)}
            </div>
          </div>
        ),
      },

      {
        title: "Actions",
        key: "actions",
        fixed: "right",
        width: 120,
        render: (_, row) => (
          <button
            onClick={() => openDetails(row)}
            className="px-3 py-1 rounded-md bg-blue-600 text-white hover:bg-blue-700"
          >
            Details
          </button>
        ),
      },
    ];
  }, []);

  const items = data?.items || data?.products || data?.data || [];
  const total = data?.total || data?.totalProducts || data?.count || 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="bg-white rounded-lg p-4 md:p-6 mb-4 shadow-lg border border-gray-200 bg-gradient-to-t from-blue-50 to-blue-100">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <Title level={3} style={{ margin: 0 }}>
            Merged Products
          </Title>
        </div>
        <div className="mt-4">
          <Search
            placeholder="Search by title, SKU..."
            onChange={handleSearchChange}
            className="w-full md:w-96"
            allowClear
            size="large"
          />
        </div>
      </div>

      <div className="bg-white rounded-lg">
        <Table
          dataSource={items}
          columns={columns}
          rowKey={(r) => r._id || r.id || r.sku}
          loading={isLoading}
          pagination={false}
          locale={{
            emptyText: (
              <Empty
                description="No merged products found"
                className="py-12 text-xl font-semibold text-gray-500"
              />
            ),
          }}
          className="w-full overflow-x-auto"
          scroll={{ x: true }}
        />

        {data && (
          <div className="flex justify-center mt-6 p-4">
            <Pagination
              current={currentPage}
              total={total}
              pageSize={pageSize}
              showSizeChanger
              showQuickJumper
              onChange={handlePageChange}
              onShowSizeChange={handlePageChange}
            />
          </div>
        )}
      </div>

      <div ref={fullscreenRef}>
        <Drawer
          getContainer={getContainer}
          key={String(isFullscreen)}
          title="Merged Product Details"
          placement="right"
          width={520}
          onClose={closeDetails}
          open={openDrawer}
        >
          {!selectedRow ? (
            <div className="flex items-center justify-center py-10">
              <Spin />
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <Text type="secondary" className="block text-xs">
                  Title
                </Text>
                <div className="text-base font-semibold">
                  {selectedRow.pro_title}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <Text type="secondary" className="block text-xs">
                    SKU
                  </Text>
                  <div className="text-gray-700">{selectedRow.sku}</div>
                </div>
                <div>
                  <Text type="secondary" className="block text-xs">
                    Brand
                  </Text>
                  <div className="text-gray-700">{selectedRow.brnd_code}</div>
                </div>
                <div>
                  <Text type="secondary" className="block text-xs">
                    Model
                  </Text>
                  <div className="text-gray-700">{selectedRow.model_code}</div>
                </div>
                <div>
                  <Text type="secondary" className="block text-xs">
                    Condition
                  </Text>
                  <div>
                    <Tag
                      color={
                        selectedRow.cnd_code === "R"
                          ? "green"
                          : selectedRow.cnd_code === "N"
                          ? "blue"
                          : "default"
                      }
                    >
                      {selectedRow.cnd_code}
                    </Tag>
                  </div>
                </div>
                <div>
                  <Text type="secondary" className="block text-xs">
                    Type
                  </Text>
                  <div className="text-gray-700">{selectedRow.type_code}</div>
                </div>
                <div>
                  <Text type="secondary" className="block text-xs">
                    Storage
                  </Text>
                  <div className="text-gray-700">
                    {selectedRow.storage_code}
                  </div>
                </div>
                <div>
                  <Text type="secondary" className="block text-xs">
                    Color
                  </Text>
                  <div className="text-gray-700">{selectedRow.color_code}</div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 text-sm">
                <div>
                  <Text type="secondary" className="block text-xs">
                    Price
                  </Text>
                  <div className="font-semibold">
                    ${Number(selectedRow.price || 0).toFixed(2)}
                  </div>
                </div>
                <div>
                  <Text type="secondary" className="block text-xs">
                    Sale Price
                  </Text>
                  <div className="font-semibold text-green-600">
                    ${Number(selectedRow.sale_price || 0).toFixed(2)}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <Text type="secondary" className="block text-xs">
                    Seller
                  </Text>
                  <div className="text-gray-700">{selectedRow.seller_ids}</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <Text type="secondary" className="block text-xs">
                    Merged By
                  </Text>
                  <div className="text-gray-700">
                    {[selectedRow?.user?.firstName, selectedRow?.user?.lastName]
                      .filter(Boolean)
                      .join(" ") || "-"}
                  </div>
                </div>
                <div>
                  <Text type="secondary" className="block text-xs">
                    Created At
                  </Text>
                  <div className="text-gray-700">
                    {new Date(selectedRow.createdAt).toLocaleString()}
                  </div>
                </div>
                <div>
                  <Text type="secondary" className="block text-xs">
                    Updated At
                  </Text>
                  <div className="text-gray-700">
                    {new Date(selectedRow.updatedAt).toLocaleString()}
                  </div>
                </div>
              </div>

              {Array.isArray(selectedRow.sources) &&
                selectedRow.sources.length > 0 && (
                  <div>
                    <Text type="secondary" className="block text-xs mb-2">
                      Source Products
                    </Text>
                    <div className="max-h-72 overflow-auto border rounded-md p-2 space-y-2">
                      {selectedRow.sources.map((sp, idx) => (
                        <div key={idx} className="border rounded p-2">
                          <div className="font-medium">
                            {sp.pro_title || sp.title}
                          </div>
                          <div className="text-xs text-gray-600">
                            SKU: {sp.sku}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
            </div>
          )}
        </Drawer>
      </div>
    </motion.div>
  );
};

export default MergedProductsPage;
