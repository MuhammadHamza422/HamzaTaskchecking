import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Table,
  Button,
  Modal,
  Form,
  Input,
  Select,
  Switch,
  Space,
  Tag,
  message,
  Typography,
  Card,
} from "antd";
import { motion } from "framer-motion";
import Swal from "sweetalert2";
import apiClient from "../api/client";
import { useAuth } from "../contexts/AuthContext";
import useFullscreen from "../components/useFullscreen";

const { Option } = Select;
const { Title } = Typography;

const initialFormState = {
  first_name: "",
  last_name: "",
  email: "",
  password: "",
  role: "sourcer",
  is_active: true,
  company: undefined,
  roles: "",
  kioskPinHash: "",
  warehouse: [],
};

const roleColors = {
  admin: "red",
  manager: "purple",
  purchaser: "blue",
  sourcer: "green",
  "Inventory Supervisor": "cyan",
  Technician: "orange",
  Picker: "magenta",
  Purchaser: "skyblue",
};

const AdminUsersPage = () => {
  const [users, setUsers] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [companiesLoading, setCompaniesLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(50);
  const [total, setTotal] = useState(0);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [deletingUsers, setDeletingUsers] = useState(new Set());
  const [changedFields, setChangedFields] = useState(new Set());
  const [form] = Form.useForm();
  const { user: currentUser } = useAuth();
  const [rolesOptions, setRolesOptions] = useState([]);
  const { ref: fullscreenRef, isFullscreen, getContainer } = useFullscreen();
  const [warehouses, setWarehouses] = useState([]);

  const loadRoles = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await apiClient.get("/api/v1/role/all");

      setRolesOptions(data?.roles);
    } catch (error) {
      console.error("Failed to load roles:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Check if current user is admin
  const isAdmin = currentUser?.roles.role === "admin";

  const fetchUsers = useCallback(() => {
    setLoading(true);
    apiClient
      .get("/api/v1/auth/all", { params: { page, limit } })
      .then((response) => {
        // Transform the API response to match the expected format
        const list = Array.isArray(response?.data?.users)
          ? response.data.users
          : [];
        const transformedUsers = list.map((user) => ({
          id: user._id,
          first_name: user.firstName,
          last_name: user.lastName,
          email: user.email,
          role: user.role,
          is_active: user.isActive,
          roles: user.roles,
          kioskPinHash: user?.kioskPinHash || "",
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
          companyId: user?.company || user?.companyId,
          warehouse: user.warehouse,
        }));
        setUsers(transformedUsers);

        setTotal(Number(response?.data?.totalCount || 0));
      })
      .catch((error) => {
        console.error("Error fetching users:", error);
        message.error("Failed to fetch users.");
      })
      .finally(() => setLoading(false));
  }, [page, limit]);

  const fetchCompanies = useCallback(() => {
    if (!isAdmin) return;
    setCompaniesLoading(true);
    apiClient
      .get("/api/v1/company/all")
      .then((response) => {
        const list =
          response?.data?.companies ||
          response?.data?.data ||
          response?.data ||
          [];
        const normalized = Array.isArray(list)
          ? list.map((c) => ({
              _id: c._id || c.id,
              name: c.name || c.companyName || c.title || "Unnamed",
              timezone: c.timezone,
            }))
          : [];
        setCompanies(normalized);
      })
      .catch((error) => {
        console.error("Error fetching companies:", error);
        message.error("Failed to load companies.");
      })
      .finally(() => setCompaniesLoading(false));
  }, [isAdmin]);

  useEffect(() => {
    fetchCompanies();
  }, [fetchCompanies]);

  const companyNameById = useMemo(() => {
    return new Map(companies.map((c) => [String(c._id), c.name || "Unnamed"]));
  }, [companies]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Fetch warehouses
  const fetchWarehouses = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await apiClient.get("/api/v1/warehouse/all");
      setWarehouses(data?.warehouses || []);
    } catch (error) {
      console.error("Error fetching warehouses:", error);
      message.error("Failed to fetch warehouses.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWarehouses();
  }, [fetchWarehouses]);

  useEffect(() => {
    loadRoles();
  }, [loadRoles]);

  // Handle user edit
  const handleOpenModal = (user = null) => {
    if (user && !isAdmin) {
      message.error("Only admin users can edit user information.");
      return;
    }

    setEditingUser(user);
    setChangedFields(new Set());

    if (user) {
      const formData = {
        first_name: user.first_name,
        last_name: user.last_name,
        email: user.email,
        role: user.role,
        is_active: user.is_active,
        password: "",
        roles: user.roles?._id || "",
        company: user.companyId || undefined,
        kioskPinHash: user.kioskPinHash,
        warehouse: user.warehouse,
      };

      console.log("formData", formData);
      form.setFieldsValue(formData);
    } else {
      // Reset form for new user
      form.setFieldsValue(initialFormState);
    }

    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingUser(null);
    setChangedFields(new Set());
    form.resetFields();
  };

  const handleFieldChange = (fieldName, value) => {
    if (!editingUser) return;

    const originalUser = users.find((u) => u.id === editingUser.id);
    if (!originalUser) return;

    let hasChanged = false;

    switch (fieldName) {
      case "first_name":
        hasChanged = value !== originalUser.first_name;
        break;
      case "last_name":
        hasChanged = value !== originalUser.last_name;
        break;
      case "email":
        hasChanged = value !== originalUser.email;
        break;
      // case "role":
      //   hasChanged = value !== originalUser.role;
      //   break;
      case "is_active":
        hasChanged = value !== originalUser.is_active;
        break;
      case "password":
        hasChanged = value !== ""; // Password is changed if not empty
        break;
      case "company":
        hasChanged =
          String(value || "") !== String(originalUser.companyId || "");
        break;
      case "roles":
        hasChanged = value !== originalUser.roles;
        break;
      case "warehouse":
        hasChanged = value !== originalUser.warehouse;
        break;
      case "kioskPinHash":
        // PIN changes are always considered if a value is entered
        hasChanged = value && String(value).trim() !== "";
        break;
      default:
        break;
    }

    setChangedFields((prev) => {
      const newSet = new Set(prev);
      if (hasChanged) {
        newSet.add(fieldName);
      } else {
        newSet.delete(fieldName);
      }
      return newSet;
    });
  };

  const handleFormSubmit = async (values) => {
    setFormSubmitting(true);
    try {
      // Validate password for new users
      if (!editingUser && !values.password) {
        message.error("Password is required for new users.");
        setFormSubmitting(false);
        return;
      }

      // Extract PIN value and remove it from user data
      const kioskPinValue = values.kioskPinHash ? String(values.kioskPinHash).trim() : "";
      const shouldUpdatePin = kioskPinValue !== "";

      let dataToSubmit = {};

      if (editingUser) {
        // For updating existing users - allow all fields to be updated
        const originalUser = users.find((u) => u.id === editingUser.id);
        if (!originalUser) {
          message.error("User not found.");
          setFormSubmitting(false);
          return;
        }

        // Check which fields have changed (EXCLUDING kioskPinHash)
        if (values.first_name !== originalUser.first_name) {
          dataToSubmit.firstName = values.first_name;
        }
        if (values.last_name !== originalUser.last_name) {
          dataToSubmit.lastName = values.last_name;
        }
        if (values.email !== originalUser.email) {
          dataToSubmit.email = values.email;
        }
        if (values.is_active !== originalUser.is_active) {
          dataToSubmit.isActive = values.is_active;
        }
        if (values.password && values.password.trim() !== "") {
          dataToSubmit.password = values.password.trim();
        }
        if (values.company !== originalUser.companyId) {
          dataToSubmit.company = values.company || null;
        }
        if (values.roles !== originalUser.roles) {
          dataToSubmit.roles = values.roles;
        }
        if (values.warehouse !== originalUser.warehouse) {
          dataToSubmit.warehouse = values.warehouse;
        }
      } else {
        // For new users, include all required fields (EXCLUDING kioskPinHash)
        dataToSubmit = {
          firstName: values.first_name,
          lastName: values.last_name,
          email: values.email,
          password: values.password,
          roles: values.roles,
          warehouse: values.warehouse,
          ...(values.company ? { company: values.company } : {}),
        };
      }

      // Make sure we have data to submit (or PIN to set)
      if (Object.keys(dataToSubmit).length === 0 && !shouldUpdatePin) {
        message.warning(
          "No changes detected. Please modify at least one field."
        );
        setFormSubmitting(false);
        return;
      }

      let userId = editingUser?.id;

      // Step 1: Create/Update user (if there are changes)
      if (Object.keys(dataToSubmit).length > 0) {
        const apiCall = editingUser
          ? apiClient.patch(`/api/v1/auth/update/${editingUser.id}`, dataToSubmit)
          : apiClient.post("/api/v1/auth/register", dataToSubmit);

        const response = await apiCall;

        // Check for successful response
        const isSuccess = response.status >= 200 && response.status < 300;
        const hasSuccessFlag = response.data && response.data.success === true;

        if (!isSuccess || !hasSuccessFlag) {
          message.error(response.data?.message || "Failed to save user.");
          setFormSubmitting(false);
          return;
        }

        // For new users, extract the user ID from response
        if (!editingUser) {
          userId = response.data.user?._id || response.data.user?.id || response.data.userId;
          if (!userId) {
            message.error("User created but failed to get user ID for PIN setup.");
            fetchUsers();
            handleCloseModal();
            setFormSubmitting(false);
            return;
          }
        }
      }

      // Step 2: Set kiosk PIN if provided
      if (shouldUpdatePin && userId) {
        try {
          const { setEmployeeKioskPin } = await import("../api/auth");
          await setEmployeeKioskPin(userId, kioskPinValue);
        } catch (pinError) {
          console.error("Error setting kiosk PIN:", pinError);
          message.warning(
            `User ${editingUser ? "updated" : "created"} successfully, but failed to set kiosk PIN. ${pinError.response?.data?.message || ""}`
          );
          fetchUsers();
          handleCloseModal();
          setFormSubmitting(false);
          return;
        }
      }

      // Success message
      if (Object.keys(dataToSubmit).length > 0 && shouldUpdatePin) {
        message.success(
          `User ${editingUser ? "updated" : "created"} successfully with kiosk PIN!`
        );
      } else if (Object.keys(dataToSubmit).length > 0) {
        message.success(
          `User ${editingUser ? "updated" : "created"} successfully!`
        );
      } else if (shouldUpdatePin) {
        message.success("Kiosk PIN updated successfully!");
      }

      handleCloseModal();
      fetchUsers();
    } catch (error) {
      console.error("Error saving user:", error);
      console.error("Error response:", error.response);

      // Handle different types of errors
      if (error.response?.status === 401) {
        message.error("Authentication failed. Please login again.");
      } else if (error.response?.status === 403) {
        message.error("You don't have permission to update this user.");
      } else if (error.response?.data?.message) {
        message.error(error.response.data.message);
      } else if (error.response?.status === 409) {
        message.error("Email already exists. Please use a different email.");
      } else if (error.response?.status === 400) {
        message.error("Invalid data. Please check your input.");
      } else if (error.response?.status === 404) {
        message.error("User not found.");
      } else {
        message.error("Error: Could not save user. Please try again.");
      }
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleDelete = async (userId) => {
    // Check if user is admin before allowing delete
    if (!isAdmin) {
      message.error("Only admin users can delete users.");
      return;
    }

    const result = await Swal.fire({
      title: "Delete User",
      text: "Are you sure you want to delete this user? This action cannot be undone.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ff4d4f",
      cancelButtonColor: "#6b7280",
      confirmButtonText: "Yes, Delete",
      cancelButtonText: "Cancel",
      reverseButtons: true,
      customClass: {
        popup: "rounded-lg",
        confirmButton: "rounded-md",
        cancelButton: "rounded-md",
      },
    });

    if (result.isConfirmed) {
      setDeletingUsers((prev) => new Set(prev).add(userId));
      try {
        const response = await apiClient.delete(
          `/api/v1/auth/delete/${userId}`
        );

        if (response.data.success) {
          message.success("User deleted successfully!");
          fetchUsers();
        } else {
          message.error(response.data.message || "Failed to delete user.");
        }
      } catch (error) {
        console.error("Error deleting user:", error);

        // Handle different types of errors
        if (error.response?.data?.message) {
          message.error(error.response.data.message);
        } else if (error.response?.status === 404) {
          message.error("User not found.");
        } else if (error.response?.status === 403) {
          message.error("You don't have permission to delete this user.");
        } else {
          message.error("Failed to delete user. Please try again.");
        }
      } finally {
        setDeletingUsers((prev) => {
          const newSet = new Set(prev);
          newSet.delete(userId);
          return newSet;
        });
      }
    }
  };

  const columns = [
    {
      title: "First Name",
      dataIndex: "first_name",
      key: "first_name",
      sorter: (a, b) => a.first_name.localeCompare(b.first_name),
      render: (text) => (
        <p title={text} className="text-sm text-gray-900 capitalize">
          {text}
        </p>
      ),
      width: 130,
    },
    {
      title: "Last Name",
      dataIndex: "last_name",
      key: "last_name",
      sorter: (a, b) => a.last_name.localeCompare(b.last_name),
      render: (text) => (
        <p title={text} className="text-sm text-gray-900 capitalize">
          {text}
        </p>
      ),
      width: 130,
    },
    {
      title: "Email",
      dataIndex: "email",
      key: "email",
      sorter: (a, b) => a.email.localeCompare(b.email),
      render: (text) => (
        <p title={text} className="text-sm text-gray-900">
          {text}
        </p>
      ),
      width: 220,
    },
    {
      title: "Role",
      dataIndex: "roles",
      key: "roles",
      render: (roles) => {
        if (!roles) return null;

        // Single role object
        return (
          <Tag color={roleColors[roles.role] || "default"}>
            {roles?.role?.toUpperCase()}
          </Tag>
        );
      },
      width: 100,
    },
    {
      title: "Company",
      dataIndex: "companyId",
      key: "company",
      render: (id) => <span>{companyNameById.get(String(id)) || "—"}</span>,
      sorter: (a, b) =>
        (companyNameById.get(String(a.companyId)) || "").localeCompare(
          companyNameById.get(String(b.companyId)) || ""
        ),
      width: 180,
    },
    {
      title: "Active",
      dataIndex: "is_active",
      key: "is_active",
      render: (active) => (
        <Tag color={active ? "cyan" : "default"}>
          {active ? "Active" : "Inactive"}
        </Tag>
      ),
      width: 80,
    },
    {
      title: "Actions",
      key: "actions",
      render: (_, record) => {
        const isDeleting = deletingUsers.has(record.id);
        console.log(record);
        return (
          <Space size="middle">
            <Button
              type="link"
              onClick={() => handleOpenModal(record)}
              disabled={isDeleting || !isAdmin}
              title={!isAdmin ? "Only admin users can edit users" : ""}
            >
              Edit
            </Button>
            <Button
              type="link"
              danger
              loading={isDeleting}
              disabled={isDeleting || !isAdmin}
              onClick={() => handleDelete(record.id)}
              title={!isAdmin ? "Only admin users can delete users" : ""}
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </Button>
          </Space>
        );
      },
      width: 150,
    },
  ];

  const totalPages = Math.max(1, Math.ceil((total || 0) / (limit || 1)));

  // Show access denied message if user is not admin
  if (!isAdmin) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        style={{ padding: "2rem" }}
      >
        <Card
          style={{
            background: "linear-gradient(to right, #fff5f5, #fed7d7)",
            borderRadius: "12px",
            boxShadow: "0 8px 24px rgba(0,0,0,0.06)",
            padding: "2rem",
            marginBottom: "2rem",
          }}
        >
          <div style={{ textAlign: "center" }}>
            <Title level={3} style={{ color: "#c53030", margin: 0 }}>
              Access Denied
            </Title>
            <p style={{ color: "#742a2a", marginTop: "1rem" }}>
              Only admin users can manage user accounts.
            </p>
          </div>
        </Card>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="bg-gradient-to-r from-blue-50 to-purple-50 mb-2 p-2 sm:mb-4 sm:p-4 rounded-lg shadow-lg">
        <div className="flex sm:flex-row flex-col gap-3 sm:justify-between sm:items-center">
          <Title level={3} style={{ margin: 0 }}>
            Manage Users
          </Title>
          <motion.div whileHover={{ scale: 1.05 }}>
            <Button type="primary" onClick={() => handleOpenModal()}>
              Add New User
            </Button>
          </motion.div>
        </div>
      </Card>

      <div className="rounded-lg shadow-[0 4px 14px rgba(0,0,0,0.05)] overflow-x-auto">
        <Table
          dataSource={users}
          columns={columns}
          rowKey="id"
          loading={loading}
          pagination={false}
          scroll={{ x: 1200 }}
        />
      </div>

      {total > 0 && (
        <div className="mt-6 bg-white rounded-2xl shadow-sm border border-gray-100 p-4 md:p-6">
          <div className="text-center sm:text-left text-sm text-gray-600 font-medium mb-4 sm:mb-2">
            Showing{" "}
            <span className="font-semibold text-gray-900">
              {Math.min((page - 1) * limit + 1, total)}
            </span>{" "}
            to{" "}
            <span className="font-semibold text-gray-900">
              {Math.min(page * limit, total)}
            </span>{" "}
            of <span className="font-semibold text-gray-900">{total}</span>{" "}
            users
          </div>

          {/* Desktop Pagination */}
          <div className="hidden lg:flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(1)}
                disabled={page === 1}
                className="px-3 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                First
              </button>
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Previous
              </button>

              {(() => {
                const nums = [];
                const windowSize = 2;
                const start = Math.max(1, page - windowSize);
                const end = Math.min(totalPages, page + windowSize);
                if (start > 1) {
                  nums.push(1);
                  if (start > 2) nums.push("...");
                }
                for (let n = start; n <= end; n++) nums.push(n);
                if (end < totalPages) {
                  if (end < totalPages - 1) nums.push("...");
                  nums.push(totalPages);
                }
                return nums.map((n, idx) =>
                  n === "..." ? (
                    <span
                      key={`ellipsis-${idx}`}
                      className="px-3 py-2 text-sm text-gray-400"
                    >
                      ...
                    </span>
                  ) : (
                    <button
                      key={n}
                      onClick={() => setPage(n)}
                      className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                        n === page
                          ? "bg-blue-600 text-white border border-blue-600 shadow-lg"
                          : "text-gray-600 bg-white border border-gray-300 hover:bg-gray-50"
                      }`}
                    >
                      {n}
                    </button>
                  )
                );
              })()}

              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="px-3 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Next
              </button>
              <button
                onClick={() => setPage(totalPages)}
                disabled={page >= totalPages}
                className="px-3 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Last
              </button>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">Show:</span>
              <select
                value={limit}
                onChange={(e) => {
                  setPage(1);
                  setLimit(Number(e.target.value));
                }}
                className="px-3 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
              >
                {[10, 20, 30, 50, 100, 200, 500].map((n) => (
                  <option key={n} value={n}>
                    {n} per page
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Tablet Pagination */}
          <div className="hidden sm:flex lg:hidden flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  ← Previous
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Next →
                </button>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">
                  Page {page} of {totalPages}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">Go to page:</span>
                <select
                  value={page}
                  onChange={(e) => setPage(Number(e.target.value))}
                  className="px-3 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
                >
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                    (n) => (
                      <option key={n} value={n}>
                        Page {n}
                      </option>
                    )
                  )}
                </select>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">Show:</span>
                <select
                  value={limit}
                  onChange={(e) => {
                    setPage(1);
                    setLimit(Number(e.target.value));
                  }}
                  className="px-3 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
                >
                  {[10, 20, 30, 50, 100, 200, 500].map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Mobile Pagination */}
          <div className="flex sm:hidden flex-col gap-3 mt-4">
            <div className="flex items-center justify-between">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <span>←</span>
                <span className="hidden xs:inline">Previous</span>
              </button>

              <div className="text-sm text-gray-600 font-medium">
                Page {page} of {totalPages}
              </div>

              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <span className="hidden xs:inline">Next</span>
                <span>→</span>
              </button>
            </div>

            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-600">Jump to:</span>
                <select
                  value={page}
                  onChange={(e) => setPage(Number(e.target.value))}
                  className="px-2 py-1 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded focus:border-blue-500 focus:ring-1 focus:ring-blue-100 outline-none"
                >
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                    (n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    )
                  )}
                </select>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-600">Show:</span>
                <select
                  value={limit}
                  onChange={(e) => {
                    setPage(1);
                    setLimit(Number(e.target.value));
                  }}
                  className="px-2 py-1 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded focus:border-blue-500 focus:ring-1 focus:ring-blue-100 outline-none"
                >
                  {[10, 20, 30, 50, 100].map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>
      )}

      <div ref={fullscreenRef}>
        <Modal
          getContainer={getContainer}
          key={String(isFullscreen)}
          className="max-h-[95vh] overflow-y-auto"
          title={
            <Title level={4} style={{ margin: 0 }}>
              {editingUser ? "Edit User" : "Add New User"}
            </Title>
          }
          open={isModalOpen}
          onCancel={formSubmitting ? undefined : handleCloseModal}
          footer={null}
          centered
          bodyStyle={{ paddingTop: "1rem" }}
          maskClosable={!formSubmitting}
          closable={!formSubmitting}
        >
          <Form form={form} layout="vertical" onFinish={handleFormSubmit}>
            <Form.Item
              label="First Name"
              name="first_name"
              rules={[
                { required: true, message: "Please enter the first name" },
              ]}
            >
              <Input
                onChange={(e) =>
                  handleFieldChange("first_name", e.target.value)
                }
                style={
                  changedFields.has("first_name")
                    ? { borderColor: "#1890ff" }
                    : {}
                }
              />
            </Form.Item>
            <Form.Item
              label="Last Name"
              name="last_name"
              rules={[
                { required: true, message: "Please enter the last name" },
              ]}
            >
              <Input
                onChange={(e) => handleFieldChange("last_name", e.target.value)}
                style={
                  changedFields.has("last_name")
                    ? { borderColor: "#1890ff" }
                    : {}
                }
              />
            </Form.Item>
            <Form.Item
              label="Email"
              name="email"
              rules={[{ required: true, type: "email" }]}
            >
              <Input
                onChange={(e) => handleFieldChange("email", e.target.value)}
                style={
                  changedFields.has("email") ? { borderColor: "#1890ff" } : {}
                }
              />
            </Form.Item>
            <Form.Item
              label="Password"
              name="password"
              rules={[
                {
                  required: !editingUser,
                  message: "Password is required for new users",
                },
                {
                  min: 6,
                  message: "Password must be at least 6 characters",
                  validator: (_, value) => {
                    if (!value || value.length >= 6) {
                      return Promise.resolve();
                    }
                    return Promise.reject(
                      new Error("Password must be at least 6 characters")
                    );
                  },
                },
              ]}
              help={
                editingUser
                  ? "Enter new password to update, or leave blank to keep existing password."
                  : "Password is required for new users"
              }
            >
              <Input.Password
                onChange={(e) => handleFieldChange("password", e.target.value)}
                style={
                  changedFields.has("password")
                    ? { borderColor: "#1890ff" }
                    : {}
                }
              />
            </Form.Item>
            <Form.Item
              label="Kiosk PIN"
              name="kioskPinHash"
              tooltip="Optional 4–6 digit PIN for kiosk/clock-in."
              rules={[
                {
                  validator: (_, value) => {
                    if (!value || /^\d{4,6}$/.test(String(value))) {
                      return Promise.resolve();
                    }
                    return Promise.reject(
                      new Error("PIN must be 4–6 digits (numbers only)")
                    );
                  },
                },
              ]}
              help={
                editingUser
                  ? "Enter a new PIN to update, leave blank to keep existing, or clear to remove."
                  : "Optional, but must be 4–6 digits if set."
              }
            >
              <Input.Password
                maxLength={6}
                inputMode="numeric"
                placeholder="e.g., 1234"
                onChange={(e) =>
                  handleFieldChange("kioskPinHash", e.target.value)
                }
                style={
                  changedFields.has("kioskPinHash")
                    ? { borderColor: "#1890ff" }
                    : {}
                }
              />
            </Form.Item>

            {/* <Form.Item label="Role" name="role" rules={[{ required: true }]}>
              <Select
                onChange={(value) => handleFieldChange("role", value)}
                style={
                  changedFields.has("role") ? { borderColor: "#1890ff" } : {}
                }
              >
                <Option value="sourcer">Sourcer</Option>
                <Option value="purchaser">Purchaser</Option>
                <Option value="manager">Manager</Option>
                <Option value="admin">Admin</Option>
              </Select>
            </Form.Item> */}
            <Form.Item label="Roles" name="roles" rules={[{ required: true }]}>
              <Select
                onChange={(value) => handleFieldChange("roles", value)}
                style={
                  changedFields.has("roles") ? { borderColor: "#1890ff" } : {}
                }
              >
                {rolesOptions.map((role) => (
                  <Option key={role._id} value={role._id}>
                    {role?.role}
                  </Option>
                ))}
              </Select>
            </Form.Item>

            <Form.Item label="Company" name="company">
              <Select
                allowClear
                showSearch
                placeholder="Select a company"
                loading={companiesLoading}
                optionFilterProp="children"
                onChange={(val) => handleFieldChange("company", val)}
                style={
                  changedFields.has("company") ? { borderColor: "#1890ff" } : {}
                }
              >
                {companies.map((c) => (
                  <Option key={c._id} value={c._id}>
                    {c.name}
                    {c.timezone ? ` (${c.timezone})` : ""}
                  </Option>
                ))}
              </Select>
            </Form.Item>

            <Form.Item
              label="Is Active"
              name="is_active"
              valuePropName="checked"
            >
              <Switch
                onChange={(checked) => handleFieldChange("is_active", checked)}
              />
            </Form.Item>

            {/*Warehouses Assign*/}
            <Form.Item
              label="Assign Warehouses"
              name="warehouse"
              // rules={[
              //   { required: true, message: "Please select at least one ware" },
              // ]}
            >
              <Select
                mode="multiple"
                onChange={(value) => handleFieldChange("warehouse", value)}
                style={
                  changedFields.has("warehouse")
                    ? { borderColor: "#1890ff" }
                    : {}
                }
                placeholder="Assign Warehouses"
              >
                {warehouses.map((warehouse) => (
                  <Select.Option key={warehouse._id} value={warehouse._id}>
                    {warehouse?.name}
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>

            <Form.Item style={{ textAlign: "right", marginTop: "1rem" }}>
              <Button
                onClick={handleCloseModal}
                style={{ marginRight: 8 }}
                disabled={formSubmitting}
              >
                Cancel
              </Button>
              <Button type="primary" htmlType="submit" loading={formSubmitting}>
                {editingUser ? "Save Changes" : "Create User"}
              </Button>
            </Form.Item>
          </Form>
        </Modal>
      </div>
    </motion.div>
  );
};

export default AdminUsersPage;
