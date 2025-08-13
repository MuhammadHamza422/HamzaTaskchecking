import { useEffect, useMemo, useRef, useState } from "react";
import {
  FiArrowLeft,
  FiPlus,
  FiX,
  FiTrash2,
  FiEdit2,
  FiPrinter,
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
} from "../../api/warehouse";
import { setSelectedZoneId } from "../../store/appSlice.js";
import html2canvas from "html2canvas-pro";
import jsPDF from "jspdf";
import Swal from "sweetalert2";
import { QRCodeSVG } from "qrcode.react";

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

  useEffect(() => {
    if (!warehouseId) navigate("/inventory/warehouses");
  }, [warehouseId, navigate]);

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
          id: l.id ?? l._id,
          code: l.code,
          type: String(l.type || "").toLowerCase(),
          warehouseId:
            typeof l.warehouse === "string"
              ? l.warehouse
              : l.warehouse?.id ?? l.warehouse?._id ?? null,
          zoneId:
            typeof l.zone === "string"
              ? l.zone
              : l.zone?.id ?? l.zone?._id ?? null,
          qrcode: l.qrcode || l.qrPath || null,
        }))
        .filter((l) => l.warehouseId === warehouseId && l.zoneId === zoneId);
    },
  });

  const locations = locationsRes || [];

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

  const handleDelete = (id) => {
    Swal.fire({
      title: "Are you sure?",
      text: "This location will be permanently deleted.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "Yes, delete it!",
      cancelButtonText: "Cancel",
    }).then((result) => {
      if (result.isConfirmed) {
        deleteMut.mutate(id);
      }
    });
  };

  const deleteMut = useMutation({
    mutationFn: (id) => deleteLocation(id),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["locations", warehouseId, zoneId],
      });

      Swal.fire({
        toast: true,
        position: "top-end",
        icon: "success",
        title: "Location deleted successfully",
        showConfirmButton: false,
        timer: 2000,
        timerProgressBar: true,
        background: "#ef4444",
        color: "#fff",
      });
    },
  });

  const toggleSelected = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

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

  // Handlers
  // Helpers for input sanitization and code building
  const sanitizeRow = (v) =>
    v
      .replace(/[^A-Za-z]/g, "")
      .toUpperCase()
      .slice(0, 1);
  const sanitizeNum2 = (v) => v.replace(/[^0-9]/g, "").slice(0, 2);
  const buildCode = (row, bay, shelf, type, binNum) => {
    const base = `${row}-${bay}-${shelf}`;
    return type === "bin" ? `${base}-BIN-${binNum}` : base;
  };

  const onCreate = (e) => {
    e.preventDefault();
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
    const code = buildCode(row, bay, shelf, newType, binNum);
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
    const code = buildCode(row, bay, shelf, editType, binNum);
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

  const handleChange = (e) => {
    // strip everything except A-Z and a-z
    const cleaned = e.target.value.replace(/[^A-Za-z]/g, "");
    setValue(cleaned);
  };

  return (
    <div className="max-w-7xl mx-auto p-2 space-y-6">
      <div className="flex items-center justify-between">
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
        <button
          onClick={openPrint}
          title="Print"
          aria-label="Print"
          className="inline-flex items-center justify-center gap-2 rounded-md px-3 py-2 text-lg font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <FiPrinter className="w-5 h-5" />
          Print labels
        </button>
      </div>

      {/* Header + New */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl font-bold">Locations</h1>
        <button
          onClick={() => setShowNew(true)}
          className="inline-flex items-center space-x-1 px-4 py-2 border rounded hover:bg-gray-100 transition"
        >
          <FiPlus /> <span>New Location</span>
        </button>
      </div>

      {/* Print Preview Modal */}
      {printOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-[9999] flex items-center justify-center p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) closePrint();
          }}
        >
          <div className="bg-white rounded-lg w-full max-w-6xl max-h-[95vh] overflow-y-auto shadow-xl">
            <div className="flex items-center justify-between border-b px-4 py-3">
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
            <div className="overflow-auto p-4">
              {/* A4 Canvas Wrapper */}
              <div
                ref={printRef}
                className="mx-auto bg-white"
                style={{ width: "272mm", minHeight: "300mm", padding: "22mm" }}
              >
                {/* Grid: two per row */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-[3rem]">
                  {locations
                    .filter(
                      (l) => selectedIds.size === 0 || selectedIds.has(l.id)
                    )
                    .map((loc) => (
                      <div
                        key={loc.id}
                        className="border border-black flex items-center"
                      >
                        <div className="flex items-center justify-center w-[200px] h-[200px]">
                          <QRCodeSVG
                            value={String(loc.code || "")}
                            size={200}
                            level="M"
                            includeMargin
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
                          <div className="grid grid-cols-2 text-sm">
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
        </div>
      )}

      {/* Locations Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {isLoading && (
          <p className="col-span-full text-center text-gray-500">Loading…</p>
        )}
        {!isLoading && locations.length === 0 && (
          <p className="col-span-full text-center text-gray-500">
            No locations yet.
          </p>
        )}
        {!isLoading &&
          locations.map((loc) => (
            <div
              key={loc?._id}
              className="bg-white rounded-xl shadow p-5 flex flex-col justify-between relative"
            >
              <div className="absolute top-2 right-2">
                <input
                  className="accent-white h-5 w-5 cursor-pointer border border-black"
                  type="checkbox"
                  checked={selectedIds.has(loc.id)}
                  onChange={() => toggleSelected(loc.id)}
                />
              </div>
              <div>
                <h2 className="text-lg font-semibold truncate">{loc?.code}</h2>
                <span className="inline-block mt-2 px-2 py-0.5 text-xs text-gray-600 border rounded">
                  {loc?.type}
                </span>
                <div className="flex items-center justify-center">
                  <QRCodeSVG
                    value={String(loc?.code || "")}
                    size={128}
                    level="M"
                    includeMargin
                  />
                </div>
              </div>
              <div className="mt-4 flex items-center justify-end gap-2">
                <button
                  onClick={() => {
                    setEditing(loc);
                    setEditCode(loc.code);
                    setEditType(loc.type);
                    // Pre-fill edit parts from code pattern
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
                  className="rounded p-2 text-zinc-600 hover:bg-zinc-100"
                  title="Edit"
                >
                  <FiEdit2 />
                </button>
                <button
                  onClick={() => handleDelete(loc.id)}
                  className="rounded p-2 text-red-600 hover:bg-red-50"
                  title="Delete"
                >
                  <FiTrash2 />
                </button>
              </div>
            </div>
          ))}
      </div>

      {/* New Location Modal */}
      {showNew && (
        <>
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-[999]"
            onClick={() => setShowNew(false)}
          />
          <div className="fixed inset-0 flex items-center justify-center z-[999] px-4">
            <form
              onSubmit={onCreate}
              className="bg-white rounded-xl w-full max-w-md shadow-lg p-6 space-y-4 max-h-[95vh] overflow-y-auto"
            >
              <header className="flex justify-between items-center">
                <h3 className="text-xl font-semibold">New Location</h3>
                <button
                  onClick={() => setShowNew(false)}
                  className="text-gray-600 hover:text-gray-800"
                >
                  <FiX size={24} />
                </button>
              </header>
              <div className="space-y-2">
                <label className="block text-sm font-medium">Type</label>
                <select
                  value={newType}
                  onChange={(e) => setNewType(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm bg-white text-black duration-300 ease-in-out focus:border-zinc-400 focus:shadow-lg focus:shadow-zinc-400/50"
                >
                  <option value="shelf">Shelf</option>
                  <option value="bin">Bin</option>
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
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium">Bay</label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={newBay}
                  onChange={(e) =>
                    setNewBay(e.target.value.replace(/[^0-9]/g, "").slice(0, 2))
                  }
                  placeholder="1"
                  className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm bg-white text-black duration-300 ease-in-out focus:border-zinc-400 focus:shadow-lg focus:shadow-zinc-400/50"
                />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium">Shelf</label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={newShelf}
                  onChange={(e) =>
                    setNewShelf(
                      e.target.value.replace(/[^0-9]/g, "").slice(0, 2)
                    )
                  }
                  placeholder="1"
                  className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm bg-white text-black duration-300 ease-in-out focus:border-zinc-400 focus:shadow-lg focus:shadow-zinc-400/50"
                />
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
                        e.target.value.replace(/[^0-9]/g, "").slice(0, 2)
                      )
                    }
                    placeholder="1"
                    className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm bg-white text-black duration-300 ease-in-out focus:border-zinc-400 focus:shadow-lg focus:shadow-zinc-400/50"
                  />
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
          </div>
        </>
      )}

      {/* Edit Location Modal */}
      {editing && (
        <>
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-40"
            onClick={() => setEditing(null)}
          />
          <div className="fixed inset-0 flex items-center justify-center z-50 px-4">
            <form
              onSubmit={onEditSubmit}
              className="bg-white rounded-xl w-full max-w-md shadow-lg p-6 space-y-4"
            >
              <header className="flex justify-between items-center">
                <h3 className="text-xl font-semibold">Edit Location</h3>
                <button
                  onClick={() => setEditing(null)}
                  className="text-gray-600 hover:text-gray-800"
                >
                  <FiX size={24} />
                </button>
              </header>
              <div className="space-y-2">
                <label className="block text-sm font-medium">Type</label>
                <select
                  value={editType}
                  onChange={(e) => setEditType(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm bg-white text-black duration-300 ease-in-out focus:border-zinc-400 focus:shadow-lg focus:shadow-zinc-400/50"
                >
                  <option value="shelf">Shelf</option>
                  <option value="bin">Bin</option>
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
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium">Bay</label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={editBay}
                  onChange={(e) =>
                    setEditBay(
                      e.target.value.replace(/[^0-9]/g, "").slice(0, 2)
                    )
                  }
                  placeholder="1"
                  className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm bg-white text-black duration-300 ease-in-out focus:border-zinc-400 focus:shadow-lg focus:shadow-zinc-400/50"
                />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium">Shelf</label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={editShelf}
                  onChange={(e) =>
                    setEditShelf(
                      e.target.value.replace(/[^0-9]/g, "").slice(0, 2)
                    )
                  }
                  placeholder="1"
                  className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm bg-white text-black duration-300 ease-in-out focus:border-zinc-400 focus:shadow-lg focus:shadow-zinc-400/50"
                />
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
                        e.target.value.replace(/[^0-9]/g, "").slice(0, 2)
                      )
                    }
                    placeholder="1"
                    className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm bg-white text-black duration-300 ease-in-out focus:border-zinc-400 focus:shadow-lg focus:shadow-zinc-400/50"
                  />
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
          </div>
        </>
      )}
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
