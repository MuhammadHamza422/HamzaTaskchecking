import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FiPlus, FiEdit2, FiTrash2, FiSearch } from "react-icons/fi";
import { useDispatch, useSelector } from "react-redux";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getZonesByWarehouse, deleteZone as apiDeleteZone, getWarehouse } from "../../api/warehouse";
import { setSelectedZoneId } from "../../store/appSlice.js";
import Swal from "sweetalert2";

export default function Zones() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const queryClient = useQueryClient();

  const selectedWarehouseId = useSelector((s) => s.app.selectedWarehouseId);
  const selectedZoneId = useSelector((s) => s.app.selectedZoneId);

  const [q, setQ] = useState("");

  const { data, isLoading, error } = useQuery({
    queryKey: ["zones", selectedWarehouseId],
    queryFn: () => (selectedWarehouseId ? getZonesByWarehouse(selectedWarehouseId) : null),
    enabled: !!selectedWarehouseId,
    staleTime: 60 * 1000,
  });

  const { data: warehouseDetail } = useQuery({
    queryKey: ["warehouse", selectedWarehouseId],
    queryFn: () => (selectedWarehouseId ? getWarehouse(selectedWarehouseId) : null),
    enabled: !!selectedWarehouseId,
    staleTime: 5 * 60 * 1000,
  });

  const zones = useMemo(() => {
    const list = Array.isArray(data?.zones) ? data.zones : [];
    return list.map((z) => ({
      id: z.id ?? z._id,
      name: z.name,
      description: z.description,
      warehouseId: z.warehouse?.id ?? z.warehouse?._id ?? selectedWarehouseId,
    }));
  }, [data, selectedWarehouseId]);

  const warehouseName = useMemo(() => {
    if (warehouseDetail?.warehouse?.name) return warehouseDetail.warehouse.name;
    if (warehouseDetail?.name) return warehouseDetail.name;
    const first = Array.isArray(data?.zones) && data.zones.length > 0 ? data.zones[0] : null;
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-xl border border-zinc-200 bg-white">
        <div className="flex items-center justify-between gap-3 border-b border-zinc-200 px-4 py-3">
          <h1 className="text-base font-semibold">
            Zones {selectedWarehouseId ? `— ${warehouseName || "Warehouse"}` : ""}
          </h1>
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate("/zones/new")}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm text-white hover:bg-blue-700"
            >
              <FiPlus /> New Zone
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="px-4 pb-4 pt-3">
          <div className="relative">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search zones…"
              className="w-full rounded-lg border border-zinc-300 bg-white px-9 py-2 text-sm outline-none placeholder:text-zinc-400 focus:border-zinc-400"
            />
            <FiSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
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

        {filtered.map((z) => (
          <div
            key={z.id}
            onClick={() => dispatch(setSelectedZoneId(z.id))}
            className={`group relative cursor-pointer rounded-xl border p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${
              selectedZoneId === z.id
                ? "border-blue-600 bg-blue-50"
                : "border-zinc-200 bg-white"
            }`}
          >
            {/* Actions */}
            <div className="absolute right-2 top-2 hidden gap-1 group-hover:flex">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(`/zones/${z.id}/edit`);
                }}
                className="rounded p-1 text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
                title="Edit"
              >
                <FiEdit2 />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteZone(z.id);
                }}
                className="rounded p-1 text-red-600 hover:bg-red-50"
                title="Delete"
              >
                <FiTrash2 />
              </button>
            </div>

            <h2 className="truncate text-base font-semibold">{z.name}</h2>
            {z.description && (
              <p className="mt-1 line-clamp-3 text-sm text-zinc-600">
                {z.description}
              </p>
            )}

            <div className="mt-3 text-sm text-blue-600">Select →</div>
          </div>
        ))}
      </div>
      {/* Selected zone details */}
      {selectedZoneId && (
        <div className="rounded-xl border border-zinc-200 bg-white p-5">
          {(() => {
            const z = zones?.find((x) => x.id === selectedZoneId);
            if (!z) return null;
            return (
              <div>
                <h2 className="text-lg font-semibold">Selected Zone: {z?.name}</h2>
                {z?.description && (
                  <p className="mt-1 text-sm text-zinc-600">{z?.description}</p>
                )}
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
}
