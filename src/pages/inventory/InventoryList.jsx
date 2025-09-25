import React, { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createInventory,
  getInventory,
  getProducts,
  getWarehouse,
  getLocations,
  updateInventoryQuantity,
  getZonesByWarehouse,
  moveInventoryToZone,
} from "../../api/warehouse";
import InventoryTableSkeleton from "./components/InventoryTableSkeleton";
import EmptyInventory from "./components/EmptyInventory";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import Swal from "sweetalert2";
import useFullscreen from "../../components/useFullscreen";
import InventoryBreadcrumb from "./components/InventoryBreadcrumb";
import InventoryHeader from "./components/InventoryHeader";
import NotShelfTable from "./components/NotShelfTable";
import ShelfGroupedView from "./components/ShelfGroupedView";
import CreateInventoryModal from "./components/CreateInventoryModal";
import MoveToZoneModal from "./components/MoveToZoneModal";
import InventoryPagination from "./components/InventoryPagination";
import { useAuth } from "../../contexts/AuthContext";

// product types moved to CreateInventoryModal

// utility: test for a 24-char Mongo ObjectId
const isObjectId = (id) => /^[a-f\d]{24}$/i.test(String(id));

export default function InventoryList() {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(50);
  const [searchTerm, setSearchTerm] = useState("");
  const [warehouseType, setWarehouseType] = useState("shelf");
  const [pendingQtyChanges, setPendingQtyChanges] = useState(new Map());
  const { user } = useAuth();
  const role = user?.roles.role;

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [moveModalOpen, setMoveModalOpen] = useState(false);
  const [moveTargetId, setMoveTargetId] = useState(null);
  const [selectedMoveZoneId, setSelectedMoveZoneId] = useState("");
  const [isMoveSubmitting, setIsMoveSubmitting] = useState(false);
  const [moveQty, setMoveQty] = useState(1);
  const [moveMaxQty, setMoveMaxQty] = useState(0);
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
  const zoneId = useSelector((s) => s.app.selectedZoneId);
  console.log("Zone Id", zoneId);
  const queryClient = useQueryClient();

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["inventory", page, limit, searchTerm, zoneId],
    queryFn: () =>
      getInventory({
        page,
        limit,
        search: searchTerm,
        // warehouseId,
        zoneId,
      }),
    keepPreviousData: false,
    staleTime: 0,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    refetchOnMount: true,
    enabled: !!zoneId,
  });

  // Fetch zones to resolve selected zone name for breadcrumb
  const { data: zonesRes } = useQuery({
    queryKey: ["zones", warehouseId, warehouseType],
    queryFn: () =>
      warehouseId ? getZonesByWarehouse(warehouseId, warehouseType) : null,
    enabled: !!warehouseId,
    staleTime: 0,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    refetchOnMount: true,
  });

  console.log("zonesRes", zonesRes);

  const zonesOptions = useMemo(() => {
    const list = Array.isArray(zonesRes?.zones) ? zonesRes.zones : [];
    return list.map((z) => ({ id: z._id ?? z.id, name: z.name }));
  }, [zonesRes]);

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
        zoneId: String(zoneId),
      });
      return data;
    },
    onMutate: () => {
      setIsSaving(true);
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
          zoneId,
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
      setIsSaving(false);
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
      setIsSaving(false);
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

  // Total items for pagination (fallback to items length)
  const totalInventory = useMemo(() => {
    const total = Number(data?.totalInventry ?? data?.total ?? 0);
    return Number.isFinite(total) && total > 0 ? total : items.length;
  }, [data, items.length]);

  // Reset to first page when filters change
  useEffect(() => {
    setPage(1);
  }, [searchTerm, limit, zoneId]);

  // Build CSV headers from backend fields (prefer original keys; map from our shaped items)
  const csvHeaders = useMemo(() => {
    // Expected backend fields from original inventory response
    return [
      { label: "ID", key: "id" },
      { label: "Product Title", key: "productTitle" },
      { label: "SKU", key: "sku" },
      { label: "Quantity", key: "quantity" },
      { label: "Location Code", key: "locationCode" },
      { label: "Warehouse Name", key: "name" },
      { label: "Warehouse Country", key: "country" },
      { label: "Model Code", key: "modelCode" },
      { label: "Updated At", key: "updatedAt" },
    ];
  }, []);

  // Use current page items only for CSV (no checkbox selection)
  const csvData = useMemo(() => {
    return items.map((r) => ({
      id: r.id,
      productTitle: r.productTitle,
      sku: r.sku,
      quantity: r.quantity,
      locationCode: r.locationCode,
      name: r.name,
      country: r.country,
      modelCode: r.modelCode,
      updatedAt: r.updatedAt,
    }));
  }, [items]);

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
    staleTime: 0,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    refetchOnMount: true,
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
    staleTime: 0,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    refetchOnMount: true,
  });

  const { data: locationsRes } = useQuery({
    queryKey: ["locations", warehouseId, zoneId],
    enabled: !!warehouseId,
    staleTime: 0,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    refetchOnMount: true,
    queryFn: async () => {
      const res = await getLocations({
        warehouseId,
        zoneId,
        page: 1,
        limit: 50,
      });
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
          zoneId: typeof l?.zone === "string" ? l.zone : l.zone?._id ?? null,
          zone: l.zone,
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

  // Move inventory to another zone
  const moveInvToZone = useMutation({
    mutationFn: async ({ inventoryId, movedZoneId, quantity }) => {
      if (!inventoryId || !movedZoneId) {
        throw new Error("Inventory and target zone are required");
      }
      return moveInventoryToZone(inventoryId, movedZoneId, quantity);
    },
    onSuccess: () => {
      setMoveModalOpen(false);
      setMoveTargetId(null);
      setSelectedMoveZoneId("");
      queryClient.invalidateQueries([
        "inventory",
        page,
        limit,
        searchTerm,
        zoneId,
      ]);
      Swal.fire({
        icon: "success",
        title: "Item moved",
        toast: true,
        position: "top-end",
        showConfirmButton: false,
        timer: 2000,
        background: "#10b981",
        color: "#fff",
      });
    },
    onError: (error) => {
      Swal.fire({
        icon: "error",
        title: "Move failed",
        text:
          error?.response?.data?.message ||
          error?.message ||
          "Unable to move item",
        toast: true,
        position: "top-end",
        showConfirmButton: false,
        timer: 3000,
        background: "#ef4444",
        color: "#fff",
      });
    },
  });

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

  // Resolve zone name: prefer zones list (selected zoneId), fallback to locations data
  const zoneName = useMemo(() => {
    const list = Array.isArray(zonesRes?.zones) ? zonesRes.zones : [];
    const found = list.find((z) => (z._id ?? z.id) === zoneId);
    if (found?.name) return found.name;
    if (locations.length > 0) {
      const firstLocation = locations[0];
      return firstLocation?.zone?.name || "";
    }
    return "";
  }, [zonesRes, zoneId, locations]);
  console.log("zoneName", zoneName);

  // CSV filename based on current zone name and page
  const csvFilename = useMemo(() => {
    const base = String(zoneName || "inventory")
      .trim()
      .toLowerCase();
    const slug = base.replace(/[^a-z0-9]+/gi, "-").replace(/^-+|-+$/g, "");
    return `${slug || "inventory"}-page-${page}.csv`;
  }, [zoneName, page]);

  if (isLoading) {
    return (
      <>
        <InventoryBreadcrumb
          navigate={navigate}
          warehouseName={warehouseName}
          zoneName={zoneName}
        />
        <InventoryHeader
          zoneName={zoneName}
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          warehouseType={warehouseType}
          onAddNew={() => setIsCreateOpen(true)}
          isAddDisabled={true}
          addButtonLabel={"Add Inventory"}
        />
        <div className="max-w-7xl mx-auto py-6">
          <InventoryTableSkeleton />
        </div>
      </>
    );
  }

  const isAddDisabled = createInv.isLoading || isFetching;
  const addButtonLabel = createInv.isLoading
    ? "Adding..."
    : isFetching
    ? "Updating..."
    : "Add Inventory";

  return (
    <>
      <InventoryBreadcrumb
        navigate={navigate}
        warehouseName={warehouseName}
        zoneName={zoneName}
      />
      <InventoryHeader
        zoneName={zoneName}
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        warehouseType={warehouseType}
        onAddNew={() => setIsCreateOpen(true)}
        isAddDisabled={isAddDisabled}
        addButtonLabel={addButtonLabel}
        csvData={csvData}
        csvHeaders={csvHeaders}
        csvFilename={csvFilename}
      />
      <div className="max-w-7xl mx-auto py-6">
        {isLoading ? (
          <InventoryTableSkeleton />
        ) : warehouseType === "not_shelf" ? (
          // Simple table for not_shelf warehouses
          items.length === 0 ? (
            <EmptyInventory onAddNew={() => setIsCreateOpen(true)} />
          ) : (
            <NotShelfTable
              items={items}
              pendingQtyChanges={pendingQtyChanges}
              setPendingQtyChanges={setPendingQtyChanges}
              handleQuantityInputChange={handleQuantityInputChange}
              handleUpdateQty={handleUpdateQty}
              role={role}
              onOpenMove={(id) => {
                setMoveTargetId(id);
                const found = items.find((it) => it.id === id);
                const qty = Number(found?.quantity || 0);
                setMoveMaxQty(qty);
                setMoveQty(Math.max(1, qty));
                setSelectedMoveZoneId("");
                setMoveModalOpen(true);
              }}
            />
          )
        ) : // Grouped display for shelf warehouses
        groupedByLocation.length === 0 ? (
          <EmptyInventory onAddNew={() => setIsCreateOpen(true)} />
        ) : (
          <ShelfGroupedView
            groupedByShelf={groupedByShelf}
            pendingQtyChanges={pendingQtyChanges}
            setPendingQtyChanges={setPendingQtyChanges}
            handleQuantityInputChange={handleQuantityInputChange}
            handleUpdateQty={handleUpdateQty}
            expandedBins={expandedBins}
            toggleBin={toggleBin}
            onOpenMove={(id) => {
              setMoveTargetId(id);
              const found = items.find((it) => it.id === id);
              const qty = Number(found?.quantity || 0);
              setMoveMaxQty(qty);
              setMoveQty(Math.max(1, qty));
              setSelectedMoveZoneId("");
              setMoveModalOpen(true);
            }}
          />
        )}
        {/* Pagination */}
        <InventoryPagination
          page={page}
          setPage={setPage}
          limit={limit}
          setLimit={setLimit}
          total={totalInventory}
        />
      </div>

      <div ref={fullscreenRef}>
        <CreateInventoryModal
          isOpen={isCreateOpen}
          onClose={() => setIsCreateOpen(false)}
          getContainer={getContainer}
          isFullscreen={isFullscreen}
          zoneName={zoneName}
          form={form}
          setForm={setForm}
          productsData={productsData}
          onSubmit={handleFormSubmit}
          isSaving={isSaving}
          createInvLoading={createInv.isLoading}
          dropdownRef={dropdownRef}
        />
        <MoveToZoneModal
          isOpen={moveModalOpen}
          onClose={() => {
            setMoveModalOpen(false);
            setMoveTargetId(null);
            setSelectedMoveZoneId("");
          }}
          getContainer={getContainer}
          isFullscreen={isFullscreen}
          zonesOptions={zonesOptions}
          selectedMoveZoneId={selectedMoveZoneId}
          setSelectedMoveZoneId={setSelectedMoveZoneId}
          moveQty={moveQty}
          setMoveQty={setMoveQty}
          maxQty={moveMaxQty}
          onSubmit={(e) => {
            e.preventDefault();
            if (!moveTargetId || !selectedMoveZoneId) return;
            const qty = Number(moveQty || 0);
            if (
              !Number.isFinite(qty) ||
              qty < 1 ||
              qty > Number(moveMaxQty || 0)
            ) {
              Swal.fire({
                icon: "error",
                title: "Invalid Quantity",
                text: "Quantity must be between 1 and current quantity",
                toast: true,
                position: "top-end",
                showConfirmButton: false,
                timer: 2500,
                background: "#ef4444",
                color: "#fff",
              });
              return;
            }
            setIsMoveSubmitting(true);
            moveInvToZone.mutate(
              {
                inventoryId: moveTargetId,
                movedZoneId: selectedMoveZoneId,
                quantity: qty,
              },
              {
                onSettled: () => setIsMoveSubmitting(false),
              }
            );
          }}
          isSubmitting={isMoveSubmitting}
          isLoading={moveInvToZone.isLoading}
        />
      </div>
    </>
  );
}
