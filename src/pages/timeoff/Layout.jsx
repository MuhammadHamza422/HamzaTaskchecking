import { NavLink, Outlet, Navigate, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";

export default function TimeOffLayout() {
  // ✅ Replace this with however you get the logged-in user (context, redux, etc.)
  // Example assumes role is stored in localStorage
  const [role, setRole] = useState(null);
  const location = useLocation();

  useEffect(() => {
    const storedUser = JSON.parse(localStorage.getItem("user"));
    setRole(storedUser?.role || "user"); // default to user
  }, []);

  const tabs = [
    { label: "My Requests", to: "/timeoff/me", roles: ["admin", "manager", "user", "purchaser", "sourcer"] },
    { label: "Requests", to: "/timeoff/requests", roles: ["admin", "manager"] },
    { label: "Types", to: "/admin/timeoff/types", roles: ["admin"] },
    { label: "Allocation", to: "/admin/timeoff/allocation", roles: ["admin"] },
  ];

  // ✅ Auto-redirect to /timeoff/me if user opens just /timeoff
  if (location.pathname === "/timeoff") {
    return <Navigate to="/timeoff/me" replace />;
  }

  // ✅ Filter tabs based on user role
  const visibleTabs = tabs.filter((tab) => tab.roles.includes(role));

  return (
    <div className="w-full">
      {/* Top Menu */}
      <nav className="flex gap-6 border-b mb-6 px-4 py-2 bg-white shadow-sm">
        {visibleTabs.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            className={({ isActive }) =>
              `px-3 py-2 font-medium rounded-md transition-colors ${
                isActive
                  ? "text-teal-600 border-b-2 border-teal-600"
                  : "text-gray-600 hover:text-teal-500"
              }`
            }
          >
            {tab.label}
          </NavLink>
        ))}
      </nav>

      {/* Render the child page */}
      <div className="p-4">
        <Outlet />
      </div>
    </div>
  );
}
