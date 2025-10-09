import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FiPlus, FiEdit2, FiTrash2, FiSearch, FiPrinter } from "react-icons/fi";
import { useDispatch, useSelector } from "react-redux";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getZonesByWarehouse,
  deleteZone as apiDeleteZone,
  getWarehouse,
  createZone as apiCreateZone,
  updateZone as apiUpdateZone,
} from "../../api/warehouse";
import { setSelectedZoneId } from "../../store/appSlice.js";
import Swal from "sweetalert2";
import useFullscreen from "../../components/useFullscreen.jsx";
import { Modal } from "antd";
import { useAuth } from "../../contexts/AuthContext.jsx";
import { useEffect } from "react";
import ZonePrintModal from "./components/ZonePrintModal.jsx";

export default function Zones() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const queryClient = useQueryClient();

  const [whModalOpen, setWhModalOpen] = useState(false);
  const [whEdit, setWhEdit] = useState(null);
  const [whName, setWhName] = useState("");
  const [whCountry, setWhCountry] = useState("");
  const [whLoading, setWhLoading] = useState(false);
  const { user } = useAuth();
  const role = user?.roles.role;

  const selectedWarehouseId = useSelector((s) => s.app.selectedWarehouseId);
  const selectedZoneId = useSelector((s) => s.app.selectedZoneId);
  const { ref: fullscreenRef, isFullscreen, getContainer } = useFullscreen();

  const [q, setQ] = useState("");

  // Zone modal & form state (added)
  const [znModalOpen, setZnModalOpen] = useState(false);
  const [znEdit, setZnEdit] = useState(null);
  const [znName, setZnName] = useState("");
  const [znDesc, setZnDesc] = useState("");
  const [znType, setZnType] = useState("shelf");
  const [znLoading, setZnLoading] = useState(false);
  const [znFormError, setZnFormError] = useState("");

  // Print functionality state
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [printOpen, setPrintOpen] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ["zones", selectedWarehouseId],
    queryFn: () =>
      selectedWarehouseId ? getZonesByWarehouse(selectedWarehouseId) : null,
    enabled: !!selectedWarehouseId,
    staleTime: 0,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    refetchOnMount: true,
  });

  const { data: warehouseDetail } = useQuery({
    queryKey: ["warehouse", selectedWarehouseId],
    queryFn: () =>
      selectedWarehouseId ? getWarehouse(selectedWarehouseId) : null,
    enabled: !!selectedWarehouseId,
    staleTime: 0,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    refetchOnMount: true,
  });

  const zones = useMemo(() => {
    const list = Array.isArray(data?.zones) ? data.zones : [];
    return list.map((z) => ({
      id: z.id ?? z._id,
      _raw: z,
      name: z.name,
      description: z.description,
      warehouseId: z.warehouse?.id ?? z.warehouse?._id ?? selectedWarehouseId,
      qr: z.qr,
      type: z.type,
    }));
  }, [data, selectedWarehouseId]);

  const warehouseName = useMemo(() => {
    if (warehouseDetail?.warehouse?.name) return warehouseDetail.warehouse.name;
    if (warehouseDetail?.name) return warehouseDetail.name;
    const first =
      Array.isArray(data?.zones) && data.zones.length > 0
        ? data.zones[0]
        : null;
    return first?.warehouse?.name || "";
  }, [warehouseDetail, data]);

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return zones;
    return zones.filter(
      (z) =>
        z.name.toLowerCase().includes(t) ||
        (z.description || "").toLowerCase().includes(t)
    );
  }, [q, zones]);

  // Confirm selection like warehouses page: show a button and toast when clicked
  const handleSelectZone = () => {
    const z = zones?.find((x) => x.id === selectedZoneId);
    if (!z) return;
    Swal.fire({
      icon: "success",
      title: `Zone "${z.name}" selected!`,
      toast: true,
      position: "top-end",
      timer: 2000,
      showConfirmButton: false,
      background: "#9333ea",
      color: "#fff",
    });
  };

  // open create modal
  function openCreateZn() {
    setZnEdit(null);
    setZnName("");
    setZnDesc("");
    setZnFormError("");
    setZnModalOpen(true);
  }

  // open edit modal
  function openEditZn(z) {
    setZnEdit(z);
    setZnName(z.name || "");
    setZnDesc(z.description || "");
    setZnType(z.type || "shelf");
    setZnFormError("");
    setZnModalOpen(true);
  }

  function closeZn() {
    setZnModalOpen(false);
    setZnEdit(null);
    setZnName("");
    setZnDesc("");
    setZnFormError("");
    setZnLoading(false);
  }

  async function saveZn(e) {
    e.preventDefault();
    setZnFormError("");
    if (!selectedWarehouseId) return;
    const name = (znName || "").trim();
    if (!name) {
      setZnFormError("Zone name is required.");
      return;
    }
    const payload = {
      name,
      description: (znDesc || "").trim(),
      type: znType,
      warehouse: String(selectedWarehouseId),
    };

    try {
      setZnLoading(true);

      if (znEdit && znEdit.id) {
        // Update existing zone
        const updated = await apiUpdateZone(znEdit.id, payload);

        // Optimistically update cache (match by id or _id)
        queryClient.setQueryData(["zones", selectedWarehouseId], (old) => {
          if (!old) return old;
          const current = Array.isArray(old.zones) ? old.zones : [];
          const updatedList = current.map((z) =>
            z._id === znEdit.id || z.id === znEdit.id
              ? { ...z, name: payload.name, description: payload.description }
              : z
          );
          return { ...(old || {}), zones: updatedList };
        });
      } else {
        // Create new zone
        const created = await apiCreateZone(payload);

        // Insert into cache
        queryClient.setQueryData(["zones", selectedWarehouseId], (old) => {
          const current = Array.isArray(old?.zones) ? old.zones : [];
          // created may return the new zone in various shapes; normalize if needed
          const newZone = created?.zone ?? created?.data ?? created;
          return {
            ...(old || {}),
            zones: [newZone, ...current],
          };
        });
      }

      closeZn();

      // Background refetch to ensure server is authoritative
      queryClient.invalidateQueries({
        queryKey: ["zones", selectedWarehouseId],
      });
    } catch (err) {
      setZnFormError(
        err?.response?.data?.message || err?.message || "Save failed"
      );
    } finally {
      setZnLoading(false);
    }
  }

  async function handleDeleteZone(id) {
    const result = await Swal.fire({
      title: "Delete this zone?",
      text: "This action cannot be undone.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#dc2626",
      cancelButtonColor: "#6b7280",
      confirmButtonText: "Delete",
      cancelButtonText: "Cancel",
    });
    if (!result.isConfirmed) return;
    await apiDeleteZone(id);
    queryClient.invalidateQueries({ queryKey: ["zones", selectedWarehouseId] });
  }

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
      const allIds = zones.map((zone) => zone.id);
      setSelectedIds(new Set(allIds));
    } else {
      setSelectedIds(new Set());
    }
  };

  // Print handlers
  const handleOpenPrint = () => {
    if (zones.length === 0) {
      Swal.fire({
        icon: "warning",
        title: "No Zones",
        text: "There are no zones to print.",
        showConfirmButton: false,
        timer: 3000,
        background: "#f59e0b",
        color: "#fff",
      });
      return;
    }
    setPrintOpen(true);
  };

  function openEditWh(w) {
    setWhEdit(w);
    setWhName(w.name);
    setWhCountry(w.country);
    setWhModalOpen(true);
  }
  function closeWh() {
    setWhModalOpen(false);
    setWhEdit(null);
  }

  if (!selectedWarehouseId) {
    return (
      <div className="space-y-3">
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-amber-800">
          No warehouse selected. Please pick one first.
        </div>
        <button
          onClick={() => navigate("/inventory/warehouses")}
          className="inline-flex items-center rounded-lg border border-zinc-300 px-4 py-2 text-sm hover:bg-zinc-50"
        >
          Go to Warehouses
        </button>
      </div>
    );
  }

  return (
    <div ref={fullscreenRef} className="space-y-6">
      {/* Header */}
      <div className="rounded-xl border border-zinc-200 bg-white">
        <div className="flex items-start sm:items-center sm:justify-between flex-col sm:flex-row gap-3 border-b border-zinc-200 px-4 py-3">
          <h1 className="text-base font-semibold">
            Zones{" "}
            {selectedWarehouseId ? `— ${warehouseName || "Warehouse"}` : ""}
          </h1>
          <div className="flex items-center gap-2 w-full sm:w-fit justify-end">
            {zones.length > 0 && (
              <button
                onClick={handleOpenPrint}
                className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-3 py-2 text-sm text-white hover:bg-green-700"
              >
<<<<<<< HEAD
                <FiPrinter />
                {selectedIds.size > 0
                  ? `Print ${selectedIds.size} Zone${
                      selectedIds.size !== 1 ? "s" : ""
                    }`
                  : "Print Zones"}
=======
                <FiPrinter /> 
                {selectedIds.size > 0 ? `Print ${selectedIds.size} Zone${selectedIds.size !== 1 ? 's' : ''}` : 'Print Labels'}
>>>>>>> ccc5ffa06ffe3458b1211e40d5c1017dd37816ff
              </button>
            )}
            {role !== "Technician" && role !== "Picker" && (
              <button
                onClick={openCreateZn}
                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm text-white hover:bg-blue-700"
              >
                <FiPlus /> New Zone
              </button>
            )}
          </div>
        </div>

        {/* Search and Selection */}
        <div className="px-4 pb-4 pt-3">
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search zones…"
                className="w-full rounded-lg border border-zinc-300 bg-white px-9 py-2 text-sm outline-none placeholder:text-zinc-400 focus:border-zinc-400"
              />
              <FiSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
            </div>
            {zones.length > 0 && (
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-blue-600"
                  checked={selectedIds.size === zones.length}
                  ref={(input) => {
                    if (input)
                      input.indeterminate =
                        selectedIds.size > 0 && selectedIds.size < zones.length;
                  }}
                  onChange={(e) => handleSelectAll(e.target.checked)}
                />
                <span className="text-sm text-zinc-600">
                  {selectedIds.size > 0
                    ? `${selectedIds.size} selected`
                    : "Select all"}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-red-700">
          {error}
        </div>
      )}

      {/* Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 my-4">
        {isLoading && (
          <div className="col-span-full rounded-lg border border-zinc-200 bg-white px-4 py-6 text-center text-sm text-zinc-500">
            Loading…
          </div>
        )}

        {!isLoading && filtered.length === 0 && (
          <div className="col-span-full rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-6 text-center text-sm text-zinc-600">
            No zones found.
          </div>
        )}

        {filtered?.map((z, i) => (
          <div
            key={z.id + i}
            onClick={() => {
              dispatch(setSelectedZoneId(z.id));
              localStorage.setItem("zoneType", JSON.stringify(z.type));
            }}
            className={`group relative cursor-pointer rounded-xl hover:bg-blue-50  duration-500 border p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md ${
              selectedZoneId === z.id
                ? "border-blue-600 bg-blue-50"
                : "border-zinc-200 bg-white"
            }`}
          >
            {/* Selection checkbox */}
            <input
              type="checkbox"
              className="h-4 w-4 accent-blue-600 cursor-pointer"
              checked={selectedIds.has(z.id)}
              onChange={() => toggleSelected(z.id)}
              onClick={(e) => e.stopPropagation()}
            />

            {/* Actions */}
            <div className="absolute right-2 top-2 hidden gap-1 group-hover:flex">
              {role !== "Technician" && role !== "Picker" && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    openEditZn(z); // <-- fixed: open zone edit (not warehouse)
                  }}
                  className="rounded p-1 text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
                  title="Edit"
                >
                  <FiEdit2 />
                </button>
              )}
            </div>
            {/* <img
              src={z?.qr}
              alt="qr"
              className="w-full h-[9rem] rounded-md object-contain"
            /> */}
            <h2 className="truncate text-base mt-2 font-semibold">{z.name}</h2>
            {z.description && (
              <p className="mt-1 line-clamp-3 text-xs text-zinc-500">
                {z.description}
              </p>
            )}
            <span
              className={`mt-2 inline-flex items-center capitalize rounded-full  border ${
                z.type === "shelf"
                  ? "bg-green-100 text-green-700  border-green-500 "
                  : z.type === "not_shelf"
                  ? "bg-purple-100 text-purple-700  border-purple-500"
                  : "bg-orange-100 text-orange-700  border-orange-500"
              }   px-3 py-0.5 text-xs`}
            >
              {z.type === "not_shelf" ? "Not Shelf" : z.type}
            </span>
          </div>
        ))}
      </div>
      {/* Select Zone action */}
      {selectedZoneId && (
        <div className="text-right">
          <button
            onClick={handleSelectZone}
            className="inline-flex items-center rounded-lg bg-purple-600 px-4 py-2 text-sm text-white hover:bg-purple-700"
          >
            Select Zone
          </button>
        </div>
      )}
      {/* Selected zone details */}
      {selectedZoneId && (
        <div className="rounded-xl border border-zinc-200 bg-white p-5">
          {(() => {
            const z = zones?.find((x) => x.id === selectedZoneId);
            if (!z) return null;
            return (
              <div>
                <h2 className="text-lg font-semibold">
                  Selected Zone: {z?.name}
                </h2>
                {z?.description && (
                  <p className="mt-1 text-sm text-zinc-600">{z?.description}</p>
                )}
              </div>
            );
          })()}
        </div>
      )}

      <div ref={fullscreenRef}>
        <Modal
          getContainer={getContainer}
          key={String(isFullscreen)}
          open={znModalOpen}
          onCancel={() => closeZn(false)}
          centered
          footer={null}
          width={450}
          title={null}
          className="max-h-[95vh] overflow-y-auto"
        >
          <div className="w-full max-w-md">
            <h3 className="text-lg font-semibold">
              {znEdit ? "Edit Zone" : "New Zone"}
            </h3>
            <form onSubmit={saveZn} className="mt-4 space-y-3">
              {znFormError && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {znFormError}
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-zinc-700">
                  Name
                </label>
                <input
                  type="text"
                  autoFocus
                  className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm bg-white text-black duration-300 ease-in-out focus:border-zinc-400 focus:shadow-lg focus:shadow-zinc-400/50"
                  value={znName}
                  onChange={(e) => setZnName(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700">
                  Description
                </label>
                <textarea
                  className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm bg-white text-black duration-300 ease-in-out focus:border-zinc-400 focus:shadow-lg focus:shadow-zinc-400/50"
                  rows={3}
                  value={znDesc}
                  onChange={(e) => setZnDesc(e.target.value)}
                />
              </div>
              <div className=" w-full">
                <label className="block text-sm font-medium text-zinc-700">
                  Type
                </label>
                <select
                  value={znType}
                  onChange={(e) => setZnType(e.target.value)}
                  className=" h-[2.2rem] border w-full mt-2 border-gray-400 outline-none rounded-md cursor-pointer text-sm"
                >
                  <option value="shelf">Shelf</option>
                  <option value="not_shelf">Not Shelf</option>
                  <option value="hybrid">Hybrid</option>
                </select>
              </div>
              <div className="mt-6 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={closeZn}
                  className="rounded-lg border border-zinc-300 px-4 py-2 text-sm hover:bg-zinc-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={znLoading}
                  className={`rounded-lg bg-green-600 px-4 py-2 text-sm text-white hover:bg-green-700 ${
                    znLoading ? "opacity-50 cursor-not-allowed" : ""
                  }`}
                >
                  {znLoading ? "Saving…" : "Save"}
                </button>
              </div>
            </form>
          </div>
        </Modal>
      </div>

      {/* Zone Print Modal */}
      <ZonePrintModal
        isOpen={printOpen}
        onClose={() => setPrintOpen(false)}
        zones={zones}
        selectedIds={selectedIds}
        warehouseName={warehouseName}
      />
    </div>
  );
}
