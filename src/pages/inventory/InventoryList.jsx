import React, { useEffect, useMemo, useRef, useState } from "react";
import { FiArrowLeft, FiSearch } from "react-icons/fi";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createInventory,
  getInventory,
  getProducts,
  getWarehouse,
  getLocations,
} from "../../api/warehouse";
import ProductTableSkeleton from "./components/ProductTableSkeleton";
import InventoryTableSkeleton from "./components/InventoryTableSkeleton";
import EmptyInventory from "./components/EmptyInventory";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { setSelectedZoneId } from "../../store/appSlice";
import { Minus, Plus } from "lucide-react";
import Swal from "sweetalert2";

const productTypes = [
  { label: "Consoles", code: "CON" },
  { label: "Handhelds", code: "HAN" },
  { label: "Accessories", code: "ACC" },
  { label: "Games", code: "GAM" },
];

export default function InventoryList() {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(30);
  const [searchTerm, setSearchTerm] = useState("");

  const [isNewLocationModalOpen, setIsNewLocationModalOpen] = useState(false);
  const [newLocationForm, setNewLocationForm] = useState({
    productId: "",
    locationId: "",
    quantity: "",
    productSearch: "",
    showProductDropdown: false,
    showLocationDropdown: false,
    locationSearch: "",
    type: "", // Add this line
    typeCode: "", // Add this line
  });

  const newLocationDropdownRef = useRef(null);
  const newProductDropdownRef = useRef(null);
  const dropdownRef = useRef(null);

  const navigate = useNavigate();
  const dispatch = useDispatch();
  const warehouseId = useSelector((s) => s.app.selectedWarehouseId);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["inventory", page, limit, searchTerm, warehouseId],
    queryFn: () =>
      getInventory({
        page,
        limit,
        search: searchTerm,
        warehouseId,
      }),
    keepPreviousData: true,
    staleTime: 60 * 1000,
    enabled: !!warehouseId,
  });

  const items = useMemo(() => {
    const list = Array.isArray(data?.inventry) ? data.inventry : [];

    const mapped = list
      .filter((row) => {
        const itemWarehouseId = row.warehouseData?._id;
        return itemWarehouseId === warehouseId;
      })
      .map((row) => ({
        id: row._id,
        quantity: row.quantity,
        updatedAt: row.updatedAt,
        productTitle: row.productData?.pro_title,
        locationCode: row.locationData?.code,
        sku: row.productData?.sku,
        modelCode: row.productData?.model_code,
        name: row.warehouseData?.name,
        country: row.warehouseData?.country,
        warehouseId: row.warehouseData?._id,
      }));

    return mapped;
  }, [data, warehouseId]);

  const groupedByLocation = useMemo(() => {
    const bucket = new Map();
    for (const r of items) {
      const code = r.locationCode || "Unknown";
      if (!bucket.has(code)) bucket.set(code, []);
      bucket.get(code).push(r);
    }
    return Array.from(bucket.entries()).map(([locationCode, rows]) => {
      const country = rows.find((x) => x.country)?.country || "";
      const warehouseName = rows.find((x) => x.name)?.name || "";
      return {
        locationCode,
        rows,
        country,
        warehouseName,
      };
    });
  }, [items]);

  const total = data?.totalInventry || 0;
  const totalPages = Math.max(1, Math.ceil(total / limit));

  const { data: whDetail } = useQuery({
    queryKey: ["warehouse", warehouseId],
    queryFn: () => (warehouseId ? getWarehouse(warehouseId) : null),
    enabled: !!warehouseId,
    staleTime: 5 * 60 * 1000,
    onSuccess: (data) => {
      const warehouseName = data?.warehouse?.name || data?.name || "";
      setSearchTerm(warehouseName);
    },
  });
  const warehouseName = whDetail?.warehouse?.name || whDetail?.name || "";

  const { data: productsData } = useQuery({
    queryKey: ["products", 1, 50, ""],
    queryFn: () => getProducts({ page: 1, limit: 50, search: "" }),
    staleTime: 5 * 60 * 1000,
  });

  const { data: locationsRes } = useQuery({
    queryKey: ["locations", warehouseId],
    enabled: !!warehouseId,
    staleTime: 60 * 1000,
    queryFn: async () => {
      const res = await getLocations();
      const list = Array.isArray(res?.locations)
        ? res.locations
        : Array.isArray(res)
        ? res
        : [];
      return list
        .map((l) => ({
          id: l.id ?? l._id,
          code: l.code,
          type: String(l.type || "").toLowerCase(),
          warehouseId:
            typeof l.warehouse === "string"
              ? l.warehouse
              : l.warehouse?.id ?? l.warehouse?._id ?? null,
          qrcode: l.qrcode || l.qrPath || null,
        }))
        .filter((l) => l.warehouseId === warehouseId);
    },
  });

  const locations = locationsRes || [];

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
    mutationFn: (body) =>
      createInventory({ ...body, warehouseId: warehouseId }),
    onSuccess: (data, variables) => {
      // Close the modal and reset form
      setIsNewLocationModalOpen(false);
      setNewLocationForm({
        productId: "",
        locationId: "",
        quantity: "",
        productSearch: "",
        showProductDropdown: false,
        showLocationDropdown: false,
        locationSearch: "",
      });

      // Get the location and product details
      const location = locations.find((l) => l.id === variables.locationId);
      const product = productsData?.products?.find(
        (p) => p._id === variables.productId
      );

      // Update the cache with the new inventory item
      queryClient.setQueryData(
        ["inventory", page, limit, searchTerm, warehouseId],
        (old) => {
          if (!old) return old;

          const newItem = {
            _id: data?.inventory?._id || `temp-${Date.now()}`,
            quantity: Number(variables.quantity),
            productData: {
              _id: variables.productId,
              pro_title: product?.pro_title || product?.title || product?.name,
              sku: product?.sku || "N/A",
              model_code: product?.model_code || "N/A",
            },
            locationData: {
              _id: variables.locationId,
              code: location?.code || "Unknown",
              type: location?.type || "unknown",
            },
            warehouseData: {
              _id: warehouseId,
              name: warehouseName,
              country: whDetail?.warehouse?.country || whDetail?.country,
            },
          };

          return {
            ...old,
            inventry: [newItem, ...(old.inventry || [])],
            totalInventry: (old.totalInventry || 0) + 1,
          };
        }
      );

      // Show success message
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
        customClass: { popup: "rounded-lg" },
      });
    },
    onError: (error) => {
      Swal.fire({
        icon: "error",
        title: "Error Adding Product",
        text: error.message || "Something went wrong",
        toast: true,
        position: "top-end",
        showConfirmButton: false,
        timer: 3000,
        timerProgressBar: true,
        background: "#ef4444",
        color: "#fff",
        customClass: { popup: "rounded-lg" },
      });
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
                placeholder="Search product, location, or warehouse…"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-3 py-2 border rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500 outline-none duration-300 ease-in-out"
              />
            </div>
            {/* <button
              onClick={() => setIsNewLocationModalOpen(true)}
              className="flex items-center justify-center gap-2 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white px-4 py-2 rounded-xl font-medium transition-all duration-200 transform shadow-lg hover:shadow-xl whitespace-nowrap"
            >
              <Plus className="h-4 w-4" />
              Add to New Location
            </button> */}
          </div>
        </div>
        <div className="max-w-7xl mx-auto py-6">
          <InventoryTableSkeleton />
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
              placeholder="Search product, location, or warehouse…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-3 py-2 border rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500 outline-none duration-300 ease-in-out"
            />
          </div>
          {/* <button
            onClick={() => setIsNewLocationModalOpen(true)}
            className="flex items-center justify-center gap-2 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white px-4 py-2 rounded-xl font-medium transition-all duration-200 transform shadow-lg hover:shadow-xl whitespace-nowrap"
          >
            <Plus className="h-4 w-4" />
            Add to New Location
          </button> */}
        </div>
      </div>
      <div className="max-w-7xl mx-auto py-6">
        {isLoading ? (
          <InventoryTableSkeleton />
        ) : groupedByLocation.length === 0 ? (
          <EmptyInventory onAddNew={() => setIsNewLocationModalOpen(true)} />
        ) : (
          <div className="space-y-6">
            {groupedByLocation.map(({ locationCode, rows, country }) => (
              <div
                key={locationCode}
                className="overflow-hidden rounded-lg border"
              >
                <div className="flex items-center gap-4 px-4 py-2 bg-white border-b border-gray-200 ">
                  <p className="font-bold text-xl uppercase tracking-wide">
                    {locationCode}
                  </p>
                  <p className="text-lg font-semibold uppercase">{country}</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full border border-gray-200 bg-white">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-sm font-semibold text-gray-700 border-b">
                          Product Title
                        </th>
                        <th className="px-4 py-2 text-left whitespace-nowrap text-sm font-semibold text-gray-700 border-b">
                          SKU
                        </th>
                        <th className="px-4 py-2 text-left text-sm font-semibold text-gray-700 border-b">
                          Warehouse
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
                            className="px-4 py-3 text-sm font-medium leading-relaxed border-b min-w-[300px]"
                            title={r?.productTitle}
                          >
                            {r?.productTitle}
                          </td>
                          <td className="px-4 py-3 text-xs whitespace-nowrap font-mono border-b">
                            {r?.sku || "N/A"}
                          </td>
                          <td className="px-4 py-3 text-sm whitespace-nowrap text-gray-500 border-b">
                            {r?.name || ""}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-500 border-b">
                            {r?.quantity}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {rows.length === 0 && (
                    <div className="px-4 py-8 text-center bg-gray-50">
                      <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gray-100 mb-4">
                        <FiPackage className="w-6 h-6 text-gray-400" />
                      </div>
                      <p className="text-gray-500 mb-2">No items in this location</p>
                      <button
                        onClick={() => setIsNewLocationModalOpen(true)}
                        className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                      >
                        Add items →
                      </button>
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

      {/* New Location Modal */}
      {isNewLocationModalOpen && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/40">
          <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-lg max-h-[95vh] overflow-y-auto">
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
                if (
                  !newLocationForm.productId ||
                  !newLocationForm.locationId ||
                  !newLocationForm.quantity ||
                  !newLocationForm.typeCode
                )
                  return;

                createInv.mutate({
                  productId: newLocationForm.productId,
                  locationId: newLocationForm.locationId,
                  quantity: String(newLocationForm.quantity),
                  type: newLocationForm.typeCode,
                });
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
                    {Array.isArray(locations) ? (
                      locations
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
                            key={loc.id}
                            onClick={() => {
                              setNewLocationForm((prev) => ({
                                ...prev,
                                locationId: loc.id, // Changed from loc._id to loc.id
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

              {/* Type Selection - Add this before Product Selection */}
              <div className="relative">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Product Type
                </label>
                <select
                  value={newLocationForm.typeCode}
                  onChange={(e) => {
                    const selectedType = productTypes.find(
                      (t) => t.code === e.target.value
                    );
                    setNewLocationForm((prev) => ({
                      ...prev,
                      type: selectedType?.label || "",
                      typeCode: e.target.value,
                      productId: "", // Reset product selection when type changes
                      productSearch: "", // Reset product search when type changes
                    }));
                  }}
                  className="w-full rounded-md border px-3 py-2 text-sm"
                  required
                >
                  <option value="">Select Type</option>
                  {productTypes.map((type) => (
                    <option key={type.code} value={type.code}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Product Selection - Now filtered by type */}
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
                  disabled={!newLocationForm.typeCode} // Disable if no type selected
                />
                {newLocationForm.showProductDropdown && (
                  <div className="absolute z-10 w-full mt-1 bg-white border rounded-md shadow-lg max-h-60 overflow-y-auto">
                    {Array.isArray(productsData?.products) ? (
                      productsData.products
                        // Filter by type_code and search term
                        .filter(
                          (p) =>
                            p.type_code === newLocationForm.typeCode &&
                            (p.pro_title || p.sku || "")
                              .toLowerCase()
                              .includes(newLocationForm.productSearch.toLowerCase())
                        )
                        .map((p) => (
                          <div
                            key={p._id}
                            onClick={() => {
                              setNewLocationForm((prev) => ({
                                ...prev,
                                productId: p._id,
                                productSearch: p.pro_title || p.sku,
                                showProductDropdown: false,
                              }));
                            }}
                            className="px-3 py-2 hover:bg-gray-100 cursor-pointer text-sm"
                          >
                            {p.pro_title} ({p.sku})
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
