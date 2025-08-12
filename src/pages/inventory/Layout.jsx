import React from "react";
import { Link, Outlet, useLocation } from "react-router-dom";

function Icon({ name, active }) {
  const common = "h-5 w-5";
  const c = active ? "text-white" : "text-blue-100";
  switch (name) {
    case "home":
      return (
        <svg className={`${common} ${c}`} viewBox="0 0 24 24" fill="none">
          <path d="M3 10.5 12 3l9 7.5v9a1.5 1.5 0 0 1-1.5 1.5H4.5A1.5 1.5 0 0 1 3 19.5v-9Z" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      );
    case "warehouse":
      return (
        <svg className={`${common} ${c}`} viewBox="0 0 24 24" fill="none">
          <path d="M3 9l9-5 9 5v11a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9Z" stroke="currentColor" strokeWidth="1.5" />
          <path d="M7 21v-8h10v8" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      );
    case "zones":
      return (
        <svg className={`${common} ${c}`} viewBox="0 0 24 24" fill="none">
          <rect x="3" y="3" width="8" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
          <rect x="13" y="3" width="8" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
          <rect x="3" y="13" width="8" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
          <rect x="13" y="13" width="8" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      );
    case "locations":
      return (
        <svg className={`${common} ${c}`} viewBox="0 0 24 24" fill="none">
          <path d="M12 21s7-5.4 7-10.5A7 7 0 1 0 5 10.5C5 15.6 12 21 12 21Z" stroke="currentColor" strokeWidth="1.5" />
          <circle cx="12" cy="10.5" r="2.5" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      );
    case "inventory":
      return (
        <svg className={`${common} ${c}`} viewBox="0 0 24 24" fill="none">
          <path d="M4 7h16M4 12h16M4 17h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      );
    case "products":
      return (
        <svg className={`${common} ${c}`} viewBox="0 0 24 24" fill="none">
          <path d="M3 7.5 12 3l9 4.5-9 4.5L3 7.5Z" stroke="currentColor" strokeWidth="1.5" />
          <path d="M12 12v9" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      );
    case "upload":
      return (
        <svg className={`${common} ${c}`} viewBox="0 0 24 24" fill="none">
          <path d="M12 16V4m0 0 4 4m-4-4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          <path d="M4 20h16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      );
    case "scan":
      return (
        <svg className={`${common} ${c}`} viewBox="0 0 24 24" fill="none">
          <path d="M4 7V4h3M17 4h3v3M7 20H4v-3M20 17v3h-3" stroke="currentColor" strokeWidth="1.5" />
          <path d="M4 12h16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      );
    default:
      return <div className={`${common} ${c}`}>•</div>;
  }
}

const navItems = [
  { to: "/inventory", label: "Home", icon: "home", exact: true },
  { to: "/inventory/warehouses", label: "Warehouses", icon: "warehouse" },
  { to: "/inventory/zones", label: "Zones", icon: "zones" },
  { to: "/inventory/locations", label: "Locations", icon: "locations" },
  { to: "/inventory/inventory", label: "Inventory", icon: "inventory" },
  { to: "/inventory/products", label: "Products", icon: "products" },
  { to: "/inventory/products/upload", label: "Upload Products", icon: "upload" },
  { to: "/inventory/scan", label: "Scan", icon: "scan" },
];

export default function InventoryLayout() {
  const location = useLocation();

  const isActive = (to, exact) => {
    if (exact) return location.pathname === to;
    return location.pathname === to || location.pathname.startsWith(to + "/");
  };

  return (
    <div className="flex gap-4">
      {/* Sidebar */}
      <aside
        className="w-64 shrink-0 rounded-xl overflow-hidden max-h-screen overflow-y-auto"
        style={{
          background: "linear-gradient(180deg, #1e3a8a 0%, #2563eb 100%)",
        }}
      >
        <div className="p-5">
          <div className="mb-4">
            <h2 className="text-white text-lg font-semibold">Inventory</h2>
            <p className="text-blue-100 text-sm">Manage stock and locations</p>
          </div>
          <nav className="space-y-1">
            {navItems.map((item) => {
              const active = isActive(item.to, item.exact);
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200 ${
                    active
                      ? "bg-white/15 text-white hover:text-white"
                      : "text-blue-100 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  <Icon name={item.icon} active={active} />
                  <span className="text-sm font-medium">{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      </aside>

      {/* Content */}
      <section className="flex-1 min-w-0">
        <Outlet />
      </section>
    </div>
  );
}


