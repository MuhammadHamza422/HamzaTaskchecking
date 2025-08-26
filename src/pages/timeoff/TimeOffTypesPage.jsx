import React, { useEffect, useState } from "react";
import {
  fetchAdminTimeOffTypes,
  createTimeOffType,
  updateTimeOffType,
  deleteTimeOffType,
} from "../../api/timeoff";
import {
  Plus,
  Edit,
  Trash2,
  ToggleLeft,
  ToggleRight,
  CheckCircle,
  XCircle,
  AlertCircle,
  Save,
  Loader2
} from "lucide-react";

export default function TimeOffTypesPage() {
  const [types, setTypes] = useState([]);
  const [form, setForm] = useState({
    name: "",
    code: "",
    requiresApproval: true,
    isPaid: true,
  });
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [editMode, setEditMode] = useState(null);
  const [editForm, setEditForm] = useState({});

  useEffect(() => {
    loadTypes();
  }, []);

  const loadTypes = async () => {
    try {
      setLoading(true);
      const data = await fetchAdminTimeOffTypes();
      setTypes(data);
    } catch (error) {
      console.error("Failed to load types:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setActionLoading("create");
      await createTimeOffType(form);
      setForm({ name: "", code: "", requiresApproval: true, isPaid: true });
      await loadTypes();
    } catch (error) {
      console.error("Failed to create type:", error);
    } finally {
      setActionLoading(null);
    }
  };

  const handleEdit = (type) => {
    setEditMode(type._id);
    setEditForm({
      name: type.name,
      code: type.code,
      requiresApproval: type.requiresApproval,
      isPaid: type.isPaid,
    });
  };

  const handleSaveEdit = async (id) => {
    try {
      setActionLoading(`edit-${id}`);
      await updateTimeOffType(id, editForm);
      setEditMode(null);
      await loadTypes();
    } catch (error) {
      console.error("Failed to update type:", error);
    } finally {
      setActionLoading(null);
    }
  };

  const toggleActive = async (id, active) => {
    try {
      setActionLoading(`toggle-${id}`);
      await updateTimeOffType(id, { active: !active });
      await loadTypes();
    } catch (error) {
      console.error("Failed to toggle type:", error);
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (id) => {
    try {
      setActionLoading(`delete-${id}`);
      await deleteTimeOffType(id);
      setDeleteConfirm(null);
      await loadTypes();
    } catch (error) {
      console.error("Failed to delete type:", error);
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading time off types...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Time Off Types</h1>
          <p className="text-gray-600">Create and manage different types of time off for your organization</p>
        </div>

        {/* Create New Type Card */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Plus className="w-5 h-5 text-indigo-500" /> Create New Time Off Type
          </h2>
          
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Type Name</label>
              <input
                type="text"
                placeholder="e.g., Vacation, Sick Leave"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Code</label>
              <input
                type="text"
                placeholder="e.g., VAC, SL"
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                required
              />
            </div>
            
            <div className="flex items-center">
              <label className="flex items-center cursor-pointer">
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={form.requiresApproval}
                    onChange={(e) => setForm({ ...form, requiresApproval: e.target.checked })}
                    className="sr-only"
                  />
                  <div className={`block w-14 h-7 rounded-full ${form.requiresApproval ? 'bg-indigo-600' : 'bg-gray-300'}`}></div>
                  <div className={`absolute left-1 top-1 bg-white w-5 h-5 rounded-full transition-transform ${form.requiresApproval ? 'transform translate-x-7' : ''}`}></div>
                </div>
                <div className="ml-3 text-sm font-medium text-gray-700">
                  Requires Approval
                </div>
              </label>
            </div>
            
            <div className="flex items-center">
              <label className="flex items-center cursor-pointer">
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={form.isPaid}
                    onChange={(e) => setForm({ ...form, isPaid: e.target.checked })}
                    className="sr-only"
                  />
                  <div className={`block w-14 h-7 rounded-full ${form.isPaid ? 'bg-indigo-600' : 'bg-gray-300'}`}></div>
                  <div className={`absolute left-1 top-1 bg-white w-5 h-5 rounded-full transition-transform ${form.isPaid ? 'transform translate-x-7' : ''}`}></div>
                </div>
                <div className="ml-3 text-sm font-medium text-gray-700">
                  Paid Leave
                </div>
              </label>
            </div>
            
            <div className="md:col-span-2">
              <button
                type="submit"
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors disabled:bg-gray-400"
                disabled={actionLoading === "create"}
              >
                {actionLoading === "create" ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Plus className="w-5 h-5" />
                    Add Type
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Types List */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Time Off Types</h2>
          
          {types.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm p-8 text-center">
              <AlertCircle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <h3 className="text-lg font-medium text-gray-900 mb-1">No time off types yet</h3>
              <p className="text-gray-500">Create your first time off type using the form above.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {types.map((type) => (
                <div key={type._id} className="bg-white rounded-xl shadow-sm overflow-hidden">
                  <div className={`p-4 ${type.active ? 'bg-indigo-50' : 'bg-gray-100'}`}>
                    <div className="flex justify-between items-center">
                      <h3 className="font-semibold text-gray-900">{type.name}</h3>
                      <span className={`px-2 py-1 text-xs rounded-full ${type.active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {type.active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 mt-1">{type.code}</p>
                  </div>
                  
                  <div className="p-4">
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div>
                        <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Approval</span>
                        <div className="flex items-center mt-1">
                          {type.requiresApproval ? (
                            <CheckCircle className="w-4 h-4 text-green-500 mr-1" />
                          ) : (
                            <XCircle className="w-4 h-4 text-red-500 mr-1" />
                          )}
                          <span className="text-sm">{type.requiresApproval ? 'Required' : 'Not Required'}</span>
                        </div>
                      </div>
                      
                      <div>
                        <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Paid</span>
                        <div className="flex items-center mt-1">
                          {type.isPaid ? (
                            <CheckCircle className="w-4 h-4 text-green-500 mr-1" />
                          ) : (
                            <XCircle className="w-4 h-4 text-red-500 mr-1" />
                          )}
                          <span className="text-sm">{type.isPaid ? 'Yes' : 'No'}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex justify-between items-center border-t pt-4">
                      <button
                        onClick={() => toggleActive(type._id, type.active)}
                        disabled={actionLoading === `toggle-${type._id}`}
                        className="flex items-center text-sm text-gray-600 hover:text-gray-900 disabled:opacity-50"
                      >
                        {actionLoading === `toggle-${type._id}` ? (
                          <Loader2 className="w-4 h-4 animate-spin mr-1" />
                        ) : type.active ? (
                          <ToggleLeft className="w-4 h-4 mr-1" />
                        ) : (
                          <ToggleRight className="w-4 h-4 mr-1" />
                        )}
                        {type.active ? 'Deactivate' : 'Activate'}
                      </button>
                      
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleEdit(type)}
                          className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg"
                          title="Edit"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        
                        <button
                          onClick={() => setDeleteConfirm(type._id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Edit Modal */}
      {editMode && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-lg max-w-md w-full p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Edit Time Off Type</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Type Name</label>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Code</label>
                <input
                  type="text"
                  value={editForm.code}
                  onChange={(e) => setEditForm({ ...editForm, code: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
              
              <div className="flex items-center">
                <label className="flex items-center cursor-pointer">
                  <div className="relative">
                    <input
                      type="checkbox"
                      checked={editForm.requiresApproval}
                      onChange={(e) => setEditForm({ ...editForm, requiresApproval: e.target.checked })}
                      className="sr-only"
                    />
                    <div className={`block w-14 h-7 rounded-full ${editForm.requiresApproval ? 'bg-indigo-600' : 'bg-gray-300'}`}></div>
                    <div className={`absolute left-1 top-1 bg-white w-5 h-5 rounded-full transition-transform ${editForm.requiresApproval ? 'transform translate-x-7' : ''}`}></div>
                  </div>
                  <div className="ml-3 text-sm font-medium text-gray-700">
                    Requires Approval
                  </div>
                </label>
              </div>
              
              <div className="flex items-center">
                <label className="flex items-center cursor-pointer">
                  <div className="relative">
                    <input
                      type="checkbox"
                      checked={editForm.isPaid}
                      onChange={(e) => setEditForm({ ...editForm, isPaid: e.target.checked })}
                      className="sr-only"
                    />
                    <div className={`block w-14 h-7 rounded-full ${editForm.isPaid ? 'bg-indigo-600' : 'bg-gray-300'}`}></div>
                    <div className={`absolute left-1 top-1 bg-white w-5 h-5 rounded-full transition-transform ${editForm.isPaid ? 'transform translate-x-7' : ''}`}></div>
                  </div>
                  <div className="ml-3 text-sm font-medium text-gray-700">
                    Paid Leave
                  </div>
                </label>
              </div>
            </div>
            
            <div className="mt-6 flex space-x-3 justify-end">
              <button
                onClick={() => setEditMode(null)}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={() => handleSaveEdit(editMode)}
                disabled={actionLoading === `edit-${editMode}`}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg disabled:opacity-50 flex items-center"
              >
                {actionLoading === `edit-${editMode}` ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-1" />
                ) : (
                  <Save className="w-4 h-4 mr-1" />
                )}
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-lg max-w-md w-full p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-2">Confirm Deletion</h3>
            <p className="text-sm text-gray-600 mb-4">
              Are you sure you want to delete this time off type? This action cannot be undone.
            </p>
            
            <div className="mt-6 flex space-x-3 justify-end">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm)}
                disabled={actionLoading === `delete-${deleteConfirm}`}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg disabled:opacity-50 flex items-center"
              >
                {actionLoading === `delete-${deleteConfirm}` ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-1" />
                ) : (
                  <Trash2 className="w-4 h-4 mr-1" />
                )}
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}