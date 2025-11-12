import { useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { motion } from "framer-motion";
import Swal from "sweetalert2";
import useFullscreen from "../useFullscreen";

import FulfillmentTabs from "../../pages/order-fulfillment/components/common/FulfillmentTabs";
import { 
  MdAdd, 
  MdFullscreen, 
  MdFullscreenExit,
  MdPendingActions,
  MdCheckCircle,
  MdCreateNewFolder
} from "react-icons/md";

const navLinks = [
  {
    to: "/",
    label: "Dashboard",
    roles: ["sourcer", "purchaser", "admin"],
  },
  { to: "/sourcing/orders", label: "Sourcing Orders", roles: ["sourcer"] },
  // { to: "/requests/pending", label: "Pending", roles: ["purchaser"] },
  { to: "/requests/my", label: "Assigned to Me", roles: ["purchaser"] },
  // Attendance navigation
  { to: "/attendance", label: "Attendance", roles: ["admin"] },
  {
    to: "/attendance-activity",
    label: "Attendance Activity",
    roles: ["admin"],
  },
  {
    to: "/purchaser/dashboard",
    label: "Dashboard",
    app: "purchasing",
    roles: ["admin", "purchaser"],
  },
  {
    to: "/purchaser/pending",
    label: "All Listings",
    app: "purchasing",
    roles: ["admin", "purchaser"],
  },
  {
    to: "/purchaser/listings",
    label: "My Listings",
    app: "purchasing",
    roles: ["admin", "purchaser"],
  },
  {
    to: "/purchaser/returned",
    label: "Returned",
    app: "purchasing",
    roles: ["admin", "purchaser"],
  },
  {
    label: "Users",
    isDropdown: true,
    app: "users",
    roles: ["admin"],
    children: [
      { to: "/admin/users", label: "Users", default: true },
      { to: "/admin/user-activity", label: "User Activity" },
      { to: "/admin/roles", label: "Role Management" },
      { to: "/admin/companies", label: "Companies" },
    ],
  },
  {
    label: "Products",
    isDropdown: true,
    app: "products",
    roles: ["admin"],
    children: [
      { to: "product/admin/products", label: "Products", default: true },
      { to: "product/inventory/products", label: "Inventory Products" },
      { to: "product/merged-products", label: "Merged Products" },
    ],
  },
  {
    label: "Orders",
    isDropdown: true,
    app: "orders",
    roles: ["admin", "sourcer", "purchaser"],
    children: [
      {
        to: "orders/external/orders/pending",
        label: "Pending Orders",
        default: true,
        icon: MdPendingActions,
        color: "blue",
      },
      { 
        to: "orders/external/orders/processed", 
        label: "Processed Orders",
        icon: MdCheckCircle,
        color: "green",
      },
      { 
        to: "orders/external/orders/manual", 
        label: "Manual Orders",
        icon: MdCreateNewFolder,
        color: "orange",
      },
    ],
  },
 
  {
    to: "orders/platforms",
    label: "Platforms",
    app: "orders",
    roles: ["admin"],
  },
  { to: "orders/kits", label: "Kits", app: "orders", roles: ["admin"] },

  {
    to: "/sourcing",
    label: "Dashboard",
    app: "sourcing",
    roles: ["admin", "sourcer", "purchaser"],
  },

  {
    to: "/sourcing/orders",
    label: "My Listings",
    app: "sourcing",
    roles: ["admin", "sourcer", "purchaser"],
  },
  {
    to: "/sourcing/sellers",
    label: "My Suppliers",
    app: "sourcing",
    roles: ["admin", "sourcer", "purchaser"],
  },
  {
    to: "/procurement",
    label: "Dashboard",
    app: "procurement",
    // menuItem: "dashboard",
    roles: ["admin", "procurement", "manager"],
  },
  {
    to: "/procurement/orders",
    label: "Purchase Orders",
    app: "procurement",
    menuItem: "view orders",
    roles: ["admin", "procurement", "manager"],
  },
];

/* ✅ Check if user has access to app */
const hasAppAccess = (user, app) => {
  if (!app) return true;
  return user?.roles?.access?.some((a) => a.app === app);
};

/* ✅ Check if user has specific menu access */
const hasMenuAccess = (user, app, menuItem) => {
  if (!app || !menuItem) return true;
  const appAccess = user?.roles?.access?.find((a) => a.app === app);
  if (!appAccess) return false;
  return appAccess.menu.includes(menuItem.toLowerCase());
};

/* ✅ Filter children menus by DB menus */
const filterChildren = (user, app, children) => {
  const appAccess = user?.roles?.access?.find((a) => a.app === app);
  if (!appAccess) return [];
  return children.filter((child) =>
    appAccess.menu.includes(child.label.toLowerCase())
  );
};

const shouldShowNavigation = (pathname) => {
  return !pathname.startsWith("/inventory");
};

const MainLayout = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const pathName = location.pathname;
  const { ref, isFullscreen, toggle } = useFullscreen();

  const handleNavClick = (to) => {
    if (location.pathname === to) {
      navigate("/reload", { replace: true });
      setTimeout(() => navigate(to), 0);
    } else {
      navigate(to);
    }
    setIsMobileMenuOpen(false);
  };

  const isPurchasingCtx =
    pathName.startsWith("/purchaser") || pathName.startsWith("/requests");

  /* ✅ Filter top-level links by role + app permission */

  const filteredLinks = navLinks.filter(
    (link) =>
      // Basic role check
      (link.roles?.includes(user.roles.role) &&
        hasAppAccess(user, link.app) &&
        // Context-specific filtering
        ((pathName.startsWith("/admin") &&
          (link.label === "Users" || (link.label === "Dashboard" && link.to === "/"))) ||
          (pathName.startsWith("/product") &&
            ["Products", "Dashboard"].includes(link.label) && link.to === "/") ||
          (pathName.startsWith("/orders") &&
            [
              "Dashboard",
              "Orders",
              "Platforms",
              "Kits",
              "Pending Orders",
              "Processed Orders",
              "Manual Orders",
            ].includes(link.label) && (link.label !== "Dashboard" || link.to === "/")) ||
          (pathName.startsWith("/attendance") &&
            ["Attendance", "Attendance Activity"].includes(link.label)))) ||
      // Sourcing context
      (pathName.startsWith("/sourcing") &&
        ["Sourcing", "Dashboard", "My Listings", "My Suppliers"].includes(
          link.label
        ) &&
        (link.app === "sourcing" || link.to.startsWith("/sourcing"))) ||
      // Purchaser context
      (pathName.startsWith("/purchaser") &&
        [
          "Dashboard",
          "Pending",
          "All Assigned",
          "All Listings",
          "My Listings",
          "Returned",   
        ].includes(link.label) &&
        (link.app === "purchasing" || link.to.startsWith("/purchaser")) &&
        (link.label !== "Dashboard" || link.to === "/purchaser/dashboard")) ||
      // Purchasing context
      (isPurchasingCtx &&
        [
          "Dashboard",
          "Pending",
          "All Assigned",
          "All Listings",
          "My Listings",
        ].includes(link.label) &&
        (link.app === "purchasing" ||
          link.to.startsWith("/purchaser") ||
          link.to.startsWith("/requests")) &&
        (link.label !== "Dashboard" || link.to === "/purchaser/dashboard")) ||
      // Show attendance links only on attendance pages
      (pathName.startsWith("/attendance") &&
        link.roles?.includes(user.roles.role) &&
        ["Attendance", "Attendance Activity"].includes(link.label) &&
        user.roles.role === "admin") ||
      // Procurement context
      (pathName.startsWith("/procurement") &&
        link.app === "procurement" &&
        link.roles?.includes(user.roles.role) &&
        hasAppAccess(user, link.app) &&
        hasMenuAccess(user, link.app, link.menuItem) &&
        (link.label !== "Dashboard" || link.to === "/procurement")) ||
      // Scan context
      (pathName.startsWith("/scan") &&
        link.app === "scan" &&
        link.roles?.includes(user.roles.role) &&
        hasAppAccess(user, link.app))
  );

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

  const displayName = user
    ? [user.firstName, user.lastName].filter(Boolean).join(" ") ||
      user.name ||
      user.email?.split("@")[0]
    : "Guest";

  return (
    <div ref={ref} className="min-h-screen bg-[#f4f6fa] overflow-x-hidden">
      {shouldShowNavigation(pathName) && (
        <>
          {/* Mobile Sidebar Overlay */}
          {isMobileMenuOpen && (
            <div
              className="fixed inset-0 bg-black/80 z-[999] lg:hidden"
              onClick={() => setIsMobileMenuOpen(false)}
            />
          )}

          {/* Mobile Sidebar */}
          <div
            className={`fixed top-0 right-0 z-[999] h-full w-80 bg-white shadow-xl transform transition-transform duration-300 ease-in-out lg:hidden ${
              isMobileMenuOpen ? "translate-x-0" : "translate-x-full"
            }`}
          >
            <div className="flex flex-col h-full">
              {/* Mobile Sidebar Header */}
              <div
                style={{
                  background: "linear-gradient(90deg, #1e3a8a, #2563eb)",
                  padding: "1.5rem",
                  color: "#fff",
                }}
              >
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm opacity-90">Welcome,</p>
                    <p className="text-lg font-semibold">{displayName}</p>
                  </div>
                  <button
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="text-white bg-blue-600 p-2 rounded-md shadow-lg hover:shadow-white"
                  >
                    <svg
                      className="w-6 h-6"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Mobile Navigation Links */}
              <div className="flex-1 overflow-y-auto p-4">
                <nav className="space-y-2">
                  {filteredLinks.map((link) => {
                    if (link.isDropdown) {
                      const children = filterChildren(
                        user,
                        link.app,
                        link.children
                      );
                      if (!children.length) return null;
                      return (
                        <div key={link.label} className="mb-2">
                          <div className="font-semibold text-gray-700 mb-1">
                            {link.label}
                          </div>
                          <div className="flex flex-col gap-1">
                            {children.map((child) => {
                              const isActive = location.pathname === child.to;
                              const IconComponent = child.icon || MdAdd;
                              const colorClass = child.color === "blue" 
                                ? "bg-blue-500" 
                                : child.color === "green"
                                ? "bg-green-500"
                                : "bg-orange-500";
                              
                              const getActiveClasses = () => {
                                if (child.color === "blue") {
                                  return "bg-blue-100 border-l-4 border-blue-600 text-blue-800";
                                } else if (child.color === "green") {
                                  return "bg-green-100 border-l-4 border-green-600 text-green-800";
                                } else {
                                  return "bg-orange-100 border-l-4 border-orange-600 text-orange-800";
                                }
                              };

                              return (
                                <div
                                  key={child.to}
                                  onClick={() => handleNavClick(child.to)}
                                  className={`w-full p-3 rounded-lg cursor-pointer transition-all duration-300 flex items-center gap-2 ${
                                    isActive
                                      ? `${getActiveClasses()} font-semibold`
                                      : "text-gray-700 hover:bg-gray-50"
                                  }`}
                                >
                                  <div className={`flex items-center justify-center w-7 h-7 rounded-lg ${colorClass} text-white flex-shrink-0`}>
                                    <IconComponent className="text-xs" />
                                  </div>
                                  <span className="text-sm">{child.label}</span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    } else {
                      const isActive =
                        location.pathname === link.to ||
                        (location.pathname.startsWith(`${link.to}/`) &&
                          !(link.to === "/procurement" &&
                            location.pathname.startsWith("/procurement/orders")));
                      return (
                        <motion.div
                          key={link.to}
                          whileHover={{ scale: 1.02 }}
                          transition={{ type: "spring", stiffness: 300 }}
                          onClick={() => handleNavClick(link.to)}
                          className={`w-full p-4 rounded-lg cursor-pointer transition-all duration-300 ${
                            isActive
                              ? "bg-blue-100 border-l-4 border-blue-600 font-semibold text-blue-800"
                              : "text-gray-700 hover:bg-blue-50 hover:text-blue-600"
                          }`}
                        >
                          {link.label}
                        </motion.div>
                      );
                    }
                  })}
                </nav>
              </div>

              {/* Mobile Logout Button */}
              {user && (
                <div className="border-t p-4">
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={() => {
                      handleLogout();
                      setIsMobileMenuOpen(false);
                    }}
                    className="w-full bg-red-50 text-red-600 border border-red-200 rounded-lg p-3 font-semibold hover:bg-red-100 transition-colors duration-200 flex items-center justify-center gap-2"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                      />
                    </svg>
                    Logout
                  </motion.button>
                </div>
              )}
            </div>
          </div>

          {/* Header */}
          <motion.header
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            style={{
              background: "linear-gradient(90deg, #1e3a8a, #2563eb)",
              padding: "1.5rem 1rem",
              boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              color: "#fff",
              borderBottomLeftRadius: "1.5rem",
              borderBottomRightRadius: "1.5rem",
              backdropFilter: "blur(10px)",
              position: "sticky",
              top: 0,
              zIndex: 100,
            }}
            className="sm:px-6 md:px-10"
          >
            <div className="flex items-center gap-10">
              <img
                src="/logo.png"
                alt="Logo"
                className="w-32 sm:w-40 md:w-44 object-contain cursor-pointer"
                onClick={() => handleNavClick("/")}
              />

              {/* Desktop Navigation */}
              {shouldShowNavigation(pathName) && (
                <nav className="hidden lg:flex gap-6 mt-4">
                  {filteredLinks.map((link) => {
                    if (link.isDropdown) {
                      const children = filterChildren(
                        user,
                        link.app,
                        link.children
                      );
                      if (!children.length) return null;
                      const isAnyActive = children.some(
                        (child) => location.pathname === child.to
                      );
                      return (
                        <div key={link.label} className="relative group">
                          <button
                            className={`flex items-center gap-1 transition-colors duration-200 bg-transparent ${
                              isAnyActive
                                ? "font-bold text-blue-100 border-b-2 border-white"
                                : "text-white"
                            }`}
                          >
                            {link.label}
                            <svg
                              className="w-4 h-4 ml-1"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M19 9l-7 7-7-7"
                              />
                            </svg>
                          </button>
                          <div className="absolute left-0 mt-3 w-64 bg-white rounded-xl shadow-2xl z-50 opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 group-hover:visible invisible transition-all duration-300 ease-out border border-gray-100 overflow-hidden">
                            <div className="py-2">
                              {children.map((child) => {
                                const isActive = location.pathname === child.to;
                                const IconComponent = child.icon || MdAdd;
                                const colorClass = child.color === "blue" 
                                  ? "bg-blue-500" 
                                  : child.color === "green"
                                  ? "bg-green-500"
                                  : "bg-orange-500";
                                
                                // Get proper gradient classes based on color
                                const getActiveClasses = () => {
                                  if (child.color === "blue") {
                                    return "bg-gradient-to-r from-blue-100 to-blue-50 text-blue-700 border-l-4 border-blue-500";
                                  } else if (child.color === "green") {
                                    return "bg-gradient-to-r from-green-100 to-green-50 text-green-700 border-l-4 border-green-500";
                                  } else {
                                    return "bg-gradient-to-r from-orange-100 to-orange-50 text-orange-700 border-l-4 border-orange-500";
                                  }
                                };

                                return (
                                  <motion.div
                                    key={child.to}
                                    onClick={() => handleNavClick(child.to)}
                                    whileHover={{ scale: 1.02, x: 4 }}
                                    className={`flex items-center gap-3 px-5 py-3 cursor-pointer rounded-lg mx-1 my-0.5 transition-all duration-200 ${
                                      isActive
                                        ? `${getActiveClasses()} font-semibold shadow-sm`
                                        : "text-gray-700 hover:bg-gray-50 hover:text-gray-900"
                                    }`}
                                  >
                                    <div className={`flex items-center justify-center w-8 h-8 rounded-lg ${colorClass} text-white shadow-sm`}>
                                      <IconComponent className="text-sm" />
                                    </div>
                                    <span className="flex-1 font-medium text-sm">{child.label}</span>
                                    {isActive && (
                                      <motion.div
                                        initial={{ scale: 0 }}
                                        animate={{ scale: 1 }}
                                        className={`w-2 h-2 rounded-full ${colorClass}`}
                                      />
                                    )}
                                  </motion.div>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      );
                    } else {
                      const isActive =
                        location.pathname === link.to ||
                        (location.pathname.startsWith(`${link.to}/`) &&
                          !(link.to === "/procurement" &&
                            location.pathname.startsWith("/procurement/orders")));
                      return (
                        <motion.div
                          key={link.to}
                          whileHover={{ scale: 1.07 }}
                          transition={{ type: "spring", stiffness: 300 }}
                          onClick={() => handleNavClick(link.to)}
                          style={{
                            cursor: "pointer",
                            paddingBottom: "5px",
                            fontWeight: isActive ? 700 : 500,
                            borderBottom: isActive
                              ? "3px solid white"
                              : "3px solid transparent",
                            transition: "all 0.3s ease",
                            fontSize: "1rem",
                          }}
                        >
                          {link.label}
                        </motion.div>
                      );
                    }
                  })}
                </nav>
              )}
            </div>

            <motion.div
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              className="flex items-center gap-2 sm:gap-4"
            >
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggle();
                }}
                aria-pressed={isFullscreen}
                aria-label={
                  isFullscreen ? "Exit full screen" : "Enter full screen"
                }
                className="text-white text-3xl rounded focus:outline-none"
                title={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
              >
                {isFullscreen ? <MdFullscreenExit /> : <MdFullscreen />}
              </button>
              <span className="hidden sm:block text-sm md:text-base">
                Welcome, <strong>{displayName}</strong>
              </span>

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

              <button
                onClick={() => setIsMobileMenuOpen(true)}
                className="lg:hidden text-white bg-blue-600 p-2 rounded-md transition-colors duration-200 shadow-lg hover:shadow-white"
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                </svg>
              </button>
            </motion.div>
          </motion.header>
        </>
      )}

      {/* Order Fulfillment Tabs */}
      {pathName.startsWith("/fulfillment") && <FulfillmentTabs />}

      {/* Main Content */}
      <main
        className={`transition-all bg-white min-h-screen duration-300 ease-in-out ${
          shouldShowNavigation(pathName) ? "p-4 sm:p-6" : "p-0"
        }`}
      >
        <Outlet />
      </main>
    </div>
  );
};

export default MainLayout;
