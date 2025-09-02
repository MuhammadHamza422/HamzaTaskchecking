import React, { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import ProductTableSkeleton from "./components/ProductTableSkeleton";
import { getProducts } from "../../api/warehouse";
import { Search } from "lucide-react";
import { Col, Row, Select, Tag } from "antd";

const TYPE_CODE_LABELS = {
  CON: "Consoles",
  HAN: "Handhelds",
  ACC: "Accessories",
  GAM: "Games",
};

const typeOptions = ["CON", "HAN", "GAM", "ACC"];

export default function Products() {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(30);
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState({
    type: null,
  });

  const { data, isLoading } = useQuery({
    queryKey: ["products", page, limit, search, filters.type],
    queryFn: () => getProducts({ page, limit, search, type: filters.type }),
    keepPreviousData: false,
    staleTime: 0,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    refetchOnMount: true,
  });

  const products = useMemo(() => {
    if (!data) return [];
    const list = Array.isArray(data?.products) ? data.products : [];
    return list.map((p) => {
      const rawType = String(p?.type_code || "").toUpperCase();
      return {
        id: p._id || p?.id,
        pro_title: p?.pro_title,
        sku: p?.sku,
        model_code: p?.model_code,
        type_code: p?.type_code,
        type_name: TYPE_CODE_LABELS[rawType] || p?.type_code || "",
        brnd_code: p?.brnd_code,
        sale_price: p?.sale_price,
        cnd_code: p?.cnd_code,
      };
    });
  }, [data]);

  const total = data?.totalProducts || 0;
  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <>
      <div className="w-full max-w-7xl mx-auto p-2 min-h-screen">
        {/* Header Section */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Products</h1>
              <p className="mt-2 text-gray-600">
                Browse and manage your product inventory
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 min-w-0">
              {/* Search Bar */}
              <div className="relative flex-1 min-w-[320px]">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Search className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  value={search}
                  onChange={(e) => {
                    setPage(1);
                    setSearch(e.target.value);
                  }}
                  placeholder="Search products by name, SKU, or category..."
                  className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm placeholder-gray-500 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-100 outline-none transition-all duration-200"
                />
              </div>
            </div>
          </div>
        </div>

        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} md={8} lg={6}>
            <div className="mb-5">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Type
              </label>
              <Select
                placeholder="Select Type"
                value={filters.type}
                onChange={(value) => setFilters({ ...filters, type: value })}
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
        </Row>

        {/* Active Filters Display */}
        {(filters.type || filters.brand) && (
          <div className="mb-4">
            <div className="flex flex-wrap gap-2">
              {filters.type && (
                <Tag
                  color="blue"
                  closable
                  onClose={() => setFilters({ ...filters, type: null })}
                  className="text-sm"
                >
                  Type: {TYPE_CODE_LABELS[filters.type] || filters.type}
                </Tag>
              )}
            </div>
          </div>
        )}

        {/* Table Section */}
        <div className="overflow-x-auto w-full bg-white rounded-2xl shadow-sm border border-gray-100">
          <table className="w-full table-auto">
            <thead className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
              <tr>
                {["Product Title", "SKU", "Type"].map((header) => (
                  <th
                    key={header}
                    className="px-6 py-4 text-left text-xs whitespace-nowrap font-semibold text-gray-700 uppercase tracking-wider"
                  >
                    {header}
                  </th>
                ))}
              </tr>
            </thead>

            {isLoading ? (
              <ProductTableSkeleton rows={8} />
            ) : (
              <tbody className="divide-y divide-gray-100">
                {products.map((p, index) => (
                  <tr
                    key={p?.id}
                    className={`hover:bg-blue-50 transition-colors duration-200 ${
                      index % 2 === 0 ? "bg-white" : "bg-gray-50/50"
                    }`}
                  >
                    <td className="px-6 py-3">
                      <p
                        title={p?.pro_title}
                        className="w-[250px] text-sm font-semibold text-gray-900 line-clamp-2 leading-relaxed"
                      >
                        {p?.pro_title}
                      </p>
                    </td>
                    <td className="px-6 py-3 whitespace-nowrap">
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                        {p?.sku}
                      </span>
                    </td>
                    <td className="px-6 py-3 whitespace-nowrap">
                      <span className="inline-flex uppercase items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-black">
                        {p?.type_name}
                      </span>
                    </td>
                  </tr>
                ))}

                {products.length === 0 && (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-6 py-12 text-center text-gray-500"
                    >
                      <div className="flex flex-col items-center justify-center">
                        <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-3">
                          <Search className="h-6 w-6 text-gray-400" />
                        </div>
                        <p className="text-lg font-medium text-gray-600">
                          No products found
                        </p>
                        <p className="text-sm text-gray-500 mt-1">
                          Try adjusting your search criteria
                        </p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            )}
          </table>
        </div>

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
    </>
  );
}
