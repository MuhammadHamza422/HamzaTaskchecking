import React, { useEffect, useMemo, useRef, useState } from "react";
import { FiArrowLeft, FiSearch, FiChevronDown } from "react-icons/fi";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createInventory,
  getInventory,
  getProducts,
  getWarehouse,
  getLocations,
} from "../../api/warehouse";
import InventoryTableSkeleton from "./components/InventoryTableSkeleton";
import EmptyInventory from "./components/EmptyInventory";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import Swal from "sweetalert2";

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
    type: "",
    typeCode: "",
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
    const term = String(searchTerm || "").trim().toLowerCase();
    if (!term) return; // leave existing expansions untouched when search is cleared

    const binsToOpen = new Set();
    const shelvesToOpen = new Set();

    for (const shelf of groupedByShelf) {
      const { shelfCode, shelfRows, bins } = shelf;

      // check shelfRows
      if (
        shelfRows.some((r) =>
          (r.productTitle || "").toLowerCase().includes(term) ||
          (r.sku || "").toLowerCase().includes(term)
        )
      ) {
        shelvesToOpen.add(shelfCode);
      }

      // check bins inside shelf
      for (const [binCode, rows] of bins.entries()) {
        if (
          rows.some((r) =>
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
            <p className="mt-1 text-sm text-zinc-600">View and manage stock items.</p>
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
          <h1 className="text-2xl font-semibold">Inventory by location</h1>
          <p className="mt-1 text-sm text-zinc-600">View and manage stock items.</p>
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
        {isLoading ? (
          <InventoryTableSkeleton />
        ) : groupedByLocation.length === 0 ? (
          <EmptyInventory onAddNew={() => setIsNewLocationModalOpen(true)} />
        ) : (
          <div className="space-y-6">
            {groupedByShelf.map(({ shelfCode, shelfRows, bins }) => (
              <div key={shelfCode} className="rounded-lg border overflow-hidden">
                {/* shelf header */}
                <div className="flex items-center justify-between gap-4 px-4 py-3 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-200">
                  <div>
                    <p className="font-bold text-xl uppercase tracking-wide">{shelfCode}</p>
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
                              <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700">Product</th>
                              <th className="px-3 py-2 text-left text-xs font-mono text-gray-700">SKU</th>
                              <th className="px-3 py-2 text-left text-xs text-gray-700">Warehouse</th>
                              <th className="px-3 py-2 text-left text-xs text-gray-700">Qty</th>
                            </tr>
                          </thead>
                          <tbody>
                            {shelfRows.map((r) => (
                              <tr key={r.id} className="border-t">
                                <td className="px-3 py-2 text-sm font-medium">{r.productTitle}</td>
                                <td className="px-3 py-2 text-xs font-mono">{r.sku || "N/A"}</td>
                                <td className="px-3 py-2 text-sm text-gray-500">{r.name}</td>
                                <td className="px-3 py-2 text-sm text-gray-700">{r.quantity}</td>
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
                      <div key={binCode} className="mb-4 last:mb-0 bg-white p-0 rounded-lg">
                        <div
                          className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50"
                          onClick={() => toggleBin(binCode)}
                          role="button"
                          tabIndex={0}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") toggleBin(binCode);
                          }}
                        >
                          <div className="flex items-center gap-3">
                            <span
                              className={`transform transition-transform duration-200 ${isOpen ? "rotate-180" : "rotate-0"}`}
                            >
                              <FiChevronDown />
                            </span>
                            <div>
                              <p className="text-base font-semibold">{binCode}</p>
                              <p className="text-sm text-gray-500">{rows.length} item{rows.length !== 1 ? "s" : ""}</p>
                            </div>
                          </div>

                          <div className="text-sm text-gray-500">{isOpen ? "Collapse" : "Expand"}</div>
                        </div>

                        {/* products inside bin - only render when open to keep DOM small */}
                        {isOpen && (
                          <div className="p-4 border-t">
                            <div className="overflow-x-auto">
                              <table className="min-w-full bg-white rounded-lg">
                                <thead className="border-b">
                                  <tr>
                                    <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700">Product</th>
                                    <th className="px-3 py-2 text-left text-xs font-mono text-gray-700">SKU</th>
                                    <th className="px-3 py-2 text-left text-xs text-gray-700">Warehouse</th>
                                    <th className="px-3 py-2 text-left text-xs text-gray-700">Qty</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {rows.map((r) => (
                                    <tr key={r.id} className="border-t">
                                      <td className="px-3 py-2 text-sm font-medium">{r.productTitle}</td>
                                      <td className="px-3 py-2 text-xs font-mono">{r.sku || "N/A"}</td>
                                      <td className="px-3 py-2 text-sm text-gray-500">{r.name}</td>
                                      <td className="px-3 py-2 text-sm text-gray-700">{r.quantity}</td>
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
                    <div className="px-4 py-8 text-center bg-white text-gray-500">No items in this shelf</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
