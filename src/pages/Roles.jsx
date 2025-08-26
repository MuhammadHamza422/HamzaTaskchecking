"use client";

import { useState, useEffect } from "react";
import {
  ChevronDown,
  ChevronUp,
  Edit,
  Trash2,
  Plus,
  X,
  Check,
  Shield,
} from "lucide-react";
import apiClient from "../api/client";
import Swal from "sweetalert2";
import Skeleton from "react-loading-skeleton";
import "react-loading-skeleton/dist/skeleton.css";

const cn = (...classes) => classes.filter(Boolean).join(" ");

const rolesOptions = [
  {
    app: "inventory",
    label: "Inventory Management",
    menu: [
      "app",
      "home",
      "warehouse",
      "zone",
      "location",
      "inventory",
      "products",
      "scan",
      "activity log",
    ],
  },
  {
    app: "orders",
    label: "Order Processing",
    menu: [
      "products",
      "merged products",
      "pending orders",
      "processed orders",
      "platforms",
      "kits",
      "manual orders",
    ],
  },
  {
    app: "users",
    label: "User Management",
    menu: ["users", "user activity", "role management"],
  },
  {
    app: "attendance",
    label: "Attendance",
    menu: ["attendance","Kiosk"],
  },
  {
    app: "timeoff",
    label: "Time Off Management",
    menu: [
      "my requests",
      "requests",
      "types",
      "allocation",
    ],
  },
];

const CustomButton = ({
  children,
  onClick,
  variant = "default",
  size = "default",
  className = "",
  disabled = false,
  ...props
}) => {
  const baseClasses =
    "inline-flex items-center justify-center rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:pointer-events-none disabled:opacity-50";

  const variants = {
    default: "bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800",
    outline:
      "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 active:bg-slate-100",
    ghost: "text-slate-700 hover:bg-slate-100 active:bg-slate-200",
  };

  const sizes = {
    sm: "h-8 px-3 text-sm",
    default: "h-10 px-4 py-2",
    lg: "h-12 px-6 text-lg",
  };

  return (
    <button
      className={cn(baseClasses, variants[variant], sizes[size], className)}
      onClick={onClick}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
};

const CustomInput = ({ className = "", ...props }) => {
  return (
    <input
      className={cn(
        "flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    />
  );
};

const CustomCard = ({ children, className = "", onClick, ...props }) => {
  return (
    <div
      className={cn(
        "rounded-lg border border-slate-200 bg-blue-50 shadow-sm",
        className
      )}
      onClick={onClick}
      {...props}
    >
      {children}
    </div>
  );
};

const CustomCardHeader = ({ children, className = "" }) => {
  return (
    <div className={cn("flex flex-col space-y-1.5 p-6 pb-4", className)}>
      {children}
    </div>
  );
};

const CustomCardTitle = ({ children, className = "" }) => {
  return (
    <h3
      className={cn(
        "text-lg font-semibold leading-none tracking-tight text-slate-900",
        className
      )}
    >
      {children}
    </h3>
  );
};

const CustomCardContent = ({ children, className = "" }) => {
  return <div className={cn("py-6 pt-0", className)}>{children}</div>;
};

const CustomBadge = ({ children, variant = "default", className = "" }) => {
  const variants = {
    default: "bg-slate-900 text-slate-50 hover:bg-slate-900/80",
    secondary: "bg-blue-500 text-white hover:bg-green-600",
    outline: "border border-green-600 text-green-700 hover:bg-slate-100",
  };

  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors",
        variants[variant],
        className
      )}
    >
      {children}
    </div>
  );
};

const CustomCheckbox = ({ checked, onCheckedChange, className = "" }) => {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        "peer h-4 w-4 shrink-0 rounded-sm border border-slate-300 ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
        checked ? "bg-blue-600 border-blue-600 text-white" : "bg-white",
        className
      )}
    >
      {checked && (
        <svg
          className="w-3 h-3 mx-auto"
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path
            fillRule="evenodd"
            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
            clipRule="evenodd"
          />
        </svg>
      )}
    </button>
  );
};

const CustomScrollArea = ({ children, className = "" }) => {
  return (
    <div
      className={cn(
        "overflow-auto scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-slate-100",
        className
      )}
    >
      {children}
    </div>
  );
};

export default function RoleManagement() {
  const [roles, setRoles] = useState([]);
  const [selectedRole, setSelectedRole] = useState(null);
  const [newRoleName, setNewRoleName] = useState("");
  const [isCreatingRole, setIsCreatingRole] = useState(false);
  const [expandedApps, setExpandedApps] = useState(
    new Set(["inventry", "orders", "user"])
  );
  const [loading, setLoading] = useState(false);
  const [editingRole, setEditingRole] = useState(null);
  const [editRoleName, setEditRoleName] = useState("");

  // Load initial data
  useEffect(() => {
    loadRoles();
  }, []);

  const loadRoles = async () => {
    setLoading(true);
    try {
      const { data } = await apiClient.get("/api/v1/role/all");

      setRoles(data?.roles);
      if (data?.roles?.length > 0 && !selectedRole) {
        setSelectedRole(data?.roles[0]);
      }
    } catch (error) {
      console.error("Failed to load roles:", error);
    } finally {
      setLoading(false);
    }
  };

  const createRole = async () => {
    if (!newRoleName.trim()) return;

    try {
      const { data } = await apiClient.post("/api/v1/role/create", {
        role: newRoleName.trim(),
      });

      setRoles([...roles, data.data]);
      setNewRoleName("");
      setIsCreatingRole(false);
      setSelectedRole(data.data);
    } catch (error) {
      console.error("Failed to create role:", error);
    }
  };

  const deleteRole = async (roleId) => {
    try {
      const { data } = await apiClient.delete(`/api/v1/role/delete//${roleId}`);
      if (data) {
        setRoles(roles?.filter((r) => r._id !== roleId));
        if (selectedRole?._id === roleId) {
          setSelectedRole(roles?.find((r) => r._id !== roleId) || null);
        }
        Swal.fire({
          icon: "success",
          title: "Role Deleted",
          text: "Role deleted successfully",
          toast: true,
          position: "top-end",
          showConfirmButton: false,
          timer: 4000,
          timerProgressBar: true,
          background: "#ef4444",
          color: "#fff",
          customClass: { popup: "rounded-lg" },
        });
      }
    } catch (error) {
      console.error("Failed to delete role:", error);
    }
  };

  const updateRole = async (roleId, updatedRole) => {
    try {
      const { data } = await apiClient.patch(
        `/api/v1/role/update/${roleId}`,
        updatedRole
      );
      if (data) {
        const updatedRoleData = data.data || data;
        setRoles(roles.map((r) => (r._id === roleId ? updatedRoleData : r)));
        if (selectedRole?._id === roleId) {
          setSelectedRole(updatedRoleData);
        }
        Swal.fire({
          icon: "success",
          title: "Role Updated",
          text: "Role updated successfully",
          toast: true,
          position: "top-end",
          showConfirmButton: false,
          timer: 4000,
          timerProgressBar: true,
          background: "#ef4444",
          color: "#fff",
          customClass: { popup: "rounded-lg" },
        });
      }
    } catch (error) {
      console.error("Failed to update role:", error);
    }
  };

  const toggleAppPermission = (app) => {
    if (!selectedRole) return;
    console.log("selectedRole", selectedRole);
    console.log("app", app);

    const currentAccess = selectedRole.access || [];
    const updatedAccess = [...currentAccess];
    const existingAppIndex = updatedAccess?.findIndex((a) => a.app === app);
    const appOptions = rolesOptions?.find((opt) => opt.app === app);

    if (existingAppIndex >= 0) {
      // If all menus are selected, remove the app entirely
      const currentMenus = updatedAccess[existingAppIndex].menu || [];
      if (currentMenus?.length === appOptions?.menu?.length) {
        updatedAccess?.splice(existingAppIndex, 1);
      } else {
        // Otherwise, select all menus
        updatedAccess[existingAppIndex].menu = [...(appOptions?.menu || [])];
      }
    } else {
      // Add app with all menus
      updatedAccess.push({
        app,
        menu: [...(appOptions?.menu || [])],
      });
    }

    const updatedRole = { ...selectedRole, access: updatedAccess };
    setSelectedRole(updatedRole);
    updateRole(selectedRole._id, updatedRole);
  };

  const toggleMenuPermission = (app, menuItem) => {
    if (!selectedRole) return;

    const currentAccess = selectedRole.access || [];
    const updatedAccess = [...currentAccess];
    const existingAppIndex = updatedAccess?.findIndex((a) => a.app === app);

    if (existingAppIndex >= 0) {
      const currentMenus = updatedAccess[existingAppIndex].menu || [];
      const menuIndex = currentMenus.indexOf(menuItem);

      if (menuIndex >= 0) {
        // Remove menu item
        const newMenus = currentMenus.filter((m) => m !== menuItem);
        if (newMenus?.length === 0) {
          // Remove entire app if no menus left
          updatedAccess.splice(existingAppIndex, 1);
        } else {
          updatedAccess[existingAppIndex].menu = newMenus;
        }
      } else {
        // Add menu item
        updatedAccess[existingAppIndex].menu = [...currentMenus, menuItem];
      }
    } else {
      // Add new app with this menu item
      updatedAccess.push({
        app,
        menu: [menuItem],
      });
    }

    const updatedRole = { ...selectedRole, access: updatedAccess };
    setSelectedRole(updatedRole);
    updateRole(selectedRole._id, updatedRole);
  };

  const isAppGranted = (app) => {
    if (!selectedRole || !selectedRole.access) return false;
    const appAccess = selectedRole.access?.find((a) => a.app === app);
    const appOptions = rolesOptions?.find((opt) => opt.app === app);
    return appAccess && appAccess?.menu?.length === appOptions?.menu?.length;
  };

  const isAppPartiallyGranted = (app) => {
    if (!selectedRole || !selectedRole.access) return false;
    const appAccess = selectedRole.access?.find((a) => a.app === app);
    const appOptions = rolesOptions?.find((opt) => opt.app === app);
    return (
      appAccess &&
      appAccess?.menu?.length > 0 &&
      appAccess?.menu?.length < appOptions?.menu?.length
    );
  };

  const isMenuGranted = (app, menuItem) => {
    if (!selectedRole || !selectedRole.access) return false;
    const appAccess = selectedRole.access?.find((a) => a.app === app);
    return appAccess?.menu?.includes(menuItem) || false;
  };

  const toggleExpanded = (app) => {
    const newExpanded = new Set(expandedApps);
    if (newExpanded.has(app)) {
      newExpanded.delete(app);
    } else {
      newExpanded.add(app);
    }
    setExpandedApps(newExpanded);
  };

  const getPermissionCount = (role) => {
    if (!role || !role.access) return 0;
    return role.access.reduce(
      (total, app) => total + (app?.menu?.length || 0),
      0
    );
  };

  const saveRoleName = async (roleId) => {
    if (!editRoleName.trim()) return;

    try {
      const { data } = await apiClient.patch(`/api/v1/role/update/${roleId}`, {
        role: editRoleName.trim(),
      });
      const updatedRole = { ...selectedRole, role: editRoleName.trim() };
      setRoles(roles.map((r) => (r._id === roleId ? updatedRole : r)));
      setSelectedRole(updatedRole);
      setEditingRole(null);
      setEditRoleName("");
    } catch (error) {
      console.error("Failed to update role name:", error);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 px-2 sm:py-4 sm:px-4 md:p-6">
      <div className="max-w-7xl min-h-screen mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-slate-900 mb-2 flex items-center gap-1">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <Shield className="w-5 h-5 text-white" />
            </div>
            Role Management
          </h1>
          <p className="text-slate-600">
            Manage user roles and permissions across your applications
          </p>
        </div>

        {!loading ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 min-h-screen">
            {/* Left Panel - Roles */}
            <CustomCard className="flex flex-col bg-blue-100 ">
              <CustomCardHeader className="flex-shrink-0">
                <div className="flex items-center justify-between">
                  <CustomCardTitle className="flex items-center gap-2">
                    Roles
                    <CustomBadge variant="secondary" className="ml-2">
                      {roles?.length}
                    </CustomBadge>
                  </CustomCardTitle>
                  <CustomButton
                    onClick={() => setIsCreatingRole(true)}
                    size="sm"
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    New Role
                  </CustomButton>
                </div>
              </CustomCardHeader>

              <CustomCardContent className="flex-1 overflow-hidden">
                <CustomScrollArea className="h-full">
                  <div className="space-y-3 px-2">
                    {isCreatingRole && (
                      <CustomCard className="border-2 border-dashed border-blue-300 bg-blue-50">
                        <CustomCardContent className="px-4 py-2 mt-5">
                          <div className="flex gap-2">
                            <CustomInput
                              type="text"
                              value={newRoleName}
                              onChange={(e) => setNewRoleName(e.target.value)}
                              placeholder="Enter role name"
                              className="flex-1"
                              onKeyPress={(e) =>
                                e.key === "Enter" && createRole()
                              }
                            />
                            <CustomButton
                              onClick={createRole}
                              size="sm"
                              className="bg-green-600 hover:bg-green-700"
                            >
                              <Check className="w-4 h-4" />
                            </CustomButton>
                            <CustomButton
                              onClick={() => {
                                setIsCreatingRole(false);
                                setNewRoleName("");
                              }}
                              variant="outline"
                              size="sm"
                            >
                              <X className="w-4 h-4" />
                            </CustomButton>
                          </div>
                        </CustomCardContent>
                      </CustomCard>
                    )}

                    {roles.map((role) => (
                      <CustomCard
                        key={role._id}
                        className={cn(
                          "cursor-pointer transition-all duration-200 border hover:shadow-md py-2 mt-2",
                          selectedRole?._id === role._id
                            ? "ring-2 ring-blue-500 bg-white border-blue-200"
                            : "hover:border-slate-300 bg-gray-50 border-gray-300"
                        )}
                        onClick={() => setSelectedRole(role)}
                      >
                        <CustomCardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              {editingRole === role._id ? (
                                <div className="flex gap-2">
                                  <CustomInput
                                    value={editRoleName}
                                    onChange={(e) =>
                                      setEditRoleName(e.target.value)
                                    }
                                    className="text-sm"
                                    onKeyPress={(e) =>
                                      e.key === "Enter" &&
                                      saveRoleName(role._id)
                                    }
                                  />
                                  <CustomButton
                                    onClick={() => saveRoleName(role._id)}
                                    size="sm"
                                    variant="ghost"
                                  >
                                    <Check className="w-4 h-4" />
                                  </CustomButton>
                                  <CustomButton
                                    onClick={() => {
                                      setEditingRole(null);
                                      setEditRoleName("");
                                    }}
                                    size="sm"
                                    variant="ghost"
                                  >
                                    <X className="w-4 h-4" />
                                  </CustomButton>
                                </div>
                              ) : (
                                <>
                                  <div className="flex items-center justify-between">
                                    <h3 className="font-semibold text-slate-900 mb-1">
                                      {role.role}
                                    </h3>
                                    <div className="flex gap-1 ml-2">
                                      <CustomButton
                                        variant="ghost"
                                        size="sm"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setEditingRole(role._id);
                                          setEditRoleName(role.role);
                                        }}
                                        className="text-blue-600 hover:text-blue-700 hover:bg-blue-100"
                                      >
                                        <Edit className="w-4 h-4" />
                                      </CustomButton>
                                      <CustomButton
                                        variant="ghost"
                                        size="sm"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          deleteRole(role._id);
                                        }}
                                        className="text-red-600 hover:text-red-700 hover:bg-red-100"
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </CustomButton>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <CustomBadge
                                      variant="secondary"
                                      className="text-xs"
                                    >
                                      {getPermissionCount(role)} permissions
                                    </CustomBadge>
                                    <CustomBadge
                                      variant="outline"
                                      className="text-xs"
                                    >
                                      {role?.access?.length} apps
                                    </CustomBadge>
                                  </div>
                                </>
                              )}
                            </div>
                          </div>
                        </CustomCardContent>
                      </CustomCard>
                    ))}
                  </div>
                </CustomScrollArea>
              </CustomCardContent>
            </CustomCard>

            {/* Right Panel - Permissions */}
            <CustomCard className="flex flex-col">
              <CustomCardHeader className="flex-shrink-0">
                <div className="flex items-center justify-between">
                  <CustomCardTitle>
                    Permissions{" "}
                    {selectedRole && (
                      <span className="text-blue-600 font-normal">
                        ({selectedRole.role})
                      </span>
                    )}
                  </CustomCardTitle>
                  {selectedRole && (
                    <CustomBadge variant="secondary">
                      {getPermissionCount(selectedRole)} active
                    </CustomBadge>
                  )}
                </div>
              </CustomCardHeader>

              <CustomCardContent className="flex-1 overflow-hidden">
                {selectedRole ? (
                  <CustomScrollArea className="h-full">
                    <div className="space-y-4 px-2">
                      {rolesOptions.map((appOption) => (
                        <CustomCard
                          key={appOption.app}
                          className=" bg-gray-50 border  border-sky-600 "
                        >
                          <CustomCardContent className="p-0">
                            {/* App Header */}
                            <div className="flex items-center justify-between p-4 bg-sky-100 rounded-t-lg">
                              <div className="flex items-center gap-3">
                                <CustomCheckbox
                                  checked={isAppGranted(appOption.app)}
                                  onCheckedChange={() =>
                                    toggleAppPermission(appOption.app)
                                  }
                                />
                                <div>
                                  <h3 className="font-semibold text-slate-900">
                                    {appOption.label}
                                  </h3>
                                  <p className="text-sm text-slate-500">
                                    {selectedRole?.access?.find(
                                      (a) => a.app === appOption.app
                                    )?.menu?.length || 0}{" "}
                                    of {appOption?.menu?.length} permissions
                                  </p>
                                </div>
                                {isAppPartiallyGranted(appOption?.app) && (
                                  <CustomBadge
                                    variant="secondary"
                                    className="bg-yellow-100 text-yellow-800"
                                  >
                                    Partial
                                  </CustomBadge>
                                )}
                              </div>
                              <CustomButton
                                variant="ghost"
                                size="sm"
                                onClick={() => toggleExpanded(appOption.app)}
                                className="text-slate-500 hover:text-slate-700"
                              >
                                {expandedApps.has(appOption.app) ? (
                                  <ChevronUp className="w-4 h-4" />
                                ) : (
                                  <ChevronDown className="w-4 h-4" />
                                )}
                              </CustomButton>
                            </div>

                            {/* Menu Items */}
                            {expandedApps.has(appOption.app) && (
                              <div className="p-4 space-y-3">
                                {appOption.menu.map((menuItem) => (
                                  <div
                                    key={menuItem}
                                    className="flex items-center gap-3 p-2 rounded-lg  hover:bg-slate-50 border  border-sky-600"
                                  >
                                    <CustomCheckbox
                                      checked={isMenuGranted(
                                        appOption.app,
                                        menuItem
                                      )}
                                      onCheckedChange={() =>
                                        toggleMenuPermission(
                                          appOption.app,
                                          menuItem
                                        )
                                      }
                                    />
                                    <span className="text-sm text-slate-700 capitalize">
                                      {menuItem.replace(/[-_]/g, " ")}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </CustomCardContent>
                        </CustomCard>
                      ))}
                    </div>
                  </CustomScrollArea>
                ) : (
                  <div className="flex items-center justify-center h-full text-center">
                    <div className="text-slate-500">
                      <div className="w-16 h-16 mx-auto mb-4 bg-slate-100 rounded-full flex items-center justify-center">
                        <Edit className="w-8 h-8 text-slate-400" />
                      </div>
                      <h3 className="text-lg font-medium mb-2">
                        No Role Selected
                      </h3>
                      <p className="text-sm">
                        Select a role from the left panel to manage its
                        permissions
                      </p>
                    </div>
                  </div>
                )}
              </CustomCardContent>
            </CustomCard>
          </div>
        ) : (
          <RolesPermissionsSkeleton />
        )}
      </div>
    </div>
  );
}

const RolesPermissionsSkeleton = () => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 min-h-screen">
      {/* Left Panel Skeleton */}
      <div className="flex flex-col bg-blue-50 rounded-xl shadow-sm">
        <div className="p-4 border-b border-blue-200 flex items-center justify-between">
          <Skeleton width={100} height={20} />
          <Skeleton width={80} height={32} />
        </div>
        <div className="flex-1 overflow-hidden p-4 space-y-4">
          {Array(5)
            .fill(0)
            .map((_, idx) => (
              <div
                key={idx}
                className="border rounded-lg bg-white p-4 shadow-sm"
              >
                <Skeleton width="60%" height={18} />
                <div className="mt-2 flex gap-2">
                  <Skeleton width={80} height={16} />
                  <Skeleton width={60} height={16} />
                </div>
              </div>
            ))}
        </div>
      </div>

      {/* Right Panel Skeleton */}
      <div className="flex flex-col bg-white rounded-xl shadow-sm">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
          <Skeleton width={120} height={20} />
          <Skeleton width={50} height={20} />
        </div>
        <div className="flex-1 overflow-hidden p-4 space-y-4">
          {Array(3)
            .fill(0)
            .map((_, idx) => (
              <div
                key={idx}
                className="border border-slate-200 rounded-lg bg-gray-50"
              >
                <div className="p-4 border-b flex items-center justify-between bg-slate-100">
                  <div className="flex items-center gap-3">
                    <Skeleton circle width={20} height={20} />
                    <div>
                      <Skeleton width={100} height={16} />
                      <Skeleton width={80} height={12} />
                    </div>
                  </div>
                  <Skeleton width={24} height={24} />
                </div>
                <div className="p-4 space-y-3">
                  {Array(3)
                    .fill(0)
                    .map((_, idx2) => (
                      <div
                        key={idx2}
                        className="flex items-center gap-3 p-2 rounded-lg"
                      >
                        <Skeleton circle width={18} height={18} />
                        <Skeleton width={120} height={14} />
                      </div>
                    ))}
                </div>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
};
