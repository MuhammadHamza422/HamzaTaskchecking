import React, { useEffect, useState } from "react";
import {
  fetchUserTimeOffTypes,
  requestTimeOff,
  myTimeOff,
  fetchMyBalance,
} from "../../api/timeoff";
import { Calendar, Loader2, AlertCircle, Clock, TrendingUp, PieChart } from "lucide-react";

export default function MyTimeOffPage() {
  const [types, setTypes] = useState([]);
  const [requests, setRequests] = useState([]);
  const [balance, setBalance] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("balance"); // For mobile responsive tabs

  const [form, setForm] = useState({
    typeId: "",
    startDate: "",
    endDate: "",
    reason: "",
    unit: "day",
  });

  const loadTypes = async () => {
    const t = await fetchUserTimeOffTypes();
    setTypes(t);
  };

  const loadRequests = async () => {
    const { items } = await myTimeOff();
    setRequests(items || []);
  };

  const loadBalance = async () => {
    try {
      const data = await fetchMyBalance();
      setBalance(data);
    } catch (error) {
      console.error("Failed to load balance:", error);
    }
  };

  useEffect(() => {
    loadTypes();
    loadRequests();
    loadBalance();
  }, []);

  // Check if user has allocation for selected type
  const hasAllocationForType = (typeId) => {
    const allocation = balance.find(b => b.type?._id === typeId);
    return allocation && allocation.remaining > 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    
    // Check allocation before submitting
    if (!hasAllocationForType(form.typeId)) {
      setError("You don't have any remaining time off for this type.");
      return;
    }

    setLoading(true);
    try {
      await requestTimeOff(form);
      setForm({ typeId: "", startDate: "", endDate: "", reason: "", unit: "day" });
      await loadRequests();
      await loadBalance();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to submit request");
    } finally {
      setLoading(false);
    }
  };

  const statusColor = (status) => {
    switch (status) {
      case "approved":
        return "bg-green-100 text-green-700";
      case "refused":
        return "bg-red-100 text-red-700";
      default:
        return "bg-yellow-100 text-yellow-700";
    }
  };

  const getProgressPercentage = (allocated, used) => {
    if (!allocated) return 0;
    return Math.min(100, (used / allocated) * 100);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Time Off Management</h1>
          <p className="text-gray-600">View your balance, request time off, and track your requests</p>
        </div>

        {/* Mobile Tabs */}
        <div className="lg:hidden mb-6">
          <div className="flex border-b border-gray-200">
            <button
              className={`py-3 px-4 font-medium text-sm ${activeTab === 'balance' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-gray-500'}`}
              onClick={() => setActiveTab('balance')}
            >
              Balance
            </button>
            <button
              className={`py-3 px-4 font-medium text-sm ${activeTab === 'request' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-gray-500'}`}
              onClick={() => setActiveTab('request')}
            >
              Request
            </button>
            <button
              className={`py-3 px-4 font-medium text-sm ${activeTab === 'history' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-gray-500'}`}
              onClick={() => setActiveTab('history')}
            >
              History
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Balance Cards Section */}
          <div className={`lg:col-span-1 ${activeTab === 'balance' ? 'block' : 'hidden lg:block'}`}>
            <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <PieChart className="w-5 h-5 text-indigo-500" /> Time Off Balance
              </h2>
              
              {balance.length === 0 ? (
                <div className="text-center py-8">
                  <Clock className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">No allocations found.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {balance.map((b, i) => {
                    const progress = getProgressPercentage(b.allocated, b.used);
                    return (
                      <div key={i} className="border border-gray-100 rounded-lg p-4 hover:shadow-md transition-shadow">
                        <div className="flex justify-between items-start mb-2">
                          <h3 className="font-medium text-gray-900">{b.type?.name}</h3>
                          <span className={`px-2 py-1 text-xs rounded-full ${b.remaining > 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                            {b.remaining} {b.unit === "hour" ? "hrs" : "days"} left
                          </span>
                        </div>
                        
                        <div className="mb-2">
                          <div className="flex justify-between text-sm text-gray-600 mb-1">
                            <span>Used: {b.used}</span>
                            <span>Allocated: {b.allocated}</span>
                          </div>
                          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div 
                              className={`h-full rounded-full ${progress < 80 ? 'bg-indigo-500' : 'bg-amber-500'}`}
                              style={{ width: `${progress}%` }}
                            ></div>
                          </div>
                        </div>
                        
                        <div className="flex justify-between text-xs text-gray-500">
                          <span>{Math.round(progress)}% utilized</span>
                          <span>{b.unit === "hour" ? "Hours" : "Days"}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            
            {/* Quick Stats Card */}
            <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl shadow-sm p-6 text-white">
              <h3 className="font-medium mb-4 flex items-center gap-2">
                <TrendingUp className="w-5 h-5" /> Quick Stats
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white bg-opacity-20 rounded-lg p-3">
                  <div className="text-2xl font-bold">{requests.filter(r => r.status === 'approved').length}</div>
                  <div className="text-xs opacity-80">Approved Requests</div>
                </div>
                <div className="bg-white bg-opacity-20 rounded-lg p-3">
                  <div className="text-2xl font-bold">{requests.filter(r => r.status === 'to_approve').length}</div>
                  <div className="text-xs opacity-80">Pending Requests</div>
                </div>
              </div>
            </div>
          </div>

          {/* Main Content Area */}
          <div className={`lg:col-span-2 space-y-8 ${activeTab === 'request' || activeTab === 'history' ? 'block' : 'hidden lg:block'}`}>
            {/* Request Form */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-indigo-500" /> Request Time Off
              </h2>
              
              {error && (
                <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg flex items-center gap-2">
                  <AlertCircle className="w-5 h-5" />
                  {error}
                </div>
              )}
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Time Off Type</label>
                  <select
                    value={form.typeId}
                    onChange={(e) => {
                      setForm({ ...form, typeId: e.target.value });
                      setError("");
                    }}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    required
                  >
                    <option value="">Select Type</option>
                    {types.map((t) => {
                      const allocation = balance.find(b => b.type?._id === t._id);
                      const hasAllocation = allocation && allocation.remaining > 0;
                      
                      return (
                        <option 
                          key={t._id} 
                          value={t._id}
                          disabled={!hasAllocation}
                          className={!hasAllocation ? "text-gray-400" : ""}
                        >
                          {t.name} {!hasAllocation && "(No allocation)"}
                        </option>
                      );
                    })}
                  </select>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                    <input
                      type="date"
                      value={form.startDate}
                      onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                    <input
                      type="date"
                      value={form.endDate}
                      onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      required
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Reason</label>
                  <textarea
                    placeholder="Provide a reason for your time off request..."
                    value={form.reason}
                    onChange={(e) => setForm({ ...form, reason: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    rows={3}
                  />
                </div>
                
                <button
                  type="submit"
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2.5 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                  disabled={loading || !hasAllocationForType(form.typeId)}
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    "Submit Request"
                  )}
                </button>
                
                {!hasAllocationForType(form.typeId) && form.typeId && (
                  <p className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">
                    You don't have any remaining time off for this type.
                  </p>
                )}
              </form>
            </div>

            {/* Requests History */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Request History</h2>
              
              {requests.length === 0 ? (
                <div className="text-center py-8">
                  <Clock className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">No requests yet.</p>
                </div>
              ) : (
                <div className="overflow-hidden">
                  <div className="hidden md:grid grid-cols-1 gap-4">
                    {requests.map((r) => (
                      <div key={r._id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                        <div className="flex justify-between items-start mb-2">
                          <h3 className="font-medium text-gray-900">{r.type?.name}</h3>
                          <span
                            className={`px-3 py-1 text-xs font-medium rounded-full ${statusColor(r.status)}`}
                          >
                            {r.status.charAt(0).toUpperCase() + r.status.slice(1)}
                          </span>
                        </div>
                        
                        <div className="text-sm text-gray-600 mb-3">
                          {new Date(r.startDate).toLocaleDateString()} → {new Date(r.endDate).toLocaleDateString()}
                        </div>
                        
                        {r.reason && (
                          <div className="text-sm text-gray-700 bg-gray-50 p-3 rounded-lg">
                            {r.reason}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                  
                  {/* Mobile table view */}
                  <div className="md:hidden overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="bg-gray-50 text-left text-xs text-gray-500 uppercase">
                          <th className="p-3 font-medium">Type</th>
                          <th className="p-3 font-medium">Dates</th>
                          <th className="p-3 font-medium">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {requests.map((r) => (
                          <tr key={r._id} className="hover:bg-gray-50">
                            <td className="p-3 text-sm font-medium text-gray-900">{r.type?.name}</td>
                            <td className="p-3 text-sm text-gray-600">
                              {new Date(r.startDate).toLocaleDateString()} →{" "}
                              {new Date(r.endDate).toLocaleDateString()}
                            </td>
                            <td className="p-3">
                              <span
                                className={`px-2 py-1 text-xs font-medium rounded-full ${statusColor(r.status)}`}
                              >
                                {r.status.charAt(0).toUpperCase() + r.status.slice(1)}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}