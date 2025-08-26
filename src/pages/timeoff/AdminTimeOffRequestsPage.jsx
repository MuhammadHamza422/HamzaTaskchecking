import React, { useEffect, useState } from "react";
import { listTimeOff, approveTimeOff, refuseTimeOff, deleteTimeOff, updateTimeOff } from "../../api/timeoff";
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  Filter, 
  Search, 
  User, 
  Calendar,
  AlertCircle,
  Loader2,
  Building,
  Users,
  Edit,
  Trash2
} from "lucide-react";

export default function AdminTimeOffRequestsPage() {
  const [requests, setRequests] = useState([]);
  const [filteredRequests, setFilteredRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [companyFilter, setCompanyFilter] = useState("all");
  const [employeeFilter, setEmployeeFilter] = useState("all");
  const [refusalReason, setRefusalReason] = useState("");
  const [showRefusalModal, setShowRefusalModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [companies, setCompanies] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingRequest, setEditingRequest] = useState(null);

  useEffect(() => {
    loadRequests();
  }, []);

  useEffect(() => {
    filterRequests();
  }, [requests, searchTerm, statusFilter, companyFilter, employeeFilter]);

  const loadRequests = async () => {
    try {
      setLoading(true);
      const { items } = await listTimeOff();
      setRequests(items || []);
      
      // Extract unique companies and employees for filters
      const uniqueCompanies = [...new Set(items
        .filter(item => item.company && item.company.name)
        .map(item => item.company.name))];
      
      const uniqueEmployees = [...new Set(items
        .filter(item => item.user)
        .map(item => `${item.user.firstName} ${item.user.lastName}`))];
      
      setCompanies(uniqueCompanies);
      setEmployees(uniqueEmployees);
    } catch (error) {
      console.error("Failed to load requests:", error);
    } finally {
      setLoading(false);
    }
  };

  const filterRequests = () => {
    let filtered = requests;

    // Apply status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter(request => request.status === statusFilter);
    }

    // Apply company filter
    if (companyFilter !== "all") {
      filtered = filtered.filter(request => 
        request.company?.name === companyFilter
      );
    }

    // Apply employee filter
    if (employeeFilter !== "all") {
      filtered = filtered.filter(request => 
        `${request.user?.firstName} ${request.user?.lastName}` === employeeFilter
      );
    }

    // Apply search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(request => 
        request.user?.firstName?.toLowerCase().includes(term) ||
        request.user?.lastName?.toLowerCase().includes(term) ||
        request.type?.name?.toLowerCase().includes(term) ||
        request.company?.name?.toLowerCase().includes(term)
      );
    }

    setFilteredRequests(filtered);
  };

  const handleApprove = async (id) => {
    try {
      setActionLoading(id);
      await approveTimeOff(id);
      await loadRequests();
    } catch (error) {
      console.error("Failed to approve request:", error);
    } finally {
      setActionLoading(null);
    }
  };

  const openRefusalModal = (request) => {
    setSelectedRequest(request);
    setRefusalReason("");
    setShowRefusalModal(true);
  };

  const handleRefuse = async () => {
    if (!refusalReason.trim()) {
      alert("Please provide a reason for refusal");
      return;
    }

    try {
      setActionLoading(selectedRequest._id);
      await refuseTimeOff(selectedRequest._id, refusalReason);
      setShowRefusalModal(false);
      await loadRequests();
    } catch (error) {
      console.error("Failed to refuse request:", error);
    } finally {
      setActionLoading(null);
    }
  };

  const handleEdit = (request) => {
    setEditingRequest({
      ...request,
      startDate: request.startDate.split('T')[0],
      endDate: request.endDate.split('T')[0]
    });
    setShowEditModal(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this request?")) return;
    
    try {
      setActionLoading(id);
      console.log('Deleting request:', id); // Debug log
      const response = await deleteTimeOff(id);
      console.log('Delete response:', response); // Debug log
      
      if (response.success) {
        await loadRequests();
      } else {
        alert(response.message || 'Failed to delete request');
      }
    } catch (error) {
      console.error("Failed to delete request:", error);
      alert(error.response?.data?.message || "Failed to delete request. Please try again.");
    } finally {
      setActionLoading(null);
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    
    try {
      setActionLoading(editingRequest._id);
      console.log('Updating request:', editingRequest); // Debug log
      
      const response = await updateTimeOff(editingRequest._id, {
        startDate: editingRequest.startDate,
        endDate: editingRequest.endDate,
        reason: editingRequest.reason
      });
      
      console.log('Update response:', response); // Debug log
      
      if (response.success) {
        setShowEditModal(false);
        setEditingRequest(null);
        await loadRequests();
      } else {
        alert(response.message || 'Failed to update request');
      }
    } catch (error) {
      console.error("Failed to update request:", error);
      alert(error.response?.data?.message || "Failed to update request. Please try again.");
    } finally {
      setActionLoading(null);
    }
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case "approved":
        return "bg-green-100 text-green-800";
      case "refused":
        return "bg-red-100 text-red-800";
      case "to_approve":
        return "bg-amber-100 text-amber-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "approved":
        return <CheckCircle className="w-4 h-4" />;
      case "refused":
        return <XCircle className="w-4 h-4" />;
      case "to_approve":
        return <Clock className="w-4 h-4" />;
      default:
        return <AlertCircle className="w-4 h-4" />;
    }
  };

  const formatDateRange = (startDate, endDate) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    if (start.toDateString() === end.toDateString()) {
      return start.toLocaleDateString();
    }
    
    return `${start.toLocaleDateString()} - ${end.toLocaleDateString()}`;
  };

  const clearFilters = () => {
    setSearchTerm("");
    setStatusFilter("all");
    setCompanyFilter("all");
    setEmployeeFilter("all");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading requests...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Time Off Requests</h1>
          <p className="text-gray-600">Review and manage employee time off requests</p>
        </div>

        {/* Filters and Search */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <div className="flex flex-col md:flex-row gap-4 mb-4">
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Search by name, type, or company..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
            
            <button
              onClick={clearFilters}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              Clear Filters
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="flex items-center gap-2">
              <Filter className="h-5 w-5 text-gray-400" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full border border-gray-300 rounded-lg py-2 px-3 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="all">All Statuses</option>
                <option value="to_approve">Pending</option>
                <option value="approved">Approved</option>
                <option value="refused">Refused</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <Building className="h-5 w-5 text-gray-400" />
              <select
                value={companyFilter}
                onChange={(e) => setCompanyFilter(e.target.value)}
                className="w-full border border-gray-300 rounded-lg py-2 px-3 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="all">All Companies</option>
                {companies.map((company, index) => (
                  <option key={index} value={company}>
                    {company}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-gray-400" />
              <select
                value={employeeFilter}
                onChange={(e) => setEmployeeFilter(e.target.value)}
                className="w-full border border-gray-300 rounded-lg py-2 px-3 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="all">All Employees</option>
                {employees.map((employee, index) => (
                  <option key={index} value={employee}>
                    {employee}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center justify-end text-sm text-gray-500">
              Showing {filteredRequests.length} of {requests.length} requests
            </div>
          </div>
        </div>

        {/* Requests Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredRequests.length === 0 ? (
            <div className="col-span-full text-center py-12 bg-white rounded-xl shadow-sm">
              <Clock className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <h3 className="text-lg font-medium text-gray-900 mb-1">No requests found</h3>
              <p className="text-gray-500">No time off requests match your current filters.</p>
            </div>
          ) : (
            filteredRequests.map((request) => (
              <div key={request._id} className="bg-white rounded-xl shadow-sm overflow-hidden">
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        {request.user?.firstName} {request.user?.lastName}
                      </h3>
                      <p className="text-sm text-gray-500">{request.user?.email}</p>
                      {request.company?.name && (
                        <p className="text-xs text-gray-400 mt-1 flex items-center">
                          <Building className="w-3 h-3 mr-1" />
                          {request.company.name}
                        </p>
                      )}
                    </div>
                    <span
                      className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getStatusBadgeClass(
                        request.status
                      )}`}
                    >
                      {getStatusIcon(request.status)}
                      <span className="ml-1">
                        {request.status === "to_approve" 
                          ? "Pending" 
                          : request.status.charAt(0).toUpperCase() + request.status.slice(1)
                        }
                      </span>
                    </span>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center text-sm text-gray-600">
                      <Calendar className="w-4 h-4 mr-2" />
                      {formatDateRange(request.startDate, request.endDate)}
                    </div>
                    
                    <div>
                      <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Type</span>
                      <p className="text-sm font-medium text-gray-900">{request.type?.name}</p>
                    </div>

                    {request.reason && (
                      <div>
                        <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Reason</span>
                        <p className="text-sm text-gray-700 mt-1">{request.reason}</p>
                      </div>
                    )}

                    {request.status === "refused" && request.refuseReason && (
                      <div>
                        <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Refusal Reason</span>
                        <p className="text-sm text-red-600 mt-1">{request.refuseReason}</p>
                      </div>
                    )}
                  </div>

                  {request.status === "to_approve" && (
                    <div className="mt-6 flex space-x-2">
                      <button
                        onClick={() => handleApprove(request._id)}
                        disabled={actionLoading === request._id}
                        className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-lg text-sm font-medium flex items-center justify-center disabled:opacity-50"
                      >
                        {actionLoading === request._id ? (
                          <Loader2 className="w-4 h-4 animate-spin mr-1" />
                        ) : (
                          <CheckCircle className="w-4 h-4 mr-1" />
                        )}
                        Approve
                      </button>
                      <button
                        onClick={() => openRefusalModal(request)}
                        disabled={actionLoading === request._id}
                        className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded-lg text-sm font-medium flex items-center justify-center disabled:opacity-50"
                      >
                        <XCircle className="w-4 h-4 mr-1" />
                        Refuse
                      </button>
                    </div>
                  )}

                  {request.status !== "to_approve" && (
                    <div className="mt-6 flex space-x-2">
                      <button
                        onClick={() => handleEdit(request)}
                        className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white py-2 px-4 rounded-lg text-sm font-medium flex items-center justify-center"
                      >
                        <Edit className="w-4 h-4 mr-1" />
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(request._id)}
                        disabled={actionLoading === request._id}
                        className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded-lg text-sm font-medium flex items-center justify-center disabled:opacity-50"
                      >
                        {actionLoading === request._id ? (
                          <Loader2 className="w-4 h-4 animate-spin mr-1" />
                        ) : (
                          <Trash2 className="w-4 h-4 mr-1" />
                        )}
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Refusal Reason Modal */}
      {showRefusalModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-lg max-w-md w-full p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-2">Refuse Time Off Request</h3>
            <p className="text-sm text-gray-600 mb-4">
              Please provide a reason for refusing this request from {selectedRequest.user?.firstName}{" "}
              {selectedRequest.user?.lastName}.
            </p>
            
            <textarea
              value={refusalReason}
              onChange={(e) => setRefusalReason(e.target.value)}
              placeholder="Enter reason for refusal..."
              rows={4}
              className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
            
            <div className="mt-6 flex space-x-3 justify-end">
              <button
                onClick={() => setShowRefusalModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleRefuse}
                disabled={actionLoading === selectedRequest._id}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg disabled:opacity-50 flex items-center"
              >
                {actionLoading === selectedRequest._id && (
                  <Loader2 className="w-4 h-4 animate-spin mr-1" />
                )}
                Confirm Refusal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Request Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-lg max-w-md w-full p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Edit Time Off Request</h3>
            
            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Start Date
                </label>
                <input
                  type="date"
                  value={editingRequest.startDate}
                  onChange={(e) => setEditingRequest({
                    ...editingRequest,
                    startDate: e.target.value
                  })}
                  className="w-full border border-gray-300 rounded-lg p-2"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  End Date
                </label>
                <input
                  type="date"
                  value={editingRequest.endDate}
                  onChange={(e) => setEditingRequest({
                    ...editingRequest,
                    endDate: e.target.value
                  })}
                  className="w-full border border-gray-300 rounded-lg p-2"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Reason
                </label>
                <textarea
                  value={editingRequest.reason}
                  onChange={(e) => setEditingRequest({
                    ...editingRequest,
                    reason: e.target.value
                  })}
                  rows={3}
                  className="w-full border border-gray-300 rounded-lg p-2"
                />
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading === editingRequest._id}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg disabled:opacity-50 flex items-center"
                >
                  {actionLoading === editingRequest._id ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-1" />
                  ) : (
                    <Edit className="w-4 h-4 mr-1" />
                  )}
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}