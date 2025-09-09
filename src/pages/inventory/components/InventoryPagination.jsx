import React from "react";

export default function InventoryPagination({
  page,
  setPage,
  limit,
  setLimit,
  total,
}) {
  const totalPages = Math.max(1, Math.ceil((total || 0) / (limit || 50)));

  if (!total) return null;

  return (
    <div className="mt-6 bg-white rounded-2xl shadow-sm border border-gray-100 p-4 md:p-6">
      <div className="text-center sm:text-left text-sm text-gray-600 font-medium mb-4 sm:mb-2">
        Showing {Math.min((page - 1) * limit + 1, total)} to {Math.min(page * limit, total)} of {total} items
      </div>

      <div className="hidden lg:flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button onClick={() => setPage(1)} disabled={page === 1} className="px-3 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">First</button>
          <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="px-3 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">Previous</button>

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
                <span key={`ellipsis-${idx}`} className="px-3 py-2 text-sm text-gray-400">...</span>
              ) : (
                <button key={n} onClick={() => setPage(n)} className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${n === page ? "bg-blue-600 text-white border border-blue-600 shadow-lg" : "text-gray-600 bg-white border border-gray-300 hover:bg-gray-50"}`}>{n}</button>
              )
            );
          })()}

          <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages} className="px-3 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">Next</button>
          <button onClick={() => setPage(totalPages)} disabled={page >= totalPages} className="px-3 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">Last</button>
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
            {[10, 20, 30, 50, 100, 200, 500,1000].map((n) => (
              <option key={n} value={n}>
                {n} per page
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="hidden sm:flex lg:hidden flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">← Previous</button>
            <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages} className="px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">Next →</button>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">Page {page} of {totalPages}</span>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">Go to page:</span>
            <select value={page} onChange={(e) => setPage(Number(e.target.value))} className="px-3 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
                <option key={n} value={n}>Page {n}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">Show:</span>
            <select value={limit} onChange={(e) => { setPage(1); setLimit(Number(e.target.value)); }} className="px-3 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none">
              {[10, 20, 30, 50, 100, 200, 500].map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="flex sm:hidden flex-col gap-3 mt-4">
        <div className="flex items-center justify-between">
          <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
            <span>←</span>
            <span className="hidden xs:inline">Previous</span>
          </button>
          <div className="text-sm text-gray-600 font-medium">Page {page} of {totalPages}</div>
          <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages} className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
            <span className="hidden xs:inline">Next</span>
            <span>→</span>
          </button>
        </div>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-600">Jump to:</span>
            <select value={page} onChange={(e) => setPage(Number(e.target.value))} className="px-2 py-1 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded focus:border-blue-500 focus:ring-1 focus:ring-blue-100 outline-none">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-600">Show:</span>
            <select value={limit} onChange={(e) => { setPage(1); setLimit(Number(e.target.value)); }} className="px-2 py-1 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded focus:border-blue-500 focus:ring-1 focus:ring-blue-100 outline-none">
              {[10, 20, 30, 50, 100].map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </div>
        </div>
      </div>
    </div>
  );
}


