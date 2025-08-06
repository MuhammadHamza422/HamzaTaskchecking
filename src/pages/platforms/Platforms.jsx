"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Edit, Eye, X, Calendar, Hash, Tag } from "lucide-react";
import apiClient from "../../api/client";
import Swal from "sweetalert2";
import { Spin } from "antd";

export default function PlatformsPage() {
  const [platforms, setPlatforms] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState("add"); // 'add', 'edit', 'view'
  const [selectedPlatform, setSelectedPlatform] = useState(null);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [formData, setFormData] = useState({
    plt_id: "",
    plt_name: "",
    plt_prefix: "",
  });

  // Fetch platforms from API
  const fetchPlatforms = async () => {
    try {
      setFetching(true);
      const response = await apiClient.get("/api/v1/plateforms/all");
      if (response.data.success) {
        // Sort platforms in ascending order by plt_id
        const sortedPlatforms = response.data.platforms.sort((a, b) => {
          const idA = parseInt(a.plt_id);
          const idB = parseInt(b.plt_id);
          return idA - idB;
        });
        setPlatforms(sortedPlatforms);
      } else {
        throw new Error(response.data.message || "Failed to fetch platforms");
      }
    } catch (error) {
      console.error("Error fetching platforms:", error);
      Swal.fire({
        icon: "error",
        title: "Failed to fetch platforms",
        text: error.response?.data?.message || error.message || "An error occurred while fetching platforms",
        toast: true,
        position: "top-end",
        showConfirmButton: false,
        timer: 4000,
        timerProgressBar: true,
        background: "#ef4444",
        color: "#fff",
        customClass: {
          popup: "rounded-lg",
        },
      });
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => {
    fetchPlatforms();
  }, []);

  const openModal = (mode, platform = null) => {
    setModalMode(mode);
    setSelectedPlatform(platform);
    if (mode === "add") {
      setFormData({ plt_id: "", plt_name: "", plt_prefix: "" });
    } else if (platform) {
      setFormData({
        plt_id: platform.plt_id,
        plt_name: platform.plt_name,
        plt_prefix: platform.plt_prefix,
      });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedPlatform(null);
    setFormData({ plt_id: "", plt_name: "", plt_prefix: "" });
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (modalMode === "add") {
        // Add new platform
        const response = await apiClient.post("/api/v1/plateforms/add", formData);
        
        if (response.data.success) {
          Swal.fire({
            icon: "success",
            title: "Platform Added",
            text: "Platform has been added successfully!",
            toast: true,
            position: "top-end",
            showConfirmButton: false,
            timer: 3000,
            timerProgressBar: true,
            background: "#10b981",
            color: "#fff",
            customClass: {
              popup: "rounded-lg",
            },
          });
          
          // Refresh the platforms list
          await fetchPlatforms();
        } else {
          throw new Error(response.data.message || "Failed to add platform");
        }
      } else if (modalMode === "edit") {
        // Update existing platform
        const response = await apiClient.patch(`/api/v1/plateforms/update/${selectedPlatform._id}`, formData);
        
        if (response.data.success) {
          Swal.fire({
            icon: "success",
            title: "Platform Updated",
            text: "Platform has been updated successfully!",
            toast: true,
            position: "top-end",
            showConfirmButton: false,
            timer: 3000,
            timerProgressBar: true,
            background: "#10b981",
            color: "#fff",
            customClass: {
              popup: "rounded-lg",
            },
          });
          
          // Refresh the platforms list
          await fetchPlatforms();
        } else {
          throw new Error(response.data.message || "Failed to update platform");
        }
      }
    } catch (error) {
      console.error("Error saving platform:", error);
      Swal.fire({
        icon: "error",
        title: "Failed to save platform",
        text: error.response?.data?.message || error.message || "An error occurred while saving the platform",
        toast: true,
        position: "top-end",
        showConfirmButton: false,
        timer: 4000,
        timerProgressBar: true,
        background: "#ef4444",
        color: "#fff",
        customClass: {
          popup: "rounded-lg",
        },
      });
    } finally {
      setLoading(false);
      closeModal();
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (fetching) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Spin size="large" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <div className="relative z-10 max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-black mb-2">
                Platform Management
              </h1>
              <p className="text-black text-sm sm:text-base">
                Manage your e-commerce platforms and integrations
              </p>
            </div>
            <motion.button
              onClick={() => openModal("add")}
              className="flex items-center gap-2 px-4 sm:px-6 py-3 bg-blue-500 text-white font-semibold rounded-xl transition-all duration-300 shadow-lg hover:shadow-blue-300/25 transform hover:scale-105 w-full sm:w-auto justify-center"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Plus className="w-5 h-5" />
              Add Platform
            </motion.button>
          </div>
        </motion.div>

        {/* Mobile Cards Layout */}
        <div className="block md:hidden space-y-4">
          {platforms.map((platform, index) => (
            <motion.div
              key={platform._id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="border border-blue-300/20 rounded-2xl p-6 shadow-lg"
            >
              {/* Card Header */}
              <div className="flex justify-between items-start mb-4">
                <p className="text-black font-mono text-lg font-semibold">
                  #{platform.plt_id}
                </p>
                <div className="flex gap-2">
                  {/* <button
                    onClick={() => openModal("view", platform)}
                    className="p-2 text-white hover:text-black hover:bg-black/10 rounded-lg transition-all duration-200"
                  >
                    <Eye className="w-4 h-4" />
                  </button> */}
                  <button
                    onClick={() => openModal("edit", platform)}
                    className="p-2 text-white bg-black hover:text-black hover:bg-black/10 rounded-lg transition-all duration-200"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Platform Name */}
              <div className="mb-3">
                <h3 className="text-black font-semibold text-lg mb-1">
                  {platform.plt_name}
                </h3>
                <div className="flex items-center gap-2">
                  <Tag className="w-4 h-4 text-black" />
                  <span className="px-3 py-1 bg-blue-300/20 text-black rounded-full text-sm font-medium">
                    {platform.plt_prefix}
                  </span>
                </div>
              </div>

              {/* Dates */}
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2 text-black">
                  <Calendar className="w-4 h-4" />
                  <span className="text-black">Created:</span>
                  <span>{formatDate(platform.createdAt)}</span>
                </div>
                <div className="flex items-center gap-2 text-black">
                  <Calendar className="w-4 h-4" />
                  <span className="text-black">Updated:</span>
                  <span>{formatDate(platform.updatedAt)}</span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Desktop Table Layout */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="hidden md:block border border-yellow-300/20 rounded-2xl overflow-hidden shadow-2xl"
        >
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b text-black">
                  <th className="text-left p-6 font-semibold">ID</th>
                  <th className="text-left p-6 font-semibold">Platform Name</th>
                  <th className="text-left p-6 font-semibold">Prefix</th>
                  <th className="text-left p-6 font-semibold">Created</th>
                  <th className="text-left p-6 font-semibold">Updated</th>
                  <th className="text-center p-6 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {platforms.map((platform, index) => (
                  <motion.tr
                    key={platform._id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="border-b border-yellow-300/10 transition-colors duration-200"
                  >
                    <td className="p-6">
                      <div className="flex items-center gap-2">
                        <Hash className="w-4 h-4 text-black" />
                        <span className="text-black font-mono">
                          {platform.plt_id}
                        </span>
                      </div>
                    </td>
                    <td className="p-6">
                      <div className="text-black font-medium">
                        {platform.plt_name}
                      </div>
                    </td>
                    <td className="p-6">
                      <div className="flex items-center gap-2">
                        <Tag className="w-4 h-4 text-black" />
                        <span className="px-3 py-1 bg-yellow-300/20 text-black rounded-full text-sm font-medium">
                          {platform.plt_prefix}
                        </span>
                      </div>
                    </td>
                    <td className="p-6">
                      <div className="flex items-center gap-2 text-black text-sm">
                        <Calendar className="w-4 h-4" />
                        {formatDate(platform.createdAt)}
                      </div>
                    </td>
                    <td className="p-6">
                      <div className="text-black text-sm">
                        {formatDate(platform.updatedAt)}
                      </div>
                    </td>
                    <td className="p-6">
                      <div className="flex justify-center gap-2">
                        {/* <button
                          onClick={() => openModal("view", platform)}
                          className="p-2 text-white hover:text-black hover:bg-black/10 rounded-lg transition-all duration-200"
                        >
                          <Eye className="w-4 h-4" />
                        </button> */}
                        <button
                          onClick={() => openModal("edit", platform)}
                          className="p-2 text-white bg-black hover:text-black hover:bg-black/10 rounded-lg transition-all duration-200"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>

        {/* Stats */}
        <p className="text-black text-sm mt-4 text-center">
          Total Platforms:{" "}
          <span className="text-black font-semibold">{platforms.length}</span>
        </p>
      </div>

      {/* Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-white/50 backdrop-blur-sm flex items-center justify-center p-4 z-[999]"
            onClick={closeModal}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white/30 backdrop-blur-xl border border-blue-300 max-h-[93vh] overflow-y-auto rounded-2xl p-8 w-full max-w-md shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-black">
                  {modalMode === "add"
                    ? "Add Platform"
                    : modalMode === "edit"
                    ? "Edit Platform"
                    : "Platform Details"}
                </h2>
                <button
                  onClick={closeModal}
                  className="p-2 text-white hover:text-black hover:bg-black/10 rounded-lg transition-all duration-200"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {modalMode === "view" ? (
                /* View Mode */
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-black mb-2">
                      Platform ID
                    </label>
                    <div className="p-3 bg-black/20 border border-blue-300/20 rounded-lg text-black">
                      {selectedPlatform?.plt_id}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-black mb-2">
                      Platform Name
                    </label>
                    <div className="p-3 bg-black/20 border border-blue-300/20 rounded-lg text-black">
                      {selectedPlatform?.plt_name}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-black mb-2">
                      Prefix
                    </label>
                    <div className="p-3 bg-black/20 border border-blue-300/20 rounded-lg text-black">
                      {selectedPlatform?.plt_prefix}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-black mb-2">
                      Created At
                    </label>
                    <div className="p-3 bg-black/20 border border-blue-300/20 rounded-lg text-black">
                      {formatDate(selectedPlatform?.createdAt)}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-black mb-2">
                      Updated At
                    </label>
                    <div className="p-3 bg-black/20 border border-blue-300/20 rounded-lg text-black">
                      {formatDate(selectedPlatform?.updatedAt)}
                    </div>
                  </div>
                </div>
              ) : (
                /* Add/Edit Form */
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-black mb-2">
                      Platform ID
                    </label>
                    <input
                      type="text"
                      name="plt_id"
                      value={formData.plt_id}
                      onChange={handleInputChange}
                      required
                      className="w-full px-4 py-3 border-2 border-blue-300/20 text-white rounded-xl transition-all hover:border-blue-300/40 focus:border-blue-300/60 outline-none duration-300"
                      placeholder="Enter platform id"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-black mb-2">
                      Platform Name
                    </label>
                    <input
                      type="text"
                      name="plt_name"
                      value={formData.plt_name}
                      onChange={handleInputChange}
                      required
                      className="w-full px-4 py-3 border-2 border-blue-300/20 text-white rounded-xl transition-all hover:border-blue-300/40 focus:border-blue-300/60 outline-none duration-300"
                      placeholder="Enter platform name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-black mb-2">
                      Platform Prefix
                    </label>
                    <input
                      type="text"
                      name="plt_prefix"
                      value={formData.plt_prefix}
                      onChange={handleInputChange}
                      required
                      maxLength="5"
                      className="w-full px-4 py-3 border-2 border-blue-300/20 text-white rounded-xl transition-all hover:border-blue-300/40 focus:border-blue-300/60 outline-none duration-300"
                      placeholder="Enter prefix (e.g., WLC)"
                    />
                  </div>
                  <div className="flex gap-4 pt-4">
                    <button
                      type="button"
                      onClick={closeModal}
                      className="flex-1 py-3 px-4 bg-black/30 border border-blue-300/20 text-black rounded-xl hover:bg-black/40 transition-all duration-300"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className={`flex-1 py-3 px-4 rounded-xl font-semibold transition-all duration-300 ${
                        loading
                          ? "bg-yellow-400/40 text-black/60 cursor-not-allowed"
                          : "bg-blue-500 text-white hover:bg-blue-600 shadow-lg hover:shadow-blue-300/25"
                      }`}
                    >
                      {loading ? (
                        <div className="flex items-center justify-center gap-2">
                          <div className="w-4 h-4 border-2 border-black/40 border-t-black rounded-full animate-spin" />
                          {modalMode === "add" ? "Adding..." : "Updating..."}
                        </div>
                      ) : modalMode === "add" ? (
                        "Add Platform"
                      ) : (
                        "Update Platform"
                      )}
                    </button>
                  </div>
                </form>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
