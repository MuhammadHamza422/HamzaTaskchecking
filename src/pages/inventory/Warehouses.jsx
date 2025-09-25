import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  FiCheck,
  FiCopy,
  FiEdit2,
  FiPlus,
  FiSearch,
  FiTrash2,
} from "react-icons/fi";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { useDispatch, useSelector } from "react-redux";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  setSelectedWarehouseId,
  setSelectedZoneId,
} from "../../store/appSlice.js";
import {
  getWarehouses as apiGetWarehouses,
  createWarehouse as apiCreateWarehouse,
  updateWarehouse as apiUpdateWarehouse,
  deleteWarehouse as apiDeleteWarehouse,
  getZonesByWarehouse,
  createZone as apiCreateZone,
  updateZone as apiUpdateZone,
  deleteZone as apiDeleteZone,
} from "../../api/warehouse";
import Swal from "sweetalert2";
import useFullscreen from "../../components/useFullscreen.jsx";
import { Modal } from "antd";

export default function Warehouses() {
  const { token, user } = useAuth();
  const role = user?.roles.role;
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const selectedWarehouseId = useSelector((s) => s.app.selectedWarehouseId);
  const selectedZoneId = useSelector((s) => s.app.selectedZoneId);
  const queryClient = useQueryClient();

  const [copiedId, setCopiedId] = useState(null);
  const [copiedZoneId, setCopiedZoneId] = useState(null);

  // Zones come from React Query based on selected warehouse
  const [q, setQ] = useState("");

  // Modal controls
  const [whModalOpen, setWhModalOpen] = useState(false);
  const [whEdit, setWhEdit] = useState(null);
  const [whName, setWhName] = useState("");
  const [whCountry, setWhCountry] = useState("");
  const [whLoading, setWhLoading] = useState(false);
  const [whType, setWhType] = useState("shelf");

  const [znModalOpen, setZnModalOpen] = useState(false);
  const [znEdit, setZnEdit] = useState(null);
  const [znName, setZnName] = useState("");
  const [znDesc, setZnDesc] = useState("");
  const [znType, setZnType] = useState("shelf");
  const [znLoading, setZnLoading] = useState(false);
  const [whFormError, setWhFormError] = useState("");
  const [znFormError, setZnFormError] = useState("");
  const [copied, setCopied] = useState(false);
  const { ref: fullscreenRef, isFullscreen, getContainer } = useFullscreen();

  const [type, setType] = useState("shelf");
  const [zones, setZones] = useState([]);

  useEffect(() => {
    const zoneType = localStorage.getItem("zoneType");
    setType(zoneType);
  }, []);

  const countryOptions = [
    "uae",
    "Colombia",
    "usa",
    "canada",
    "maxico",
    "Japan",
    "Pakistan",
  ];

  // Load data
  useEffect(() => {
    if (!token) navigate("/login");
  }, [token, navigate]);

  // Warehouses via React Query (cached across tabs)
  const {
    data: warehousesResponse,
    isLoading: warehousesLoading,
    error: warehousesError,
  } = useQuery({
    queryKey: ["warehouses", type],
    queryFn: async () => {
      const ws = await apiGetWarehouses({ page: 1, limit: 50, type });
      return ws;
    },
    staleTime: 0,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    refetchOnMount: true,
  });

  const warehouses = useMemo(() => {
    const ws = warehousesResponse;
    const list = Array.isArray(ws?.data)
      ? ws.data
      : Array.isArray(ws?.warehouses)
      ? ws.warehouses
      : Array.isArray(ws)
      ? ws
      : [];
    return list.map((w) => ({ ...w, id: w.id ?? w._id }));
  }, [warehousesResponse]);

  // ✅ Filter warehouses based on role
  const warehouseData = useMemo(() => {
    if (!warehouses?.length) return [];

    // If role is admin -> show all
    if (user?.roles?.role?.toLowerCase() === "admin") {
      return warehouses;
    }

    // Otherwise -> only show warehouses user has access to
    return warehouses.filter((w) => user?.warehouse?.includes(w.id));
  }, [warehouses, user]);

  // Ensure a default selected warehouse when none is chosen
  // useEffect(() => {
  //   if (!selectedWarehouseId && warehouses.length > 0) {
  //     dispatch(setSelectedWarehouseId(warehouses[0].id));
  //   }
  // }, [warehouses, selectedWarehouseId, dispatch]);

  // Fetch zones for selected warehouse using TanStack React Query
  const fetchZones = useCallback(async () => {
    if (!selectedWarehouseId) return;
    const zonesResponse = await getZonesByWarehouse(selectedWarehouseId, type);
    const list = Array.isArray(zonesResponse?.zones) ? zonesResponse.zones : [];
    const zoneList = list.map((z) => ({
      id: z.id ?? z._id,
      name: z.name,
      description: z.description,
      type: z.type,
      warehouseId: z.warehouse?.id ?? z.warehouse?._id ?? selectedWarehouseId,
    }));
    setZones(zoneList);
  }, [selectedWarehouseId, type]);

  useEffect(() => {
    fetchZones();
  }, [fetchZones]);

  // Warehouse CRUD
  function openNewWh() {
    setWhEdit(null);
    setWhName("");
    setWhCountry("");
    setWhType("shelf");
    setWhModalOpen(true);
  }
  function openEditWh(w) {
    setWhEdit(w);
    setWhName(w.name);
    setWhCountry(w.country);
    setWhType(w.type);
    setWhModalOpen(true);
  }
  function closeWh() {
    setWhModalOpen(false);
    setWhEdit(null);
  }

  async function handleDeleteWarehouse(id) {
    const result = await Swal.fire({
      title: "Delete this warehouse?",
      text: "This action cannot be undone.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#dc2626",
      cancelButtonColor: "#6b7280",
      confirmButtonText: "Delete",
      cancelButtonText: "Cancel",
    });
    if (!result.isConfirmed) return;
    try {
      await apiDeleteWarehouse(id);
      queryClient.invalidateQueries({ queryKey: ["warehouses"] });
      await Swal.fire({
        icon: "success",
        title: "Warehouse deleted",
        toast: true,
        position: "top-end",
        timer: 2200,
        showConfirmButton: false,
        background: "#ef4444",
        color: "#fff",
      });
    } catch (err) {
      await Swal.fire({
        icon: "error",
        title: "Delete failed",
        text:
          err?.response?.data?.message || err?.message || "Unable to delete",
        toast: true,
        position: "top-end",
        background: "#ef4444",
        color: "#fff",
      });
    }
  }
  async function saveWh(e) {
    e.preventDefault();
    setWhFormError("");
    const name = whName.trim();
    const country = whCountry.trim();
    const type = whType.trim();
    if (!name || !country) {
      setWhFormError("Both name and country are required.");
      return;
    }
    setWhLoading(true);
    const payload = { name, country, type };
    try {
      if (whEdit && whEdit.id) {
        await apiUpdateWarehouse(whEdit.id, payload);
        Swal.fire({
          icon: "success",
          title: "Warehouse updated",
          text: "Warehouse has been updated successfully!",
          toast: true,
          position: "top-end",
          showConfirmButton: false,
          timer: 3000,
          timerProgressBar: true,
        });
      } else {
        await apiCreateWarehouse(payload);
        Swal.fire({
          icon: "success",
          title: "Warehouse created",
          text: "Warehouse has been created successfully!",
          toast: true,
          position: "top-end",
          showConfirmButton: false,
          timer: 3000,
          timerProgressBar: true,
        });
      }
      closeWh();
      queryClient.invalidateQueries({ queryKey: ["warehouses"] });
    } catch (err) {
      Swal.fire({
        icon: "error",
        title: "Failed to save warehouse",
        text: err?.response?.data?.message || err?.message || "Save failed",
        toast: true,
        position: "top-end",
      });
      setWhFormError(
        err?.response?.data?.message || err?.message || "Save failed"
      );
    } finally {
      setWhLoading(false);
    }
  }

  // Zone CRUD
  function openNewZn() {
    setZnEdit(null);
    setZnName("");
    setZnDesc("");
    setZnType("shelf");
    setZnModalOpen(true);
  }
  function openEditZn(z) {
    setZnEdit(z);
    setZnName(z.name);
    setZnDesc(z.description || "");
    setZnType(z.type || "shelf");
    setZnModalOpen(true);
  }
  function closeZn() {
    setZnModalOpen(false);
    setZnEdit(null);
  }
  async function saveZn(e) {
    e.preventDefault();
    setZnFormError("");
    if (!selectedWarehouseId) return;
    const name = znName.trim();
    if (!name) {
      setZnFormError("Zone name is required.");
      return;
    }
    const payload = {
      name,
      description: znDesc.trim(),
      warehouse: String(selectedWarehouseId),
      type: znType,
    };
    try {
      setZnLoading(true);
      if (znEdit && znEdit.id) {
        // Optimistic update for update
        await apiUpdateZone(znEdit.id, payload);
        queryClient.setQueryData(["zones", selectedWarehouseId], (old) => {
          const current = Array.isArray(old?.zones) ? old.zones : [];
          const updated = current.map((z) =>
            z._id === znEdit.id || z.id === znEdit.id
              ? { ...z, name: payload.name, description: payload.description }
              : z
          );
          return { ...(old || {}), zones: updated };
        });
      } else {
        const created = await apiCreateZone(payload);
        // created may return created zone or message; we optimistically add by name if not returned
        const newZone = created?.zone || {
          _id: Math.random().toString(36).slice(2),
          name: payload.name,
          description: payload.description,
          warehouse: { _id: selectedWarehouseId },
        };
        queryClient.setQueryData(["zones", selectedWarehouseId], (old) => {
          const current = Array.isArray(old?.zones) ? old.zones : [];
          return { ...(old || {}), zones: [newZone, ...current] };
        });
      }
      closeZn();
      // Background refetch to ensure freshness
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

  async function handleDeleteZone(zoneId) {
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
    try {
      await apiDeleteZone(zoneId);
      // Optimistically remove from cache
      queryClient.setQueryData(["zones", selectedWarehouseId], (old) => {
        const current = Array.isArray(old?.zones) ? old.zones : [];
        const filtered = current.filter(
          (z) => z._id !== zoneId && z.id !== zoneId
        );
        return { ...(old || {}), zones: filtered };
      });
      queryClient.invalidateQueries({
        queryKey: ["zones", selectedWarehouseId],
      });
      await Swal.fire({
        icon: "success",
        title: "Zone deleted",
        toast: true,
        position: "top-end",
        timer: 1600,
        showConfirmButton: false,
        background: "#ef4444",
        color: "#fff",
      });
    } catch (err) {
      await Swal.fire({
        icon: "error",
        title: "Delete failed",
        text:
          err?.response?.data?.message || err?.message || "Unable to delete",
        toast: true,
        position: "top-end",
        background: "#ef4444",
        color: "#fff",
      });
    }
  }

  // Toast helper
  function toast(msg) {
    const el = document.createElement("div");
    el.textContent = msg;
    el.className =
      "fixed bottom-4 right-4 rounded-lg bg-zinc-900 px-4 py-2 text-sm text-white shadow-lg transition-opacity duration-500";
    document.body.appendChild(el);
    setTimeout(() => {
      el.style.opacity = "0";
      setTimeout(() => document.body.removeChild(el), 500);
    }, 1600);
  }

  // Derived
  const filteredWarehouses = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return warehouseData;
    return warehouseData.filter(
      (w) =>
        w.name.toLowerCase().includes(t) ||
        (w.country || "").toLowerCase().includes(t)
    );
  }, [q, warehouseData]);

  const filteredZones = useMemo(
    () => zones.filter((z) => z.warehouseId === selectedWarehouseId),
    [zones, selectedWarehouseId]
  );

  const handleSelectZone = () => {
    const z = filteredZones.find((z) => z.id === selectedZoneId);
    if (z) {
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
      navigate("/inventory/zones");
      window.location.reload();
    }
  };

  // Handle type
  const handleTypeChange = (type) => {
    localStorage.setItem("zoneType", type);
    setType(type);
    window.location.reload();
  };
  return (
    <div
      ref={fullscreenRef}
      className="rounded-xl border border-zinc-200 bg-white p-5"
    >
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <h1 className=" text-xl sm:text-2xl font-semibold">Warehouses</h1>
          <p className="mt-1 text-sm text-zinc-600">Manage your warehouses.</p>
        </div>
        <select
          value={type}
          onChange={(e) => handleTypeChange(e.target.value)}
          className=" h-[2.2rem] border border-gray-400 outline-none rounded-md cursor-pointer text-sm"
        >
          <option value="shelf">Shelf</option>
          <option value="not_shelf">Without Shelf</option>
        </select>
      </div>
      {/* handleTypeChange */}

      <div className="space-y-6">
        {warehousesError && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-red-700">
            {warehousesError?.message || "Failed to load warehouses"}
          </div>
        )}
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[340px_1fr] mt-4">
          {/* LEFT: Warehouses */}
          <section className="rounded-xl border border-zinc-200 bg-white">
            <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-3">
              <h2 className="text-base font-semibold">Warehouses</h2>
              {role !== "Technician" &&
                role !== "Picker" &&
                role !== "Inventory Supervisor" && (
                  <button
                    onClick={openNewWh}
                    className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm text-white hover:bg-blue-700"
                  >
                    <FiPlus /> New
                  </button>
                )}
            </div>
            <div className="px-4 py-3 border-b border-zinc-200">
              <button
                onClick={() => {
                  if (!selectedWarehouseId) return;
                  // Persist is automatic via redux-persist; show toast
                  const w = warehouseData.find(
                    (x) => x.id === selectedWarehouseId
                  );
                  if (w) {
                    Swal.fire({
                      icon: "success",
                      title: `Warehouse saved: ${w.name}`,
                      toast: true,
                      position: "top-end",
                      timer: 1500,
                      showConfirmButton: false,
                    });
                  }
                }}
                disabled={!selectedWarehouseId}
                className="rounded-lg border border-zinc-300 px-3 py-2 text-sm hover:bg-zinc-50 disabled:opacity-60"
              >
                Save Selection
              </button>
            </div>

            {/* Search */}
            <div className="px-4 pb-3 pt-3">
              <div className="relative">
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search warehouses…"
                  className="w-full rounded-lg border border-zinc-300 bg-white px-9 py-2 text-sm outline-none placeholder:text-zinc-400 focus:border-zinc-400"
                />
                <FiSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
              </div>
            </div>

            {/* List */}
            <div className="max-h-[60vh] overflow-y-auto px-2 pb-3">
              {warehousesLoading && (
                <div className="px-2 py-6 text-center text-sm text-zinc-500">
                  Loading…
                </div>
              )}

              {!warehousesLoading && filteredWarehouses.length === 0 && (
                <div className="px-2 py-6 text-center text-sm text-zinc-500">
                  No warehouses found.
                </div>
              )}

              <ul className="space-y-2">
                {filteredWarehouses.map((w) => {
                  const active = selectedWarehouseId === w.id;
                  return (
                    <li key={w.id}>
                      <button
                        onClick={() => {
                          dispatch(setSelectedWarehouseId(w.id));
                          dispatch(setSelectedZoneId(null));
                        }}
                        className={[
                          "flex w-full items-start justify-between rounded-lg border px-3 py-2 text-left",
                          active
                            ? "border-blue-600 bg-blue-50"
                            : "border-zinc-200 bg-white hover:bg-zinc-50",
                        ].join(" ")}
                      >
                        <div>
                          <p className="font-medium">{w.name}</p>
                          <p className="text-xs text-zinc-500">
                            {w.country || "—"}
                          </p>
                          <div
                            className="flex items-center gap-1 group cursor-pointer"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (copiedId === w.id) return;
                              navigator.clipboard.writeText(w.id);
                              setCopiedId(w.id);
                              setTimeout(() => setCopiedId(null), 2000);
                            }}
                            title={copiedId === w.id ? "Copied!" : "Copy"}
                          >
                            <p className="text-xs text-zinc-500">{w.id}</p>
                            {copiedId === w.id ? (
                              <FiCheck className="h-3 w-3 text-green-600 transition-colors" />
                            ) : (
                              <FiCopy className="h-3 w-3 text-zinc-400 group-hover:text-zinc-600 transition-colors" />
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          {role !== "Technician" &&
                            role !== "Picker" &&
                            role !== "Inventory Supervisor" && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openEditWh(w);
                                }}
                                className="rounded p-1 text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
                                title="Edit"
                              >
                                <FiEdit2 />
                              </button>
                            )}
                          {/* <button
                            onClick={async (e) => {
                              e.stopPropagation();
                              await handleDeleteWarehouse(w.id);
                            }}
                            className="rounded p-1 text-red-600 hover:bg-red-50"
                            title="Delete"
                          >
                            <FiTrash2 />
                          </button> */}
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          </section>

          {/* RIGHT: Zones of selected warehouse */}
          <section className="rounded-xl border border-zinc-200 bg-white">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-zinc-200 px-4 py-3 gap-y-2">
              <h2 className="text-base font-semibold">
                {selectedWarehouseId
                  ? `Zones — ${
                      warehouseData.find((w) => w.id === selectedWarehouseId)
                        ?.name || ""
                    }`
                  : "Zones"}
              </h2>
              {role !== "Technician" &&
                role !== "Picker" &&
                role !== "Inventory Supervisor" && (
                  <button
                    onClick={openNewZn}
                    disabled={!selectedWarehouseId}
                    className="inline-flex items-center justify-center gap-2 rounded-lg bg-green-600 px-3 py-2 text-sm text-white disabled:opacity-50 hover:enabled:bg-green-700"
                  >
                    <FiPlus /> New Zone
                  </button>
                )}
            </div>

            <div className="p-4">
              {!selectedWarehouseId && (
                <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-600">
                  Select a warehouse to view its zones.
                </div>
              )}

              {selectedWarehouseId && (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-2">
                  {filteredZones.length === 0 && (
                    <div className="col-span-full rounded-lg border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-600">
                      No zones found for this warehouse.
                    </div>
                  )}
                  {filteredZones.map((z) => {
                    const active = selectedZoneId === z.id;
                    return (
                      <div
                        key={z.id}
                        onClick={() => dispatch(setSelectedZoneId(z.id))}
                        className={[
                          "flex cursor-pointer items-center justify-between rounded-lg border px-3 py-3",
                          active
                            ? "border-green-600 bg-green-50"
                            : "border-zinc-200 bg-white hover:bg-zinc-50",
                        ].join(" ")}
                      >
                        <div>
                          <p className="font-medium">{z.name}</p>
                          <div
                            className="flex items-center gap-1 group cursor-pointer"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (copiedZoneId === z.id) return; // prevent multiple copies during cooldown
                              navigator.clipboard.writeText(z.id);
                              setCopiedZoneId(z.id);
                              setTimeout(() => setCopiedZoneId(null), 2000);
                            }}
                            title={copiedZoneId === z.id ? "Copied!" : "Copy"}
                          >
                            <p className="text-xs text-zinc-500">{z.id}</p>
                            {copiedZoneId === z.id ? (
                              <FiCheck className="h-3 w-3 text-green-600 transition-colors" />
                            ) : (
                              <FiCopy className="h-3 w-3 text-zinc-400 group-hover:text-zinc-600 transition-colors" />
                            )}
                          </div>
                        </div>
                        {/* {role !== "Technician" &&
                          role !== "Picker" &&
                          role !== "Inventory Supervisor" && (
                            <div className="flex items-center gap-1">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openEditZn(z);
                                }}
                                className="rounded p-1 text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
                                title="Edit"
                              >
                                <FiEdit2 />
                              </button>
                              <button
                            onClick={async (e) => {
                              e.stopPropagation();
                              await handleDeleteZone(z.id);
                            }}
                            className="rounded p-1 text-red-600 hover:bg-red-50"
                            title="Delete"
                          >
                            <FiTrash2 />
                          </button>
                            </div>
                          )} */}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Select Zone */}
              {selectedWarehouseId && selectedZoneId && (
                <div className="mt-4 text-right">
                  <button
                    onClick={handleSelectZone}
                    className="inline-flex items-center rounded-lg bg-purple-600 px-4 py-2 text-sm text-white hover:bg-purple-700"
                  >
                    Select Zone
                  </button>
                </div>
              )}
            </div>
          </section>
        </div>

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
            <div className="w-full">
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
                <div className="w-full">
                  <label className="block text-sm font-medium text-zinc-700">
                    Type
                  </label>
                  <select
                    value={znType}
                    onChange={(e) => setZnType(e.target.value)}
                    className=" h-[2.2rem] border mt-2 w-full border-gray-400 outline-none rounded-md cursor-pointer text-sm"
                  >
                    <option value="shelf">Shelf</option>
                    <option value="not_shelf">Not Shelf</option>
                  </select>
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

        <div ref={fullscreenRef}>
          <Modal
            getContainer={getContainer}
            key={String(isFullscreen)}
            open={whModalOpen}
            onCancel={() => closeWh(false)}
            centered
            footer={null}
            width={450}
            title={null}
            className="max-h-[95vh] overflow-y-auto"
          >
            {/* Clean Tailwind-only Warehouse Modal */}
            <div className="w-full">
              <h3 className="text-lg font-semibold">
                {whEdit ? "Edit Warehouse" : "New Warehouse"}
              </h3>
              <form onSubmit={saveWh} className="mt-4 space-y-3">
                {whFormError && (
                  <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                    {whFormError}
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
                    value={whName}
                    onChange={(e) => setWhName(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-700">
                    Country
                  </label>
                  <select
                    className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm bg-white text-black duration-300 ease-in-out focus:border-zinc-400 focus:shadow-lg focus:shadow-zinc-400/50"
                    value={whCountry}
                    onChange={(e) => setWhCountry(e.target.value)}
                  >
                    <option value="" disabled>
                      Select country
                    </option>
                    {countryOptions.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="w-full">
                  <label className="block text-sm font-medium text-zinc-700">
                    Type
                  </label>
                  <select
                    value={whType}
                    onChange={(e) => setWhType(e.target.value)}
                    className=" h-[2.2rem] w-full mt-2 border border-gray-400 outline-none rounded-md cursor-pointer text-sm"
                  >
                    <option value="shelf">Shelf</option>
                    <option value="not_shelf">Not Shelf</option>
                  </select>
                </div>
                <div className="mt-6 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={closeWh}
                    className="rounded-lg border border-zinc-300 px-4 py-2 text-sm hover:bg-zinc-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={whLoading}
                    className={`rounded-lg bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 ${
                      whLoading ? "opacity-50 cursor-not-allowed" : ""
                    }`}
                  >
                    {whLoading ? "Saving…" : "Save"}
                  </button>
                </div>
              </form>
            </div>
          </Modal>
        </div>
      </div>
    </div>
  );
}
