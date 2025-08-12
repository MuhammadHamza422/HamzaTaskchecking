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

  const deleteMut = useMutation({
    mutationFn: (id) => deleteLocation(id),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: ["locations", warehouseId, zoneId],
      }),
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

  // Most robust approach - forces image loading and conversion
  const generatePDF = async () => {
    const node = printRef.current;
    if (!node) return;

    try {
      setDownloading(true);

      // Convert all QR images to base64 data URLs
      const convertImagesToDataUrl = async () => {
        const images = node.querySelectorAll("img");
        const promises = Array.from(images).map(async (img) => {
          try {
            // Create a canvas to convert the image
            const canvas = document.createElement("canvas");
            const ctx = canvas.getContext("2d");

            // Create a new image to ensure it's loaded
            const newImg = new Image();
            newImg.crossOrigin = "anonymous";

            await new Promise((resolve, reject) => {
              newImg.onload = resolve;
              newImg.onerror = reject;
              newImg.src = img.src;
            });

            // Set canvas size to match image
            canvas.width = newImg.naturalWidth || 200;
            canvas.height = newImg.naturalHeight || 200;

            // Draw image to canvas
            ctx.fillStyle = "white";
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(newImg, 0, 0);

            // Convert to data URL and update the original img
            const dataUrl = canvas.toDataURL("image/png", 1.0);
            img.src = dataUrl;

            return dataUrl;
          } catch (error) {
            console.error("Error converting image:", error);
            return null;
          }
        });

        return Promise.all(promises);
      };

      // Convert all images to data URLs
      await convertImagesToDataUrl();

      // Wait a bit more for DOM to update
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Now generate the canvas with all images as data URLs
      const canvas = await html2canvas(node, {
        scale: 2,
        useCORS: true,
        allowTaint: true, // Allow since we converted to data URLs
        imageTimeout: 0, // No timeout needed since images are data URLs
        backgroundColor: "#ffffff",
        logging: false,
        onclone: (clonedDoc) => {
          // Ensure all images maintain their data URL sources
          const clonedImages = clonedDoc.querySelectorAll("img");
          const originalImages = node.querySelectorAll("img");

          clonedImages.forEach((clonedImg, index) => {
            if (originalImages[index]) {
              clonedImg.src = originalImages[index].src;
            }
          });
        },
        removeContainer: true,
      });

      const imgData = canvas.toDataURL("image/png", 1.0);
      const pdf = new jsPDF("p", "mm", "a4");
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = pageWidth;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      // Add to PDF with pagination
      let currentHeight = 0;
      let pageNumber = 0;

      while (currentHeight < imgHeight) {
        if (pageNumber > 0) {
          pdf.addPage();
        }

        const remainingHeight = imgHeight - currentHeight;
        const heightToAdd = Math.min(remainingHeight, pageHeight);

        pdf.addImage(imgData, "PNG", 0, -currentHeight, imgWidth, imgHeight);

        currentHeight += pageHeight;
        pageNumber++;
      }

      pdf.save("locations_labels.pdf");
    } catch (err) {
      console.error("Error generating PDF", err);
      alert(
        "Failed to generate PDF. Please check your internet connection and try again."
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
    <div className="max-w-7xl mx-auto px-4 lg:px-8 py-6 space-y-6">
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
                      <div key={loc.id} className="border border-black flex items-center">
                        <div className="flex items-center justify-center w-[200px] h-[200px]">
                          <img
                            src={loc.qrcode}
                            alt="QR"
                            className="w-full h-full object-contain"
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
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
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
                  <img
                    src={loc?.qrcode}
                    alt={`QR for ${loc?.code}`}
                    loading="lazy"
                    onError={(e) => (e.currentTarget.style.display = "none")}
                    className="mt-4 self-center w-32 h-32 object-contain"
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
                  onClick={() => {
                    if (confirm("Delete this location?"))
                      deleteMut.mutate(loc.id);
                  }}
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
