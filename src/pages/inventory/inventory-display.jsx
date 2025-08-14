import React, { useEffect, useMemo, useState, useRef } from "react";
import { FiSearch } from "react-icons/fi";
import { Minus, Package, Plus } from "lucide-react";
import {
  updateInventoryQuantity,
  getProducts,
  createInventory,
} from "../../api/warehouse";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Swal from "sweetalert2";

const productTypes = [
  { label: "Consoles", code: "CON" },
  { label: "Handhelds", code: "HAN" },
  { label: "Accessories", code: "ACC" },
  { label: "Games", code: "GAM" },
];

export default function InventoryDisplay({
  items,
  totalCount,
  isLoading,
  scannedData,
}) {
  const [search, setSearch] = useState("");
  const [localItems, setLocalItems] = useState(
    Array.isArray(items) ? items : []
  );
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [activeLocationCode, setActiveLocationCode] = useState("");
  const [form, setForm] = useState({
    productId: "",
    locationId: scannedData || "", // Initialize with scannedData
    quantity: "",
    productSearch: "",
    showProductDropdown: false,
    type: "",
    typeCode: "",
  });
  const [pendingQtyChange, setPendingQtyChange] = useState(null);
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

  // Add this validation function near the top of your component
  const validateQuantityChange = (currentQty, newQty) => {
    // Don't allow negative quantities
    if (newQty < 0) {
      Swal.fire({
        icon: "error",
        title: "Invalid Quantity",
        text: "Quantity cannot be negative",
        toast: true,
        position: "top-end",
        showConfirmButton: false,
        timer: 3000,
        background: "#ef4444",
        color: "#fff",
      });
      return false;
    }

    // Optional: Add maximum quantity limit
    if (newQty > 9999) {
      Swal.fire({
        icon: "error",
        title: "Invalid Quantity",
        text: "Quantity cannot exceed 9999",
        toast: true,
        position: "top-end",
        showConfirmButton: false,
        timer: 3000,
        background: "#ef4444",
        color: "#fff",
      });
      return false;
    }

    return true;
  };

  // Update the handleUpdateQty function
  const handleUpdateQty = async (id, nextQty) => {
    const currentItem = localItems.find((item) => item._id === id);
    if (!currentItem) return;

    const currentQty = Number(currentItem.quantity) || 0;
    const newQty = Math.max(0, Number(nextQty) || 0);

    // Validate the quantity change
    if (!validateQuantityChange(currentQty, newQty)) {
      setPendingQtyChange(null);
      return;
    }

    try {
      // Show confirmation for large changes
      if (Math.abs(newQty - currentQty) > 10) {
        const result = await Swal.fire({
          icon: "warning",
          title: "Confirm Quantity Change",
          text: `Are you sure you want to ${
            newQty > currentQty ? "increase" : "decrease"
          } the quantity by ${Math.abs(newQty - currentQty)}?`,
          showCancelButton: true,
          confirmButtonText: "Yes, update it",
          cancelButtonText: "Cancel",
          confirmButtonColor: "#3b82f6",
        });

        if (!result.isConfirmed) {
          setPendingQtyChange(null);
          return;
        }
      }

      // Apply change locally first (optimistic update)
      applyLocalQty(id, newQty);

      // Update in backend
      await updateInventoryQuantity(id, newQty);

      // Clear pending change
      setPendingQtyChange(null);

      // Show success message
      Swal.fire({
        icon: "success",
        title: "Quantity Updated",
        toast: true,
        position: "top-end",
        showConfirmButton: false,
        timer: 2000,
        background: "#10b981",
        color: "#fff",
      });
    } catch (error) {
      // Revert local change on error
      applyLocalQty(id, currentQty);
      setPendingQtyChange(null);

      // Show error message
      Swal.fire({
        icon: "error",
        title: "Update Failed",
        text: error.message || "Failed to update quantity",
        toast: true,
        position: "top-end",
        showConfirmButton: false,
        timer: 3000,
        background: "#ef4444",
        color: "#fff",
      });
    }
  };

  const { data: productsData } = useQuery({
    queryKey: ["products", 1, 50, ""],
    queryFn: () => getProducts({ page: 1, limit: 50, search: "" }),
    staleTime: 5 * 60 * 1000,
  });

  const createInv = useMutation({
    mutationFn: (body) => {
      if (!body.productId || !body.locationId || !body.quantity) {
        throw new Error("Missing required fields");
      }
      return createInventory({
        productId: body.productId,
        locationId: body.locationId,
        quantity: String(body.quantity),
      });
    },
    onSuccess: (data, variables) => {
      // Close the modal and reset form
      setIsCreateOpen(false);
      setForm({
        productId: "",
        locationId: "",
        quantity: "",
        productSearch: "",
        showProductDropdown: false,
        type: "",
        typeCode: "",
      });

      // Find the product details from the productsData
      const addedProduct = productsData?.products?.find(
        (p) => p._id === variables.productId
      );

      // Update localItems state with the new inventory
      setLocalItems((prev) => [
        ...prev,
        {
          _id: data._id || Date.now(), // Use the returned ID or temporary ID
          quantity: variables.quantity,
          productData: addedProduct,
          locationData: {
            code: activeLocationCode || scannedData,
            _id: variables.locationId,
          },
        },
      ]);

      // Show success message
      Swal.fire({
        icon: "success",
        title: "Products Added Successfully",
        toast: true,
        position: "top-end",
        showConfirmButton: false,
        timer: 3000,
        background: "#10b981",
        color: "#fff",
      });

      // Refresh queries in background
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
    },
    onError: (error) => {
      Swal.fire({
        icon: "error",
        title: "Error",
        text: error.message || "Failed to create inventory",
        toast: true,
        position: "top-end",
        showConfirmButton: false,
        timer: 3000,
        background: "#ef4444",
        color: "#fff",
      });
    },
  });

  useEffect(() => {
    if (scannedData) {
      setForm((prev) => ({
        ...prev,
        locationId: scannedData,
      }));
    }
  }, [scannedData]);

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
            <div className="flex items-center justify-between px-4 py-2 bg-white border-b border-gray-200">
              <p className="font-bold text-xl uppercase tracking-wide">
                {locationCode}
              </p>
              <button
                onClick={() => {
                  setActiveLocationCode(locationCode);
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
                      Quantity
                    </th>
                    <th className="px-4 py-2 text-left text-sm font-semibold text-gray-700 border-b">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, idx) => (
                    <tr
                      key={r._id}
                      className={`hover:bg-gray-50 ${
                        idx % 2 !== 0 ? "bg-gray-50/50" : "bg-white"
                      }`}
                    >
                      <td
                        className="px-4 py-3 text-sm font-medium leading-relaxed border-b min-w-[300px]"
                        title={r?.productData?.pro_title}
                      >
                        {r?.productData?.pro_title}
                      </td>
                      <td className="px-4 py-3 text-xs whitespace-nowrap font-mono border-b">
                        {r?.productData.sku || "N/A"}
                      </td>

                      <td className="px-4 py-3 text-sm text-gray-500 border-b">
                        {r?.quantity}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center space-x-2">
                          {pendingQtyChange?.id === r._id ? (
                            <div className="flex items-center space-x-2">
                              <div className="text-sm font-medium">
                                New qty: {pendingQtyChange.newQty}
                              </div>
                              <button
                                onClick={() => {
                                  handleUpdateQty(
                                    r._id,
                                    pendingQtyChange.newQty
                                  );
                                  setPendingQtyChange(null);
                                }}
                                className="px-2 py-1 text-xs bg-green-500 text-white rounded hover:bg-green-600"
                              >
                                Validate
                              </button>
                              <button
                                onClick={() => setPendingQtyChange(null)}
                                className="px-2 py-1 text-xs bg-gray-500 text-white rounded hover:bg-gray-600"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center rounded-lg overflow-hidden border border-gray-200 shadow-sm bg-gray-50 h-9">
                              <button
                                disabled={Number(r.quantity) <= 0}
                                onClick={() => {
                                  const newQty = Math.max(
                                    0,
                                    Number(r.quantity) - 1
                                  );
                                  setPendingQtyChange({
                                    id: r._id,
                                    currentQty: Number(r.quantity),
                                    newQty,
                                    type: "decrease",
                                  });
                                }}
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
                                readOnly
                                className="w-14 text-center px-3 py-2 text-sm bg-white border-l border-r outline-none focus:ring-0"
                                inputMode="numeric"
                                pattern="[0-9]*"
                                title="Current quantity"
                                aria-label={`Quantity for ${r?.productData?.pro_title}`}
                              />
                              <button
                                onClick={() => {
                                  const newQty = Number(r.quantity) + 1;
                                  setPendingQtyChange({
                                    id: r._id,
                                    currentQty: Number(r.quantity),
                                    newQty,
                                    type: "increase",
                                  });
                                }}
                                className="px-3 h-full flex items-center justify-center text-sm duration-300 ease-in-out transition-colors bg-green-100 text-green-600 hover:bg-green-900 hover:text-white"
                                title="Increase"
                                aria-label={`Increase quantity for ${r?.productData?.pro_title}`}
                              >
                                <Plus className="w-4 h-4" />
                              </button>
                            </div>
                          )}
                        </div>
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
        {groups.length === 0 && (
          <div className="overflow-hidden rounded-lg border">
            <div className="flex items-center justify-between px-4 py-2 bg-white border-b border-gray-200">
              <p className="font-bold text-xl uppercase tracking-wide">
                {scannedData}
              </p>

              <button
                onClick={() => {
                  setActiveLocationCode(scannedData);
                  // Set the locationId in the form state
                  setForm((prev) => ({
                    ...prev,
                    locationId:
                      localItems.find(
                        (item) => item.locationData?.code === scannedData
                      )?.locationData?._id || scannedData,
                  }));
                  setIsCreateOpen(true);
                }}
                className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-xl font-medium transition-all duration-200 transform shadow-lg hover:shadow-xl"
              >
                <Plus className="h-4 w-4" />
                Add first Product
              </button>
            </div>
            <div className="px-4 py-6 text-center bg-white">
              <div className="max-w-sm mx-auto">
                <div className="mb-4">
                  <Package className="h-12 w-12 text-gray-400 mx-auto" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-1">
                  No inventory found
                </h3>
                <p className="text-sm text-gray-500 mb-4">
                  {scannedData
                    ? `Location ${scannedData} has no products assigned to it.`
                    : "This location currently has no products assigned to it."}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {isCreateOpen && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/40">
          <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-lg max-h-[95vh] overflow-y-auto">
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
                if (!form.productId || !form.quantity) return;

                // Ensure we're using the location ID instead of the code
                const locationItem = localItems.find(
                  (item) =>
                    item.locationData?.code ===
                    (activeLocationCode || scannedData)
                );

                if (!locationItem?.locationData?._id) {
                  Swal.fire({
                    icon: "error",
                    title: "Error",
                    text: "Invalid location ID. Please try again.",
                    toast: true,
                    position: "top-end",
                    showConfirmButton: false,
                    timer: 3000,
                    background: "#ef4444",
                    color: "#fff",
                  });
                  return;
                }

                createInv.mutate({
                  productId: form.productId,
                  locationId: locationItem.locationData._id, // Use the actual MongoDB ObjectId
                  quantity: String(form.quantity),
                  type: form.typeCode,
                });
              }}
              className="space-y-4"
            >
              {/* Location */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Location
                </label>
                <div className="w-full rounded-md border px-3 py-2 text-sm bg-gray-50 text-gray-600">
                  {activeLocationCode}
                </div>
              </div>

              {/* Type Selection - Add this before Product Selection */}
              <div className="relative">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Product Type
                </label>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {productTypes.map((type) => (
                    <button
                      key={type.code}
                      type="button"
                      onClick={() => {
                        // If clicking the already selected type, deselect it
                        if (form.typeCode === type.code) {
                          setForm((prev) => ({
                            ...prev,
                            type: "",
                            typeCode: "",
                            productId: "",
                            productSearch: "",
                            showProductDropdown: false,
                          }));
                        } else {
                          // Select the new type
                          setForm((prev) => ({
                            ...prev,
                            type: type.label,
                            typeCode: type.code,
                            productId: "",
                            productSearch: "",
                            showProductDropdown: false,
                          }));
                        }
                      }}
                      className={`
          p-2 rounded-lg border text-sm font-medium transition-all duration-200
          ${
            form.typeCode === type.code
              ? "border-blue-500 bg-blue-50 text-blue-700 shadow-sm"
              : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
          }
        `}
                    >
                      {type.label}
                    </button>
                  ))}
                </div>
              </div>
              {/* Product Selection - Only show if type is selected */}
              {form.typeCode ? (
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Product
                  </label>
                  <div className="relative" ref={dropdownRef}>
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
                        setForm((prev) => ({
                          ...prev,
                          showProductDropdown: true,
                        }))
                      }
                      className="w-full rounded-md border px-3 py-2 text-sm"
                      required
                    />
                    {form.showProductDropdown && (
                      <div className="absolute z-10 w-full mt-1 bg-white border rounded-md shadow-lg max-h-60 overflow-y-auto">
                        {Array.isArray(productsData?.products) ? (
                          productsData.products
                            .filter(
                              (p) =>
                                p.type_code === form.typeCode &&
                                (p.pro_title || p.sku || "")
                                  .toLowerCase()
                                  .includes(form.productSearch.toLowerCase())
                            )
                            .map((p) => (
                              <div
                                key={p._id}
                                onClick={() => {
                                  setForm((prev) => ({
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
                </div>
              ) : null}
              {/* Quantity */}
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
