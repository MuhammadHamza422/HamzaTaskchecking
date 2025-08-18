import React, { useEffect, useState } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "../../contexts/AuthContext";
import Swal from "sweetalert2";

function Icon({ name, active }) {
  const common = "h-5 w-5";
  const c = active ? "text-white" : "text-blue-100";
  switch (name) {
    case "app":
      return (
        <svg className={`${common} ${c}`} viewBox="0 0 24 24" fill="none">
          {/* rounded square */}
          <rect
            x="3.5"
            y="3.5"
            width="17"
            height="17"
            rx="3"
            stroke="currentColor"
            strokeWidth="1.5"
          />
          {/* 2x2 grid */}
          <rect
            x="7.2"
            y="7.2"
            width="3.2"
            height="3.2"
            rx="0.6"
            stroke="currentColor"
            strokeWidth="1.2"
          />
          <rect
            x="13.6"
            y="7.2"
            width="3.2"
            height="3.2"
            rx="0.6"
            stroke="currentColor"
            strokeWidth="1.2"
          />
          <rect
            x="7.2"
            y="13.6"
            width="3.2"
            height="3.2"
            rx="0.6"
            stroke="currentColor"
            strokeWidth="1.2"
          />
          <rect
            x="13.6"
            y="13.6"
            width="3.2"
            height="3.2"
            rx="0.6"
            stroke="currentColor"
            strokeWidth="1.2"
          />
        </svg>
      );

    case "home":
      return (
        <svg className={`${common} ${c}`} viewBox="0 0 24 24" fill="none">
          <path
            d="M3 10.5 12 3l9 7.5v9a1.5 1.5 0 0 1-1.5 1.5H4.5A1.5 1.5 0 0 1 3 19.5v-9Z"
            stroke="currentColor"
            strokeWidth="1.5"
          />
        </svg>
      );
    case "warehouse":
      return (
        <svg className={`${common} ${c}`} viewBox="0 0 24 24" fill="none">
          <path
            d="M3 9l9-5 9 5v11a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9Z"
            stroke="currentColor"
            strokeWidth="1.5"
          />
          <path d="M7 21v-8h10v8" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      );
    case "zones":
      return (
        <svg className={`${common} ${c}`} viewBox="0 0 24 24" fill="none">
          <rect
            x="3"
            y="3"
            width="8"
            height="8"
            rx="1.5"
            stroke="currentColor"
            strokeWidth="1.5"
          />
          <rect
            x="13"
            y="3"
            width="8"
            height="8"
            rx="1.5"
            stroke="currentColor"
            strokeWidth="1.5"
          />
          <rect
            x="3"
            y="13"
            width="8"
            height="8"
            rx="1.5"
            stroke="currentColor"
            strokeWidth="1.5"
          />
          <rect
            x="13"
            y="13"
            width="8"
            height="8"
            rx="1.5"
            stroke="currentColor"
            strokeWidth="1.5"
          />
        </svg>
      );
    case "locations":
      return (
        <svg className={`${common} ${c}`} viewBox="0 0 24 24" fill="none">
          <path
            d="M12 21s7-5.4 7-10.5A7 7 0 1 0 5 10.5C5 15.6 12 21 12 21Z"
            stroke="currentColor"
            strokeWidth="1.5"
          />
          <circle
            cx="12"
            cy="10.5"
            r="2.5"
            stroke="currentColor"
            strokeWidth="1.5"
          />
        </svg>
      );
    case "inventory":
      return (
        <svg className={`${common} ${c}`} viewBox="0 0 24 24" fill="none">
          <path
            d="M4 7h16M4 12h16M4 17h10"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      );
    case "products":
      return (
        <svg className={`${common} ${c}`} viewBox="0 0 24 24" fill="none">
          <path
            d="M3 7.5 12 3l9 4.5-9 4.5L3 7.5Z"
            stroke="currentColor"
            strokeWidth="1.5"
          />
          <path d="M12 12v9" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      );
    case "upload":
      return (
        <svg className={`${common} ${c}`} viewBox="0 0 24 24" fill="none">
          <path
            d="M12 16V4m0 0 4 4m-4-4-4 4"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          <path
            d="M4 20h16"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      );
    case "scan":
      return (
        <svg className={`${common} ${c}`} viewBox="0 0 24 24" fill="none">
          <path
            d="M4 7V4h3M17 4h3v3M7 20H4v-3M20 17v3h-3"
            stroke="currentColor"
            strokeWidth="1.5"
          />
          <path
            d="M4 12h16"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      );
    case "activity":
      return (
        <svg className={`${common} ${c}`} viewBox="0 0 24 24" fill="none">
          {/* document / list */}
          <path
            d="M7 2h6l4 4v14a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1z"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
          <path
            d="M9 8h6"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          <path
            d="M9 11h6"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          <path
            d="M9 14h4"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          {/* small clock */}
          <circle
            cx="17.5"
            cy="17.5"
            r="2.2"
            stroke="currentColor"
            strokeWidth="1.2"
          />
          <path
            d="M17.5 16.2v1l0.9 0.5"
            stroke="currentColor"
            strokeWidth="1.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );

    default:
      return <div className={`${common} ${c}`}>•</div>;
  }
}

const navItems = [
  { to: "/", label: "App", icon: "app" },
  { to: "/inventory", label: "Home", icon: "home", exact: true },
  { to: "/inventory/warehouses", label: "Warehouse", icon: "warehouse" },
  { to: "/inventory/zones", label: "Zone", icon: "zones" },
  { to: "/inventory/locations", label: "Location", icon: "locations" },
  { to: "/inventory/inventory", label: "Inventory", icon: "inventory" },
  { to: "/inventory/products", label: "Products", icon: "products" },
  { to: "/inventory/scan", label: "Scan", icon: "scan" },
  { to: "/inventory/activity-logs", label: "Activity Log", icon: "activity" },
];

export default function InventoryLayout() {
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrollTop, setScrollTop] = useState(0);
  const { user, logout } = useAuth();

  console.log("user", user);

  const isActive = (to, exact) => {
    if (exact) return location.pathname === to;
    return location.pathname === to || location.pathname.startsWith(to + "/");
  };

  useEffect(() => {
    window.addEventListener("scroll", handleScroll);
    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  const handleScroll = () => {
    const scrollTop = window.scrollY;
    setScrollTop(scrollTop);
  };

  const handleLogout = async () => {
    const result = await Swal.fire({
      title: "Are you sure?",
      text: "You will be logged out of the application.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#1e3a8a",
      cancelButtonColor: "#6b7280",
      confirmButtonText: "Yes, logout!",
      cancelButtonText: "Cancel",
      reverseButtons: true,
      customClass: {
        popup: "rounded-lg",
        confirmButton: "rounded-md",
        cancelButton: "rounded-md",
      },
    });
    if (result.isConfirmed) {
      logout();
    }
  };

  // Get allowed inventory menus for the user
  const allowedInventoryMenus =
    user?.roles?.access?.find((role) => role.app === "inventory")?.menu || [];

  // Convert to lowercase to normalize (since in DB you have "activity log" but in navItems it's "activity")
  const normalizedAllowedMenus = allowedInventoryMenus.map(
    (m) => m.toLowerCase().replace(/\s+/g, "-") // convert "activity log" → "activity-log"
  );

  // Now filter navItems based on allowed menus
  const filteredNavItems = navItems.filter((item) =>
    normalizedAllowedMenus.includes(
      item.label.toLowerCase().replace(/\s+/g, "-")
    )
  );

  return (
    <div className="flex m-0 p-0">
      {/* Desktop Sidebar */}
      <div className="relative w-64 h-full hidden md:block">
        <aside
          className={`fixed ${
            scrollTop > 100 ? "max-h-screen" : " max-h-screen"
          }  w-64 h-full  shrink-0 overflow-hidden  overflow-y-auto`}
          style={{
            background: "linear-gradient(180deg, #1e3a8a 0%, #2563eb 100%)",
          }}
        >
          <div className="p-4 flex flex-col justify-between h-full">
            <div>
              <Link to="/" className="block mb-4">
                <img
                  src="/logo.png"
                  alt="Logo"
                  className="w-32 sm:w-40 md:w-44 object-contain cursor-pointer"
                />
              </Link>
              {/* <div className="mb-4">
                <h2 className="text-white text-2xl text-center font-semibold">Inventory</h2>
              </div> */}
              <nav className="space-y-1">
                {filteredNavItems.map((item) => {
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
            {user && (
              <motion.button
                whileTap={{ scale: 0.95 }}
                whileHover={{ scale: 1.05 }}
                onClick={handleLogout}
                className="hidden lg:block"
                style={{
                  background: "#ffffff",
                  color: "#1e3a8a",
                  border: "none",
                  borderRadius: "8px",
                  padding: "0.5rem 1.2rem",
                  cursor: "pointer",
                  fontWeight: 600,
                  boxShadow: "0 2px 6px rgba(0,0,0,0.12)",
                  transition: "background 0.3s ease",
                }}
              >
                Logout
              </motion.button>
            )}
          </div>
        </aside>
      </div>

      {/* Mobile Sidebar Overlay */}
      <div
        className={`md:hidden fixed inset-0 z-[999] transition-opacity duration-300 ${
          mobileOpen
            ? "opacity-100 pointer-events-auto"
            : "opacity-0 pointer-events-none"
        }`}
      >
        <div
          className="absolute inset-0 bg-black/40"
          onClick={() => setMobileOpen(false)}
        />
        <aside
          className={`absolute inset-y-0 left-0 z-10 w-64 rounded-r-xl overflow-hidden shadow-xl transform transition-transform duration-300 ease-in-out ${
            mobileOpen ? "translate-x-0" : "-translate-x-full"
          }`}
          style={{
            background: "linear-gradient(180deg, #1e3a8a 0%, #2563eb 100%)",
          }}
        >
          <div className="p-5 flex flex-col justify-between h-full">
            <div>
              <div className="mb-4 flex items-center justify-between">
                <Link to="/" className="block">
                  <img
                    src="/logo.png"
                    alt="Logo"
                    className="w-32 sm:w-40 md:w-44 object-contain cursor-pointer"
                  />
                </Link>
                <button
                  onClick={() => setMobileOpen(false)}
                  className="text-blue-100 hover:text-white transition-colors duration-200"
                  aria-label="Close sidebar"
                >
                  <svg
                    className="h-6 w-6"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M6 6l12 12M6 18L18 6" />
                  </svg>
                </button>
              </div>
              <nav className="space-y-1">
                {navItems.map((item) => {
                  const active = isActive(item.to, item.exact);
                  return (
                    <Link
                      key={item.to}
                      to={item.to}
                      onClick={() => setMobileOpen(false)}
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
            {user && (
              <motion.button
                whileTap={{ scale: 0.95 }}
                whileHover={{ scale: 1.05 }}
                onClick={handleLogout}
                className="block lg:hidden"
                style={{
                  background: "#ffffff",
                  color: "#1e3a8a",
                  border: "none",
                  borderRadius: "8px",
                  padding: "0.5rem 1.2rem",
                  cursor: "pointer",
                  fontWeight: 600,
                  boxShadow: "0 2px 6px rgba(0,0,0,0.12)",
                  transition: "background 0.3s ease",
                }}
              >
                Logout
              </motion.button>
            )}
          </div>
        </aside>
      </div>

      {/* Content */}
      <section className="flex-1 min-w-0 p-4">
        {/* Mobile top bar */}
        <div className="md:hidden mb-3 flex items-center">
          <button
            onClick={() => setMobileOpen(true)}
            className="inline-flex items-center justify-center rounded-lg border px-3 py-2 text-sm transition-colors duration-200 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white"
            aria-label="Open sidebar"
          >
            <svg
              className="h-5 w-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M3 6h18M3 12h18M3 18h18" />
            </svg>
            <span className="ml-2">Menu</span>
          </button>
        </div>
        <Outlet />
      </section>
    </div>
  );
}
