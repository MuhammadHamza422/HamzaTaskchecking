import React, { useEffect, useMemo, useRef, useState } from "react";
import { FiArrowLeft, FiSearch } from "react-icons/fi";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createInventory,
  getInventory,
  getProducts,
  getWarehouse,
  getZonesByWarehouse,
  getLocations,
} from "../../api/warehouse";
import ProductTableSkeleton from "./components/ProductTableSkeleton";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { setSelectedZoneId } from "../../store/appSlice";
import { Minus, Plus } from "lucide-react";
import Swal from "sweetalert2";

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
      sku: row.productData?.sku,
      modelCode: row.productData?.model_code,
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

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [activeLocationCode, setActiveLocationCode] = useState("");
  const [form, setForm] = useState({
    productId: "",
    locationId: "",
    quantity: "",
    productSearch: "",
    showProductDropdown: false,
  });
  const dropdownRef = useRef(null);

  // New state for adding to new location
  const [isNewLocationModalOpen, setIsNewLocationModalOpen] = useState(false);
  const [newLocationForm, setNewLocationForm] = useState({
    productId: "",
    locationId: "",
    quantity: "",
    productSearch: "",
    showProductDropdown: false,
    showLocationDropdown: false,
    locationSearch: "",
  });
  const newLocationDropdownRef = useRef(null);
  const newProductDropdownRef = useRef(null);

  // Fetch products for dropdown
  const { data: productsData } = useQuery({
    queryKey: ["products", 1, 50, ""],
    queryFn: () => getProducts({ page: 1, limit: 50, search: "" }),
    staleTime: 5 * 60 * 1000,
  });

  // Fetch locations for dropdown
  const { data: locationsData } = useQuery({
    queryKey: ["locations"],
    queryFn: () => getLocations(),
    staleTime: 5 * 60 * 1000,
  });

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setForm((prev) => ({ ...prev, showProductDropdown: false }));
      }
      if (
        newLocationDropdownRef.current &&
        !newLocationDropdownRef.current.contains(event.target)
      ) {
        setNewLocationForm((prev) => ({
          ...prev,
          showLocationDropdown: false,
        }));
      }
      if (
        newProductDropdownRef.current &&
        !newProductDropdownRef.current.contains(event.target)
      ) {
        setNewLocationForm((prev) => ({ ...prev, showProductDropdown: false }));
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

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

      // Add the new product to local state immediately for instant UI update
      const newProduct = {
        _id: data?.inventory?._id || `temp-${Date.now()}`,
        quantity: Number(variables.quantity),
        productTitle:
          productsData?.products?.find((p) => p._id === variables.productId)
            ?.title ||
          productsData?.products?.find((p) => p._id === variables.productId)
            ?.pro_title ||
          productsData?.products?.find((p) => p._id === variables.productId)
            ?.name ||
          productsData?.products?.find((p) => p._id === variables.productId)
            ?.sku ||
          productsData?.products?.find((p) => p._id === variables.productId)
            ?.model_code ||
          "New Product",
        locationCode: activeLocationCode,
      };

      // Force a re-render by updating the query data
      queryClient.setQueryData(
        ["inventory", page, limit, searchTerm],
        (old) => {
          if (!old) return old;
          console.log("Updating cache with new product:", newProduct);
          console.log("Old cache data:", old);

          const updatedInventry = [
            ...(old.inventry || []),
            {
              _id: newProduct._id,
              quantity: newProduct.quantity,
              productData: {
                pro_title: newProduct.productTitle,
                sku:
                  productsData?.products?.find(
                    (p) => p._id === variables.productId
                  )?.sku || "N/A",
                model_code:
                  productsData?.products?.find(
                    (p) => p._id === variables.productId
                  )?.model_code || "N/A",
              },
              locationData: {
                code: newProduct.locationCode,
                _id: variables.locationId, // Use the actual locationId from the form
              },
            },
          ];

          console.log("Updated inventry:", updatedInventry);

          return {
            ...old,
            inventry: updatedInventry,
            totalInventry: (old.totalInventry || 0) + 1,
          };
        }
      );

      Swal.fire({
        icon: "success",
        title: "Product Added Successfully",
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

          <div className="flex gap-3">
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
            <button
              onClick={() => setIsNewLocationModalOpen(true)}
              className="flex items-center justify-center gap-2 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white px-4 py-2 rounded-xl font-medium transition-all duration-200 transform shadow-lg hover:shadow-xl whitespace-nowrap"
            >
              <Plus className="h-4 w-4" />
              Add to New Location
            </button>
          </div>
        </div>
        <div className="max-w-7xl mx-auto py-6 space-y-6">
          <div className="overflow-auto rounded-lg border">
            <div className="min-w-full divide-y divide-gray-200">
              <ProductTableSkeleton rows={8} columns={2} />
            </div>
          </div>
        </div>
      </>
    );
  }
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

        <div className="flex gap-3">
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
          <button
            onClick={() => setIsNewLocationModalOpen(true)}
            className="flex items-center justify-center gap-2 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white px-4 py-2 rounded-xl font-medium transition-all duration-200 transform shadow-lg hover:shadow-xl whitespace-nowrap"
          >
            <Plus className="h-4 w-4" />
            Add to New Location
          </button>
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
                <div className="flex items-center justify-between px-4 py-2 bg-white border-b border-gray-200 ">
                  <p className="font-bold text-xl uppercase tracking-wide">
                    {locationCode}
                  </p>
                </div>
                <div>
                  <table className="min-w-full border border-gray-200 bg-white">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-sm font-semibold text-gray-700 border-b">
                          Product Title
                        </th>
                        <th className="px-4 py-2 text-left text-sm font-semibold text-gray-700 border-b">
                          SKU
                        </th>
                        <th className="px-4 py-2 text-left text-sm font-semibold text-gray-700 border-b">
                          Quantity
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((r, idx) => (
                        <tr
                          key={r.id}
                          className={`hover:bg-gray-50 ${
                            idx % 2 !== 0 ? "bg-gray-50/50" : "bg-white"
                          }`}
                        >
                          <td
                            className="px-4 py-3 text-sm font-medium leading-relaxed border-b w-[300px]"
                            title={r?.productTitle}
                          >
                            {r?.productTitle}
                          </td>
                          <td className="px-4 py-3 text-xs font-mono border-b">
                            {r?.sku || "N/A"}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-500 border-b">
                            {r?.quantity}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

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
      </div>
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
                console.log("Form data:", form);
                console.log("Active location code:", activeLocationCode);
                console.log("Form locationId:", form.locationId);
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
                  className="px-4 py-2 text-sm rounded-lg bg-blue-600 text-white"
                >
                  {createInv.isLoading ? "Saving…" : "Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* New Location Modal */}
      {isNewLocationModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">
                Add Product to New Location
              </h3>
              <button
                onClick={() => setIsNewLocationModalOpen(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                console.log("New location form data:", newLocationForm);
                if (
                  !newLocationForm.productId ||
                  !newLocationForm.locationId ||
                  !newLocationForm.quantity
                )
                  return;
                createInv.mutate({
                  productId: newLocationForm.productId,
                  locationId: newLocationForm.locationId,
                  quantity: String(newLocationForm.quantity),
                });
                // Reset form and close modal
                setNewLocationForm({
                  productId: "",
                  locationId: "",
                  quantity: "",
                  productSearch: "",
                  showProductDropdown: false,
                  showLocationDropdown: false,
                  locationSearch: "",
                });
                setIsNewLocationModalOpen(false);
              }}
              className="space-y-4"
            >
              {/* Location Selection */}
              <div className="relative" ref={newLocationDropdownRef}>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Location
                </label>
                <input
                  type="text"
                  placeholder="Search locations..."
                  value={newLocationForm.locationSearch}
                  onChange={(e) => {
                    setNewLocationForm((prev) => ({
                      ...prev,
                      locationSearch: e.target.value,
                      showLocationDropdown: true,
                      locationId: "",
                    }));
                  }}
                  onFocus={() =>
                    setNewLocationForm((prev) => ({
                      ...prev,
                      showLocationDropdown: true,
                    }))
                  }
                  className="w-full rounded-md border px-3 py-2 text-sm"
                  required
                />
                {newLocationForm.showLocationDropdown && (
                  <div className="absolute z-10 w-full mt-1 bg-white border rounded-md shadow-lg max-h-60 overflow-y-auto">
                    {Array.isArray(locationsData?.locations) ? (
                      locationsData.locations
                        .filter((loc) =>
                          (loc.code || "")
                            .toLowerCase()
                            .includes(
                              (
                                newLocationForm.locationSearch || ""
                              ).toLowerCase()
                            )
                        )
                        .map((loc) => (
                          <div
                            key={loc._id}
                            onClick={() => {
                              setNewLocationForm((prev) => ({
                                ...prev,
                                locationId: loc._id,
                                locationSearch: loc.code,
                                showLocationDropdown: false,
                              }));
                            }}
                            className="px-3 py-2 hover:bg-gray-100 cursor-pointer text-sm"
                          >
                            {loc.code} ({loc.type})
                          </div>
                        ))
                    ) : (
                      <div className="px-3 py-2 text-gray-500 text-sm">
                        Loading locations...
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Product Selection */}
              <div className="relative" ref={newProductDropdownRef}>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Product
                </label>
                <input
                  type="text"
                  placeholder="Search products..."
                  value={newLocationForm.productSearch}
                  onChange={(e) => {
                    setNewLocationForm((prev) => ({
                      ...prev,
                      productSearch: e.target.value,
                      showProductDropdown: true,
                      productId: "",
                    }));
                  }}
                  onFocus={() =>
                    setNewLocationForm((prev) => ({
                      ...prev,
                      showProductDropdown: true,
                    }))
                  }
                  className="w-full rounded-md border px-3 py-2 text-sm"
                  required
                />
                {newLocationForm.showProductDropdown && (
                  <div className="absolute z-10 w-full mt-1 bg-white border rounded-md shadow-lg max-h-60 overflow-y-auto">
                    {Array.isArray(productsData?.products) ? (
                      productsData.products
                        .filter((p) =>
                          (p.title || p.pro_title || p.name || p.sku || "")
                            .toLowerCase()
                            .includes(
                              (
                                newLocationForm.productSearch || ""
                              ).toLowerCase()
                            )
                        )
                        .map((p) => (
                          <div
                            key={p._id}
                            onClick={() => {
                              setNewLocationForm((prev) => ({
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

              {/* Quantity */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Quantity
                </label>
                <input
                  type="number"
                  min={0}
                  value={newLocationForm.quantity}
                  onChange={(e) =>
                    setNewLocationForm((f) => ({
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
                  onClick={() => setIsNewLocationModalOpen(false)}
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
    </>
  );
}
