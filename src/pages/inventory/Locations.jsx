import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getWarehouse,
  getLocations,
  createLocation,
  updateLocation,
  deleteLocation,
  getZonesByWarehouse,
  importLocationsCSV,
} from "../../api/warehouse";
import { useAuth } from "../../contexts/AuthContext.jsx";
import Swal from "sweetalert2";

// Import components
import LocationHeader from "./components/LocationHeader.jsx";
import LocationSearch from "./components/LocationSearch.jsx";
import LocationTable from "./components/LocationTable.jsx";
import LocationPagination from "./components/LocationPagination.jsx";
import LocationForm from "./components/LocationForm.jsx";
import LocationPrintModal from "./components/LocationPrintModal.jsx";

export default function Locations() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const queryClient = useQueryClient();
  const warehouseId = useSelector((s) => s.app.selectedWarehouseId);
  const zoneId = useSelector((s) => s.app.selectedZoneId);
  const { user } = useAuth();
  const role = user?.roles.role;

  // State management
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [sortField, setSortField] = useState("code");
  const [sortOrder, setSortOrder] = useState("asc");
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  // Modal states
  const [showNew, setShowNew] = useState(false);
  const [editing, setEditing] = useState(null);
  const [printOpen, setPrintOpen] = useState(false);

  // Debounced search effect
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fetch warehouse for breadcrumb
  const { data: warehouseRes } = useQuery({
    queryKey: ["warehouse", warehouseId],
    queryFn: () => (warehouseId ? getWarehouse(warehouseId) : null),
    enabled: !!warehouseId,
    staleTime: 5 * 60 * 1000,
  });
  const warehouseName =
    warehouseRes?.warehouse?.name || warehouseRes?.name || "";

  // Fetch zones to resolve selected zone name for breadcrumb
  const { data: zonesRes } = useQuery({
    queryKey: ["zones", warehouseId],
    queryFn: () => (warehouseId ? getZonesByWarehouse(warehouseId) : null),
    enabled: !!warehouseId,
    staleTime: 60 * 1000,
  });

  const zoneName = useMemo(() => {
    const list = Array.isArray(zonesRes?.zones) ? zonesRes.zones : [];
    const match = list.find((z) => (z.id ?? z._id) === zoneId);
    return match?.name || "";
  }, [zonesRes, zoneId]);

  // Fetch locations with backend pagination and search
  const {
    data: locationsRes,
    isLoading,
    error,
  } = useQuery({
    queryKey: [
      "locations",
      warehouseId,
      zoneId,
      page,
      limit,
      debouncedSearchQuery,
      sortOrder,
    ],
    enabled: !!warehouseId && !!zoneId,
    staleTime: 60 * 1000,
    queryFn: async () => {
      const res = await getLocations({
        page,
        limit,
        search: debouncedSearchQuery,
        warehouseId,
        zoneId,
        sortOrder,
      });

      const list = Array.isArray(res?.locations)
        ? res.locations
        : Array.isArray(res)
        ? res
        : [];

      return {
        locations: list.map((l) => ({
          id: l._id,
          code: l.code,
          type: String(l.type || "").toLowerCase(),
          warehouseId:
            typeof l.warehouse === "string"
              ? l?.warehouse
              : l?.warehouse?._id ?? null,
          zoneId: typeof l?.zone === "string" ? l?.zone : l?.zone?._id ?? null,
          qrcode: l?.qrcode || l?.qrPath || null,
        })),
        total:
          res?.totalCount || res?.total || res?.totalLocations || list.length,
      };
    },
  });

  const locations = locationsRes?.locations || [];
  const total = locationsRes?.total || 0;

  // compute shelf set and helpers for validations
  const shelfCodesSet = useMemo(() => {
    const s = new Set();
    for (const l of locations) {
      if ((l.type || "").toLowerCase() === "shelf" && l.code) {
        s.add(String(l.code));
      }
    }
    return s;
  }, [locations]);

  const hasShelves = shelfCodesSet.size > 0;

  const existsLocationCode = (code) =>
    locations.some((l) => String(l.code) === String(code));

  const existsShelfBase = (base) => shelfCodesSet.has(String(base));

  // Handle sorting
  const handleSort = (field) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
    setPage(1);
  };

  // Mutations
  const createMut = useMutation({
    mutationFn: (payload) => createLocation(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["locations", warehouseId, zoneId],
      });
      setShowNew(false);
      Swal.fire({
        icon: "success",
        title: "Location Created!",
        text: "The new location has been successfully created.",
        toast: true,
        position: "top-end",
        showConfirmButton: false,
        timer: 3000,
        timerProgressBar: true,
        background: "#10b981",
        color: "#fff",
      });
    },
  });

  const updateMut = useMutation({
    mutationFn: ({ id, payload }) => updateLocation(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["locations", warehouseId, zoneId],
      });
      setEditing(null);
    },
  });

  const bulkDeleteMut = useMutation({
    mutationFn: async (ids) => {
      const results = await Promise.allSettled(
        ids.map((id) => deleteLocation(id))
      );
      return results;
    },
    onSuccess: (results) => {
      const successCount = results.filter(
        (r) => r.status === "fulfilled"
      ).length;
      const failedCount = results.filter((r) => r.status === "rejected").length;

      if (successCount > 0) {
        queryClient.invalidateQueries({
          queryKey: ["locations", warehouseId, zoneId],
        });
        setSelectedIds(new Set());

        Swal.fire({
          icon: "success",
          title: "Bulk Delete Successful!",
          text: `Successfully deleted ${successCount} location${
            successCount !== 1 ? "s" : ""
          }${failedCount > 0 ? ` (${failedCount} failed)` : ""}`,
          toast: true,
          position: "top-end",
          showConfirmButton: false,
          timer: 3000,
          timerProgressBar: true,
          background: "#10b981",
          color: "#fff",
        });
      }

      if (failedCount > 0) {
        Swal.fire({
          icon: "warning",
          title: "Some Deletions Failed",
          text: `${failedCount} location${
            failedCount !== 1 ? "s" : ""
          } could not be deleted`,
          toast: true,
          position: "top-end",
          showConfirmButton: false,
          timer: 4000,
          timerProgressBar: true,
          background: "#f59e0b",
          color: "#fff",
        });
      }
    },
    onError: (error) => {
      Swal.fire({
        icon: "error",
        title: "Bulk Delete Failed",
        text: error.message || "Failed to delete selected locations",
        toast: true,
        position: "top-end",
        showConfirmButton: false,
        timer: 4000,
        timerProgressBar: true,
        background: "#ef4444",
        color: "#fff",
      });
    },
  });

  // Handle CSV file upload
  const handleCSVUpload = async (event) => {
    if (!zoneId) {
      Swal.fire({
        icon: "warning",
        title: "Select Zone",
        text: "Please select a zone first before importing CSV.",
        showConfirmButton: false,
        timer: 3000,
        background: "#f59e0b",
        color: "#fff",
      });
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    const file = event.target.files[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith(".csv")) {
      Swal.fire({
        icon: "error",
        title: "Invalid File",
        text: "Please select a CSV file",
      });
      return;
    }

    setUploading(true);

    try {
      const result = await importLocationsCSV(file);
      Swal.fire({
        icon: "success",
        title: "CSV Import Successful!",
        text: result.message || "Locations have been imported successfully",
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
    } catch (error) {
      Swal.fire({
        icon: "error",
        title: "Import Failed",
        text:
          error.response?.data?.message ||
          error.message ||
          "Failed to import CSV file",
        toast: true,
        position: "top-end",
        showConfirmButton: false,
        timer: 4000,
        timerProgressBar: true,
        background: "#ef4444",
        color: "#fff",
        customClass: {
          popup: "rounded-lg",
        },
      });
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  // Handle Import CSV button click
  const handleImportCSVClick = () => {
    if (!zoneId) {
      Swal.fire({
        icon: "warning",
        title: "Select Zone",
        text: "Please select a zone first before importing CSV.",
        showConfirmButton: false,
        timer: 3000,
        background: "#f59e0b",
        color: "#fff",
      });
      return;
    }
    fileInputRef.current?.click();
  };

  // Selection handlers
  const toggleSelected = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSelectAll = (checked) => {
    if (checked) {
      const allIds = locations.map((loc) => loc.id);
      setSelectedIds(new Set(allIds));
    } else {
      setSelectedIds(new Set());
    }
  };

  // Modal handlers
  const handleOpenNew = () => {
    if (!zoneId) {
      Swal.fire({
        icon: "warning",
        title: "Select Zone",
        text: "Please select a zone first before adding a location.",
        position: "center",
        showConfirmButton: false,
        timer: 3000,
        background: "#f59e0b",
        color: "#fff",
      });
      return;
    }
    if (!hasShelves) setShowNew(true);
    setShowNew(true);
  };

  const handleEditLocation = (location) => {
    setEditing(location);
  };

  // Form submission handlers
  const handleCreateLocation = (formData) => {
    const { type, code } = formData;

    // If creating a shelf: prevent duplicates
    if (type === "shelf") {
      if (existsLocationCode(code)) {
        Swal.fire({
          icon: "warning",
          title: "Duplicate Shelf",
          text: `Shelf "${code}" already exists in this zone.`,
        });
        return;
      }
    }

    // If creating a bin: require parent shelf exists
    if (type === "bin") {
      const base = code.replace(/-BIN-\d+$/, "");
      if (!existsShelfBase(base)) {
        Swal.fire({
          icon: "warning",
          title: "Missing Shelf",
          text: `Shelf "${base}" doesn't exist. Create the shelf first to add a BIN.`,
        });
        return;
      }
      if (existsLocationCode(code)) {
        Swal.fire({
          icon: "warning",
          title: "Duplicate BIN",
          text: `BIN "${code}" already exists in this zone.`,
        });
        return;
      }
    }

    createMut.mutate({
      type,
      code,
      warehouse: String(warehouseId),
      zone: String(zoneId),
    });
  };

  const handleUpdateLocation = (formData) => {
    if (!editing) return;

    const { type, code } = formData;

    // If editing to shelf, ensure duplicate shelf code does not exist on a different item
    if (type === "shelf") {
      const duplicate = locations.find(
        (l) => l.code === code && String(l.id) !== String(editing.id)
      );
      if (duplicate) {
        Swal.fire({
          icon: "warning",
          title: "Duplicate Shelf",
          text: `Another shelf with code "${code}" already exists.`,
        });
        return;
      }
    }

    // If editing to bin, ensure parent shelf exists
    if (type === "bin") {
      const base = code.replace(/-BIN-\d+$/, "");
      if (!existsShelfBase(base)) {
        Swal.fire({
          icon: "warning",
          title: "Missing Shelf",
          text: `Shelf "${base}" doesn't exist. Create the shelf first to add a BIN.`,
        });
        return;
      }
      const duplicateBin = locations.find(
        (l) => l.code === code && String(l.id) !== String(editing.id)
      );
      if (duplicateBin) {
        Swal.fire({
          icon: "warning",
          title: "Duplicate BIN",
          text: `Another BIN with code "${code}" already exists.`,
        });
        return;
      }
    }

    updateMut.mutate({
      id: editing.id,
      payload: {
        type,
        code,
        warehouse: String(warehouseId),
        zone: String(zoneId),
      },
    });
  };

  return (
    <div className="max-w-7xl mx-auto p-2 space-y-6">
      <LocationHeader
        warehouseName={warehouseName}
        zoneName={zoneName}
        zoneId={zoneId}
        warehouseId={warehouseId}
        locations={locations}
        role={role}
        onOpenNew={handleOpenNew}
        onOpenPrint={() => setPrintOpen(true)}
        onImportCSV={handleImportCSVClick}
        uploading={uploading}
      />

      <LocationSearch
        searchQuery={searchQuery}
        onSearchChange={(value) => {
          setPage(1);
          setSearchQuery(value);
        }}
        onClearSearch={() => {
          setSearchQuery("");
          setPage(1);
        }}
      />

      {/* Locations Grid */}
      <div className="overflow-x-auto bg-white rounded-xl shadow">
        <LocationTable
          locations={locations}
          isLoading={isLoading}
          error={error}
          selectedIds={selectedIds}
          onToggleSelected={toggleSelected}
          onSelectAll={handleSelectAll}
          onEditLocation={handleEditLocation}
          sortField={sortField}
          sortOrder={sortOrder}
          onSort={handleSort}
          role={role}
          onOpenNew={handleOpenNew}
        />
      </div>

      {/* Pagination */}
      {total > 0 && (
        <LocationPagination
          total={total}
          page={page}
          limit={limit}
          onPageChange={setPage}
          onLimitChange={(newLimit) => {
            setPage(1);
            setLimit(newLimit);
          }}
          searchQuery={searchQuery}
        />
      )}

      {/* Location Form Modal */}
      <LocationForm
        isOpen={showNew}
        onClose={() => setShowNew(false)}
        onSubmit={handleCreateLocation}
        isEditing={false}
        hasShelves={hasShelves}
        isLoading={createMut.isPending}
      />

      {/* Edit Location Form Modal */}
      <LocationForm
        isOpen={!!editing}
        onClose={() => setEditing(null)}
        onSubmit={handleUpdateLocation}
        isEditing={true}
        location={editing}
        hasShelves={hasShelves}
        isLoading={updateMut.isPending}
      />

      {/* Print Modal */}
      <LocationPrintModal
        isOpen={printOpen}
        onClose={() => setPrintOpen(false)}
        locations={locations}
        selectedIds={selectedIds}
        zoneName={zoneName}
      />

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv"
        onChange={handleCSVUpload}
        style={{ display: "none" }}
      />
    </div>
  );
}
