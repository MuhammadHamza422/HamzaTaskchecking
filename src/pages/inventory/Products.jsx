import React, { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Swal from "sweetalert2";
import ProductTableSkeleton from "./components/ProductTableSkeleton";
import { getProducts, deleteProduct } from "../../api/warehouse";
import { Search, Trash2, Upload, Loader2 } from "lucide-react";

export default function Products() {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(30);
  const [search, setSearch] = useState("");
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["products", page, limit, search],
    queryFn: () => getProducts({ page, limit, search }),
    keepPreviousData: true,
    staleTime: 60 * 1000,
  });

  const products = useMemo(() => {
    if (!data) return [];
    const list = Array.isArray(data?.products) ? data.products : [];
    return list.map((p) => ({
      id: p._id || p?.id,
      pro_title: p?.pro_title,
      sku: p?.sku,
      model_code: p?.model_code,
      type_code: p?.type_code,
      brnd_code: p?.brnd_code,
      sale_price: p?.sale_price,
      cnd_code: p?.cnd_code,
    }));
  }, [data]);

  // const handleDelete = async (id) => {
  //   const result = await Swal.fire({
  //     title: "Delete this product?",
  //     text: "This action cannot be undone.",
  //     icon: "warning",
  //     showCancelButton: true,
  //     confirmButtonColor: "#dc2626",
  //     cancelButtonColor: "#6b7280",
  //     confirmButtonText: "Delete",
  //     cancelButtonText: "Cancel",
  //   });
  //   if (!result.isConfirmed) return;
  //   await deleteProduct(id);
  //   queryClient.invalidateQueries({ queryKey: ["products"] });
  //   await Swal.fire({
  //     icon: "success",
  //     title: "Product deleted",
  //     toast: true,
  //     position: "top-end",
  //     timer: 1800,
  //     showConfirmButton: false,
  //     background: "#ef4444",
  //     color: "#fff",
  //   });
  // };

  const total = data?.totalProducts || 0;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const fileInputRef = React.useRef(null);
  const [importing, setImporting] = useState(false);

  // const onPickCsv = () => {
  //   if (importing) return;
  //   if (fileInputRef.current) fileInputRef.current.click();
  // };

  // const onFileChange = async (e) => {
  //   const file = e.target.files?.[0];
  //   if (!file) return;
  //   if (!file.name.toLowerCase().endsWith(".csv")) {
  //     await Swal.fire({ icon: "error", title: "Invalid file", text: "Please select a .csv file" });
  //     e.target.value = "";
  //     return;
  //   }
  //   try {
  //     setImporting(true);
  //     await importProductsCsv(file);
  //     queryClient.invalidateQueries({ queryKey: ["products"] });
  //     await Swal.fire({
  //       icon: "success",
  //       title: "Import started",
  //       text: "Your CSV is being processed.",
  //       toast: true,
  //       position: "top-end",
  //       timer: 1800,
  //       showConfirmButton: false,
  //     });
  //   } catch (err) {
  //     await Swal.fire({ icon: "error", title: "Import failed", text: err?.response?.data?.message || err?.message || "Unable to import" });
  //   } finally {
  //     e.target.value = "";
  //     setImporting(false);
  //   }
  // };

  const modelCodeColors = {
    M1: "bg-green-100 text-green-800",
    M2: "bg-yellow-100 text-yellow-800",
    M3: "bg-red-100 text-red-800",
  };

  const brandCodeColors = {
    B1: "bg-purple-100 text-purple-800",
    B2: "bg-pink-100 text-pink-800",
    B3: "bg-orange-100 text-orange-800",
  };

  const conditionColors = {
    NEW: "bg-green-100 text-green-800",
    USED: "bg-yellow-100 text-yellow-800",
    REF: "bg-blue-100 text-blue-800", // Refurbished
  };

  const getColor = (map, value) => map[value] || "bg-gray-100 text-gray-800"; // fallback

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

              {/* CSV Upload Button */}
              {/* <input ref={fileInputRef} type="file" accept=".csv,text/csv" onChange={onFileChange} className="hidden" />
              <button
                onClick={onPickCsv}
                disabled={importing}
                className={`flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-3 rounded-xl font-medium transition-all duration-200 transform ${
                  importing ? "opacity-60 cursor-not-allowed" : "hover:from-blue-700 hover:to-blue-800 hover:scale-105 shadow-lg hover:shadow-xl"
                } whitespace-nowrap`}
              >
                {importing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Importing…
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4" />
                    Upload CSV
                  </>
                )}
              </button> */}
            </div>
          </div>
        </div>

        {/* Table Section */}
        <div className="overflow-x-auto w-full bg-white rounded-2xl shadow-sm border border-gray-100">
          <table className="w-full table-auto">
            <thead className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
              <tr>
                {[
                  "Product Title",
                  "SKU",
                  "Model Code",
                  "Brand Code",
                  "Sale Price",
                  "Condition",
                ].map((header) => (
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
                      <span
                        className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getColor(
                          modelCodeColors,
                          p?.model_code
                        )}`}
                      >
                        {p?.model_code}
                      </span>
                    </td>

                    <td className="px-6 py-3 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getColor(
                          brandCodeColors,
                          p?.brnd_code
                        )}`}
                      >
                        {p?.brnd_code}
                      </span>
                    </td>

                    <td className="px-6 py-3 whitespace-nowrap">
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {p?.sale_price}
                      </span>
                    </td>

                    <td className="px-6 py-3 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getColor(
                          conditionColors,
                          p?.cnd_code
                        )}`}
                      >
                        {p?.cnd_code}
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
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-6 bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="text-sm text-gray-600 font-medium">
            Showing{" "}
            <span className="font-semibold text-gray-900">
              {(page - 1) * limit + 1}
            </span>{" "}
            to{" "}
            <span className="font-semibold text-gray-900">
              {Math.min(page * limit, total)}
            </span>{" "}
            of <span className="font-semibold text-gray-900">{total}</span>{" "}
            products
          </div>

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

            {/* Items per page */}
            <select
              value={limit}
              onChange={(e) => {
                setPage(1);
                setLimit(Number(e.target.value));
              }}
              className="ml-2 px-3 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
            >
              {[10, 20, 30, 50, 100, 200, 500].map((n) => (
                <option key={n} value={n}>
                  {n} per page
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
    </>
  );
}
