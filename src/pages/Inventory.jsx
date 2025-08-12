import React from "react";
import { Link } from "react-router-dom";
import {
  FiHome,
  FiBox,
  FiMap,
  FiGrid,
  FiPackage,
  FiUpload,
  FiCamera,
} from "react-icons/fi";

export default function Inventory() {
  const cards = [
    {
      to: "/inventory/warehouses",
      label: "Warehouses",
      icon: <FiBox className="h-5 w-5" />,
    },
    { to: "/inventory/zones", label: "Zones", icon: <FiGrid className="h-5 w-5" /> },
    {
      to: "/inventory/locations",
      label: "Locations",
      icon: <FiMap className="h-5 w-5" />,
    },
    {
      to: "/inventory/inventory",
      label: "Inventory",
      icon: <FiPackage className="h-5 w-5" />,
    },
    {
      to: "/inventory/products",
      label: "Products",
      icon: <FiHome className="h-5 w-5" />,
    },
    {
      to: "/inventory/products/upload",
      label: "Upload Products",
      icon: <FiUpload className="h-5 w-5" />,
    },
    { to: "/inventory/scan", label: "Scan", icon: <FiCamera className="h-5 w-5" /> },
  ];

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-zinc-200 bg-white p-5">
        <h1 className="text-2xl font-semibold">Warehouse Inventory</h1>
        <p className="mt-1 text-sm text-zinc-600">
          Overview and quick links will appear here.
        </p>
      </div>

      <div className="rounded-xl border border-zinc-200 bg-white p-5">
        <h2 className="text-base font-semibold">Quick actions</h2>
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map((c) => (
            <Link
              key={c.to}
              to={c.to}
              className="group flex items-center justify-between rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3 hover:border-zinc-300 hover:bg-white"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-md bg-blue-600 text-white">
                  {c.icon}
                </div>
                <span className="font-medium">{c.label}</span>
              </div>
              <span className="text-zinc-400 group-hover:text-zinc-500">→</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
