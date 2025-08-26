import React, { useEffect, useState } from "react";
import apiClient from "../../api/client";
import {
  Plus,
  Users,
  Calendar,
  Loader2,
  AlertCircle,
  Search,
  Filter,
  TrendingUp,
  Award
} from "lucide-react";

export default function AdminTimeOffAllocationsPage() {
  const [users, setUsers] = useState([]);
  const [types, setTypes] = useState([]);
  const [allocations, setAllocations] = useState([]);
  const [filteredAllocations, setFilteredAllocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formLoading, setFormLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [form, setForm] = useState({ userId: "", typeId: "", total: "" });
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingAllocation, setEditingAllocation] = useState(null);

  useEffect(() => {
    loadUsers();
    loadTypes();
    loadAllocations();
  }, []);

  useEffect(() => {
    filterAllocations();
  }, [allocations, searchTerm]);

  const loadUsers = async () => {
    try {
      const { data } = await apiClient.get("/api/v1/auth/all");
      setUsers(data?.users || []);
    } catch (error) {
      console.error("Failed to load users:", error);
    }
  };

  const loadTypes = async () => {
    try {
      const { data } = await apiClient.get("/api/v1/admin/timeoff/types");
      setTypes(data?.types || []);
    } catch (error) {
      console.error("Failed to load types:", error);
    }
  };

  const loadAllocations = async () => {
    try {
      setLoading(true);
      const { data } = await apiClient.get("/api/v1/admin/timeoff/allocations");

      // Normalize response
      const list = Array.isArray(data)
        ? data
        : Array.isArray(data?.allocations)
        ? data.allocations
        : Array.isArray(data?.items)
        ? data.items
        : [];

      setAllocations(list);
    } catch (error) {
      console.error("Failed to load allocations:", error);
    } finally {
      setLoading(false);
    }
  };

  const filterAllocations = () => {
    if (!searchTerm) {
      setFilteredAllocations(allocations);
      return;
    }

    const term = searchTerm.toLowerCase();
    const filtered = allocations.filter((a) => {
      const userName = getUserDisplayName(a.user).toLowerCase();
      const typeName = (a.type?.name || "").toLowerCase();
      
      return userName.includes(term) || typeName.includes(term);
    });

    setFilteredAllocations(filtered);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormLoading(true);

    try {
      const payload = {
        userId: form.userId,
        typeId: form.typeId,
        allocated: Number(form.total), // backend requires "allocated"
      };

      await apiClient.post("/api/v1/admin/timeoff/allocations", payload);

      setForm({ userId: "", typeId: "", total: "" });
      await loadAllocations();
    } catch (err) {
      console.error("Error saving allocation:", err.response?.data || err.message);
      alert("Failed to allocate time off. Check console for details.");
    } finally {
      setFormLoading(false);
    }
  };

  const handleEdit = (allocation) => {
    setEditingAllocation(allocation);
    setIsEditModalOpen(true);
  };

  const handleDelete = async (allocationId) => {
    if (!window.confirm("Are you sure you want to delete this allocation?")) return;
    
    try {
      // Fix the endpoint path
      await apiClient.delete(`/api/v1/admin/timeoff/allocations/${allocationId}`);
      await loadAllocations();
    } catch (error) {
      console.error("Failed to delete allocation:", error);
      alert("Failed to delete allocation. Please try again.");
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    
    try {
      // Fix the endpoint path
      await apiClient.put(`/api/v1/admin/timeoff/allocations/${editingAllocation._id}`, {
        allocated: Number(editingAllocation.allocated)
      });
      
      setIsEditModalOpen(false);
      setEditingAllocation(null);
      await loadAllocations();
    } catch (error) {
      console.error("Failed to update allocation:", error);
      alert("Failed to update allocation. Please try again.");
    }
  };

  // Show username instead of email
  const getUserDisplayName = (user) => {
    if (!user) return "-";
    // Prefer full name, fallback to username, then email
    if (user.firstName || user.lastName) {
      return `${user.firstName || ""} ${user.lastName || ""}`.trim();
    }
    return user.username || user.name || user.fullName || user.email || "-";
  };

  const getRemainingPercentage = (allocated, used) => {
    if (!allocated) return 100;
    return Math.max(0, ((allocated - used) / allocated) * 100);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading allocations...</p>
        </div>
      </div>
    );
  }

  // Add this component right before the final return statement
  const EditModal = () => {
    if (!isEditModalOpen || !editingAllocation) return null;

    return (
      <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center">
        <div className="bg-white rounded-lg p-6 max-w-md w-full">
          <h3 className="text-lg font-medium mb-4">Edit Allocation</h3>
          
          <form onSubmit={handleEditSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Employee
              </label>
              <input
                type="text"
                value={getUserDisplayName(editingAllocation.user)}
                disabled
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg bg-gray-50"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Type
              </label>
              <input
                type="text"
                value={editingAllocation.type?.name}
                disabled
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg bg-gray-50"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Allocated Days
              </label>
              <input
                type="number"
                value={editingAllocation.allocated}
                onChange={(e) => setEditingAllocation({
                  ...editingAllocation,
                  allocated: e.target.value
                })}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg"
                min="1"
                required
              />
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                type="button"
                onClick={() => {
                  setIsEditModalOpen(false);
                  setEditingAllocation(null);
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
              >
                Save Changes
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Time Off Allocations</h1>
          <p className="text-gray-600">Manage time off allocations for employees</p>
        </div>

        {/* Stats Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center">
              <div className="p-3 bg-indigo-100 rounded-lg mr-4">
                <Users className="w-6 h-6 text-indigo-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Employees</p>
                <p className="text-2xl font-bold text-gray-900">{users.length}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center">
              <div className="p-3 bg-green-100 rounded-lg mr-4">
                <Award className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Time Off Types</p>
                <p className="text-2xl font-bold text-gray-900">{types.length}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center">
              <div className="p-3 bg-amber-100 rounded-lg mr-4">
                <TrendingUp className="w-6 h-6 text-amber-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Total Allocations</p>
                <p className="text-2xl font-bold text-gray-900">{allocations.length}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Allocation Form */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-sm p-6 sticky top-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Plus className="w-5 h-5 text-indigo-500" /> Allocate Time Off
              </h2>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Employee</label>
                  <select
                    value={form.userId}
                    onChange={(e) => setForm({ ...form, userId: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    required
                  >
                    <option value="">Select Employee</option>
                    {users.map((u) => (
                      <option key={u._id} value={u._id}>
                        {getUserDisplayName(u)}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Time Off Type</label>
                  <select
                    value={form.typeId}
                    onChange={(e) => setForm({ ...form, typeId: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    required
                  >
                    <option value="">Select Type</option>
                    {types.map((t) => (
                      <option key={t._id} value={t._id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Days to Allocate</label>
                  <input
                    type="number"
                    placeholder="Enter number of days"
                    value={form.total}
                    onChange={(e) => setForm({ ...form, total: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    required
                    min="1"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2.5 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors disabled:bg-gray-400"
                  disabled={formLoading}
                >
                  {formLoading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Allocating...
                    </>
                  ) : (
                    <>
                      <Plus className="w-5 h-5" />
                      Allocate Time Off
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>

          {/* Allocations List */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4 sm:mb-0">Current Allocations</h2>
                
                <div className="relative w-full sm:w-auto">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    placeholder="Search by name or type..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
              </div>

              {filteredAllocations.length === 0 ? (
                <div className="text-center py-12">
                  <AlertCircle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <h3 className="text-lg font-medium text-gray-900 mb-1">No allocations found</h3>
                  <p className="text-gray-500">
                    {allocations.length === 0
                      ? "Get started by allocating time off to employees."
                      : "No allocations match your search."}
                  </p>
                </div>
              ) : (
                <div className="overflow-hidden">
                  {/* Desktop Table */}
                  <div className="hidden md:block overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          <th className="px-6 py-3">Employee</th>
                          <th className="px-6 py-3">Type</th>
                          <th className="px-6 py-3">Allocated</th>
                          <th className="px-6 py-3">Used</th>
                          <th className="px-6 py-3">Remaining</th>
                          <th className="px-6 py-3">Utilization</th>
                          <th className="px-6 py-3">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {filteredAllocations.map((a) => {
                          const remaining = (a.allocated ?? 0) - (a.used ?? 0);
                          const percentage = getRemainingPercentage(a.allocated, a.used);
                          
                          return (
                            <tr key={a._id} className="hover:bg-gray-50 transition-colors">
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm font-medium text-gray-900">
                                  {getUserDisplayName(a.user)}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm text-gray-900">{a.type?.name || "-"}</div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {a.allocated}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {a.used ?? 0}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                <span className={remaining < 0 ? "text-red-600" : "text-green-600"}>
                                  {remaining}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="w-full bg-gray-200 rounded-full h-2">
                                  <div
                                    className={`h-2 rounded-full ${
                                      percentage > 50 ? "bg-green-600" : 
                                      percentage > 25 ? "bg-amber-500" : "bg-red-600"
                                    }`}
                                    style={{ width: `${percentage}%` }}
                                  ></div>
                                </div>
                                <div className="text-xs text-gray-500 mt-1">{Math.round(percentage)}% remaining</div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                <button
                                  onClick={() => handleEdit(a)}
                                  className="text-indigo-600 hover:text-indigo-900 mr-3"
                                >
                                  Edit
                                </button>
                                <button
                                  onClick={() => handleDelete(a._id)}
                                  className="text-red-600 hover:text-red-900"
                                >
                                  Delete
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile Cards */}
                  <div className="md:hidden space-y-4">
                    {filteredAllocations.map((a) => {
                      const remaining = (a.allocated ?? 0) - (a.used ?? 0);
                      const percentage = getRemainingPercentage(a.allocated, a.used);
                      
                      return (
                        <div key={a._id} className="bg-gray-50 rounded-lg p-4">
                          <div className="flex justify-between items-start mb-3">
                            <div>
                              <h3 className="font-medium text-gray-900">{getUserDisplayName(a.user)}</h3>
                              <p className="text-sm text-gray-600">{a.type?.name || "-"}</p>
                            </div>
                            <span className={`px-2 py-1 text-xs rounded-full ${
                              remaining < 0 ? "bg-red-100 text-red-800" : "bg-green-100 text-green-800"
                            }`}>
                              {remaining} days left
                            </span>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-4 mb-3">
                            <div>
                              <span className="text-xs font-medium text-gray-500">Allocated</span>
                              <p className="text-sm font-medium">{a.allocated}</p>
                            </div>
                            <div>
                              <span className="text-xs font-medium text-gray-500">Used</span>
                              <p className="text-sm font-medium">{a.used ?? 0}</p>
                            </div>
                          </div>
                          
                          <div>
                            <div className="flex justify-between text-xs text-gray-500 mb-1">
                              <span>Utilization</span>
                              <span>{Math.round(percentage)}% remaining</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div
                                className={`h-2 rounded-full ${
                                  percentage > 50 ? "bg-green-600" : 
                                  percentage > 25 ? "bg-amber-500" : "bg-red-600"
                                }`}
                                style={{ width: `${percentage}%` }}
                              ></div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Edit Allocation Modal */}
        {isEditModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-lg w-full max-w-md mx-auto">
              <div className="p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Edit Time Off Allocation</h2>
                
                <form onSubmit={handleEditSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Employee</label>
                    <select
                      value={editingAllocation?.user?._id}
                      onChange={(e) => setEditingAllocation({ ...editingAllocation, user: users.find(u => u._id === e.target.value) })}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      disabled
                    >
                      <option value="">Select Employee</option>
                      {users.map((u) => (
                        <option key={u._id} value={u._id}>
                          {getUserDisplayName(u)}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Time Off Type</label>
                    <select
                      value={editingAllocation?.type?._id}
                      onChange={(e) => setEditingAllocation({ ...editingAllocation, type: types.find(t => t._id === e.target.value) })}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      disabled
                    >
                      <option value="">Select Type</option>
                      {types.map((t) => (
                        <option key={t._id} value={t._id}>
                          {t.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Days Allocated</label>
                    <input
                      type="number"
                      placeholder="Enter number of days"
                      value={editingAllocation?.allocated}
                      onChange={(e) => setEditingAllocation({ ...editingAllocation, allocated: e.target.value })}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      required
                      min="1"
                    />
                  </div>

                  <div className="flex justify-end gap-4">
                    <button
                      type="button"
                      onClick={() => setIsEditModalOpen(false)}
                      className="w-full sm:w-auto bg-gray-200 hover:bg-gray-300 text-gray-900 font-medium py-2 px-4 rounded-lg transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors disabled:bg-gray-400"
                      disabled={formLoading}
                    >
                      {formLoading ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          Updating...
                        </>
                      ) : (
                        <>
                          <Plus className="w-5 h-5" />
                          Update Allocation
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        <EditModal />
      </div>
    </div>
  );
}