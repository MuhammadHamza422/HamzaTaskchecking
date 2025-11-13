import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Loader2, Package, MapPin, DollarSign, Clock, CheckCircle, X, ShoppingCart, Edit } from "lucide-react";
import { motion } from "framer-motion";
import { Button, Input, Select, Modal } from "antd";
import StatusBadge from "../common/StatusBadge";
import PlatformBadge from "../common/PlatformBadge";
import FulfillmentBreadcrumb from "../common/FulfillmentBreadcrumb";
import { getDropshipOrderDetails, updateDropshipStatus, createMarketplaceOrder } from "../../../../api/fulfillment";
import Swal from "sweetalert2";
import dayjs from "dayjs";

export default function DropshipDetails() {
  const navigate = useNavigate();
  const { dropshipId } = useParams();
  const [loading, setLoading] = useState(true);
  const [dropshipData, setDropshipData] = useState(null);
  const [error, setError] = useState(null);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showMarketplaceModal, setShowMarketplaceModal] = useState(false);
  const [statusForm, setStatusForm] = useState({
    status: "",
    marketplaceName: "",
    marketplaceOrderNumber: "",
    notes: "",
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const loadDropshipDetails = async () => {
      if (!dropshipId) return;

      setLoading(true);
      setError(null);

      try {
        const result = await getDropshipOrderDetails(dropshipId);

        if (result.success && result.data) {
          setDropshipData(result.data);
          setStatusForm({
            status: result.data.status || "",
            marketplaceName: result.data.marketplaceName || "",
            marketplaceOrderNumber: result.data.marketplaceOrderNumber || "",
            notes: "",
          });
        } else {
          throw new Error("Failed to load dropship details");
        }
      } catch (error) {
        console.error("Error loading dropship details:", error);
        setError(error.message || "Failed to load dropship details");

        Swal.fire({
          icon: "error",
          title: "Failed to Load",
          text: error.message || "Unable to fetch dropship details. Please try again.",
          confirmButtonColor: "#2563eb",
          confirmButtonText: "OK",
        }).then(() => {
          navigate("/fulfillment/dropship");
        });
      } finally {
        setLoading(false);
      }
    };

    loadDropshipDetails();
  }, [dropshipId, navigate]);

  const handleUpdateStatus = async () => {
    if (!statusForm.status) {
      Swal.fire({
        icon: "warning",
        title: "Status Required",
        text: "Please select a status.",
        confirmButtonColor: "#2563eb",
        confirmButtonText: "OK",
      });
      return;
    }

    setSubmitting(true);

    try {
      const result = await updateDropshipStatus(dropshipId, {
        status: statusForm.status,
        marketplaceName: statusForm.marketplaceName || null,
        marketplaceOrderNumber: statusForm.marketplaceOrderNumber || null,
        notes: statusForm.notes || null,
      });

      if (result.success) {
        await Swal.fire({
          icon: "success",
          title: "Status Updated",
          text: `Dropship order status updated to ${statusForm.status}`,
          confirmButtonColor: "#2563eb",
          confirmButtonText: "OK",
        });

        setDropshipData((prev) => ({
          ...prev,
          ...result.data,
        }));
        setShowStatusModal(false);
      }
    } catch (error) {
      console.error("Error updating status:", error);
      Swal.fire({
        icon: "error",
        title: "Update Failed",
        text: error.message || "Failed to update status. Please try again.",
        confirmButtonColor: "#2563eb",
        confirmButtonText: "OK",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateMarketplaceOrder = async () => {
    if (!statusForm.marketplaceName || !statusForm.marketplaceOrderNumber) {
      Swal.fire({
        icon: "warning",
        title: "Required Fields",
        text: "Please provide marketplace name and order number.",
        confirmButtonColor: "#2563eb",
        confirmButtonText: "OK",
      });
      return;
    }

    setSubmitting(true);

    try {
      const result = await createMarketplaceOrder(dropshipId, {
        marketplaceName: statusForm.marketplaceName,
        marketplaceOrderNumber: statusForm.marketplaceOrderNumber,
        notes: statusForm.notes || null,
      });

      if (result.success) {
        await Swal.fire({
          icon: "success",
          title: "Marketplace Order Created",
          text: `Marketplace order ${statusForm.marketplaceOrderNumber} created successfully. Status updated to Fulfilled.`,
          confirmButtonColor: "#2563eb",
          confirmButtonText: "OK",
        });

        setDropshipData((prev) => ({
          ...prev,
          ...result.data,
        }));
        setShowMarketplaceModal(false);
      }
    } catch (error) {
      console.error("Error creating marketplace order:", error);
      Swal.fire({
        icon: "error",
        title: "Creation Failed",
        text: error.message || "Failed to create marketplace order. Please try again.",
        confirmButtonColor: "#2563eb",
        confirmButtonText: "OK",
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-purple-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600 font-medium">Loading dropship details...</p>
        </div>
      </div>
    );
  }

  if (error || !dropshipData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <p className="text-red-600 font-medium mb-4">{error || "Details not found"}</p>
            <button
              onClick={() => navigate("/fulfillment/dropship")}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              Back to Dropship List
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      <div className="max-w-[1550px] mx-auto px-4 sm:px-6 py-8">
        <FulfillmentBreadcrumb />

        <motion.button
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          onClick={() => navigate("/fulfillment/dropship")}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-gray-700 to-gray-800 text-white rounded-lg hover:from-gray-800 hover:to-gray-900 transition-all duration-300 mb-6 text-sm font-medium shadow-md"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Back to Dropship List</span>
        </motion.button>

        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Dropship Order: {dropshipData.dropshipId}
              </h1>
              <p className="text-gray-600">Original Order: {dropshipData.originalOrderNumber}</p>
            </div>
            <div className="flex items-center gap-3">
              <StatusBadge status={dropshipData.status} />
              {dropshipData.status === "Unfulfilled" && (
                <>
                  <Button
                    icon={<Edit className="w-4 h-4" />}
                    onClick={() => setShowStatusModal(true)}
                    className="h-10"
                  >
                    Update Status
                  </Button>
                  <Button
                    type="primary"
                    icon={<ShoppingCart className="w-4 h-4" />}
                    onClick={() => setShowMarketplaceModal(true)}
                    className="h-10"
                  >
                    Create Marketplace Order
                  </Button>
                </>
              )}
            </div>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-gradient-to-br from-white to-purple-50 rounded-xl border-2 border-purple-100 shadow-lg p-6"
          >
            <div className="flex items-center gap-2 mb-4">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Package className="w-5 h-5 text-purple-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Dropship Information</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-xs font-medium text-gray-500 mb-1">Dropship ID</p>
                <p className="text-sm font-semibold text-gray-900">{dropshipData.dropshipId}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 mb-1">Original Order</p>
                <p className="text-sm font-semibold text-gray-900">{dropshipData.originalOrderNumber}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 mb-1">Platform</p>
                <PlatformBadge
                  platform={dropshipData.platform ? dropshipData.platform.charAt(0).toUpperCase() + dropshipData.platform.slice(1) : dropshipData.platform}
                />
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 mb-1">Status</p>
                <StatusBadge status={dropshipData.status} />
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 mb-1">Deselected Items</p>
                <p className="text-sm font-semibold text-gray-900">
                  {dropshipData.deselectedItems?.length || 0}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 mb-1">Created At</p>
                <p className="text-sm font-semibold text-gray-900">
                  {dropshipData.createdAt ? dayjs(dropshipData.createdAt).format("MMM DD, YYYY HH:mm") : "N/A"}
                </p>
              </div>
              {dropshipData.marketplaceName && (
                <div>
                  <p className="text-xs font-medium text-gray-500 mb-1">Marketplace</p>
                  <p className="text-sm font-semibold text-gray-900">{dropshipData.marketplaceName}</p>
                </div>
              )}
              {dropshipData.marketplaceOrderNumber && (
                <div>
                  <p className="text-xs font-medium text-gray-500 mb-1">Marketplace Order</p>
                  <p className="text-sm font-semibold text-gray-900">{dropshipData.marketplaceOrderNumber}</p>
                </div>
              )}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-gradient-to-br from-white to-green-50 rounded-xl border-2 border-green-100 shadow-lg p-6"
          >
            <div className="flex items-center gap-2 mb-4">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Customer Information</h3>
            </div>
            <div className="space-y-3">
              <div>
                <p className="text-xs font-medium text-gray-500 mb-1">Name</p>
                <p className="text-sm font-semibold text-gray-900">{dropshipData.customerName || "N/A"}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 mb-1">Email</p>
                <p className="text-sm text-gray-900">{dropshipData.customerEmail || "N/A"}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 mb-1">Phone</p>
                <p className="text-sm text-gray-900">{dropshipData.phone || "N/A"}</p>
              </div>
            </div>
          </motion.div>
        </div>

        {dropshipData.shipTo && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-gradient-to-br from-white to-blue-50 rounded-xl border-2 border-blue-100 shadow-lg p-6 mb-6"
          >
            <div className="flex items-center gap-2 mb-4">
              <div className="p-2 bg-blue-100 rounded-lg">
                <MapPin className="w-5 h-5 text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Shipping Address</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-xs font-medium text-gray-500 mb-1">Name</p>
                <p className="text-sm font-semibold text-gray-900">{dropshipData.shipTo.name || "N/A"}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 mb-1">Phone</p>
                <p className="text-sm text-gray-900">{dropshipData.shipTo.phone || "N/A"}</p>
              </div>
              <div className="md:col-span-2">
                <p className="text-xs font-medium text-gray-500 mb-1">Address</p>
                <p className="text-sm text-gray-900">
                  {dropshipData.shipTo.address1 || ""}
                  {dropshipData.shipTo.address2 ? `, ${dropshipData.shipTo.address2}` : ""}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 mb-1">City, State, ZIP</p>
                <p className="text-sm text-gray-900">
                  {dropshipData.shipTo.city}, {dropshipData.shipTo.state} {dropshipData.shipTo.zip}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 mb-1">Country</p>
                <p className="text-sm text-gray-900">{dropshipData.shipTo.country || "N/A"}</p>
              </div>
            </div>
          </motion.div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-gradient-to-br from-white to-emerald-50 rounded-xl border-2 border-emerald-100 shadow-lg p-6"
          >
            <div className="flex items-center gap-2 mb-4">
              <div className="p-2 bg-emerald-100 rounded-lg">
                <DollarSign className="w-5 h-5 text-emerald-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Order Financials</h3>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between">
                <p className="text-xs font-medium text-gray-500">Subtotal</p>
                <p className="text-sm font-semibold text-gray-900">
                  {dropshipData.currency || "USD"} {dropshipData.subtotal?.toFixed(2) || "0.00"}
                </p>
              </div>
              <div className="flex justify-between">
                <p className="text-xs font-medium text-gray-500">Tax</p>
                <p className="text-sm font-semibold text-gray-900">
                  {dropshipData.currency || "USD"} {dropshipData.tax?.toFixed(2) || "0.00"}
                </p>
              </div>
              <div className="flex justify-between">
                <p className="text-xs font-medium text-gray-500">Shipping</p>
                <p className="text-sm font-semibold text-gray-900">
                  {dropshipData.currency || "USD"} {dropshipData.shipping?.toFixed(2) || "0.00"}
                </p>
              </div>
              {dropshipData.discount > 0 && (
                <div className="flex justify-between">
                  <p className="text-xs font-medium text-gray-500">Discount</p>
                  <p className="text-sm font-semibold text-red-600">
                    -{dropshipData.currency || "USD"} {dropshipData.discount?.toFixed(2) || "0.00"}
                  </p>
                </div>
              )}
              <div className="flex justify-between pt-3 border-t border-gray-200">
                <p className="text-sm font-semibold text-gray-900">Total</p>
                <p className="text-base font-bold text-blue-600">
                  {dropshipData.currency || "USD"} {dropshipData.totalValue?.toFixed(2) || "0.00"}
                </p>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="bg-gradient-to-br from-white to-orange-50 rounded-xl border-2 border-orange-100 shadow-lg p-6"
          >
            <div className="flex items-center gap-2 mb-4">
              <div className="p-2 bg-orange-100 rounded-lg">
                <Clock className="w-5 h-5 text-orange-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Order Timeline</h3>
            </div>
            <div className="space-y-3">
              <div>
                <p className="text-xs font-medium text-gray-500 mb-1">Created At</p>
                <p className="text-sm text-gray-900">
                  {dropshipData.createdAt ? dayjs(dropshipData.createdAt).format("MMM DD, YYYY HH:mm") : "N/A"}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 mb-1">Updated At</p>
                <p className="text-sm text-gray-900">
                  {dropshipData.updatedAt ? dayjs(dropshipData.updatedAt).format("MMM DD, YYYY HH:mm") : "N/A"}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 mb-1">Created By</p>
                <p className="text-sm text-gray-900">
                  {dropshipData.createdBy?.name || "N/A"}
                </p>
              </div>
            </div>
          </motion.div>
        </div>

        {dropshipData.deselectedItems && dropshipData.deselectedItems.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="bg-white rounded-xl border-2 border-gray-200 shadow-lg p-6 mb-6"
          >
            <div className="flex items-center gap-2 mb-4">
              <div className="p-2 bg-indigo-100 rounded-lg">
                <Package className="w-5 h-5 text-indigo-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Deselected Items</h3>
            </div>
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Product
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      SKU
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Quantity
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Price
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Total
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {dropshipData.deselectedItems.map((item, index) => (
                    <tr key={item.id || index} className="hover:bg-gray-50">
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          {item.image && (
                            <div className="w-12 h-12 bg-gray-100 rounded border border-gray-200 flex items-center justify-center shrink-0">
                              <img
                                src={item.image}
                                alt={item.name}
                                className="w-full h-full object-cover rounded"
                              />
                            </div>
                          )}
                          <div>
                            <p className="text-sm font-medium text-gray-900">{item.name || "N/A"}</p>
                            {item.variant && <p className="text-xs text-gray-500">{item.variant}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <p className="text-sm text-gray-900">{item.sku || "N/A"}</p>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <p className="text-sm font-medium text-gray-900">{item.quantity || 0}</p>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <p className="text-sm text-gray-900">
                          {dropshipData.currency || "USD"} {item.price?.toFixed(2) || "0.00"}
                        </p>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <p className="text-sm font-semibold text-gray-900">
                          {dropshipData.currency || "USD"} {item.total?.toFixed(2) || "0.00"}
                        </p>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="md:hidden space-y-4">
              {dropshipData.deselectedItems.map((item, index) => (
                <motion.div
                  key={item.id || index}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="bg-white rounded-lg border-2 border-gray-200 p-4 shadow-sm"
                >
                  <div className="flex items-start gap-3 mb-3">
                    {item.image && (
                      <div className="w-16 h-16 bg-gray-100 rounded border border-gray-200 flex items-center justify-center shrink-0">
                        <img
                          src={item.image}
                          alt={item.name}
                          className="w-full h-full object-cover rounded"
                        />
                      </div>
                    )}
                    <div className="flex-1">
                      <h4 className="text-sm font-semibold text-gray-900 mb-1">{item.name || "N/A"}</h4>
                      {item.variant && <p className="text-xs text-gray-500 mb-2">{item.variant}</p>}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3 pt-3 border-t border-gray-100">
                    <div>
                      <p className="text-xs text-gray-500 mb-1">SKU</p>
                      <p className="text-sm font-semibold text-gray-900">{item.sku || "N/A"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Quantity</p>
                      <p className="text-sm font-semibold text-gray-900">{item.quantity || 0}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Price</p>
                      <p className="text-sm font-semibold text-gray-900">
                        {dropshipData.currency || "USD"} {item.price?.toFixed(2) || "0.00"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Total</p>
                      <p className="text-sm font-semibold text-blue-600">
                        {dropshipData.currency || "USD"} {item.total?.toFixed(2) || "0.00"}
                      </p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {dropshipData.auditLogs && dropshipData.auditLogs.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            className="bg-gradient-to-br from-white to-gray-50 rounded-xl border-2 border-gray-200 shadow-lg p-6 mb-6"
          >
            <div className="flex items-center gap-2 mb-4">
              <div className="p-2 bg-gray-100 rounded-lg">
                <Clock className="w-5 h-5 text-gray-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Audit Logs</h3>
            </div>
            <div className="space-y-3">
              {dropshipData.auditLogs.map((log, index) => (
                <div key={index} className="flex items-start gap-3 p-3 bg-white rounded-lg border border-gray-200">
                  <div className="w-2 h-2 rounded-full bg-purple-500 mt-2"></div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm font-semibold text-gray-900 capitalize">
                        {log.action.replace(/_/g, " ")}
                      </p>
                      <p className="text-xs text-gray-500">
                        {dayjs(log.timestamp).format("MMM DD, YYYY HH:mm")}
                      </p>
                    </div>
                    <p className="text-xs text-gray-600">
                      By: {log.performedBy?.name || "N/A"} ({log.performedBy?.email || "N/A"})
                    </p>
                    {log.details && Object.keys(log.details).length > 0 && (
                      <div className="mt-2 text-xs text-gray-500">
                        {JSON.stringify(log.details, null, 2)}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        <Modal
          title="Update Status"
          open={showStatusModal}
          onCancel={() => setShowStatusModal(false)}
          footer={null}
          width={600}
        >
          <div className="space-y-4 py-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
              <Select
                value={statusForm.status}
                onChange={(value) => setStatusForm((prev) => ({ ...prev, status: value }))}
                className="w-full"
                options={[
                  { label: "Unfulfilled", value: "Unfulfilled" },
                  { label: "Fulfilled", value: "Fulfilled" },
                  { label: "Cancelled", value: "Cancelled" },
                ]}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Marketplace Name (Optional)</label>
              <Input
                value={statusForm.marketplaceName}
                onChange={(e) => setStatusForm((prev) => ({ ...prev, marketplaceName: e.target.value }))}
                placeholder="e.g., Shopify, WooCommerce"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Marketplace Order Number (Optional)</label>
              <Input
                value={statusForm.marketplaceOrderNumber}
                onChange={(e) => setStatusForm((prev) => ({ ...prev, marketplaceOrderNumber: e.target.value }))}
                placeholder="e.g., SH-12345"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Notes (Optional)</label>
              <Input.TextArea
                value={statusForm.notes}
                onChange={(e) => setStatusForm((prev) => ({ ...prev, notes: e.target.value }))}
                placeholder="e.g., Order fulfilled via Shopify"
              />
            </div>
          </div>
        </Modal>
      </div>
    </div>
  );
}