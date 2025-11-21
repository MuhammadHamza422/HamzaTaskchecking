import React from "react";

/**
 * Custom Pagination Component
 * Based on AdminProductsPage design, made reusable
 * 
 * @param {Object} props
 * @param {number} props.page - Current page number
 * @param {number} props.limit - Items per page
 * @param {number} props.total - Total number of items
 * @param {number} props.totalPages - Total number of pages
 * @param {Function} props.onPageChange - Callback when page changes (page) => void
 * @param {Function} props.onLimitChange - Callback when limit changes (limit) => void
 * @param {string} props.itemName - Name of items being paginated (e.g., "orders", "products")
 * @param {Array<number>} props.limitOptions - Options for items per page (default: [10, 20, 30, 50, 100, 200, 500])
 */
export default function CustomPagination({
  page,
  limit,
  total,
  totalPages,
  onPageChange,
  onLimitChange,
  itemName = "items",
  limitOptions = [10, 20, 30, 50, 100, 200, 500],
}) {
  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      onPageChange(newPage);
    }
  };

  const handleLimitChange = (newLimit) => {
    onLimitChange(newLimit);
    // Reset to page 1 when changing limit
    onPageChange(1);
  };

  // Generate page numbers with ellipsis
  const getPageNumbers = () => {
    const nums = [];
    const windowSize = 2;
    const start = Math.max(1, page - windowSize);
    const end = Math.min(totalPages, page + windowSize);

    if (start > 1) {
      nums.push(1);
      if (start > 2) nums.push("...");
    }

    for (let n = start; n <= end; n++) {
      nums.push(n);
    }

    if (end < totalPages) {
      if (end < totalPages - 1) nums.push("...");
      nums.push(totalPages);
    }

    return nums;
  };

  if (totalPages === 0) {
    return null;
  }

  return (
    <div className="mt-6 bg-white rounded-2xl shadow-sm border border-gray-100 p-4 md:p-6">
      {/* Results Info */}
      <div className="text-center sm:text-left text-sm text-gray-600 font-medium mb-4 sm:mb-2">
        Showing{" "}
        <span className="font-semibold text-gray-900">
          {total === 0 ? 0 : (page - 1) * limit + 1}
        </span>{" "}
        to{" "}
        <span className="font-semibold text-gray-900">
          {Math.min(page * limit, total)}
        </span>{" "}
        of <span className="font-semibold text-gray-900">{total}</span>{" "}
        {itemName}
      </div>

      {/* Desktop Pagination */}
      <div className="hidden lg:flex items-center justify-between">
        <div className="flex items-center gap-2">
          {/* First & Previous */}
          <button
            onClick={() => handlePageChange(1)}
            disabled={page === 1}
            className="px-3 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            First
          </button>
          <button
            onClick={() => handlePageChange(page - 1)}
            disabled={page === 1}
            className="px-3 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Previous
          </button>

          {/* Page Numbers */}
          {getPageNumbers().map((n, idx) =>
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
                onClick={() => handlePageChange(n)}
                className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                  n === page
                    ? "bg-blue-600 text-white border border-blue-600 shadow-lg"
                    : "text-gray-600 bg-white border border-gray-300 hover:bg-gray-50"
                }`}
              >
                {n}
              </button>
            )
          )}

          {/* Next & Last */}
          <button
            onClick={() => handlePageChange(page + 1)}
            disabled={page >= totalPages}
            className="px-3 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Next
          </button>
          <button
            onClick={() => handlePageChange(totalPages)}
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
            onChange={(e) => handleLimitChange(Number(e.target.value))}
            className="px-3 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
          >
            {limitOptions.map((n) => (
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
              onClick={() => handlePageChange(page - 1)}
              disabled={page === 1}
              className="px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              ← Previous
            </button>
            <button
              onClick={() => handlePageChange(page + 1)}
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
              onChange={(e) => handlePageChange(Number(e.target.value))}
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
              onChange={(e) => handleLimitChange(Number(e.target.value))}
              className="px-3 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
            >
              {limitOptions.map((n) => (
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
            onClick={() => handlePageChange(page - 1)}
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
            onClick={() => handlePageChange(page + 1)}
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
              onChange={(e) => handlePageChange(Number(e.target.value))}
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
              onChange={(e) => handleLimitChange(Number(e.target.value))}
              className="px-2 py-1 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded focus:border-blue-500 focus:ring-1 focus:ring-blue-100 outline-none"
            >
              {limitOptions.slice(0, 5).map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
    </div>
  );
}

