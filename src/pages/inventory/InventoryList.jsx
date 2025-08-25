import React, { useEffect, useMemo, useRef, useState } from "react";
import { FiArrowLeft, FiSearch, FiChevronDown } from "react-icons/fi";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createInventory,
  getInventory,
  getProducts,
  getWarehouse,
  getLocations,
  updateInventoryQuantity,
} from "../../api/warehouse";
import InventoryTableSkeleton from "./components/InventoryTableSkeleton";
import EmptyInventory from "./components/EmptyInventory";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import Swal from "sweetalert2";
import { Modal } from "antd";
import useFullscreen from "../../components/useFullscreen";
import { Minus, Plus } from "lucide-react";

const productTypes = [
  { label: "Consoles", code: "CON" },
  { label: "Handhelds", code: "HAN" },
  { label: "Accessories", code: "ACC" },
  { label: "Games", code: "GAM" },
];

// utility: test for a 24-char Mongo ObjectId
const isObjectId = (id) => /^[a-f\d]{24}$/i.test(String(id));

export default function InventoryList() {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(30);
  const [searchTerm, setSearchTerm] = useState("");
  const [warehouseType, setWarehouseType] = useState("shelf");
  const [pendingQtyChanges, setPendingQtyChanges] = useState(new Map());

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [form, setForm] = useState({
    productId: "",
    locationId: "",
    quantity: "",
    productSearch: "",
    showProductDropdown: false,
    type: "",
    typeCode: "",
    selectedProduct: null,
  });

  const dropdownRef = useRef(null);
  const { ref: fullscreenRef, isFullscreen, getContainer } = useFullscreen();

  // Get warehouse type from localStorage
  useEffect(() => {
    const type = localStorage.getItem("zoneType") || "shelf";
    setWarehouseType(type);
  }, []);

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

  const createInv = useMutation({
    mutationFn: async (body) => {
      if (!body.productId || !body.warehouseId || !body.quantity) {
        throw new Error("Missing required fields");
      }
      const data = await createInventory({
        productId: body.productId,
        warehouseId: body.warehouseId,
        quantity: String(body.quantity),
        key: body.key,
      });
      return data;
    },
    onSuccess: async (data, variables) => {
      try {
        // Refetch inventory to update the UI
        queryClient.invalidateQueries([
          "inventory",
          page,
          limit,
          searchTerm,
          warehouseId,
        ]);

        setIsCreateOpen(false);
        setForm({
          productId: "",
          locationId: "",
          quantity: "",
          productSearch: "",
          showProductDropdown: false,
          type: "",
          typeCode: "",
          selectedProduct: null,
        });

        Swal.fire({
          icon: "success",
          title: "Product Added Successfully",
          toast: true,
          position: "top-end",
          showConfirmButton: false,
          timer: 3000,
          background: "#10b981",
          color: "#fff",
        });
      } catch (error) {
        console.error("Error updating UI after inventory creation:", error);

        Swal.fire({
          icon: "error",
          title: "Error",
          text: "Failed to create inventory. Please try again.",
          toast: true,
          position: "top-end",
          showConfirmButton: false,
          timer: 3000,
          background: "#ef4444",
          color: "#fff",
        });

        setIsCreateOpen(false);
        setForm({
          productId: "",
          locationId: "",
          quantity: "",
          productSearch: "",
          showProductDropdown: false,
          type: "",
          typeCode: "",
          selectedProduct: null,
        });
      }
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

  const getShelfBase = (code = "") => {
    if (!code) return "Unknown";
    const parts = String(code).split("-BIN-");
    return parts[0]; // if no BIN part, returns whole code (shelf)
  };

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
        // keep original location type if available
        locationType: row.locationData?.type,
      }));

    return mapped;
  }, [data, warehouseId]);

  // Group inventory items by shelf base, nest BINs under their parent shelf
  const groupedByShelf = useMemo(() => {
    // Map: shelfBase => { shelfInfo: {code,type,qrcode,...}?, shelfRows: [...], bins: Map(binCode => [rows]) }
    const map = new Map();

    for (const r of items) {
      const code = r.locationCode || "Unknown";
      const shelfBase = getShelfBase(code);

      if (!map.has(shelfBase)) {
        map.set(shelfBase, {
          shelfCode: shelfBase,
          shelfInfo: null,
          shelfRows: [],
          bins: new Map(),
        });
      }

      const entry = map.get(shelfBase);

      if (
        (r.locationType || "").toLowerCase() === "bin" ||
        code.includes("-BIN-")
      ) {
        // treat as bin-item
        const binCode = code;
        if (!entry.bins.has(binCode)) entry.bins.set(binCode, []);
        entry.bins.get(binCode).push(r);
      } else {
        // direct shelf item (or unknown)
        entry.shelfRows.push(r);
      }
    }

    // Convert to array, sort by shelfCode
    return Array.from(map.values()).sort((a, b) =>
      a.shelfCode.localeCompare(b.shelfCode)
    );
  }, [items]);

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

  const { data: productsData, refetch: refetchProducts } = useQuery({
    queryKey: ["products", form.typeCode],
    queryFn: () =>
      getProducts({
        page: 1,
        limit: 50,
        search: form.productSearch,
        type: form.typeCode,
      }),
    enabled: !!form.typeCode, // Only run query when type is selected
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
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Add this effect to refetch products when search changes
  useEffect(() => {
    if (form.typeCode && form.productSearch) {
      const debounce = setTimeout(() => {
        refetchProducts();
      }, 300);
      return () => clearTimeout(debounce);
    }
  }, [form.productSearch, form.typeCode]);

  const validateQuantityChange = (currentQty, newQty) => {
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

  const handleUpdateQty = async (id, nextQty, key) => {
    const currentItem = items.find((item) => item.id === id);
    if (!currentItem) return;

    const currentQty = Number(currentItem.quantity) || 0;
    const newQty = Math.max(0, Number(nextQty) || 0);

    if (!validateQuantityChange(currentQty, newQty)) {
      setPendingQtyChanges((prev) => {
        const newMap = new Map(prev);
        newMap.delete(id);
        return newMap;
      });
      return;
    }

    try {
      await updateInventoryQuantity(id, newQty, key);

      setPendingQtyChanges((prev) => {
        const newMap = new Map(prev);
        newMap.delete(id);
        return newMap;
      });

      queryClient.invalidateQueries([
        "inventory",
        page,
        limit,
        searchTerm,
        warehouseId,
      ]);

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
      setPendingQtyChanges((prev) => {
        const newMap = new Map(prev);
        newMap.delete(id);
        return newMap;
      });
      Swal.fire({
        icon: "error",
        title: "Update Failed",
        text: error.message || "Failed to update quantity",
        timer: 3000,
        background: "#ef4444",
        color: "#fff",
      });
    }
  };

  const handleQuantityInputChange = (itemId, inputValue) => {
    const currentItem = items.find((item) => item.id === itemId);
    if (!currentItem) return;

    if (inputValue === "") {
      setPendingQtyChanges((prev) => {
        const newMap = new Map(prev);
        newMap.set(itemId, {
          currentQty: Number(currentItem.quantity || 0),
          newQty: 0,
          type: "manual",
        });
        return newMap;
      });
      return;
    }

    const numericValue = inputValue.replace(/\D/g, "");
    if (numericValue !== inputValue) return;

    const newQty = parseInt(numericValue) || 0;
    if (newQty > 9999) return;

    setPendingQtyChanges((prev) => {
      const newMap = new Map(prev);
      newMap.set(itemId, {
        currentQty: Number(currentItem.quantity || 0),
        newQty,
        type: "manual",
      });
      return newMap;
    });
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();

    // Basic validation
    if (!form.productId || !form.quantity) {
      Swal.fire({
        icon: "error",
        title: "Validation Error",
        text: "Please select a product and enter quantity",
        toast: true,
        position: "top-end",
        showConfirmButton: false,
        timer: 3000,
        background: "#ef4444",
        color: "#fff",
      });
      return;
    }

    // Ensure we have a valid warehouse ID
    if (!warehouseId) {
      Swal.fire({
        icon: "error",
        title: "Warehouse Error",
        text: "No valid warehouse selected.",
        toast: true,
        position: "top-end",
        showConfirmButton: false,
        timer: 3000,
        background: "#ef4444",
        color: "#fff",
      });
      return;
    }

    // Validate quantity is a positive number
    const quantity = parseInt(form.quantity);
    if (isNaN(quantity) || quantity <= 0) {
      Swal.fire({
        icon: "error",
        title: "Invalid Quantity",
        text: "Please enter a valid quantity greater than 0",
        toast: true,
        position: "top-end",
        showConfirmButton: false,
        timer: 3000,
        background: "#ef4444",
        color: "#fff",
      });
      return;
    }

    // Submit the form
    createInv.mutate({
      productId: form.productId,
      warehouseId: warehouseId,
      quantity: String(quantity),
      type: form.typeCode,
      key: "add", // Since we're creating new inventory, it's an "add" operation
    });
  };

  // NEW: track expanded bins (by binCode) and expanded shelves (by shelfCode)
  const [expandedBins, setExpandedBins] = useState(new Set());
  const [expandedShelves, setExpandedShelves] = useState(new Set());

  const toggleBin = (binCode) => {
    setExpandedBins((prev) => {
      const next = new Set(prev);
      if (next.has(binCode)) next.delete(binCode);
      else next.add(binCode);
      return next;
    });
  };

  const toggleShelf = (shelfCode) => {
    setExpandedShelves((prev) => {
      const next = new Set(prev);
      if (next.has(shelfCode)) next.delete(shelfCode);
      else next.add(shelfCode);
      return next;
    });
  };

  // Auto-expand bins and shelves when a search term matches content inside them.
  // Behavior: when searchTerm is non-empty, any bin that contains at least one item
  // whose productTitle or sku includes the search term (case-insensitive) will be added
  // to the expandedBins set. Similarly, shelves that have matching shelfRows will be
  // expanded into expandedShelves. We *add* matches to the current expanded sets so
  // user-expanded bins remain open.
  useEffect(() => {
    const term = String(searchTerm || "")
      .trim()
      .toLowerCase();
    if (!term) return; // leave existing expansions untouched when search is cleared

    const binsToOpen = new Set();
    const shelvesToOpen = new Set();

    for (const shelf of groupedByShelf) {
      const { shelfCode, shelfRows, bins } = shelf;

      // check shelfRows
      if (
        shelfRows.some(
          (r) =>
            (r.productTitle || "").toLowerCase().includes(term) ||
            (r.sku || "").toLowerCase().includes(term)
        )
      ) {
        shelvesToOpen.add(shelfCode);
      }

      // check bins inside shelf
      for (const [binCode, rows] of bins.entries()) {
        if (
          rows.some(
            (r) =>
              (r.productTitle || "").toLowerCase().includes(term) ||
              (r.sku || "").toLowerCase().includes(term)
          )
        ) {
          binsToOpen.add(binCode);
          // also expand the parent shelf so bin header is visible
          shelvesToOpen.add(shelfCode);
        }
      }
    }

    if (binsToOpen.size) {
      setExpandedBins((prev) => {
        const next = new Set(prev);
        for (const b of binsToOpen) next.add(b);
        return next;
      });
    }

    if (shelvesToOpen.size) {
      setExpandedShelves((prev) => {
        const next = new Set(prev);
        for (const s of shelvesToOpen) next.add(s);
        return next;
      });
    }
  }, [searchTerm, groupedByShelf]);

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
          <h1 className="text-2xl font-semibold">Inventory</h1>
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
          {warehouseType === "not_shelf" && (
            <button
              onClick={() => setIsCreateOpen(true)}
              className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md"
            >
              Add Inventory
            </button>
          )}
        </div>
      </div>
      <div className="max-w-7xl mx-auto py-6">
        {isLoading ? (
          <InventoryTableSkeleton />
        ) : warehouseType === "not_shelf" ? (
          // Simple table for not_shelf warehouses
          items.length === 0 ? (
            <EmptyInventory onAddNew={() => setIsCreateOpen(true)} />
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full bg-white rounded-lg border">
                <thead className="border-b bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                      Product
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                      SKU
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                      Quantity
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, idx) => (
                    <tr
                      key={item.id}
                      className={`border-t ${
                        idx % 2 !== 0 ? "bg-gray-50" : "bg-white"
                      }`}
                    >
                      <td className="px-4 py-3 text-sm font-medium">
                        {item.productTitle}
                      </td>
                      <td className="px-4 py-3 text-xs font-mono">
                        {item.sku || "N/A"}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        {item.quantity}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <div className="flex items-center rounded-lg overflow-hidden border border-gray-200 shadow-sm bg-gray-50 h-9">
                            <button
                              disabled={Number(item.quantity) <= 0}
                              onClick={() => {
                                const currentPending = pendingQtyChanges.get(
                                  item.id
                                );
                                const baseQty = currentPending
                                  ? currentPending.newQty
                                  : Number(item.quantity);
                                const newQty = Math.max(0, baseQty - 1);

                                setPendingQtyChanges((prev) => {
                                  const newMap = new Map(prev);
                                  newMap.set(item.id, {
                                    currentQty: Number(item.quantity),
                                    newQty,
                                    type: "decrease",
                                  });
                                  return newMap;
                                });
                              }}
                              className={`px-3 h-full flex items-center justify-center text-sm duration-300 ease-in-out transition-colors ${
                                Number(item.quantity) <= 0
                                  ? "text-gray-300 bg-gray-50 cursor-not-allowed"
                                  : "text-red-400 bg-red-100 hover:bg-red-800 hover:text-white"
                              }`}
                              title="Decrease by 1"
                            >
                              <Minus className="w-4 h-4" />
                            </button>
                            <input
                              value={
                                pendingQtyChanges.has(item.id)
                                  ? pendingQtyChanges.get(item.id).newQty
                                  : item.quantity || ""
                              }
                              onChange={(e) =>
                                handleQuantityInputChange(
                                  item.id,
                                  e.target.value
                                )
                              }
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  const pendingChange = pendingQtyChanges.get(
                                    item.id
                                  );
                                  if (pendingChange) {
                                    const key =
                                      pendingChange.newQty >
                                      pendingChange.currentQty
                                        ? "added"
                                        : "removed";
                                    handleUpdateQty(
                                      item.id,
                                      pendingChange.newQty,
                                      key
                                    );
                                  }
                                }
                              }}
                              className="w-14 text-center px-3 py-2 text-sm bg-white border-l border-r outline-none focus:ring-2 focus:ring-blue-500 focus:bg-blue-50 transition-colors"
                              inputMode="numeric"
                              pattern="[0-9]*"
                              placeholder="0"
                            />
                            <button
                              onClick={() => {
                                const currentPending = pendingQtyChanges.get(
                                  item.id
                                );
                                const baseQty = currentPending
                                  ? currentPending.newQty
                                  : Number(item.quantity);
                                const newQty = baseQty + 1;

                                setPendingQtyChanges((prev) => {
                                  const newMap = new Map(prev);
                                  newMap.set(item.id, {
                                    currentQty: Number(item.quantity),
                                    newQty,
                                    type: "increase",
                                  });
                                  return newMap;
                                });
                              }}
                              className="px-3 h-full flex items-center justify-center text-sm duration-300 ease-in-out transition-colors bg-green-100 text-green-600 hover:bg-green-900 hover:text-white"
                              title="Increase by 1"
                            >
                              <Plus className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        {pendingQtyChanges.has(item.id) && (
                          <div className="fixed left-0 bottom-0 w-full p-5 bg-white flex flex-col sm:flex-row sm:items-center gap-y-2 justify-between duration-300 ease-in-out">
                            <h2 className="text-xl sm:text-2xl font-bold">
                              {item.productTitle}
                            </h2>
                            <div className="flex items-center max-sm:justify-end space-x-2">
                              <p className="text-sm font-medium text-blue-700">
                                New qty:{" "}
                                {pendingQtyChanges.get(item.id)?.newQty}
                              </p>
                              <button
                                onClick={() => {
                                  const pendingChange = pendingQtyChanges.get(
                                    item.id
                                  );
                                  if (pendingChange) {
                                    const key =
                                      pendingChange.newQty >
                                      pendingChange.currentQty
                                        ? "added"
                                        : "removed";
                                    handleUpdateQty(
                                      item.id,
                                      pendingChange.newQty,
                                      key
                                    );
                                  }
                                }}
                                className="px-3 py-2 text-sm tracking-wide bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
                              >
                                Validate
                              </button>
                              <button
                                onClick={() => {
                                  setPendingQtyChanges((prev) => {
                                    const newMap = new Map(prev);
                                    newMap.delete(item.id);
                                    return newMap;
                                  });
                                }}
                                className="px-3 py-2 text-sm bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-medium"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        ) : // Grouped display for shelf warehouses
        groupedByLocation.length === 0 ? (
          <EmptyInventory onAddNew={() => setIsCreateOpen(true)} />
        ) : (
          <div className="space-y-6">
            {groupedByShelf.map(({ shelfCode, shelfRows, bins }) => (
              <div
                key={shelfCode}
                className="rounded-lg border overflow-hidden"
              >
                {/* shelf header */}
                <div className="flex items-center justify-between gap-4 px-4 py-3 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-200">
                  <div>
                    <p className="font-bold text-xl uppercase tracking-wide">
                      {shelfCode}
                    </p>
                    <p className="text-sm text-gray-500 mt-0.5">{`Items on shelf: ${shelfRows.length} · BIN groups: ${bins.size}`}</p>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* toggle shelf rows (if any) */}
                    {/* {shelfRows.length > 0 && (
                        <button
                          onClick={() => toggleShelf(shelfCode)}
                          className="text-sm px-3 py-1 rounded-md bg-white shadow-sm"
                        >
                          {expandedShelves.has(shelfCode) ? "Hide shelf items" : "Show shelf items"}
                        </button>
                      )} */}
                  </div>
                </div>

                {/* shelf content */}
                <div className="p-4 bg-gray-100">
                  {/* shelf rows (collapsed by default) */}
                  {shelfRows.length > 0 && (
                    <div className="mb-4">
                      <div className="overflow-x-auto">
                        <table className="min-w-full bg-white rounded-lg">
                          <thead className="border-b">
                            <tr>
                              <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700">
                                Product
                              </th>
                              <th className="px-3 py-2 text-left text-xs font-mono text-gray-700">
                                SKU
                              </th>
                              <th className="px-3 py-2 text-left text-xs text-gray-700">
                                Warehouse
                              </th>
                              <th className="px-3 py-2 text-left text-xs text-gray-700">
                                Qty
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {shelfRows.map((r) => (
                              <tr key={r.id} className="border-t">
                                <td className="px-3 py-2 text-sm font-medium">
                                  {r.productTitle}
                                </td>
                                <td className="px-3 py-2 text-xs font-mono">
                                  {r.sku || "N/A"}
                                </td>
                                <td className="px-3 py-2 text-sm text-gray-500">
                                  {r.name}
                                </td>
                                <td className="px-3 py-2 text-sm text-gray-700">
                                  {r.quantity}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* bins: show collapsed list of bin codes first; click to expand products */}
                  {Array.from(bins.entries()).map(([binCode, rows]) => {
                    const isOpen = expandedBins.has(binCode);
                    return (
                      <div
                        key={binCode}
                        className="mb-4 last:mb-0 bg-white p-0 rounded-lg"
                      >
                        <div
                          className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50"
                          onClick={() => toggleBin(binCode)}
                          role="button"
                          tabIndex={0}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ")
                              toggleBin(binCode);
                          }}
                        >
                          <div className="flex items-center gap-3">
                            <span
                              className={`transform transition-transform duration-200 ${
                                isOpen ? "rotate-180" : "rotate-0"
                              }`}
                            >
                              <FiChevronDown />
                            </span>
                            <div>
                              <p className="text-base font-semibold">
                                {binCode}
                              </p>
                              <p className="text-sm text-gray-500">
                                {rows.length} item{rows.length !== 1 ? "s" : ""}
                              </p>
                            </div>
                          </div>

                          <div className="text-sm text-gray-500">
                            {isOpen ? "Collapse" : "Expand"}
                          </div>
                        </div>

                        {/* products inside bin - only render when open to keep DOM small */}
                        {isOpen && (
                          <div className="p-4 border-t">
                            <div className="overflow-x-auto">
                              <table className="min-w-full bg-white rounded-lg">
                                <thead className="border-b">
                                  <tr>
                                    <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700">
                                      Product
                                    </th>
                                    <th className="px-3 py-2 text-left text-xs font-mono text-gray-700">
                                      SKU
                                    </th>
                                    <th className="px-3 py-2 text-left text-xs text-gray-700">
                                      Warehouse
                                    </th>
                                    <th className="px-3 py-2 text-left text-xs text-gray-700">
                                      Qty
                                    </th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {rows.map((r) => (
                                    <tr key={r.id} className="border-t">
                                      <td className="px-3 py-2 text-sm font-medium">
                                        {r.productTitle}
                                      </td>
                                      <td className="px-3 py-2 text-xs font-mono">
                                        {r.sku || "N/A"}
                                      </td>
                                      <td className="px-3 py-2 text-sm text-gray-500">
                                        {r.name}
                                      </td>
                                      <td className="px-3 py-2 text-sm text-gray-700">
                                        {r.quantity}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {/* when shelf has nothing at all */}
                  {shelfRows.length === 0 && bins.size === 0 && (
                    <div className="px-4 py-8 text-center bg-white text-gray-500">
                      No items in this shelf
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div ref={fullscreenRef}>
        <Modal
          getContainer={getContainer}
          key={String(isFullscreen)}
          open={isCreateOpen}
          onCancel={() => setIsCreateOpen(false)}
          centered
          footer={null}
          width={600}
          closable={true}
          title={null}
          className="max-h-[95vh] overflow-y-auto"
        >
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Create Inventory</h3>
            </div>
            <form onSubmit={handleFormSubmit} className="space-y-4">
              {/* Warehouse */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Warehouse
                </label>
                <div className="w-full rounded-md border px-3 py-2 text-sm bg-gray-50 text-gray-600">
                  {warehouseName}
                </div>
              </div>

              {/* Type Selection */}
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
                            selectedProduct: null,
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
                            selectedProduct: null,
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
                      <div className="absolute z-50 w-full mt-1 bg-white border rounded-md shadow-lg h-60 overflow-y-auto">
                        {productsData?.products?.length > 0 ? (
                          productsData.products.map((p) => (
                            <div
                              key={p._id}
                              onClick={() => {
                                setForm((prev) => ({
                                  ...prev,
                                  productId: p._id,
                                  productSearch: p.pro_title || p.sku,
                                  showProductDropdown: false,
                                  selectedProduct: p, // Store the selected product
                                }));
                              }}
                              className="px-3 py-2 hover:bg-gray-100 cursor-pointer text-sm border-b last:border-b-0"
                            >
                              <div className="font-medium">{p.pro_title}</div>
                              <div className="text-xs text-gray-500">
                                {p.sku}
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="px-3 py-2 text-gray-500 text-sm">
                            {productsData?.products
                              ? "No products found"
                              : "Loading products..."}
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
                  disabled={
                    createInv.isLoading || !form.productId || !form.quantity
                  }
                  className="px-4 py-2 text-sm rounded-lg bg-blue-600 text-white disabled:opacity-60"
                >
                  {createInv.isLoading ? "Saving…" : "Save"}
                </button>
              </div>
            </form>
          </div>
        </Modal>
      </div>
    </>
  );
}
