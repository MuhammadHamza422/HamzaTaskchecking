import React, { useState, useEffect, useCallback } from "react";
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
  roles: "",
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
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [deletingUsers, setDeletingUsers] = useState(new Set());
  const [changedFields, setChangedFields] = useState(new Set());
  const [form] = Form.useForm();
  const { user: currentUser } = useAuth();
  const [rolesOptions, setRolesOptions] = useState([]);
  const { ref: fullscreenRef, isFullscreen, getContainer } = useFullscreen();
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
  const isAdmin = currentUser?.role === "admin";

  const fetchUsers = useCallback(() => {
    setLoading(true);
    apiClient
      .get("/api/v1/auth/all")
      .then((response) => {
        // Transform the API response to match the expected format
        const transformedUsers = response.data.users.map((user) => ({
          id: user._id,
          first_name: user.firstName,
          last_name: user.lastName,
          email: user.email,
          role: user.role,
          is_active: user.isActive,
          roles: user.roles,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        }));
        setUsers(transformedUsers);
      })
      .catch((error) => {
        console.error("Error fetching users:", error);
        message.error("Failed to fetch users.");
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  useEffect(() => {
    loadRoles();
  }, [loadRoles]);

  const handleOpenModal = (user = null) => {
    // Check if user is admin before allowing edit
    if (user && !isAdmin) {
      message.error("Only admin users can edit user information.");
      return;
    }

    setEditingUser(user);
    setChangedFields(new Set()); // Reset changed fields

    if (user) {
      // Transform user data to match form field names
      const formData = {
        first_name: user.first_name,
        last_name: user.last_name,
        email: user.email,
        role: user.role,
        is_active: user.is_active,
        password: "",
        roles: user.roles,
      };
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
    if (!editingUser) return; // Only track changes for editing

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
      case "roles":
        hasChanged = value !== originalUser.roles;
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

      let dataToSubmit = {};

      if (editingUser) {
        // For updating existing users - allow all fields to be updated
        const originalUser = users.find((u) => u.id === editingUser.id);
        if (!originalUser) {
          message.error("User not found.");
          setFormSubmitting(false);
          return;
        }

        // Check which fields have changed
        if (values.first_name !== originalUser.first_name) {
          dataToSubmit.firstName = values.first_name;
        }
        if (values.last_name !== originalUser.last_name) {
          dataToSubmit.lastName = values.last_name;
        }
        if (values.email !== originalUser.email) {
          dataToSubmit.email = values.email;
        }
        // if (values.role !== originalUser.role) {
        //   dataToSubmit.role = values.role;
        // }
        if (values.is_active !== originalUser.is_active) {
          dataToSubmit.isActive = values.is_active;
        }
        if (values.password && values.password.trim() !== "") {
          dataToSubmit.password = values.password.trim();
        }
        if (values.roles !== originalUser.roles) {
          dataToSubmit.roles = values.roles;
        }
      } else {
        // For new users, include all required fields
        dataToSubmit = {
          firstName: values.first_name,
          lastName: values.last_name,
          email: values.email,
          // role: values.role,
          password: values.password,
          roles: values.roles,
        };
      }

      // Make sure we have data to submit
      if (Object.keys(dataToSubmit).length === 0) {
        message.warning(
          "No changes detected. Please modify at least one field."
        );
        setFormSubmitting(false);
        return;
      }

      const apiCall = editingUser
        ? apiClient.patch(`/api/v1/auth/update/${editingUser.id}`, dataToSubmit)
        : apiClient.post("/api/v1/auth/register", dataToSubmit);

      const response = await apiCall;

      // Check for successful response
      const isSuccess = response.status >= 200 && response.status < 300;
      const hasSuccessFlag = response.data && response.data.success === true;

      if (isSuccess && (hasSuccessFlag || response.data.message)) {
        message.success(
          `User ${editingUser ? "updated" : "created"} successfully!`
        );

        handleCloseModal();

        fetchUsers();
      } else {
        message.error(response.data?.message || "Failed to save user.");
      }
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
      <Card
        style={{
          background: "linear-gradient(to right, #f0f4ff, #dbeafe)",
          borderRadius: "12px",
          boxShadow: "0 8px 24px rgba(0,0,0,0.06)",
          padding: "2rem",
          marginBottom: "2rem",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
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
          pagination={{ pageSize: 10 }}
          scroll={{ x: 1200 }}
        />
      </div>

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

            <Form.Item
              label="Is Active"
              name="is_active"
              valuePropName="checked"
            >
              <Switch
                onChange={(checked) => handleFieldChange("is_active", checked)}
              />
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
