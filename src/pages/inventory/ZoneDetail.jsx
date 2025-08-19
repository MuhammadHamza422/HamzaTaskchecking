import React, { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { FiEdit2, FiTrash2, FiPlus, FiSearch } from "react-icons/fi";
import { getZone, deleteZone } from "../api/zone";
import { getLocations, deleteLocation } from "../api/location";
import { useAuth } from "../../contexts/AuthContext";

export default function ZoneDetail() {
  const { id } = useParams();
  const zoneId = Number(id);
  const nav = useNavigate();

  const [zone, setZone] = useState(null);
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const { user } = useAuth();
  const role = user?.roles.role;

  useEffect(() => {
    (async () => {
      setLoading(true);
      const z = await getZone(zoneId);
      setZone(z);
      const allLocs = await getLocations();
      setLocations(allLocs.filter((l) => l.zoneId === zoneId));
      setLoading(false);
    })();
  }, [zoneId]);

  const handleDeleteZone = async () => {
    if (!confirm("Delete this zone and all its locations?")) return;
    await deleteZone(zoneId);
    nav("/zones");
  };

  const handleDeleteLocation = async (locId) => {
    if (!confirm("Delete this location?")) return;
    await deleteLocation(locId);
    setLocations((prev) => prev.filter((l) => l.id !== locId));
  };

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return locations;
    return locations.filter(
      (l) =>
        l.code.toLowerCase().includes(t) ||
        String(l.row).includes(t) ||
        String(l.bay).includes(t) ||
        String(l.level).includes(t) ||
        (l.bin ? String(l.bin).includes(t) : false)
    );
  }, [q, locations]);

  if (loading || !zone) {
    return (
      <div className="rounded-xl border border-zinc-200 bg-white px-4 py-6 text-center text-sm text-zinc-600">
        Loading zone…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-xl border border-zinc-200 bg-white">
        <div className="flex flex-col items-start justify-between gap-3 border-b border-zinc-200 px-4 py-4 sm:flex-row sm:items-center">
          <div>
            <h1 className="text-xl font-semibold">{zone.name}</h1>
            {zone.description && (
              <p className="mt-1 text-sm text-zinc-600">{zone.description}</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => nav(`/zones/${zoneId}/edit`)}
              className="inline-flex items-center gap-2 rounded-lg border border-zinc-300 px-3 py-2 text-sm hover:bg-zinc-50"
            >
              <FiEdit2 /> Edit Zone
            </button>
            <button
              onClick={handleDeleteZone}
              className="inline-flex items-center gap-2 rounded-lg border border-zinc-300 px-3 py-2 text-sm hover:bg-zinc-50"
            >
              <FiTrash2 /> Delete Zone
            </button>
            <button
              onClick={() => nav("/locations/new")}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm text-white hover:bg-blue-700"
            >
              <FiPlus /> New Location
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="px-4 pb-4 pt-3">
          <div className="relative">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search locations…"
              className="w-full rounded-lg border border-zinc-300 bg-white px-9 py-2 text-sm outline-none placeholder:text-zinc-400 focus:border-zinc-400"
            />
            <FiSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          </div>
        </div>
      </div>

      {/* Locations */}
      {filtered.length === 0 ? (
        <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-6 text-center text-sm text-zinc-600">
          No locations yet.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((loc) => (
            <div
              key={loc.id}
              className="group relative rounded-xl border border-zinc-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
            >
              {/* Actions */}
              <div className="absolute right-2 top-2 hidden gap-1 group-hover:flex">
                <button
                  onClick={() => nav(`/locations/${loc.id}/edit`)}
                  className="rounded p-1 text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
                  title="Edit"
                >
                  <FiEdit2 />
                </button>
                <button
                  onClick={() => handleDeleteLocation(loc.id)}
                  className="rounded p-1 text-red-600 hover:bg-red-50"
                  title="Delete"
                >
                  <FiTrash2 />
                </button>
              </div>

              <div className="flex items-start justify-between">
                <h3 className="truncate text-base font-semibold">{loc.code}</h3>
                <span className="ml-2 inline-flex items-center rounded-full border border-zinc-300 px-2 py-0.5 text-xs">
                  {loc.type}
                </span>
              </div>

              {loc.qrPath && (
                <img
                  src={loc.qrPath}
                  alt={`${loc.code} QR`}
                  className="mx-auto mt-3 h-20 w-20"
                />
              )}

              <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-zinc-600">
                <div>
                  <dt className="text-zinc-500">Row</dt>
                  <dd className="font-medium">{loc.row}</dd>
                </div>
                <div>
                  <dt className="text-zinc-500">Bay</dt>
                  <dd className="font-medium">{loc.bay}</dd>
                </div>
                <div>
                  <dt className="text-zinc-500">Level</dt>
                  <dd className="font-medium">{loc.level}</dd>
                </div>
                {loc.bin && (
                  <div>
                    <dt className="text-zinc-500">Bin</dt>
                    <dd className="font-medium">{loc.bin}</dd>
                  </div>
                )}
              </dl>

              <button
                onClick={() => nav(`/locations/${loc.id}`)}
                className="mt-4 inline-flex text-sm text-blue-600 hover:underline"
              >
                View details →
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
