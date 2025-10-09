"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import { FiSearch } from "react-icons/fi";
import { Minus, Package, Plus, Loader2 } from "lucide-react";
import {
  updateInventoryQuantity,
  getProducts,
  createInventory,
  getInventory,
  moveInventoryItem,
  getLocations,
} from "../../api/warehouse";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Swal from "sweetalert2";
import { useAuth } from "../../contexts/AuthContext";
import { Modal } from "antd";
import useFullscreen from "../../components/useFullscreen";
import { useSelector } from "react-redux";

const productTypes = [
  { label: "Consoles", code: "CON" },
  { label: "Handhelds", code: "HAN" },
  { label: "Accessories", code: "ACC" },
  { label: "Games", code: "GAM" },
];

// utility: test for a 24-char Mongo ObjectId
const isObjectId = (id) => /^[a-f\d]{24}$/i.test(String(id));

export default function InventoryDisplay({
  items,
  totalCount,
  isLoading,
  scannedData,
  locationid,
  setItems,
  zone,
  type,
}) {
  const isZoneType = String(type || "").toLowerCase() === "zone";
  const [search, setSearch] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isMoveOpen, setIsMoveOpen] = useState(false);
  const [selectedItemForMove, setSelectedItemForMove] = useState(null);
  const [moveLocationSearch, setMoveLocationSearch] = useState("");
  const [selectedMoveLocation, setSelectedMoveLocation] = useState(null);
  const [showLocationDropdown, setShowLocationDropdown] = useState(false);
  const [activeLocationCode, setActiveLocationCode] = useState("");
  const [form, setForm] = useState({
    productId: "",
    locationId: locationid,
    quantity: "",
    productSearch: "",
    showProductDropdown: false,
    type: "",
    typeCode: "",
    selectedProduct: null, // Store the selected product data
  });
  const [pendingQtyChanges, setPendingQtyChanges] = useState(new Map()); // Track multiple pending changes
  const [isRefreshing, setIsRefreshing] = useState(false); // disable add buttons while refetching
  const [isSaving, setIsSaving] = useState(false); // control modal Save button spinner
  const queryClient = useQueryClient();
  const dropdownRef = useRef(null);
  const { user } = useAuth();
  const { ref: fullscreenRef, isFullscreen, getContainer } = useFullscreen();
  // console.log("Location Id", locationid);
  const zoneId = useSelector((s) => s.app.selectedZoneId);

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
    if (!search.trim()) return items;
    const t = search.toLowerCase();
    return items.filter(
      (it) =>
        (it?.productData?.pro_title || "").toLowerCase().includes(t) ||
        (it?.locationData?.code || "").toLowerCase().includes(t)
    );
  }, [items, search]);

  const groups = useMemo(() => {
    const map = new Map();
    for (const it of filtered) {
      let code = it?.locationData?.code;

      if (!code) {
        if (isZoneType) {
          code = zone?.name || "Zone";
        } else if (activeLocationCode) {
          code = activeLocationCode;
        } else if (scannedData) {
          code = scannedData;
        } else {
          code = "Unknown";
        }
      }

      if (!map.has(code)) map.set(code, []);
      map.get(code).push(it);
    }

    const result = Array.from(map.entries()).map(([locationCode, rows]) => ({
      locationCode,
      rows,
    }));

    return result;
  }, [filtered, scannedData, activeLocationCode, locationid, zone]);

  const applyLocalQty = (id, quantity) => {
    // Only update parent state, no local state
    setItems((prev) =>
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

  // Helper function to handle immediate quantity updates for newly created items
  const handleImmediateQuantityUpdate = async (item, newQty, key) => {
    try {
      const payload = {
        productId: item.productId,
        quantity: String(newQty),
        key,
        zoneId: zone._id ? zone._id : String(zoneId),
        ...(isZoneType ? {} : { locationId: item.locationId }),
      };

      const createData = await createInventory(payload);

      if (createData?.inventory?._id && isObjectId(createData.inventory._id)) {
        // Update the item with the real ID from server
        const realInventoryId = createData.inventory._id;

        // Update parent state with the real ID
        setItems((prev) =>
          prev.map((prevItem) =>
            prevItem._id === item._id
              ? { ...prevItem, _id: realInventoryId, quantity: newQty }
              : prevItem
          )
        );

        return { success: true, realId: realInventoryId };
      }
    } catch (error) {
      console.error("Failed to create inventory entry:", error);
    }

    return { success: false };
  };

  // Update the handleUpdateQty function
  const handleUpdateQty = async (id, nextQty, key) => {
    const currentItem = items.find((item) => item._id === id);
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

    // Find a valid inventory id to send to backend
    let inventoryId = id;

    // Try alternative places where a backend id may exist
    if (!isObjectId(inventoryId)) {
      if (currentItem._id && isObjectId(currentItem._id)) {
        inventoryId = currentItem._id;
      } else if (
        currentItem.locationData?.inventoryId &&
        isObjectId(currentItem.locationData.inventoryId)
      ) {
        inventoryId = currentItem.locationData.inventoryId;
      } else if (
        currentItem.inventoryId &&
        isObjectId(currentItem.inventoryId)
      ) {
        inventoryId = currentItem.inventoryId;
      } else {
        // For newly created items, try to find the real inventory ID from the server
        const matchingItem = items.find(
          (item) =>
            item.productId === currentItem.productId &&
            item.locationData?.code === currentItem.locationData?.code && // Match by location code as well
            item.locationId === currentItem.locationId &&
            isObjectId(item._id)
        );

        if (matchingItem && isObjectId(matchingItem._id)) {
          inventoryId = matchingItem._id;
        } else {
          const result = await handleImmediateQuantityUpdate(
            currentItem,
            newQty,
            key
          );

          if (result.success) {
            setPendingQtyChanges((prev) => {
              const newMap = new Map(prev);
              newMap.delete(id);
              return newMap;
            });

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

            // Refetch latest inventory to reflect server-calculated changes
            try {
              setIsRefreshing(true);
              const res = await getInventory(
                isZoneType
                  ? { zoneId: type === "zone" ? zone._id : String(zoneId) }
                  : {
                      search:
                        type === "zone"
                          ? zone.name
                          : scannedData || activeLocationCode,
                    }
              );
              if (Array.isArray(res?.inventry)) {
                setItems(res.inventry);
              }
            } catch (e) {
              console.warn("Refetch after qty update (new item) failed:", e);
            } finally {
              setIsRefreshing(false);
            }

            return;
          } else {
            Swal.fire({
              icon: "error",
              title: "Update Failed",
              text: "This item doesn't have a valid server ID yet. Please wait a moment for the item to be fully saved, then try again.",
              toast: true,
              position: "top-end",
              showConfirmButton: false,
              timer: 5000,
              background: "#ef4444",
              color: "#fff",
            });
            setPendingQtyChanges((prev) => {
              const newMap = new Map(prev);
              newMap.delete(id);
              return newMap;
            });
            return;
          }
        }
      }
    }

    try {
      // Optimistic UI
      applyLocalQty(id, newQty);

      // IMPORTANT: pass the *valid* inventoryId to your API
      await updateInventoryQuantity(inventoryId, newQty, key);

      // Remove from pending changes
      setPendingQtyChanges((prev) => {
        const newMap = new Map(prev);
        newMap.delete(id);
        return newMap;
      });

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
      // Refetch latest inventory to ensure UI matches server (deletions, merges, etc.)
      try {
        setIsRefreshing(true);
        const res = await getInventory(
          isZoneType
            ? { zoneId: type === "zone" ? zone._id : String(zoneId) }
            : {
                search:
                  type === "zone"
                    ? zone.name
                    : scannedData || activeLocationCode,
              }
        );
        if (Array.isArray(res?.inventry)) {
          setItems(res.inventry);
        }
      } catch (e) {
        console.warn("Refetch after qty update failed:", e);
      } finally {
        setIsRefreshing(false);
      }
    } catch (error) {
      // revert
      applyLocalQty(id, currentQty);
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
    // Find the current item to get the original quantity
    const currentItem = items.find((item) => item._id === itemId);
    if (!currentItem) {
      console.error("Item not found for ID:", itemId);
      return;
    }

    // Allow empty string for clearing the input
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

    // Only allow numeric input
    const numericValue = inputValue.replace(/\D/g, "");
    if (numericValue !== inputValue) return; // Ignore non-numeric input

    const newQty = Number.parseInt(numericValue) || 0;

    // Optional: Add max limit validation
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

  // Query for locations in move modal
  const { data: locationsData } = useQuery({
    queryKey: ["locations", moveLocationSearch],
    queryFn: async () => {
      const res = await getLocations({
        page: 1,
        limit: 100,
        search: moveLocationSearch,
      });

      // Transform the locations to include both _id and id for compatibility
      if (res?.locations) {
        return {
          ...res,
          locations: res.locations.map((loc) => ({
            ...loc,
            id: loc._id, // Add id field for compatibility
          })),
        };
      }
      return res;
    },
    enabled: isMoveOpen, // Only run query when move modal is open
    staleTime: 0,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    refetchOnMount: true,
  });

  const createInv = useMutation({
    mutationFn: async (body) => {
      if (!body.productId || !body.quantity) {
        throw new Error("Missing required fields");
      }

      const payload = {
        productId: body.productId,
        quantity: String(body.quantity),
        key: body.key,
        // use the normalized isZoneType and fall back safely
        zoneId: isZoneType ? zone?._id || String(zoneId) : String(zoneId),
        ...(isZoneType ? {} : { locationId: body.locationId }),
      };

      const data = await createInventory(payload);
      return data;
    },
    onMutate: () => {
      setIsSaving(true);
    },
    onSuccess: async (data, variables) => {
      try {
        // If no id in response, fallback to refetching inventory and update UI from server
        const hasValidId =
          data?.inventory?._id && isObjectId(data.inventory._id);

        if (!hasValidId) {
          // show updating state while we fetch the latest list
          setIsRefreshing(true);
          try {
            const res = await getInventory(
              isZoneType
                ? { zoneId: type === "zone" ? zone._id : String(zoneId) }
                : {
                    search:
                      type === "zone"
                        ? zone.name
                        : scannedData || activeLocationCode,
                  }
            );
            if (Array.isArray(res?.inventry)) {
              setItems(res.inventry);
              Swal.fire({
                icon: "success",
                title: "Product Added",
                toast: true,
                position: "top-end",
                showConfirmButton: false,
                timer: 2000,
                background: "#10b981",
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
              return;
            }
          } catch (e) {
            console.warn("Refetch after create failed:", e);
          } finally {
            setIsRefreshing(false);
            setIsSaving(false);
          }
        }

        const realInventoryId = hasValidId ? data.inventory._id : undefined;

        const newInventoryItem = {
          _id: realInventoryId,
          productId: variables.productId,
          // omit locationId for zone-level
          ...(isZoneType ? {} : { locationId: variables.locationId }),
          quantity: variables.quantity,
          productData: form.selectedProduct || {
            pro_title: "Product Added Successfully",
            sku: "SKU: " + variables.productId.slice(-6),
          },
          ...(isZoneType
            ? {
                locationData: {
                  // use zone name as grouping label when no location code applies
                  code: zone?.name || "Zone",
                },
              }
            : {
                locationData: {
                  _id: variables.locationId,
                  code: activeLocationCode || scannedData || "Location",
                },
              }),
        };

        if (!isZoneType && !activeLocationCode && scannedData) {
          setActiveLocationCode(scannedData);
        }

        if (realInventoryId) {
          setItems((prev) => [...prev, newInventoryItem]);
        } else {
          // If still no id, do not append optimistic row; UI already refreshed above
        }

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

  // Move inventory item mutation
  const moveItem = useMutation({
    mutationFn: async ({ inventoryId, movedLocationId }) => {
      console.log("Move item mutation started", {
        inventoryId,
        movedLocationId,
      });
      const result = await moveInventoryItem(inventoryId, movedLocationId);
      console.log("Move item mutation completed", result);
      return result;
    },
    onSuccess: async (data, variables) => {
      try {
        // Refetch inventory to update the table
        const res = await getInventory(
          isZoneType
            ? { zoneId: type === "zone" ? zone._id : String(zoneId) }
            : {
                search:
                  type === "zone"
                    ? zone.name
                    : scannedData || activeLocationCode,
              }
        );
        if (Array.isArray(res?.inventry)) {
          setItems(res.inventry);
        }

        // Close modal and reset state
        setIsMoveOpen(false);
        setSelectedItemForMove(null);
        setMoveLocationSearch("");
        setSelectedMoveLocation(null);

        Swal.fire({
          icon: "success",
          title: "Product Moved Successfully",
          text: "The product has been moved to the new location.",
          toast: true,
          position: "top-end",
          showConfirmButton: false,
          timer: 3000,
          background: "#10b981",
          color: "#fff",
        });
      } catch (error) {
        console.error("Error refetching inventory after move:", error);
      }
    },
    onError: (error) => {
      Swal.fire({
        icon: "error",
        title: "Move Failed",
        text: error.message || "Failed to move product to new location",
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
    if (isZoneType) return;

    if (scannedData) {
      setForm((prev) => ({
        ...prev,
        locationId: scannedData,
      }));
      // Also ensure we have the location ID set for the form
      if (locationid) {
        setForm((prev) => ({
          ...prev,
          locationId: locationid,
        }));
      }
      // Set the active location code when scanned data is available
      if (!activeLocationCode) {
        setActiveLocationCode(scannedData);
      }
    }
  }, [isZoneType, scannedData, locationid, activeLocationCode]);

  // Add this effect to refetch products when search changes
  useEffect(() => {
    if (form.typeCode && form.productSearch) {
      const debounce = setTimeout(() => {
        refetchProducts();
      }, 300);
      return () => clearTimeout(debounce);
    }
  }, [form.productSearch, form.typeCode]);

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

    if (!isZoneType) {
      // Ensure we have a valid location ID and location code
      if (!locationid && !type === "zone") {
        Swal.fire({
          icon: "error",
          title: "Location Error",
          text: "No valid location selected. Please scan or search for a location first.",
          toast: true,
          position: "top-end",
          showConfirmButton: false,
          timer: 3000,
          background: "#ef4444",
          color: "#fff",
        });
        return;
      }

      if (!activeLocationCode && !scannedData) {
        Swal.fire({
          icon: "error",
          title: "Location Error",
          text: "No location code available. Please scan or search for a location first.",
          toast: true,
          position: "top-end",
          showConfirmButton: false,
          timer: 3000,
          background: "#ef4444",
          color: "#fff",
        });
        return;
      }
    }

    // Validate quantity is a positive number
    const quantity = Number.parseInt(form.quantity);
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

    createInv.mutate({
      productId: form.productId,
      quantity: String(quantity),
      type: form.typeCode,
      key: "add",
      ...(isZoneType ? {} : { locationId: locationid }),
    });
  };

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

  const isAddDisabled = createInv.isLoading || isRefreshing;
  const addBtnLabel = createInv.isLoading
    ? "Adding..."
    : isRefreshing
    ? "Updating..."
    : "Add Product";
  const addFirstBtnLabel = createInv.isLoading
    ? "Adding..."
    : isRefreshing
    ? "Updating..."
    : "Add First Product";

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-xl border border-border bg-background p-4">
        <div>
          <h2 className="text-lg font-semibold">Inventory</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {totalCount ? `${totalCount} total items` : `${items.length} items`}
          </p>
        </div>
        <div className="relative w-full sm:w-80">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/60" />
          <input
            type="text"
            placeholder="Search product or location…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-3 py-2 border border-border rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500 outline-none duration-300 ease-in-out bg-background text-foreground"
          />
        </div>
      </div>

      {!isZoneType ? (
        <div className="space-y-6">
          {/* location-grouped view */}
          {groups.map(({ locationCode, rows }) => (
            <div
              key={locationCode}
              className="overflow-hidden rounded-lg border"
            >
              <div className="flex items-center justify-between px-4 py-2 bg-white border-b border-gray-200">
                <p className="font-bold text-xl uppercase tracking-wide">
                  {locationCode ? locationCode : zone?.name}
                </p>
                {user?.roles.role !== "Picker" && (
                  <button
                    onClick={() => {
                      setActiveLocationCode(locationCode);
                      const currentLocation = items.find(
                        (item) => item.locationData?.code === locationCode
                      );

                      setForm((prev) => ({
                        ...prev,
                        locationId: isZoneType
                          ? ""
                          : currentLocation?.locationData?._id || locationid,
                        productSearch: "",
                        showProductDropdown: false,
                        type: "",
                        typeCode: "",
                        selectedProduct: null,
                      }));

                      setIsCreateOpen(true);
                    }}
                    disabled={isAddDisabled}
                    className="flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-2 py-1.5 rounded-xl font-medium transition-all duration-200 transform shadow-lg hover:shadow-xl whitespace-nowrap disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    <Plus className="h-4 w-4" />
                    {addBtnLabel}
                  </button>
                )}
              </div>
              <div className="overflow-x-auto">
                {/* Desktop/Table view */}
                <div className="hidden sm:block">
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
                          key={r?._id}
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
                            {r?.productData?.sku || "N/A"}
                          </td>

                          <td className="px-4 py-3 text-sm text-gray-500 border-b">
                            {r?.quantity}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1">
                              {/* Quantity Controls */}
                              <div className="flex items-center rounded-lg overflow-hidden border border-gray-200 shadow-sm bg-gray-50 h-9">
                                <button
                                  disabled={Number(r?.quantity) <= 0}
                                  onClick={() => {
                                    const currentPending =
                                      pendingQtyChanges.get(r?._id);
                                    const baseQty = currentPending
                                      ? currentPending.newQty
                                      : Number(r?.quantity);
                                    const newQty = Math.max(0, baseQty - 1);

                                    setPendingQtyChanges((prev) => {
                                      const newMap = new Map(prev);
                                      newMap.set(r?._id, {
                                        currentQty: Number(r?.quantity),
                                        newQty,
                                        type: "decrease",
                                      });
                                      return newMap;
                                    });
                                  }}
                                  className={`px-3 h-full flex items-center justify-center text-sm duration-300 ease-in-out transition-colors ${
                                    Number(r.quantity) <= 0
                                      ? "text-gray-300 bg-gray-50 cursor-not-allowed"
                                      : "text-red-400 bg-red-100 hover:bg-red-800 hover:text-white"
                                  }`}
                                  title="Decrease by 1"
                                  aria-label={`Decrease quantity for ${r?.productData?.pro_title}`}
                                >
                                  <Minus className="w-4 h-4" />
                                </button>
                                <input
                                  value={
                                    pendingQtyChanges.has(r?._id)
                                      ? pendingQtyChanges.get(r?._id).newQty
                                      : r?.quantity || ""
                                  }
                                  onChange={(e) =>
                                    handleQuantityInputChange(
                                      r?._id,
                                      e.target.value
                                    )
                                  }
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                      const pendingChange =
                                        pendingQtyChanges.get(r?._id);
                                      if (pendingChange) {
                                        const key =
                                          pendingChange.newQty >
                                          pendingChange.currentQty
                                            ? "added"
                                            : "removed";
                                        handleUpdateQty(
                                          r?._id,
                                          pendingChange.newQty,
                                          key
                                        );
                                      }
                                    }
                                  }}
                                  className="w-14 text-center px-3 py-2 text-sm bg-white border-l border-r outline-none focus:ring-2 focus:ring-blue-500 focus:bg-blue-50 transition-colors"
                                  inputMode="numeric"
                                  pattern="[0-9]*"
                                  title="Current quantity - Click to edit manually or press Enter to save"
                                  aria-label={`Quantity for ${r?.productData?.pro_title}`}
                                  placeholder="0"
                                />
                                {user?.roles.role !== "Picker" && (
                                  <button
                                    onClick={() => {
                                      const currentPending =
                                        pendingQtyChanges.get(r?._id);
                                      const baseQty = currentPending
                                        ? currentPending.newQty
                                        : Number(r?.quantity);
                                      const newQty = baseQty + 1;

                                      setPendingQtyChanges((prev) => {
                                        const newMap = new Map(prev);
                                        newMap.set(r?._id, {
                                          currentQty: Number(r?.quantity),
                                          newQty,
                                          type: "increase",
                                        });
                                        return newMap;
                                      });
                                    }}
                                    className="px-3 h-full flex items-center justify-center text-sm duration-300 ease-in-out transition-colors bg-green-100 text-green-600 hover:bg-green-900 hover:text-white"
                                    title="Increase by 1"
                                    aria-label={`Increase quantity for ${r?.productData?.pro_title}`}
                                  >
                                    <Plus className="w-4 h-4" />
                                  </button>
                                )}
                              </div>
                              <button
                                onClick={() => {
                                  setSelectedItemForMove(r);
                                  setIsMoveOpen(true);
                                }}
                                className="px-3 py-2 text-sm bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-medium"
                              >
                                Move
                              </button>
                            </div>

                            {/* Pending Changes Display */}
                            {pendingQtyChanges.has(r?._id) && (
                              <div className="fixed left-0 bottom-0 w-full p-5 bg-white flex flex-col sm:flex-row sm:items-center gap-y-2 justify-between duration-300 ease-in-out">
                                <h2 className="text-xl sm:text-2xl font-bold">
                                  {r?.productData?.pro_title}
                                </h2>
                                <div className="flex items-center max-sm:justify-end space-x-2 b">
                                  <p className="text-sm font-medium text-blue-700">
                                    New qty:{" "}
                                    {pendingQtyChanges.get(r?._id)?.newQty}
                                  </p>
                                  <button
                                    onClick={() => {
                                      const pendingChange =
                                        pendingQtyChanges.get(r?._id);

                                      if (pendingChange) {
                                        const key =
                                          pendingChange.newQty >
                                          pendingChange.currentQty
                                            ? "added"
                                            : "removed";
                                        handleUpdateQty(
                                          r?._id,
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
                                        newMap.delete(r?._id);
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

                {/* Mobile/Card view */}
                <div className="sm:hidden p-3 space-y-3">
                  {rows.map((r, idx) => (
                    <div
                      key={r?._id}
                      className={`rounded-lg border ${
                        idx % 2 !== 0 ? "bg-gray-50" : "bg-white"
                      }`}
                    >
                      <div className="p-4">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div
                              className="text-sm font-semibold"
                              title={r?.productData?.pro_title}
                            >
                              {r?.productData?.pro_title}
                            </div>
                            <div className="mt-1 text-xs text-gray-500 font-mono">
                              {r?.productData?.sku || "N/A"}
                            </div>
                          </div>
                          <div className="text-xs text-gray-600">
                            Qty: {r?.quantity}
                          </div>
                        </div>

                        <div className="mt-3 flex items-center justify-between">
                          <div className="flex items-center rounded-lg overflow-hidden border border-gray-200 bg-gray-50 h-9">
                            <button
                              disabled={Number(r?.quantity) <= 0}
                              onClick={() => {
                                const currentPending = pendingQtyChanges.get(
                                  r?._id
                                );
                                const baseQty = currentPending
                                  ? currentPending.newQty
                                  : Number(r?.quantity);
                                const newQty = Math.max(0, baseQty - 1);

                                setPendingQtyChanges((prev) => {
                                  const newMap = new Map(prev);
                                  newMap.set(r?._id, {
                                    currentQty: Number(r?.quantity),
                                    newQty,
                                    type: "decrease",
                                  });
                                  return newMap;
                                });
                              }}
                              className={`px-3 h-full flex items-center justify-center text-sm ${
                                Number(r.quantity) <= 0
                                  ? "text-gray-300 bg-gray-50 cursor-not-allowed"
                                  : "text-red-400 bg-red-100"
                              }`}
                              title="Decrease by 1"
                              aria-label={`Decrease quantity for ${r?.productData?.pro_title}`}
                            >
                              <Minus className="w-4 h-4" />
                            </button>
                            <input
                              value={
                                pendingQtyChanges.has(r?._id)
                                  ? pendingQtyChanges.get(r?._id).newQty
                                  : r?.quantity || ""
                              }
                              onChange={(e) =>
                                handleQuantityInputChange(
                                  r?._id,
                                  e.target.value
                                )
                              }
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  const pendingChange = pendingQtyChanges.get(
                                    r?._id
                                  );
                                  if (pendingChange) {
                                    const key =
                                      pendingChange.newQty >
                                      pendingChange.currentQty
                                        ? "added"
                                        : "removed";
                                    handleUpdateQty(
                                      r?._id,
                                      pendingChange.newQty,
                                      key
                                    );
                                  }
                                }
                              }}
                              className="w-14 text-center px-3 py-2 text-sm bg-white border-l border-r outline-none focus:ring-2 focus:ring-blue-500"
                              inputMode="numeric"
                              pattern="[0-9]*"
                              placeholder="0"
                              aria-label={`Quantity for ${r?.productData?.pro_title}`}
                            />
                            {user?.roles.role !== "Picker" && (
                              <button
                                onClick={() => {
                                  const currentPending = pendingQtyChanges.get(
                                    r?._id
                                  );
                                  const baseQty = currentPending
                                    ? currentPending.newQty
                                    : Number(r?.quantity);
                                  const newQty = baseQty + 1;

                                  setPendingQtyChanges((prev) => {
                                    const newMap = new Map(prev);
                                    newMap.set(r?._id, {
                                      currentQty: Number(r?.quantity),
                                      newQty,
                                      type: "increase",
                                    });
                                    return newMap;
                                  });
                                }}
                                className="px-3 h-full flex items-center justify-center text-sm bg-green-100 text-green-600"
                                title="Increase by 1"
                                aria-label={`Increase quantity for ${r?.productData?.pro_title}`}
                              >
                                <Plus className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                          <button
                            onClick={() => {
                              setSelectedItemForMove(r);
                              setIsMoveOpen(true);
                            }}
                            className="px-3 py-2 text-sm bg-gray-600 text-white rounded-lg"
                          >
                            Move
                          </button>
                        </div>

                        {pendingQtyChanges.has(r?._id) && (
                          <div className="fixed left-0 bottom-0 w-full p-4 bg-white flex flex-col sm:flex-row sm:items-center gap-y-2 justify-between shadow">
                            <h2 className="text-lg font-bold">
                              {r?.productData?.pro_title}
                            </h2>
                            <div className="flex items-center space-x-2">
                              <p className="text-sm font-medium text-blue-700">
                                New qty: {pendingQtyChanges.get(r?._id)?.newQty}
                              </p>
                              <button
                                onClick={() => {
                                  const pendingChange = pendingQtyChanges.get(
                                    r?._id
                                  );
                                  if (pendingChange) {
                                    const key =
                                      pendingChange.newQty >
                                      pendingChange.currentQty
                                        ? "added"
                                        : "removed";
                                    handleUpdateQty(
                                      r?._id,
                                      pendingChange.newQty,
                                      key
                                    );
                                  }
                                }}
                                className="px-3 py-2 text-sm bg-green-600 text-white rounded-lg"
                              >
                                Validate
                              </button>
                              <button
                                onClick={() => {
                                  setPendingQtyChanges((prev) => {
                                    const newMap = new Map(prev);
                                    newMap.delete(r?._id);
                                    return newMap;
                                  });
                                }}
                                className="px-3 py-2 text-sm bg-gray-600 text-white rounded-lg"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {rows.length === 0 && (
                  <div className="overflow-hidden rounded-lg border">
                    <div className="flex items-center justify-between px-4 py-2 bg-white border-b border-gray-200">
                      <p className="font-bold text-xl uppercase tracking-wide">
                        {scannedData}
                      </p>
                      {scannedData && (
                        <button
                          onClick={() => {
                            setActiveLocationCode(scannedData);
                            setForm((prev) => ({
                              ...prev,
                              locationId: isZoneType ? "" : locationid,
                              productSearch: "",
                              showProductDropdown: false,
                              type: "",
                              typeCode: "",
                              selectedProduct: null,
                            }));
                            setIsCreateOpen(true);
                          }}
                          disabled={isAddDisabled}
                          className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-xl font-medium transition-all duration-200 transform shadow-lg hover:shadow-xl disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                          <Plus className="h-4 w-4" />
                          {addFirstBtnLabel}
                        </button>
                      )}
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
            </div>
          ))}
          {groups.length === 0 && (
            <div className="overflow-hidden rounded-lg border">
              <div className="flex items-center justify-between px-4 py-2 bg-white border-b border-gray-200">
                <p className="font-bold text-xl uppercase tracking-wide">
                  {scannedData}
                </p>
                {scannedData && (
                  <button
                    onClick={() => {
                      setActiveLocationCode(scannedData);
                      // Set the locationId in the form state
                      setForm((prev) => ({
                        ...prev,
                        locationId: isZoneType ? "" : locationid,
                        productSearch: "",
                        showProductDropdown: false,
                        type: "",
                        typeCode: "",
                        selectedProduct: null,
                      }));
                      setIsCreateOpen(true);
                    }}
                    disabled={isAddDisabled}
                    className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-xl font-medium transition-all duration-200 transform shadow-lg hover:shadow-xl disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    <Plus className="h-4 w-4" />
                    {addFirstBtnLabel}
                  </button>
                )}
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
      ) : (
        <>
          {/* zone-level view (flat list) */}
          <div className="space-y-6">
            <div className="overflow-hidden rounded-lg border">
              <div className="flex items-center justify-between px-4 py-2 bg-white border-b border-gray-200">
                <p className="font-bold text-xl uppercase tracking-wide">
                  {zone?.name}
                </p>
                {user?.roles.role !== "Picker" && zone?.name && (
                  <button
                    onClick={() => {
                      setForm((prev) => ({
                        ...prev,
                        productSearch: "",
                        showProductDropdown: false,
                        type: "",
                        typeCode: "",
                        selectedProduct: null,
                      }));

                      setIsCreateOpen(true);
                    }}
                    disabled={isAddDisabled}
                    className="flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-2 py-1.5 rounded-xl font-medium transition-all duration-200 transform shadow-lg hover:shadow-xl whitespace-nowrap disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    <Plus className="h-4 w-4" />
                    {addBtnLabel}
                  </button>
                )}
              </div>
              <div className="overflow-x-auto">
                {/* Desktop/Table view */}
                <div className="hidden sm:block">
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
                      {items.map((r, idx) => (
                        <tr
                          key={r?._id}
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
                            {r?.productData?.sku || "N/A"}
                          </td>

                          <td className="px-4 py-3 text-sm text-gray-500 border-b">
                            {r?.quantity}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1">
                              {/* Quantity Controls */}
                              <div className="flex items-center rounded-lg overflow-hidden border border-gray-200 shadow-sm bg-gray-50 h-9">
                                <button
                                  disabled={Number(r?.quantity) <= 0}
                                  onClick={() => {
                                    const currentPending =
                                      pendingQtyChanges.get(r?._id);
                                    const baseQty = currentPending
                                      ? currentPending.newQty
                                      : Number(r?.quantity);
                                    const newQty = Math.max(0, baseQty - 1);

                                    setPendingQtyChanges((prev) => {
                                      const newMap = new Map(prev);
                                      newMap.set(r?._id, {
                                        currentQty: Number(r?.quantity),
                                        newQty,
                                        type: "decrease",
                                      });
                                      return newMap;
                                    });
                                  }}
                                  className={`px-3 h-full flex items-center justify-center text-sm duration-300 ease-in-out transition-colors ${
                                    Number(r.quantity) <= 0
                                      ? "text-gray-300 bg-gray-50 cursor-not-allowed"
                                      : "text-red-400 bg-red-100 hover:bg-red-800 hover:text-white"
                                  }`}
                                  title="Decrease by 1"
                                  aria-label={`Decrease quantity for ${r?.productData?.pro_title}`}
                                >
                                  <Minus className="w-4 h-4" />
                                </button>
                                <input
                                  value={
                                    pendingQtyChanges.has(r?._id)
                                      ? pendingQtyChanges.get(r?._id).newQty
                                      : r?.quantity || ""
                                  }
                                  onChange={(e) =>
                                    handleQuantityInputChange(
                                      r?._id,
                                      e.target.value
                                    )
                                  }
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                      const pendingChange =
                                        pendingQtyChanges.get(r?._id);
                                      if (pendingChange) {
                                        const key =
                                          pendingChange.newQty >
                                          pendingChange.currentQty
                                            ? "added"
                                            : "removed";
                                        handleUpdateQty(
                                          r?._id,
                                          pendingChange.newQty,
                                          key
                                        );
                                      }
                                    }
                                  }}
                                  className="w-14 text-center px-3 py-2 text-sm bg-white border-l border-r outline-none focus:ring-2 focus:ring-blue-500 focus:bg-blue-50 transition-colors"
                                  inputMode="numeric"
                                  pattern="[0-9]*"
                                  title="Current quantity - Click to edit manually or press Enter to save"
                                  aria-label={`Quantity for ${r?.productData?.pro_title}`}
                                  placeholder="0"
                                />
                                {user?.roles.role !== "Picker" && (
                                  <button
                                    onClick={() => {
                                      const currentPending =
                                        pendingQtyChanges.get(r?._id);
                                      const baseQty = currentPending
                                        ? currentPending.newQty
                                        : Number(r?.quantity);
                                      const newQty = baseQty + 1;

                                      setPendingQtyChanges((prev) => {
                                        const newMap = new Map(prev);
                                        newMap.set(r?._id, {
                                          currentQty: Number(r?.quantity),
                                          newQty,
                                          type: "increase",
                                        });
                                        return newMap;
                                      });
                                    }}
                                    className="px-3 h-full flex items-center justify-center text-sm duration-300 ease-in-out transition-colors bg-green-100 text-green-600 hover:bg-green-900 hover:text-white"
                                    title="Increase by 1"
                                    aria-label={`Increase quantity for ${r?.productData?.pro_title}`}
                                  >
                                    <Plus className="w-4 h-4" />
                                  </button>
                                )}
                              </div>
                              <button
                                onClick={() => {
                                  setSelectedItemForMove(r);
                                  setIsMoveOpen(true);
                                }}
                                className="px-3 py-2 text-sm bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-medium"
                              >
                                Move
                              </button>
                            </div>

                            {/* Pending Changes Display */}
                            {pendingQtyChanges.has(r?._id) && (
                              <div className="fixed left-0 bottom-0 w-full p-5 bg-white flex flex-col sm:flex-row sm:items-center gap-y-2 justify-between duration-300 ease-in-out">
                                <h2 className="text-xl sm:text-2xl font-bold">
                                  {r?.productData?.pro_title}
                                </h2>
                                <div className="flex items-center max-sm:justify-end space-x-2 b">
                                  <p className="text-sm font-medium text-blue-700">
                                    New qty:{" "}
                                    {pendingQtyChanges.get(r?._id)?.newQty}
                                  </p>
                                  <button
                                    onClick={() => {
                                      const pendingChange =
                                        pendingQtyChanges.get(r?._id);

                                      if (pendingChange) {
                                        const key =
                                          pendingChange.newQty >
                                          pendingChange.currentQty
                                            ? "added"
                                            : "removed";
                                        handleUpdateQty(
                                          r?._id,
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
                                        newMap.delete(r?._id);
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

                {/* Mobile/Card view */}
                <div className="sm:hidden p-3 space-y-3">
                  {items.map((r, idx) => (
                    <div
                      key={r?._id}
                      className={`rounded-lg border ${
                        idx % 2 !== 0 ? "bg-gray-50" : "bg-white"
                      }`}
                    >
                      <div className="p-4">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div
                              className="text-sm font-semibold"
                              title={r?.productData?.pro_title}
                            >
                              {r?.productData?.pro_title}
                            </div>
                            <div className="mt-1 text-xs text-gray-500 font-mono">
                              {r?.productData?.sku || "N/A"}
                            </div>
                          </div>
                          <div className="text-xs text-gray-600">
                            Qty: {r?.quantity}
                          </div>
                        </div>

                        <div className="mt-3 flex items-center justify-between">
                          <div className="flex items-center rounded-lg overflow-hidden border border-gray-200 bg-gray-50 h-9">
                            <button
                              disabled={Number(r?.quantity) <= 0}
                              onClick={() => {
                                const currentPending = pendingQtyChanges.get(
                                  r?._id
                                );
                                const baseQty = currentPending
                                  ? currentPending.newQty
                                  : Number(r?.quantity);
                                const newQty = Math.max(0, baseQty - 1);

                                setPendingQtyChanges((prev) => {
                                  const newMap = new Map(prev);
                                  newMap.set(r?._id, {
                                    currentQty: Number(r?.quantity),
                                    newQty,
                                    type: "decrease",
                                  });
                                  return newMap;
                                });
                              }}
                              className={`px-3 h-full flex items-center justify-center text-sm ${
                                Number(r.quantity) <= 0
                                  ? "text-gray-300 bg-gray-50 cursor-not-allowed"
                                  : "text-red-400 bg-red-100"
                              }`}
                              title="Decrease by 1"
                              aria-label={`Decrease quantity for ${r?.productData?.pro_title}`}
                            >
                              <Minus className="w-4 h-4" />
                            </button>
                            <input
                              value={
                                pendingQtyChanges.has(r?._id)
                                  ? pendingQtyChanges.get(r?._id).newQty
                                  : r?.quantity || ""
                              }
                              onChange={(e) =>
                                handleQuantityInputChange(
                                  r?._id,
                                  e.target.value
                                )
                              }
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  const pendingChange = pendingQtyChanges.get(
                                    r?._id
                                  );
                                  if (pendingChange) {
                                    const key =
                                      pendingChange.newQty >
                                      pendingChange.currentQty
                                        ? "added"
                                        : "removed";
                                    handleUpdateQty(
                                      r?._id,
                                      pendingChange.newQty,
                                      key
                                    );
                                  }
                                }
                              }}
                              className="w-14 text-center px-3 py-2 text-sm bg-white border-l border-r outline-none focus:ring-2 focus:ring-blue-500"
                              inputMode="numeric"
                              pattern="[0-9]*"
                              placeholder="0"
                              aria-label={`Quantity for ${r?.productData?.pro_title}`}
                            />
                            {user?.roles.role !== "Picker" && (
                              <button
                                onClick={() => {
                                  const currentPending = pendingQtyChanges.get(
                                    r?._id
                                  );
                                  const baseQty = currentPending
                                    ? currentPending.newQty
                                    : Number(r?.quantity);
                                  const newQty = baseQty + 1;

                                  setPendingQtyChanges((prev) => {
                                    const newMap = new Map(prev);
                                    newMap.set(r?._id, {
                                      currentQty: Number(r?.quantity),
                                      newQty,
                                      type: "increase",
                                    });
                                    return newMap;
                                  });
                                }}
                                className="px-3 h-full flex items-center justify-center text-sm bg-green-100 text-green-600"
                                title="Increase by 1"
                                aria-label={`Increase quantity for ${r?.productData?.pro_title}`}
                              >
                                <Plus className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                          <button
                            onClick={() => {
                              setSelectedItemForMove(r);
                              setIsMoveOpen(true);
                            }}
                            className="px-3 py-2 text-sm bg-gray-600 text-white rounded-lg"
                          >
                            Move
                          </button>
                        </div>

                        {pendingQtyChanges.has(r?._id) && (
                          <div className="fixed left-0 bottom-0 w-full p-4 bg-white flex flex-col sm:flex-row sm:items-center gap-y-2 justify-between shadow">
                            <h2 className="text-lg font-bold">
                              {r?.productData?.pro_title}
                            </h2>
                            <div className="flex items-center space-x-2">
                              <p className="text-sm font-medium text-blue-700">
                                New qty: {pendingQtyChanges.get(r?._id)?.newQty}
                              </p>
                              <button
                                onClick={() => {
                                  const pendingChange = pendingQtyChanges.get(
                                    r?._id
                                  );
                                  if (pendingChange) {
                                    const key =
                                      pendingChange.newQty >
                                      pendingChange.currentQty
                                        ? "added"
                                        : "removed";
                                    handleUpdateQty(
                                      r?._id,
                                      pendingChange.newQty,
                                      key
                                    );
                                  }
                                }}
                                className="px-3 py-2 text-sm bg-green-600 text-white rounded-lg"
                              >
                                Validate
                              </button>
                              <button
                                onClick={() => {
                                  setPendingQtyChanges((prev) => {
                                    const newMap = new Map(prev);
                                    newMap.delete(r?._id);
                                    return newMap;
                                  });
                                }}
                                className="px-3 py-2 text-sm bg-gray-600 text-white rounded-lg"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {items.length === 0 && (
                  <div className="overflow-hidden rounded-lg border">
                    <div className="flex items-center justify-between px-4 py-2 bg-white border-b border-gray-200">
                      <p className="font-bold text-xl uppercase tracking-wide">
                        {scannedData}
                      </p>
                      {scannedData && (
                        <button
                          onClick={() => {
                            setActiveLocationCode(scannedData);
                            setForm((prev) => ({
                              ...prev,
                              locationId: isZoneType ? "" : locationid,
                              productSearch: "",
                              showProductDropdown: false,
                              type: "",
                              typeCode: "",
                              selectedProduct: null,
                            }));
                            setIsCreateOpen(true);
                          }}
                          disabled={isAddDisabled}
                          className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-xl font-medium transition-all duration-200 transform shadow-lg hover:shadow-xl disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                          <Plus className="h-4 w-4" />
                          {addFirstBtnLabel}
                        </button>
                      )}
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
            </div>
          </div>
        </>
      )}
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
              {/* Location or Zone */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {isZoneType ? "Zone" : "Location"}
                </label>
                <div className="w-full rounded-md border px-3 py-2 text-sm bg-gray-50 text-gray-600">
                  {isZoneType
                    ? zone?.name || "Zone"
                    : activeLocationCode || scannedData}
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
                                  productSearch: p.pro_title || p?.sku,
                                  showProductDropdown: false,
                                  selectedProduct: p, // Store the selected product
                                }));
                              }}
                              className="px-3 py-2 hover:bg-gray-100 cursor-pointer text-sm border-b last:border-b-0"
                            >
                              <div className="font-medium">{p?.pro_title}</div>
                              <div className="text-xs text-gray-500">
                                {p?.sku}
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
                  disabled={isSaving || !form.productId || !form.quantity}
                  className="px-4 py-2 text-sm rounded-lg bg-blue-600 text-white disabled:opacity-60 flex items-center gap-2"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Saving…
                    </>
                  ) : (
                    "Save"
                  )}
                </button>
              </div>
            </form>
          </div>
        </Modal>
      </div>

      {/* Move Modal */}
      <div ref={fullscreenRef}>
        <Modal
          getContainer={getContainer}
          key={String(isFullscreen)}
          open={isMoveOpen}
          onCancel={() => {
            setIsMoveOpen(false);
            setSelectedItemForMove(null);
            setMoveLocationSearch("");
            setSelectedMoveLocation(null);
            setShowLocationDropdown(false);
          }}
          centered
          footer={null}
          width={500}
          closable={true}
          title="Move Product"
          className="max-h-[95vh] overflow-y-auto"
        >
          <div className="space-y-4">
            {/* Product Info */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm text-gray-700">
                <span className="font-medium">Product:</span>{" "}
                {selectedItemForMove?.productData?.pro_title}
              </p>
            </div>

            {/* Location Selection */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Select New Location
              </label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search locations..."
                  value={moveLocationSearch}
                  onChange={(e) => {
                    setMoveLocationSearch(e.target.value);
                    setShowLocationDropdown(true);
                  }}
                  onFocus={() => setShowLocationDropdown(true)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-colors"
                />
                {showLocationDropdown &&
                  locationsData?.locations &&
                  locationsData.locations.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-60 overflow-y-auto">
                      {locationsData.locations
                        .filter(
                          (loc) =>
                            loc.code !== selectedItemForMove?.locationData?.code
                        ) // Exclude current location
                        .map((loc) => (
                          <div
                            key={loc?.id}
                            onClick={() => {
                              setSelectedMoveLocation(loc);
                              setMoveLocationSearch(loc.code);
                              setShowLocationDropdown(false);
                            }}
                            className="px-3 py-2 hover:bg-gray-100 cursor-pointer text-sm border-b last:border-b-0"
                          >
                            <div className="font-medium">{loc.code}</div>
                            <div className="text-xs text-gray-500 capitalize">
                              {loc.type}
                            </div>
                          </div>
                        ))}
                    </div>
                  )}
              </div>
            </div>

            {/* Selected Location Display */}
            {selectedMoveLocation && (
              <div className="bg-blue-50 p-3 rounded-lg">
                <p className="text-sm font-medium text-blue-900">
                  Moving to:{" "}
                  <span className="font-bold">{selectedMoveLocation.code}</span>
                </p>
                <p className="text-xs text-blue-700 capitalize">
                  {selectedMoveLocation.type}
                </p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t">
              <button
                type="button"
                onClick={() => {
                  setIsMoveOpen(false);
                  setSelectedItemForMove(null);
                  setMoveLocationSearch("");
                  setSelectedMoveLocation(null);
                  setShowLocationDropdown(false);
                }}
                className="px-4 py-2 text-sm rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (!selectedMoveLocation) {
                    Swal.fire({
                      icon: "warning",
                      title: "No Location Selected",
                      text: "Please select a location to move the product to.",
                      toast: true,
                      position: "top-end",
                      showConfirmButton: false,
                      timer: 3000,
                      background: "#f59e0b",
                      color: "#fff",
                    });
                    return;
                  }

                  // Find the valid inventory ID
                  let inventoryId = selectedItemForMove._id;
                  if (!isObjectId(inventoryId)) {
                    if (
                      selectedItemForMove.inventoryId &&
                      isObjectId(selectedItemForMove.inventoryId)
                    ) {
                      inventoryId = selectedItemForMove.inventoryId;
                    } else {
                      Swal.fire({
                        icon: "error",
                        title: "Invalid Item",
                        text: "This item doesn't have a valid server ID. Please refresh and try again.",
                        toast: true,
                        position: "top-end",
                        showConfirmButton: false,
                        timer: 3000,
                        background: "#ef4444",
                        color: "#fff",
                      });
                      return;
                    }
                  }

                  console.log("Calling move mutation with:", {
                    inventoryId,
                    movedLocationId: selectedMoveLocation.id,
                    selectedMoveLocation,
                  });

                  moveItem.mutate({
                    inventoryId,
                    movedLocationId: selectedMoveLocation.id,
                  });
                }}
                disabled={moveItem.isLoading || !selectedMoveLocation}
                className="px-4 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
              >
                {moveItem.isLoading ? "Moving..." : "Move"}
              </button>
            </div>
          </div>
        </Modal>
      </div>
    </div>
  );
}
