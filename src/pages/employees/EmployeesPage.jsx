import React, { useState, useEffect } from "react";
import {
  Card,
  Row,
  Col,
  Space,
  Button,
  Input,
  Select,
  Tag,
  message,
  Spin,
  Tabs,
} from "antd";
import {
  PlusOutlined,
  SearchOutlined,
  FilterOutlined,
  ReloadOutlined,
  FileTextOutlined,
} from "@ant-design/icons";
import { useNavigate, useSearchParams, useLocation } from "react-router-dom";
import EmployeesList from "./components/EmployeesList";
import EmployeeForm from "./components/EmployeeForm";
import EmployeeDetails from "./components/EmployeeDetails";
import EmployeeFilters from "./components/EmployeeFilters";
import { useAuth } from "../../contexts/AuthContext";
import {
  getEmployees,
  getEmployee,
  deleteEmployee,
  createEmployee,
  updateEmployee,
  getDeletedEmployees,
  restoreEmployee,
  hardDeleteEmployee,
} from "../../api/employees";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  showSuccessToast,
  showErrorToast,
  confirmDelete,
} from "../../utils/sweetAlert";
import { fetchAllUsers, linkUserToEmployee } from "../../api/auth";
import Swal from "sweetalert2";
import PayslipGenerator from "./components/PayslipGenerator";

const { Search } = Input;
const { Option } = Select;

const EmployeesPage = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();

  // Get view mode and employee ID from URL
  const viewMode = searchParams.get("view") || "list";
  const employeeId = searchParams.get("id");
  const currentTab = searchParams.get("tab") || "active";

  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filters, setFilters] = useState({
    company: "all",
    department: "all",
    status: "all",
  });
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 20,
    total: 0,
  });

  // Function to update URL
  const updateURL = (newView, newId = null) => {
    const params = new URLSearchParams(searchParams);
    params.set("view", newView);
    params.set("tab", currentTab);

    if (newId) {
      params.set("id", newId);
    } else {
      params.delete("id");
    }

    setSearchParams(params);
  };
  const setTab = (tab) => {
    const params = new URLSearchParams(searchParams);
    params.set("tab", tab);
    // Keep view stable when switching tabs
    setSearchParams(params);
  };

  // Fetch individual employee when ID is in URL
  const { data: individualEmployee, isLoading: individualEmployeeLoading } =
    useQuery({
      queryKey: ["employee", employeeId],
      queryFn: () => getEmployee(employeeId),
      enabled: !!(
        employeeId &&
        (viewMode === "form" || viewMode === "details")
      ),
    });

  // Fetch employees with React Query
  const {
    data: employeesData,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: [
      "employees",
      pagination.current,
      pagination.pageSize,
      searchTerm,
      filters,
    ],
    queryFn: () =>
      getEmployees({
        page: pagination.current,
        limit: pagination.pageSize,
        search: searchTerm || undefined,
        company: filters.company !== "all" ? filters.company : undefined,
        department:
          filters.department !== "all" ? filters.department : undefined,
        status: filters.status !== "all" ? filters.status : undefined,
      }),
    keepPreviousData: true,
    enabled: viewMode === "list" && currentTab === "active",
  });

  const employees = employeesData?.data || [];

  // Deleted employees list
  const {
    data: deletedData,
    isLoading: deletedLoading,
    refetch: refetchDeleted,
  } = useQuery({
    queryKey: [
      "employees-deleted",
      pagination.current,
      pagination.pageSize,
      searchTerm,
      filters,
    ],
    queryFn: () =>
      getDeletedEmployees({
        page: pagination.current,
        limit: pagination.pageSize,
        search: searchTerm || undefined,
        company: filters.company !== "all" ? filters.company : undefined,
        department:
          filters.department !== "all" ? filters.department : undefined,
        status: filters.status !== "all" ? filters.status : undefined,
        sortBy: "deletedAt",
        sortOrder: "desc",
      }),
    keepPreviousData: true,
    enabled: viewMode === "list" && currentTab === "deleted",
  });
  const deletedEmployees = deletedData?.data || [];

  // Load employee when ID is in URL
  useEffect(() => {
    if (employeeId && (viewMode === "form" || viewMode === "details")) {
      // First try to find in current employees list
      const employee = employees.find((emp) => emp._id === employeeId);
      if (employee) {
        setSelectedEmployee(employee);
      } else if (individualEmployee) {
        // If not found in current data, use individually fetched employee
        setSelectedEmployee(individualEmployee);
      }
    } else {
      setSelectedEmployee(null);
    }
  }, [employeeId, viewMode, employees, individualEmployee]);
  const total =
    (currentTab === "active"
      ? employeesData?.pagination?.total
      : deletedData?.pagination?.total) || 0;

  // Update pagination when data changes
  useEffect(() => {
    if (total !== pagination.total) {
      setPagination((prev) => ({ ...prev, total }));
    }
  }, [total, pagination.total]);

  // Create employee mutation
  const createEmployeeMutation = useMutation({
    mutationFn: createEmployee,
    onSuccess: async (resp, variables) => {
      try {
        const created = resp?.data;
        showSuccessToast("Employee created successfully", "Success");
        queryClient.invalidateQueries(["employees"]);

        // Attempt auto-link to existing user (same email + same company)
        if (created?.email && (created?.company?._id || created?.company)) {
          const companyId =
            typeof created.company === "object"
              ? created.company._id
              : created.company;
          const users = await fetchAllUsers();
          const match = users.find(
            (u) =>
              String(u?.email || "").toLowerCase() ===
                String(created.email).toLowerCase() &&
              (typeof u?.company === "object"
                ? u.company?._id || u.company?.id
                : u?.company) === companyId
          );

          if (match) {
            try {
              await linkUserToEmployee({
                userId: match._id,
                employeeId: created._id,
              });
              showSuccessToast("Linked user to employee", "Link Success");
              // Invalidate any kiosk employee lists so the link reflects
              queryClient.invalidateQueries(["kiosk-employees"]);
            } catch (e) {
              showErrorToast(
                e?.response?.data?.message || "Failed to link user to employee",
                "Link Failed"
              );
            }
          }
        }
      } finally {
        updateURL("list");
        setSelectedEmployee(null);
      }
    },
    onError: (error) => {
      showErrorToast(
        error?.response?.data?.message || "Failed to create employee",
        "Error"
      );
    },
  });

  // Update employee mutation
  const updateEmployeeMutation = useMutation({
    mutationFn: ({ id, data }) => updateEmployee(id, data),
    onSuccess: () => {
      showSuccessToast("Employee updated successfully", "Success");
      queryClient.invalidateQueries(["employees"]);
      updateURL("list");
      setSelectedEmployee(null);
    },
    onError: (error) => {
      showErrorToast(
        error?.response?.data?.message || "Failed to update employee",
        "Error"
      );
    },
  });

  // Delete employee mutation
  const deleteEmployeeMutation = useMutation({
    mutationFn: deleteEmployee,
    onSuccess: () => {
      showSuccessToast("Employee deleted successfully", "Success");
      queryClient.invalidateQueries(["employees"]);
    },
    onError: (error) => {
      showErrorToast(
        error?.response?.data?.message || "Failed to delete employee",
        "Error"
      );
    },
  });

  const handleSearch = (value) => {
    setSearchTerm(value);
    setPagination((prev) => ({ ...prev, current: 1 })); // Reset to first page
  };

  const handleFilterChange = (newFilters) => {
    setFilters(newFilters);
    setPagination((prev) => ({ ...prev, current: 1 })); // Reset to first page
  };

  const handlePaginationChange = (page, pageSize) => {
    setPagination((prev) => ({
      ...prev,
      current: page,
      pageSize: pageSize || prev.pageSize,
    }));
  };

  const handleAddEmployee = () => {
    setSelectedEmployee(null);
    updateURL("form");
  };

  const handleEditEmployee = (employee) => {
    setSelectedEmployee(employee);
    updateURL("form", employee._id);
  };

  const handleViewEmployee = (employee) => {
    setSelectedEmployee(employee);
    updateURL("details", employee._id);
  };

  const handleFormSubmit = async (employeeData) => {
    try {
      if (selectedEmployee) {
        // Update existing employee
        updateEmployeeMutation.mutate({
          id: selectedEmployee._id,
          data: employeeData,
        });
      } else {
        // Create new employee
        createEmployeeMutation.mutate(employeeData);
      }
    } catch (error) {
      showErrorToast("Failed to save employee", "Error");
    }
  };

  const handleFormCancel = async () => {
    const result = await Swal.fire({
      title: "Discard Changes?",
      text: "Are you sure you want to discard your changes? Any unsaved data will be lost.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      cancelButtonColor: "#6b7280",
      confirmButtonText: "Yes, Discard",
      cancelButtonText: "Keep Editing",
      reverseButtons: true,
    });

    if (result.isConfirmed) {
      updateURL("list");
      setSelectedEmployee(null);
    }
  };

  const handleDeleteEmployee = async (employeeId) => {
    const result = await confirmDelete(
      "Delete Employee",
      "Are you sure you want to delete this employee? This action cannot be undone.",
      "Yes, Delete",
      "Cancel"
    );

    if (result.isConfirmed) {
      deleteEmployeeMutation.mutate(employeeId);
    }
  };

  const handleRefresh = () => {
    if (currentTab === "active") refetch();
    else refetchDeleted();
  };

  const handleRestoreEmployee = async (id) => {
    try {
      await restoreEmployee(id);
      showSuccessToast("Employee restored successfully", "Restored");
      refetchDeleted();
      refetch();
    } catch (e) {
      showErrorToast(
        e?.response?.data?.message || "Failed to restore employee",
        "Error"
      );
    }
  };

  const handleHardDeleteEmployee = async (id) => {
    // First confirmation
    const firstConfirm = await confirmDelete(
      "Permanently Delete Employee",
      "Are you sure you want to permanently delete this employee? This action cannot be undone and will remove the employee from the database.",
      "Yes, Delete Permanently",
      "Cancel"
    );

    if (!firstConfirm.isConfirmed) {
      return;
    }

    try {
      const result = await hardDeleteEmployee(id);
      
      // Check if backend returned success: false with attendance/payslips warning
      if (result?.success === false && result?.message?.includes('attendance records or payslips')) {
        const details = result.details || {};
        const confirmResult = await Swal.fire({
          title: 'Cannot Delete - Related Records Found',
          html: `
            <p>This employee has related records:</p>
            <ul style="text-align: left; margin: 20px 0;">
              <li><strong>Attendance Records:</strong> ${details.attendanceRecords || 0}</li>
              <li><strong>Payslips:</strong> ${details.payslips || 0}</li>
            </ul>
            <p style="color: #d46b08;"><strong>Warning:</strong> Force deleting will permanently remove all related records. This action cannot be undone.</p>
            <p>Do you want to proceed with force delete?</p>
          `,
          icon: 'warning',
          showCancelButton: true,
          confirmButtonColor: '#ef4444',
          cancelButtonColor: '#6b7280',
          confirmButtonText: 'Yes, Force Delete',
          cancelButtonText: 'Cancel',
          reverseButtons: true,
          customClass: {
            popup: 'rounded-lg',
            confirmButton: 'rounded-md',
            cancelButton: 'rounded-md',
          },
        });

        if (confirmResult.isConfirmed) {
          // Retry with force=true
          const forceResult = await hardDeleteEmployee(id, true);
          if (forceResult?.success !== false) {
            showSuccessToast(forceResult?.message || "Employee and all related records permanently deleted", "Deleted");
            refetchDeleted();
          } else {
            showErrorToast(forceResult?.message || "Failed to force delete employee", "Error");
          }
        }
        return;
      }

      // Normal success case
      if (result?.success !== false) {
        showSuccessToast(result?.message || "Employee permanently deleted", "Deleted");
        refetchDeleted();
      } else {
        showErrorToast(result?.message || "Failed to hard delete employee", "Error");
      }
    } catch (e) {
      // Handle axios errors - check if response contains the attendance/payslips warning
      const errorData = e?.response?.data;
      if (errorData?.success === false && errorData?.message?.includes('attendance records or payslips')) {
        const details = errorData.details || {};
        const confirmResult = await Swal.fire({
          title: 'Cannot Delete - Related Records Found',
          html: `
            <p>This employee has related records:</p>
            <ul style="text-align: left; margin: 20px 0;">
              <li><strong>Attendance Records:</strong> ${details.attendanceRecords || 0}</li>
              <li><strong>Payslips:</strong> ${details.payslips || 0}</li>
            </ul>
            <p style="color: #d46b08;"><strong>Warning:</strong> Force deleting will permanently remove all related records. This action cannot be undone.</p>
            <p>Do you want to proceed with force delete?</p>
          `,
          icon: 'warning',
          showCancelButton: true,
          confirmButtonColor: '#ef4444',
          cancelButtonColor: '#6b7280',
          confirmButtonText: 'Yes, Force Delete',
          cancelButtonText: 'Cancel',
          reverseButtons: true,
          customClass: {
            popup: 'rounded-lg',
            confirmButton: 'rounded-md',
            cancelButton: 'rounded-md',
          },
        });

        if (confirmResult.isConfirmed) {
          try {
            const forceResult = await hardDeleteEmployee(id, true);
            if (forceResult?.success !== false) {
              showSuccessToast(forceResult?.message || "Employee and all related records permanently deleted", "Deleted");
              refetchDeleted();
            } else {
              showErrorToast(forceResult?.message || "Failed to force delete employee", "Error");
            }
          } catch (forceError) {
            const forceErrorMsg = forceError?.response?.data?.message || forceError?.message || "Failed to force delete employee";
            showErrorToast(forceErrorMsg, "Error");
          }
        }
        return;
      }

      // Other error cases
      const errorMsg = errorData?.message || e?.message || "Failed to hard delete employee";
      showErrorToast(errorMsg, "Error");
    }
  };

  const renderContent = () => {
    switch (viewMode) {
      case "form":
        return (
          <EmployeeForm
            employee={selectedEmployee}
            onSubmit={handleFormSubmit}
            onCancel={handleFormCancel}
            loading={
              createEmployeeMutation.isPending ||
              updateEmployeeMutation.isPending
            }
          />
        );
      case "details":
        return (
          <EmployeeDetails
            employee={selectedEmployee}
            onEdit={() => updateURL("form", selectedEmployee?._id)}
            onBack={() => updateURL("list")}
            onDelete={handleDeleteEmployee}
          />
        );
      case "payslips":
        return <PayslipGenerator />;
      default:
        return currentTab === "active" ? (
          <EmployeesList
            mode="active"
            employees={employees}
            loading={isLoading}
            pagination={pagination}
            onEdit={handleEditEmployee}
            onView={handleViewEmployee}
            onDelete={handleDeleteEmployee}
            onPaginationChange={handlePaginationChange}
          />
        ) : (
          <EmployeesList
            mode="deleted"
            employees={deletedEmployees}
            loading={deletedLoading}
            pagination={pagination}
            onRestore={handleRestoreEmployee}
            onHardDelete={handleHardDeleteEmployee}
            onPaginationChange={handlePaginationChange}
          />
        );
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div style={{ display: "flex", gap: 8, alignItems: "baseline" }}>
            <h2 style={{ margin: 0 }}>Employees</h2>
            <Tag color="blue">HR Module</Tag>
          </div>
          <div style={{ color: "rgba(0,0,0,.45)", marginTop: 4 }}>
            Manage employee records, payroll information, and personal details.
          </div>
        </div>
        <div className="flex items-center gap-2 mt-4">
          <Space>
            <Button
              icon={<ReloadOutlined />}
              onClick={handleRefresh}
              loading={isLoading}
            >
              Refresh
            </Button>
            {viewMode === "list" && (
              <>
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={handleAddEmployee}
                >
                  Add Employee
                </Button>
                <Button
                  icon={<FileTextOutlined />}
                  onClick={() => updateURL("payslips")}
                >
                  Payslips
                </Button>
              </>
            )}
            {viewMode === "payslips" && (
              <Button onClick={() => updateURL("list")}>
                Back to Employees
              </Button>
            )}
          </Space>
        </div>
      </div>

      {/* Tabs */}
      {viewMode === "list" && (
        <div className="mt-4">
          <Tabs
            activeKey={currentTab}
            onChange={setTab}
            items={[
              { key: "active", label: "Active Employees" },
              { key: "deleted", label: "Deleted Employees" },
            ]}
          />
        </div>
      )}

      {/* Filters and Search */}
      <div className="mt-4">
        {viewMode === "list" && (
          <div className="rounded-xl p-5 mb-4 shadow-md border border-sky-200 bg-gradient-to-b from-[rgb(219,234,254)] to-[rgb(191,219,254)] transition-all duration-200 hover:shadow-lg">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="col-span-1">
                <Search
                  placeholder="Search employees..."
                  allowClear
                  onSearch={handleSearch}
                  style={{ width: "100%" }}
                />
              </div>
              <div className="col-span-1">
                <EmployeeFilters
                  filters={filters}
                  onFilterChange={handleFilterChange}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="mt-4">
        {(viewMode === "form" || viewMode === "details") &&
        employeeId &&
        individualEmployeeLoading ? (
          <div style={{ textAlign: "center", padding: "40px" }}>
            <Spin size="large" />
            <div style={{ marginTop: 16 }}>Loading employee details...</div>
          </div>
        ) : (
          renderContent()
        )}
      </div>
    </div>
  );
};

export default EmployeesPage;
