import React, { useMemo, useState } from "react";
import { FiArrowLeft, FiSearch } from "react-icons/fi";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getInventory,
  getWarehouse,
  getZonesByWarehouse,
  updateInventoryQuantity,
} from "../../api/warehouse";
import ProductTableSkeleton from "./components/ProductTableSkeleton";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { setSelectedZoneId } from "../../store/appSlice";
import { Minus, Plus } from "lucide-react";

export default function InventoryList() {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(30);
  const [searchTerm, setSearchTerm] = useState("");
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const selectedWarehouseId = useSelector((s) => s.app.selectedWarehouseId);
  const selectedZoneId = useSelector((s) => s.app.selectedZoneId);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["inventory", page, limit, searchTerm],
    queryFn: () => getInventory({ page, limit, search: searchTerm }),
    keepPreviousData: true,
    staleTime: 60 * 1000,
  });

  const items = useMemo(() => {
    const list = Array.isArray(data?.inventry) ? data.inventry : [];
    const mapped = list.map((row) => ({
      id: row._id,
      quantity: row.quantity,
      updatedAt: row.updatedAt,
      productTitle: row.productData?.pro_title,
      locationCode: row.locationData?.code,
    }));
    return mapped;
  }, [data]);

  const groupedByLocation = useMemo(() => {
    const bucket = new Map();
    for (const r of items) {
      const code = r.locationCode || "Unknown";
      if (!bucket.has(code)) bucket.set(code, []);
      bucket.get(code).push(r);
    }
    return Array.from(bucket.entries()).map(([locationCode, rows]) => ({
      locationCode,
      rows,
    }));
  }, [items]);

  const updateQty = useMutation({
    mutationFn: ({ id, quantity }) => updateInventoryQuantity(id, quantity),
    onMutate: async ({ id, quantity }) => {
      await queryClient.cancelQueries({
        queryKey: ["inventory", page, limit, searchTerm],
      });
      const previous = queryClient.getQueryData([
        "inventory",
        page,
        limit,
        searchTerm,
      ]);
      queryClient.setQueryData(
        ["inventory", page, limit, searchTerm],
        (old) => {
          if (!old || !Array.isArray(old.inventry)) return old;
          return {
            ...old,
            inventry: old.inventry.map((it) =>
              it._id === id ? { ...it, quantity } : it
            ),
          };
        }
      );
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) {
        queryClient.setQueryData(
          ["inventory", page, limit, searchTerm],
          ctx.previous
        );
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: ["inventory", page, limit, searchTerm],
      });
    },
  });

  const total = data?.totalInventry || 0;
  const totalPages = Math.max(1, Math.ceil(total / limit));

  const { data: whDetail } = useQuery({
    queryKey: ["warehouse", selectedWarehouseId],
    queryFn: () =>
      selectedWarehouseId ? getWarehouse(selectedWarehouseId) : null,
    enabled: !!selectedWarehouseId,
    staleTime: 5 * 60 * 1000,
  });
  const warehouseName = whDetail?.warehouse?.name || whDetail?.name || "";

  const { data: zonesRes } = useQuery({
    queryKey: ["zones", selectedWarehouseId],
    queryFn: () =>
      selectedWarehouseId ? getZonesByWarehouse(selectedWarehouseId) : null,
    enabled: !!selectedWarehouseId,
    staleTime: 60 * 1000,
  });
  const zoneName = useMemo(() => {
    const list = Array.isArray(zonesRes?.zones) ? zonesRes.zones : [];
    const match = list.find((z) => (z.id ?? z._id) === selectedZoneId);
    return match?.name || "";
  }, [zonesRes, selectedZoneId]);

  return (
    <>
      <nav className="text-sm text-gray-600 flex items-center space-x-2 py-4">
        <button
          onClick={() => navigate("/inventory/warehouses")}
          className="flex items-center space-x-1 hover:underline"
        >
          <FiArrowLeft /> <span>Warehouses</span>
        </button>
        <span>/</span>
        {warehouseName && (
          <>
            <span
              onClick={() => navigate("/inventory/warehouses")}
              className="cursor-pointer hover:underline"
            >
              {warehouseName}
            </span>
            <span>/</span>
          </>
        )}
        {zoneName && (
          <>
            <span
              onClick={() => {
                if (selectedZoneId) dispatch(setSelectedZoneId(selectedZoneId));
                navigate("/inventory/zones");
              }}
              className="cursor-pointer hover:underline"
            >
              {zoneName}
            </span>
            <span>/</span>
          </>
        )}
        <span className="font-medium">Inventory</span>
      </nav>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-xl border border-zinc-200 bg-white p-6">
        <div>
          <h1 className="text-2xl font-semibold">Inventory by location</h1>
          <p className="mt-1 text-sm text-zinc-600">
            View and manage stock items.
          </p>
        </div>

        <div className="relative w-full sm:w-80">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search product or location…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-3 py-2 border rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500 outline-none duration-300 ease-in-out"
          />
        </div>
      </div>
      <div className="max-w-7xl mx-auto py-6 space-y-6">
        {/* Grouped by location code */}
        {isLoading ? (
          <div className="overflow-auto rounded-lg border">
            <div className="min-w-full divide-y divide-gray-200">
              <ProductTableSkeleton rows={8} columns={2} />
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {groupedByLocation.map(({ locationCode, rows }) => (
              <div
                key={locationCode}
                className="overflow-hidden rounded-lg border"
              >
                <p className="bg-white border-b border-gray-200 px-4 py-2 font-bold text-xl uppercase tracking-wide">
                  {locationCode}
                </p>
                <div>
                  {rows.map((r, idx) => (
                    <div
                      key={r.id}
                      className={`flex items-center justify-between px-4 py-1.5 hover:bg-gray-50 bg-white ${
                        idx !== 0 ? "border-t" : ""
                      }`}
                    >
                      <p
                        title={r?.productTitle}
                        className="text-sm font-medium line-clamp-2 leading-relaxed"
                      >
                        {r?.productTitle}
                      </p>
                        <div className="flex items-center rounded-lg overflow-hidden border border-gray-200 shadow-sm bg-gray-50 h-9">
                          <button
                            disabled={Number(r.quantity) <= 0}
                            onClick={() => {
                              const q = Math.max(0, Number(r.quantity) - 1);
                              updateQty.mutate({ id: r.id, quantity: q });
                            }}
                            className={`px-3 h-full flex items-center justify-center text-sm duration-300 ease-in-out transition-colors ${
                              Number(r.quantity) <= 0
                                ? "text-gray-300 bg-gray-50 cursor-not-allowed"
                                : "text-red-400 bg-red-100 hover:bg-red-800 hover:text-white"
                            }`}
                            title="Decrease"
                            aria-label={`Decrease quantity for ${r.productTitle}`}
                          >
                            <Minus className="w-4 h-4" />
                          </button>
                          <input
                            value={r.quantity}
                            onChange={(e) => {
                              const val = e.target.value.replace(/[^0-9]/g, "");
                              const q = Math.max(
                                0,
                                val === "" ? 0 : Number(val)
                              );
                              updateQty.mutate({ id: r.id, quantity: q });
                            }}
                            className="w-14 text-center px-3 py-2 text-sm bg-white border-l border-r outline-none focus:ring-0"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            title="Enter quantity"
                            aria-label={`Quantity for ${r.productTitle}`}
                            readOnly
                          />
                          <button
                            onClick={() => {
                              const q = Number(r.quantity) + 1;
                              updateQty.mutate({ id: r.id, quantity: q });
                            }}
                            className="px-3 h-full flex items-center justify-center text-sm duration-300 ease-in-out transition-colors bg-green-100 text-green-600 hover:bg-green-900 hover:text-white"
                            title="Increase"
                            aria-label={`Increase quantity for ${r.productTitle}`}
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>
                    </div>
                  ))}
                  {rows.length === 0 && (
                    <div className="px-4 py-6 text-center text-gray-500">
                      No inventory found.
                    </div>
                  )}
                </div>
              </div>
            ))}
            {groupedByLocation.length === 0 && (
              <div className="overflow-hidden rounded-lg border">
                <div className="px-4 py-6 text-center text-gray-500">
                  No inventory found.
                </div>
              </div>
            )}
          </div>
        )}

        <div className="flex items-center justify-between mt-4">
          <div className="text-sm text-gray-600">
            Page {page} of {totalPages} • Total {total}
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="border rounded px-2 py-1 text-sm disabled:opacity-50"
            >
              ‹ Prev
            </button>
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
                  <span key={`e-${idx}`} className="px-2 text-sm text-gray-500">
                    …
                  </span>
                ) : (
                  <button
                    key={n}
                    onClick={() => setPage(n)}
                    className={`border rounded px-3 py-1 text-sm ${
                      n === page ? "bg-blue-600 text-white border-blue-600" : ""
                    }`}
                  >
                    {n}
                  </button>
                )
              );
            })()}
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="border rounded px-2 py-1 text-sm disabled:opacity-50"
            >
              Next ›
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
