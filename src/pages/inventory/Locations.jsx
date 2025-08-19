import { useEffect, useMemo, useRef, useState } from "react";
import {
  FiArrowLeft,
  FiPlus,
  FiX,
  FiTrash2,
  FiEdit2,
  FiPrinter,
  FiMapPin,
  FiPackage,
  FiAlertCircle,
  FiDownload,
  FiRefreshCw,
} from "react-icons/fi";
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
import { setSelectedZoneId } from "../../store/appSlice.js";
import html2canvas from "html2canvas-pro";
import jsPDF from "jspdf";
import Swal from "sweetalert2";
import { QRCodeSVG } from "qrcode.react";
import Skeleton from "react-loading-skeleton";
import "react-loading-skeleton/dist/skeleton.css";
import useFullscreen from "../../components/useFullscreen.jsx";
import { Modal } from "antd";

export default function Locations() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const queryClient = useQueryClient();
  const warehouseId = useSelector((s) => s.app.selectedWarehouseId);
  const zoneId = useSelector((s) => s.app.selectedZoneId);
  // New location fields
  const [newRow, setNewRow] = useState("");
  const [newBay, setNewBay] = useState("");
  const [newShelf, setNewShelf] = useState("");
  const [newBin, setNewBin] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  const [newErrors, setNewErrors] = useState({});
  const [editErrors, setEditErrors] = useState({});
  const { ref: fullscreenRef, isFullscreen, getContainer } = useFullscreen();

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

  // Fetch locations for selected warehouse+zone
  const {
    data: locationsRes,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["locations", warehouseId, zoneId],
    enabled: !!warehouseId && !!zoneId,
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
          id: l._id,
          code: l.code,
          type: String(l.type || "").toLowerCase(),
          warehouseId:
            typeof l.warehouse === "string"
              ? l?.warehouse
              : l?.warehouse?._id ?? null,
          zoneId: typeof l?.zone === "string" ? l?.zone : l?.zone?._id ?? null,
          qrcode: l?.qrcode || l?.qrPath || null,
        }))
        .filter((l) => l?.warehouseId === warehouseId && l?.zoneId === zoneId);
    },
  });

  const locations = locationsRes || [];
  console.log(locations.map((l) => l.id));

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

  // Create/Edit state
  const [showNew, setShowNew] = useState(false);
  // We build the code from individual fields
  const [newType, setNewType] = useState("shelf");
  const [newError, setNewError] = useState("");
  const [printOpen, setPrintOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [downloading, setDownloading] = useState(false);
  const printRef = useRef(null);

  const [editing, setEditing] = useState(null);
  const [editCode, setEditCode] = useState("");
  const [editType, setEditType] = useState("shelf");
  const [editRow, setEditRow] = useState("");
  const [editBay, setEditBay] = useState("");
  const [editShelf, setEditShelf] = useState("");
  const [editBin, setEditBin] = useState("");
  const [editError, setEditError] = useState("");

  // Mutations
  const createMut = useMutation({
    mutationFn: (payload) => createLocation(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["locations", warehouseId, zoneId],
      });
      setShowNew(false);
      setNewRow("");
      setNewBay("");
      setNewShelf("");
      setNewBin("");
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
      // Delete locations one by one
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
    // if zone not selected, block and clear the input
    if (!zoneId) {
      Swal.fire({
        icon: "warning",
        title: "Select Zone",
        text: "Please select a zone first before importing CSV.",
        // toast: true,
        // position: "top-end",
        showConfirmButton: false,
        timer: 3000,
        // timerProgressBar: true,
        background: "#f59e0b",
        color: "#fff",
      });
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    const file = event.target.files[0];

    if (!file) {
      return;
    }

    // Validate file type
    if (!file.name.toLowerCase().endsWith(".csv")) {
      message.error("Please select a CSV file");
      return;
    }

    setUploading(true);

    try {
      const result = await importLocationsCSV(file);
      console.log("result", result);
      // Show success message
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

      // Refresh the product list
      // refetch();
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
      // Reset file input
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
        // toast: true,
        // position: "top-end",
        showConfirmButton: false,
        timer: 3000,
        // timerProgressBar: true,
        background: "#f59e0b",
        color: "#fff",
      });
      return;
    }
    fileInputRef.current?.click();
  };

  const toggleSelected = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Handle select all
  const handleSelectAll = (checked) => {
    if (checked) {
      const allIds = locations.map((loc) => loc.id);
      setSelectedIds(new Set(allIds));
    } else {
      setSelectedIds(new Set());
    }
  };

  // Handle row click selection
  const handleRowClick = (id) => {
    toggleSelected(id);
  };

  // Check if all items are selected
  const isAllSelected =
    locations.length > 0 && selectedIds.size === locations.length;
  const isIndeterminate =
    selectedIds.size > 0 && selectedIds.size < locations.length;

  const openPrint = () => setPrintOpen(true);
  const closePrint = () => setPrintOpen(false);

  const generatePDF = async () => {
    const node = printRef.current;
    if (!node) return;

    try {
      setDownloading(true);
      await generatePDFFromNode({
        node,
        fileName: "locations_labels.pdf",
        scale: 2,
        html2canvas,
        jsPDF,
        onProgress: ({ downloading, warning, error }) => {
          setDownloading(Boolean(downloading));
          if (warning) console.warn(warning);
          if (error) console.error(error);
        },
      });
    } catch (err) {
      Swal.fire(
        "Error",
        "Failed to generate PDF. Check console for details.",
        "error"
      );
    } finally {
      setDownloading(false);
    }
  };

  // NEW: open modal only if zone is selected
  const handleOpenNew = () => {
    if (!zoneId) {
      Swal.fire({
        icon: "warning",
        title: "Select Zone",
        text: "Please select a zone first before adding a location.",
        position: "center",
        showConfirmButton: false,
        timer: 3000,
        // timerProgressBar: true,
        background: "#f59e0b",
        color: "#fff",
      });
      return;
    }
    // default to shelf if no shelves exist (hide bin option)
    if (!hasShelves) setNewType("shelf");
    setShowNew(true);
  };

  // Handlers
  // Helpers for input sanitization and code building
  const sanitizeRow = (v) =>
    v
      .replace(/[^A-Za-z]/g, "")
      .toUpperCase()
      .slice(0, 1);
  // returns "" when value is empty or zero, otherwise returns "1".."99"
  const sanitizeNum2 = (v) => {
    // keep only digits, remove leading zeros
    const cleaned = String(v || "")
      .replace(/[^0-9]/g, "")
      .replace(/^0+/, "");
    if (!cleaned) return "";
    const n = parseInt(cleaned.slice(0, 2), 10);
    return n > 0 ? String(n) : "";
  };

  const buildCode = (row, bay, shelf, type, binNum) => {
    const base = `${row}-${bay}-${shelf}`;
    return type === "bin" ? `${base}-BIN-${binNum}` : base;
  };

  // Handlers
  const onCreate = (e) => {
    e.preventDefault();

    if (!validateNew()) {
      return; // will show inline errors
    }

    // Ensure zone still present (double-check)
    if (!zoneId) {
      Swal.fire({
        icon: "warning",
        title: "Select Zone",
        text: "Please select a zone first before adding a location.",
      });
      return;
    }

    const row = sanitizeRow(newRow);
    const bay = sanitizeNum2(newBay);
    const shelf = sanitizeNum2(newShelf);
    const binNum = sanitizeNum2(newBin);

    if (!row || !bay || !shelf || (newType === "bin" && !binNum)) {
      setNewError(
        "Please enter row (A), bay (1-99), shelf (1-99) and bin (1-99 for BIN type)."
      );
      return;
    }
    setNewError("");

    const base = `${row}-${bay}-${shelf}`;
    const code = buildCode(row, bay, shelf, newType, binNum);

    // If creating a shelf: prevent duplicates
    if (newType === "shelf") {
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
    if (newType === "bin") {
      if (!existsShelfBase(base)) {
        Swal.fire({
          icon: "warning",
          title: "Missing Shelf",
          text: `Shelf "${base}" doesn't exist. Create the shelf first to add a BIN.`,
        });
        return;
      }
      // prevent duplicate bin codes too
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
      type: newType,
      code,
      warehouse: String(warehouseId),
      zone: String(zoneId),
    });
  };

  const onEditSubmit = (e) => {
    e.preventDefault();
    if (!editing) return;

    if (!validateEdit()) {
      return; // will show inline errors
    }

    const row = sanitizeRow(editRow);
    const bay = sanitizeNum2(editBay);
    const shelf = sanitizeNum2(editShelf);
    const binNum = sanitizeNum2(editBin);
    if (!row || !bay || !shelf || (editType === "bin" && !binNum)) {
      setEditError(
        "Please enter row (A), bay (1-99), shelf (1-99) and bin (1-99 for BIN type)."
      );
      return;
    }
    setEditError("");

    const base = `${row}-${bay}-${shelf}`;
    const code = buildCode(row, bay, shelf, editType, binNum);

    // If editing to shelf, ensure duplicate shelf code does not exist on a different item
    if (editType === "shelf") {
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
    if (editType === "bin") {
      if (!existsShelfBase(base)) {
        Swal.fire({
          icon: "warning",
          title: "Missing Shelf",
          text: `Shelf "${base}" doesn't exist. Create the shelf first to add a BIN.`,
        });
        return;
      }
      // prevent duplicate bin codes on different items
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
        type: editType,
        code,
        warehouse: String(warehouseId),
        zone: String(zoneId),
      },
    });
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImportFile(file);

      // Auto-import the file
      const formData = new FormData();
      formData.append("file", file);
      importCSVMut.mutate(formData);
    }
  };

  // Validation helpers for New form
  const validateNew = () => {
    const errs = {};
    const row = sanitizeRow(newRow);

    const bay = sanitizeNum2(newBay); // sanitizeNum2 now returns "" for zero
    const shelf = sanitizeNum2(newShelf);
    const binNum = sanitizeNum2(newBin);

    if (!row) errs.row = "Row is required";
    if (!bay) errs.bay = "Bay is required and must be greater than 0";
    if (!shelf) errs.shelf = "Shelf is required and must be greater than 0";
    if (newType === "bin" && !binNum)
      errs.bin = "Bin is required and must be greater than 0";

    setNewErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // Validation helpers for Edit form
  const validateEdit = () => {
    const errs = {};
    const row = sanitizeRow(editRow);
    const bay = sanitizeNum2(editBay);
    const shelf = sanitizeNum2(editShelf);
    const binNum = sanitizeNum2(editBin);

    if (!row) errs.row = "Row is required";
    if (!bay) errs.bay = "Bay is required and must be greater than 0";
    if (!shelf) errs.shelf = "Shelf is required and must be greater than 0";
    if (editType === "bin" && !binNum)
      errs.bin = "Bin is required and must be greater than 0";

    setEditErrors(errs);
    return Object.keys(errs).length === 0;
  };

  return (
    <div className="max-w-7xl mx-auto p-2 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center gap-y-4 justify-between">
        {/* Breadcrumb */}
        <nav className="text-sm text-gray-600 flex flex-wrap items-center gap-2">
          <button
            onClick={() => navigate("/inventory/warehouses")}
            className="flex items-center space-x-1 hover:underline"
          >
            <FiArrowLeft /> <span>Warehouses</span>
          </button>
          <span>/</span>
          <span
            onClick={() => navigate("/inventory/warehouses")}
            className="cursor-pointer hover:underline"
          >
            {warehouseName}
          </span>
          <span>/</span>
          {zoneName && (
            <>
              <span
                onClick={() => {
                  dispatch(setSelectedZoneId(zoneId));
                  navigate("/inventory/zones");
                }}
                className="cursor-pointer hover:underline"
              >
                {zoneName}
              </span>
              <span>/</span>
            </>
          )}
          <span className="font-semibold">Locations</span>
        </nav>
        {Array.isArray(locations) && locations.length > 0 && (
          <button
            onClick={openPrint}
            title="Print"
            aria-label="Print"
            className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md px-3 py-2 text-lg font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <FiPrinter className="w-5 h-5" />
            Print labels
          </button>
        )}
      </div>

      {/* Header + New */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl font-bold">Locations</h1>
        <div className="flex gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            onChange={handleFileSelect}
            className="hidden"
          />
          <button
            onClick={handleImportCSVClick}
            loading={uploading}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <FiDownload className="mr-2" />
            {uploading ? "Uploading..." : "Import CSV"}
          </button>
          <button
            onClick={handleOpenNew}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <FiPlus /> <span>New Location</span>
          </button>
        </div>
      </div>

      {/* Print Preview Modal */}

      {/* Locations Grid */}
      <div className="overflow-x-auto bg-white rounded-xl shadow">
        {isLoading && (
          <div className="p-4 w-full">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-sm font-semibold text-gray-600">
                    <input
                      type="checkbox"
                      className="h-4 w-4 accent-blue-600"
                      disabled
                    />
                  </th>
                  <th className="px-4 py-2 text-center text-sm font-semibold text-gray-600">
                    QR Code
                  </th>
                  <th className="px-4 py-2 text-left text-sm font-semibold text-gray-600">
                    Code
                  </th>
                  <th className="px-4 py-2 text-left text-sm font-semibold text-gray-600">
                    Type
                  </th>
                  <th className="px-4 py-2 text-right text-sm font-semibold text-gray-600">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                <LocationSkeleton />
                <LocationSkeleton />
                <LocationSkeleton />
              </tbody>
            </table>
          </div>
        )}

        {!isLoading && locations.length === 0 && !error && (
          <div className="py-12 text-center">
            <div className="bg-blue-50 p-4 rounded-full mx-auto mb-4 w-fit">
              <FiMapPin className="w-8 h-8 text-blue-500" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              No Locations Yet
            </h3>
            <p className="text-gray-500 max-w-sm mx-auto mb-6">
              Start by adding your first location to organize and track your
              inventory.
            </p>
            <button
              onClick={handleOpenNew}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none"
            >
              <FiPlus className="mr-2 -ml-1 h-5 w-5" />
              Add First Location
            </button>
          </div>
        )}

        {!isLoading && error && (
          <div className="py-12 text-center">
            <div className="bg-red-50 p-4 rounded-full mx-auto mb-4 w-fit">
              <FiAlertCircle className="w-8 h-8 text-red-500" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Error Loading Locations
            </h3>
            <p className="text-gray-500 max-w-sm mx-auto mb-6">
              {error.message || "Failed to load locations. Please try again."}
            </p>
            <button
              onClick={() =>
                queryClient.invalidateQueries([
                  "locations",
                  warehouseId,
                  zoneId,
                ])
              }
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700"
            >
              <FiRefreshCw className="mr-2 -ml-1 h-5 w-5" />
              Retry
            </button>
          </div>
        )}

        {!isLoading && locations.length > 0 && (
          <>
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-sm font-semibold text-gray-600">
                    <input
                      type="checkbox"
                      className="h-4 w-4 accent-blue-600"
                      checked={isAllSelected}
                      ref={(input) => {
                        if (input) input.indeterminate = isIndeterminate;
                      }}
                      onChange={(e) => handleSelectAll(e.target.checked)}
                    />
                  </th>
                  <th className="px-4 py-2 text-left text-sm font-semibold text-gray-600">
                    QR Code
                  </th>
                  <th className="px-4 py-2 text-left text-sm font-semibold text-gray-600">
                    Code
                  </th>
                  <th className="px-4 py-2 text-left text-sm font-semibold text-gray-600">
                    Type
                  </th>
                  <th className="px-4 py-2 text-right text-sm font-semibold text-gray-600">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {locations.map((loc) => (
                  <tr
                    key={String(loc.id || loc.code)}
                    className="hover:bg-gray-50 transition-colors cursor-pointer"
                    onClick={() => handleRowClick(loc.id)}
                  >
                    <td
                      className="px-4 py-2"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <input
                        type="checkbox"
                        className="h-4 w-4 accent-blue-600 cursor-pointer"
                        checked={selectedIds.has(loc.id)}
                        onChange={() => toggleSelected(loc.id)}
                      />
                    </td>
                    <td className="px-4 py-2 flex items-center justify-start">
                      <QRCodeSVG
                        value={String(loc?.code || "")}
                        size={40}
                        level="M"
                        includeMargin
                      />
                    </td>
                    <td className="px-4 py-2 font-medium text-gray-900">
                      {loc?.code}
                    </td>
                    <td className="px-4 py-2">
                      <span className="inline-block uppercase px-2 py-0.5 text-sm font-medium text-blue-600 bg-blue-50 rounded-full">
                        {loc?.type}
                      </span>
                    </td>

                    <td
                      className="px-4 py-2 text-right"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        onClick={() => {
                          setEditing(loc);
                          setEditCode(loc.code);
                          setEditType(loc.type);

                          // Pattern matching
                          const c = String(loc.code || "");
                          let m = c.match(
                            /^([A-Za-z])-(\d{1,2})-(\d{1,2})-BIN-(\d{1,2})$/
                          );
                          if (m) {
                            setEditRow(m[1].toUpperCase());
                            setEditBay(m[2]);
                            setEditShelf(m[3]);
                            setEditBin(m[4]);
                          } else {
                            m = c.match(/^([A-Za-z])-(\d{1,2})-(\d{1,2})$/);
                            if (m) {
                              setEditRow(m[1].toUpperCase());
                              setEditBay(m[2]);
                              setEditShelf(m[3]);
                              setEditBin("");
                            }
                          }
                        }}
                        className="rounded-full p-2 text-gray-600 hover:bg-gray-100 hover:text-blue-600 transition-colors"
                        title="Edit"
                      >
                        <FiEdit2 className="w-5 h-5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </div>

      {/* New Location Modal */}
      <div ref={fullscreenRef}>
        <Modal
          getContainer={getContainer}
          key={String(isFullscreen)}
          open={showNew}
          onCancel={() => setShowNew(false)}
          centered
          footer={null}
          width={450}
          closable={false}
          title={null}
          className="max-h-[95vh] overflow-y-auto"
        >
          <form onSubmit={onCreate} className="w-full space-y-4">
            <h3 className="text-xl font-semibold">New Location</h3>
            <div className="space-y-2">
              <label className="block text-sm font-medium">Type</label>
              <select
                value={newType}
                onChange={(e) => {
                  const val = e.target.value;
                  // prevent selecting bin if no shelves exist
                  if (val === "bin" && !hasShelves) {
                    Swal.fire({
                      icon: "warning",
                      title: "No shelves",
                      text: "You don't have any shelf in this zone. Create a shelf first to add BINs.",
                    });
                    setNewType("shelf");
                    return;
                  }
                  setNewType(val);
                }}
                className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm bg-white text-black duration-300 ease-in-out focus:border-zinc-400 focus:shadow-lg focus:shadow-zinc-400/50"
              >
                <option value="shelf">Shelf</option>
                {/* Only show bin option when there are shelves */}
                {hasShelves && <option value="bin">Bin</option>}
              </select>
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-medium">Row</label>
              <input
                type="text"
                value={newRow}
                onChange={(e) =>
                  setNewRow(
                    e.target.value
                      .replace(/[^A-Za-z]/g, "")
                      .toUpperCase()
                      .slice(0, 1)
                  )
                }
                placeholder="A"
                className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm bg-white text-black duration-300 ease-in-out focus:border-zinc-400 focus:shadow-lg focus:shadow-zinc-400/50"
              />
              {newErrors?.row && (
                <p className="text-sm text-red-600 mt-1">{newErrors?.row}</p>
              )}
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-medium">Bay</label>
              <input
                type="text"
                inputMode="numeric"
                value={newBay}
                onChange={(e) =>
                  setNewBay(
                    e.target.value
                      .replace(/[^0-9]/g, "")
                      .replace(/^0+/, "")
                      .slice(0, 2)
                  )
                }
                placeholder="1"
                className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm bg-white text-black duration-300 ease-in-out focus:border-zinc-400 focus:shadow-lg focus:shadow-zinc-400/50"
              />
              {newErrors.bay && (
                <p className="text-sm text-red-600 mt-1">{newErrors.bay}</p>
              )}
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-medium">Shelf</label>
              <input
                type="text"
                inputMode="numeric"
                value={newShelf}
                onChange={(e) =>
                  setNewShelf(
                    e.target.value
                      .replace(/[^0-9]/g, "")
                      .replace(/^0+/, "")
                      .slice(0, 2)
                  )
                }
                placeholder="1"
                className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm bg-white text-black duration-300 ease-in-out focus:border-zinc-400 focus:shadow-lg focus:shadow-zinc-400/50"
              />
              {newErrors.shelf && (
                <p className="text-sm text-red-600 mt-1">{newErrors.shelf}</p>
              )}
            </div>
            {newType === "bin" && (
              <div className="space-y-2">
                <label className="block text-sm font-medium">Bin</label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={newBin}
                  onChange={(e) =>
                    setNewBin(
                      e.target.value
                        .replace(/[^0-9]/g, "")
                        .replace(/^0+/, "")
                        .slice(0, 2)
                    )
                  }
                  placeholder="1"
                  className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm bg-white text-black duration-300 ease-in-out focus:border-zinc-400 focus:shadow-lg focus:shadow-zinc-400/50"
                />
                {newErrors.bin && (
                  <p className="text-sm text-red-600 mt-1">{newErrors.bin}</p>
                )}
              </div>
            )}
            {newError && <p className="text-red-600">{newError}</p>}
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => setShowNew(false)}
                className="px-4 py-2 border rounded"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={createMut.isPending}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded disabled:opacity-50"
              >
                {createMut.isPending ? "Creating…" : "Create"}
              </button>
            </div>
          </form>
        </Modal>
      </div>
      {/* Edit Location Modal */}
      <div ref={fullscreenRef}>
        <Modal
          getContainer={getContainer}
          key={String(isFullscreen)}
          open={editing}
          onCancel={() => setEditing(false)}
          centered
          footer={null}
          width={450}
          closable={false}
          title={null}
          className="max-h-[95vh] overflow-y-auto"
        >
          <form
            onSubmit={onEditSubmit}
            className="bg-white rounded-xl w-full max-w-md space-y-3"
          >
            <h3 className="text-xl font-semibold">Edit Location</h3>
            <div className="space-y-2">
              <label className="block text-sm font-medium">Type</label>
              <select
                value={editType}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === "bin" && !hasShelves) {
                    Swal.fire({
                      icon: "warning",
                      title: "No shelves",
                      text: "You don't have any shelf in this zone. Create a shelf first to add BINs.",
                    });
                    // if user was already editing a bin allow it; otherwise revert to shelf
                    if (editing.type === "bin") {
                      setEditType("bin");
                    } else {
                      setEditType("shelf");
                    }
                    return;
                  }
                  setEditType(val);
                }}
                className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm bg-white text-black duration-300 ease-in-out focus:border-zinc-400 focus:shadow-lg focus:shadow-zinc-400/50"
              >
                <option value="shelf">Shelf</option>
                {/* show bin option only when shelves exist or we're already editing a bin */}
                {(hasShelves || editType === "bin") && (
                  <option value="bin">Bin</option>
                )}
              </select>
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-medium">Row</label>
              <input
                type="text"
                value={editRow}
                onChange={(e) =>
                  setEditRow(
                    e.target.value
                      .replace(/[^A-Za-z]/g, "")
                      .toUpperCase()
                      .slice(0, 1)
                  )
                }
                placeholder="A"
                className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm bg-white text-black duration-300 ease-in-out focus:border-zinc-400 focus:shadow-lg focus:shadow-zinc-400/50"
              />
              {editErrors.row && (
                <p className="text-sm text-red-600 mt-1">{editErrors.row}</p>
              )}
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-medium">Bay</label>
              <input
                type="text"
                inputMode="numeric"
                value={editBay}
                onChange={(e) =>
                  setEditBay(
                    e.target.value
                      .replace(/[^0-9]/g, "")
                      .replace(/^0+/, "")
                      .slice(0, 2)
                  )
                }
                placeholder="1"
                className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm bg-white text-black duration-300 ease-in-out focus:border-zinc-400 focus:shadow-lg focus:shadow-zinc-400/50"
              />
              {editErrors.bay && (
                <p className="text-sm text-red-600 mt-1">{editErrors.bay}</p>
              )}
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-medium">Shelf</label>
              <input
                type="text"
                inputMode="numeric"
                value={editShelf}
                onChange={(e) =>
                  setEditShelf(
                    e.target.value
                      .replace(/[^0-9]/g, "")
                      .replace(/^0+/, "")
                      .slice(0, 2)
                  )
                }
                placeholder="1"
                className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm bg-white text-black duration-300 ease-in-out focus:border-zinc-400 focus:shadow-lg focus:shadow-zinc-400/50"
              />
              {editErrors.shelf && (
                <p className="text-sm text-red-600 mt-1">{editErrors.shelf}</p>
              )}
            </div>
            {editType === "bin" && (
              <div className="space-y-2">
                <label className="block text-sm font-medium">Bin</label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={editBin}
                  onChange={(e) =>
                    setEditBin(
                      e.target.value
                        .replace(/[^0-9]/g, "")
                        .replace(/^0+/, "")
                        .slice(0, 2)
                    )
                  }
                  placeholder="1"
                  className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm bg-white text-black duration-300 ease-in-out focus:border-zinc-400 focus:shadow-lg focus:shadow-zinc-400/50"
                />
                {editType === "bin" && editErrors.bin && (
                  <p className="text-sm text-red-600 mt-1">{editErrors.bin}</p>
                )}
              </div>
            )}
            {editError && <p className="text-red-600">{editError}</p>}
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setEditing(null)}
                className="px-4 py-2 border rounded"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={updateMut.isPending}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded disabled:opacity-50"
              >
                {updateMut.isPending ? "Saving…" : "Save"}
              </button>
            </div>
          </form>
        </Modal>
      </div>

      <div ref={fullscreenRef}>
        <Modal
          getContainer={getContainer}
          key={String(isFullscreen)}
          open={printOpen}
          onCancel={closePrint}
          centered
          footer={null}
          width={1152}
          closable={false}
          title={null}
          className="max-h-[95vh] overflow-y-auto"
        >
          <div className="bg-white w-full">
            <div className="flex items-center justify-between border-b px-4 pb-2">
              <h3 className="text-lg font-semibold">Print Preview</h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={closePrint}
                  className="rounded border px-3 py-1.5 text-sm"
                >
                  Close
                </button>
                <button
                  onClick={generatePDF}
                  disabled={downloading}
                  className="rounded bg-blue-600 text-white px-3 py-1.5 text-sm disabled:opacity-60"
                >
                  {downloading ? "Generating…" : "Download PDF"}
                </button>
              </div>
            </div>
            <div className="overflow-auto p-3">
              {/* A4 Canvas Wrapper */}
              <div
                ref={printRef}
                className="mx-auto bg-white"
                style={{ width: "282mm", minHeight: "300mm", padding: "22mm" }}
              >
                {/* Grid: two per row */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-[2.6rem]">
                  {locations
                    .filter(
                      (l) => selectedIds.size === 0 || selectedIds.has(l.id)
                    )
                    .map((loc) => (
                      <div
                        key={loc.id}
                        className="border border-black flex items-center"
                      >
                        <div className="flex items-center justify-center p-4">
                          <QRCodeSVG
                            value={String(loc.code || "")}
                            size={186}
                            level="L"
                          />
                        </div>
                        <div className="border-l border-black text-black flex-1 h-full">
                          <div className="flex flex-col items-center justify-center py-2">
                            <p className="font-semibold">RetroVentures</p>
                            <p className="text-xs">Fleetwood Warehouse</p>
                          </div>
                          <div className="grid grid-cols-3 text-center border-y border-black overflow-hidden">
                            <p className="col-span-3 py-2 text-sm font-semibold tracking-[0.35em]">
                              {(loc.type || "").toUpperCase()}
                            </p>
                          </div>
                          <div className="grid grid-cols-2 border-b text-sm border-black">
                            <p className="px-2 py-2.5 border-r border-black font-medium">
                              Zone
                            </p>
                            <p className="px-2 py-2.5">{zoneName || ""}</p>
                          </div>
                          <div className="grid grid-cols-2 border-b text-sm border-black">
                            <p className="px-2 py-2.5 border-r border-black font-medium">
                              LABEL
                            </p>
                            <p className="px-2 py-2.5">{loc.code}</p>
                          </div>
                          <div className="grid grid-cols-2 text-sm h-fit">
                            <p className="px-2 py-3 border-r border-black font-medium">
                              STATUS
                            </p>
                            <p className="px-2 py-3"></p>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          </div>
        </Modal>
      </div>

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

// src/utils/generatePdf.js
// Usage: import { generatePDFFromNode } from '../utils/generatePdf'
// Then call generatePDFFromNode({ node, fileName, scale, html2canvas, jsPDF, onProgress })

export async function generatePDFFromNode({
  node,
  fileName = "locations_labels.pdf",
  scale = 2,
  html2canvas,
  jsPDF,
  onProgress = () => {},
}) {
  if (!node) throw new Error("No DOM node provided");
  if (!html2canvas) throw new Error("html2canvas instance required");
  if (!jsPDF) throw new Error("jsPDF constructor required");

  const notify = (payload) => {
    try {
      onProgress(payload);
    } catch (e) {
      // ignore callback errors
    }
  };

  notify({ downloading: true });

  // Try to fetch image as blob then convert to data URL (works when server allows CORS)
  async function fetchImageAsDataUrl(src) {
    if (!src) return null;
    if (src.startsWith("data:")) return src;

    // First attempt: fetch -> blob -> dataURL (requires CORS on image host)
    try {
      const resp = await fetch(src, { mode: "cors" });
      if (!resp.ok) throw new Error("fetch failed");
      const blob = await resp.blob();
      return await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch (fetchErr) {
      // Fallback: try load via HTMLImageElement with crossOrigin and draw to canvas
      try {
        const img = new Image();
        img.crossOrigin = "anonymous";
        return await new Promise((resolve, reject) => {
          img.onload = () => {
            try {
              const canvas = document.createElement("canvas");
              canvas.width = img.naturalWidth || 200;
              canvas.height = img.naturalHeight || 200;
              const ctx = canvas.getContext("2d");
              ctx.fillStyle = "#ffffff";
              ctx.fillRect(0, 0, canvas.width, canvas.height);
              ctx.drawImage(img, 0, 0);
              const dataUrl = canvas.toDataURL("image/png", 1.0);
              resolve(dataUrl);
            } catch (drawErr) {
              reject(drawErr);
            }
          };
          img.onerror = (e) => reject(e);
          img.src = src;
        });
      } catch (imgErr) {
        console.warn("Both fetch and image fallback failed for:", src, imgErr);
        return null;
      }
    }
  }

  // Convert images inside `node` to inline data URLs (best-effort)
  async function convertImagesToDataUrl(nodeEl) {
    const images = Array.from(nodeEl.querySelectorAll("img"));
    const results = await Promise.all(
      images.map(async (img) => {
        const originalSrc = img.src || "";
        try {
          if (/^data:/.test(originalSrc)) return originalSrc;
          const dataUrl = await fetchImageAsDataUrl(originalSrc);
          if (dataUrl) {
            // replace in DOM so html2canvas will capture it
            img.src = dataUrl;
            return dataUrl;
          } else {
            console.warn("Could not inline image:", originalSrc);
            return null;
          }
        } catch (err) {
          console.warn("Error converting image:", originalSrc, err);
          return null;
        }
      })
    );

    return results;
  }

  try {
    // 1) Convert images to data URLs (best-effort). This fixes cross-origin missing images when successful.
    const convResults = await convertImagesToDataUrl(node);
    const failedCount = convResults.filter((r) => r === null).length;
    if (failedCount > 0) {
      notify({
        downloading: true,
        warning: `${failedCount} image(s) could not be inlined — likely a CORS issue on the image host.`,
      });
    }

    // Allow DOM to update after we changed image src attributes
    await new Promise((r) => setTimeout(r, 300));

    // 2) Render node to canvas
    const canvas = await html2canvas(node, {
      scale,
      useCORS: true,
      allowTaint: false,
      backgroundColor: "#ffffff",
      logging: false,
      imageTimeout: 0,
      removeContainer: true,
      onclone: (clonedDoc) => {
        const clonedImages = clonedDoc.querySelectorAll("img");
        const originalImages = node.querySelectorAll("img");
        clonedImages.forEach((cImg, i) => {
          if (originalImages[i]) cImg.src = originalImages[i].src;
        });
      },
    });

    // 3) Convert canvas to PNG data
    const imgData = canvas.toDataURL("image/png", 1.0);

    // 4) Build PDF and paginate
    const pdf = new jsPDF("p", "mm", "a4");
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();

    // Calculate image rendered size in mm
    const imgWidth = pageWidth;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    if (imgHeight <= pageHeight) {
      // Single page
      pdf.addImage(imgData, "PNG", 0, 0, imgWidth, imgHeight);
      pdf.save(fileName);
      notify({ downloading: false });
      return { success: true };
    }

    // Multi-page: draw same big image and offset it on each page
    let remaining = imgHeight;
    let position = 0;
    let page = 0;

    while (remaining > 0) {
      if (page > 0) pdf.addPage();
      // draw full image shifted up by 'position' mm so the proper slice shows
      pdf.addImage(imgData, "PNG", 0, -position, imgWidth, imgHeight);
      position += pageHeight;
      remaining -= pageHeight;
      page++;
    }

    pdf.save(fileName);
    notify({ downloading: false });
    return { success: true };
  } catch (err) {
    console.error("generatePDFFromNode error:", err);
    notify({ downloading: false, error: err.message || String(err) });
    throw err;
  }
}

const LocationSkeleton = () => (
  <tr>
    <td className="px-4 py-3">
      <Skeleton width={20} height={20} circle />
    </td>
    <td className="px-4 py-3 text-center">
      <Skeleton width={40} height={40} />
    </td>
    <td className="px-4 py-3">
      <Skeleton width={120} height={16} />
    </td>
    <td className="px-4 py-3">
      <span className="inline-block">
        <Skeleton width={60} height={20} />
      </span>
    </td>
    <td className="px-4 py-3 text-right">
      <Skeleton width={28} height={28} circle />
    </td>
  </tr>
);
