import React, { useEffect, useMemo, useState, useRef } from "react";
import { FiSearch } from "react-icons/fi";
import { Minus, Plus } from "lucide-react";
import {
  updateInventoryQuantity,
  getProducts,
  createInventory,
} from "../../api/warehouse";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Swal from "sweetalert2";

export default function InventoryDisplay({ items, totalCount, isLoading }) {
  const [search, setSearch] = useState("");
  const [localItems, setLocalItems] = useState(
    Array.isArray(items) ? items : []
  );
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [activeLocationCode, setActiveLocationCode] = useState("");
  const [form, setForm] = useState({
    productId: "",
    locationId: "",
    quantity: "",
    productSearch: "",
    showProductDropdown: false,
  });
  const queryClient = useQueryClient();
  const dropdownRef = useRef(null);

  useEffect(() => {
    setLocalItems(Array.isArray(items) ? items : []);
  }, [items]);

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setForm((prev) => ({ ...prev, showProductDropdown: false }));
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const filtered = useMemo(() => {
    if (!search.trim()) return localItems;
    const t = search.toLowerCase();
    return localItems.filter(
      (it) =>
        (it?.productData?.pro_title || "").toLowerCase().includes(t) ||
        (it?.locationData?.code || "").toLowerCase().includes(t)
    );
  }, [localItems, search]);

  const groups = useMemo(() => {
    const map = new Map();
    for (const it of filtered) {
      const code = it?.locationData?.code || "Unknown";
      if (!map.has(code)) map.set(code, []);
      map.get(code).push(it);
    }
    return Array.from(map.entries()).map(([locationCode, rows]) => ({
      locationCode,
      rows,
    }));
  }, [filtered]);

  const applyLocalQty = (id, quantity) => {
    setLocalItems((prev) =>
      prev.map((it) => (it._id === id ? { ...it, quantity } : it))
    );
  };

  const handleUpdateQty = async (id, nextQty) => {
    const q = Math.max(0, Number(nextQty) || 0);
    applyLocalQty(id, q);
    try {
      await updateInventoryQuantity(id, q);
    } catch (_e) {
      // Optional: revert? For now keep optimistic UI
    }
  };

  const { data: productsData } = useQuery({
    queryKey: ["products", 1, 50, ""],
    queryFn: () => getProducts({ page: 1, limit: 50, search: "" }),
    staleTime: 5 * 60 * 1000,
  });

  const createInv = useMutation({
    mutationFn: (body) => createInventory(body),
    onSuccess: (data, variables) => {
      setIsCreateOpen(false);
      setForm({
        productId: "",
        locationId: "",
        quantity: "",
        productSearch: "",
        showProductDropdown: false,
      });

      // Add the new product to local state immediately
      const newProduct = {
        _id: data?.inventory?._id || `temp-${Date.now()}`,
        quantity: Number(variables.quantity),
        productData: {
          pro_title:
            productsData?.products?.find((p) => p._id === variables.productId)
              ?.title ||
            productsData?.products?.find((p) => p._id === variables.productId)
              ?.pro_title ||
            productsData?.products?.find((p) => p._id === variables.productId)
              ?.name ||
            productsData?.products?.find((p) => p._id === variables.productId)
              ?.sku ||
            "New Product",
        },
        locationData: {
          code: activeLocationCode,
          _id: variables.locationId,
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      setLocalItems((prev) => [...prev, newProduct]);

      Swal.fire({
        icon: "success",
        title: "Products Added Successfully",
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

      // Refetch the current inventory data immediately
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
      // Also refresh the scan results if they exist
      if (items && items.length > 0) {
        // Trigger a refetch by updating the query key
        queryClient.invalidateQueries({ queryKey: ["scan-results"] });
      }
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="bg-white rounded-xl border p-4 animate-pulse">
            <div className="h-4 bg-slate-200 rounded w-1/3 mb-3" />
            <div className="h-10 bg-slate-200 rounded" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-xl border border-zinc-200 bg-white p-4">
        <div>
          <h2 className="text-lg font-semibold">Inventory</h2>
          <p className="mt-0.5 text-sm text-zinc-600">
            {totalCount
              ? `${totalCount} total items`
              : `${localItems.length} items`}
          </p>
        </div>
        <div className="relative w-full sm:w-80">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search product or location…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-3 py-2 border rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500 outline-none duration-300 ease-in-out"
          />
        </div>
      </div>

      <div className="space-y-6">
        {groups.map(({ locationCode, rows }) => (
          <div key={locationCode} className="overflow-hidden rounded-lg border">
            <div className="flex items-center justify-between px-4 py-2 bg-white border-b border-gray-200 ">
              <p className="font-bold text-xl uppercase tracking-wide">
                {locationCode}
              </p>
              <button
                onClick={() => {
                  setActiveLocationCode(locationCode);
                  // Find the location ID from the current items data
                  const currentLocation = localItems.find(
                    (item) => item.locationData?.code === locationCode
                  );
                  if (currentLocation?.locationData?._id) {
                    setForm((prev) => ({
                      ...prev,
                      locationId: currentLocation.locationData._id,
                      productSearch: "",
                      showProductDropdown: false,
                    }));
                  }
                  setIsCreateOpen(true);
                }}
                className="flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-2 py-1.5 rounded-xl font-medium transition-all duration-200 transform shadow-lg hover:shadow-xl whitespace-nowrap"
              >
                <Plus className="h-4 w-4" />
                Add Product
              </button>
            </div>
            <div>
              {rows.map((r, idx) => (
                <div
                  key={r._id}
                  className={`flex items-center justify-between px-4 py-1.5 hover:bg-gray-50 bg-white ${
                    idx !== 0 ? "border-t" : ""
                  }`}
                >
                  <p
                    title={r?.productData?.pro_title}
                    className="text-sm font-medium line-clamp-2 leading-relaxed"
                  >
                    {r?.productData?.pro_title}
                  </p>
                  <div className="flex items-center rounded-lg overflow-hidden border border-gray-200 shadow-sm bg-gray-50 h-9">
                    <button
                      disabled={Number(r.quantity) <= 0}
                      onClick={() =>
                        handleUpdateQty(
                          r._id,
                          Math.max(0, Number(r.quantity) - 1)
                        )
                      }
                      className={`px-3 h-full flex items-center justify-center text-sm duration-300 ease-in-out transition-colors ${
                        Number(r.quantity) <= 0
                          ? "text-gray-300 bg-gray-50 cursor-not-allowed"
                          : "text-red-400 bg-red-100 hover:bg-red-800 hover:text-white"
                      }`}
                      title="Decrease"
                      aria-label={`Decrease quantity for ${r?.productData?.pro_title}`}
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <input
                      value={r.quantity}
                      onChange={(e) => {
                        const val = e.target.value.replace(/[^0-9]/g, "");
                        const q = Math.max(0, val === "" ? 0 : Number(val));
                        handleUpdateQty(r._id, q);
                      }}
                      className="w-14 text-center px-3 py-2 text-sm bg-white border-l border-r outline-none focus:ring-0"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      title="Enter quantity"
                      aria-label={`Quantity for ${r?.productData?.pro_title}`}
                      readOnly
                    />
                    <button
                      onClick={() =>
                        handleUpdateQty(r._id, Number(r.quantity) + 1)
                      }
                      className="px-3 h-full flex items-center justify-center text-sm duration-300 ease-in-out transition-colors bg-green-100 text-green-600 hover:bg-green-900 hover:text-white"
                      title="Increase"
                      aria-label={`Increase quantity for ${r?.productData?.pro_title}`}
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
        {groups.length === 0 && (
          <div className="overflow-hidden rounded-lg border">
            <div className="px-4 py-6 text-center text-gray-500">
              No inventory found.
            </div>
          </div>
        )}
      </div>

      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Create Inventory</h3>
              <button
                onClick={() => setIsCreateOpen(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!form.productId || !form.locationId || !form.quantity)
                  return;
                createInv.mutate({
                  productId: form.productId,
                  locationId: form.locationId,
                  quantity: String(form.quantity),
                });
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Location
                </label>
                <div className="w-full rounded-md border px-3 py-2 text-sm bg-gray-50 text-gray-600">
                  {activeLocationCode}
                </div>
              </div>

              <div className="relative" ref={dropdownRef}>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Product
                </label>
                <input
                  type="text"
                  placeholder="Search products..."
                  value={form.productSearch}
                  onChange={(e) => {
                    setForm((prev) => ({
                      ...prev,
                      productSearch: e.target.value,
                      showProductDropdown: true,
                      productId: "",
                    }));
                  }}
                  onFocus={() =>
                    setForm((prev) => ({ ...prev, showProductDropdown: true }))
                  }
                  className="w-full rounded-md border px-3 py-2 text-sm"
                  required
                />
                {form.showProductDropdown && (
                  <div className="absolute z-10 w-full mt-1 bg-white border rounded-md shadow-lg max-h-60 overflow-y-auto">
                    {Array.isArray(productsData?.products) ? (
                      productsData.products
                        .filter((p) =>
                          (p.title || p.pro_title || p.name || p.sku || "")
                            .toLowerCase()
                            .includes((form.productSearch || "").toLowerCase())
                        )
                        .map((p) => (
                          <div
                            key={p._id}
                            onClick={() => {
                              setForm((prev) => ({
                                ...prev,
                                productId: p._id,
                                productSearch:
                                  p.title || p.pro_title || p.name || p.sku,
                                showProductDropdown: false,
                              }));
                            }}
                            className="px-3 py-2 hover:bg-gray-100 cursor-pointer text-sm"
                          >
                            {p.title || p.pro_title || p.name || p.sku}
                          </div>
                        ))
                    ) : (
                      <div className="px-3 py-2 text-gray-500 text-sm">
                        Loading products...
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Quantity
                </label>
                <input
                  type="number"
                  min={0}
                  value={form.quantity}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      quantity: e.target.value.replace(/[^0-9]/g, ""),
                    }))
                  }
                  className="w-full rounded-md border px-3 py-2 text-sm"
                  placeholder="e.g., 5"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-4 py-2 text-sm rounded-lg border"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createInv.isLoading}
                  className="px-4 py-2 text-sm rounded-lg bg-blue-600 text-white disabled:opacity-60"
                >
                  {createInv.isLoading ? "Saving…" : "Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
