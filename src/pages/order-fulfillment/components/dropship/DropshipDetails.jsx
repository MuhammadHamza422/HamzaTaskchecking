import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Loader2, Package, ShoppingCart, Edit } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "antd";
import StatusBadge from "../common/StatusBadge";
import PlatformBadge from "../common/PlatformBadge";
import FulfillmentBreadcrumb from "../common/FulfillmentBreadcrumb";
import CustomerInfoCard from "../common/CustomerInfoCard";
import ShippingAddressCard from "../common/ShippingAddressCard";
import OrderFinancialsCard from "../common/OrderFinancialsCard";
import OrderTimelineCard from "../common/OrderTimelineCard";
import OrderItemsDisplay from "../common/OrderItemsDisplay";
import AuditLogsCard from "../common/AuditLogsCard";
import DropshipInfoCard from "./DropshipInfoCard";
import StatusUpdateModal from "./StatusUpdateModal";
import MarketplaceOrderModal from "./MarketplaceOrderModal";
import { getDropshipOrderDetails, updateDropshipStatus, createMarketplaceOrder } from "../../../../api/fulfillment";
import Swal from "sweetalert2";

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
      <div className="max-w-[1550px] mx-auto px-2 sm:px-4 md:px-6 py-4 sm:py-6 md:py-8">
        <FulfillmentBreadcrumb />

        <motion.button
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          onClick={() => navigate("/fulfillment/dropship")}
          className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-gradient-to-r from-gray-700 to-gray-800 text-white rounded-lg hover:from-gray-800 hover:to-gray-900 transition-all duration-300 mb-4 sm:mb-6 text-xs sm:text-sm font-medium shadow-md"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
          <span className="hidden sm:inline">Back to Dropship List</span>
          <span className="sm:hidden">Back</span>
        </motion.button>

        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
                {dropshipData.dropshipId}
              </h1>
              <p className="text-sm sm:text-base text-gray-600">Original Order: {dropshipData.originalOrderNumber}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <StatusBadge status={dropshipData.status} />
              {dropshipData.status === "Unfulfilled" && (
                <>
                  <Button
                    icon={<Edit className="w-4 h-4" />}
                    onClick={() => setShowStatusModal(true)}
                    className="h-9 sm:h-10 text-xs sm:text-sm"
                    size="small"
                  >
                    <span className="hidden sm:inline">Update Status</span>
                    <span className="sm:hidden">Update</span>
                  </Button>
                  <Button
                    type="primary"
                    icon={<ShoppingCart className="w-4 h-4" />}
                    onClick={() => setShowMarketplaceModal(true)}
                    className="h-9 sm:h-10 text-xs sm:text-sm"
                    size="small"
                  >
                    <span className="hidden sm:inline">Create Marketplace Order</span>
                    <span className="sm:hidden">Create Order</span>
                  </Button>
                </>
              )}
            </div>
          </div>
        </motion.div>

        {/* Mobile-first: Order Items on top, other info below */}
        <div className="flex flex-col lg:flex-col-reverse gap-6 mb-6">
          {/* Order Items - First on mobile, last on desktop */}
          <div className="order-1 lg:order-2">
            <OrderItemsDisplay
              items={dropshipData.deselectedItems}
              currency={dropshipData.currency}
              showStatus={false}
              title="Out of Stock Items"
            />
          </div>

          {/* Other Info Sections - Second on mobile, first on desktop */}
          <div className="order-2 lg:order-1 space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <DropshipInfoCard
                dropshipId={dropshipData.dropshipId}
                originalOrderNumber={dropshipData.originalOrderNumber}
                platform={dropshipData.platform}
                status={dropshipData.status}
                deselectedItemsCount={dropshipData.deselectedItems?.length || 0}
                createdAt={dropshipData.createdAt}
                marketplaceName={dropshipData.marketplaceName}
                marketplaceOrderNumber={dropshipData.marketplaceOrderNumber}
              />
              <CustomerInfoCard
                customerName={dropshipData.customerName}
                customerEmail={dropshipData.customerEmail}
                phone={dropshipData.phone}
              />
            </div>

            <ShippingAddressCard shipTo={dropshipData.shipTo} />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <OrderFinancialsCard
                currency={dropshipData.currency}
                subtotal={dropshipData.subtotal}
                tax={dropshipData.tax}
                shipping={dropshipData.shipping}
                discount={dropshipData.discount}
                totalValue={dropshipData.totalValue}
              />
              <OrderTimelineCard
                createdAt={dropshipData.createdAt}
                updatedAt={dropshipData.updatedAt}
                createdBy={dropshipData.createdBy}
              />
            </div>
          </div>
        </div>

        <AuditLogsCard auditLogs={dropshipData.auditLogs} />

        <StatusUpdateModal
          open={showStatusModal}
          onCancel={() => setShowStatusModal(false)}
          statusForm={statusForm}
          setStatusForm={setStatusForm}
          onSubmit={handleUpdateStatus}
          submitting={submitting}
        />

        <MarketplaceOrderModal
          open={showMarketplaceModal}
          onCancel={() => setShowMarketplaceModal(false)}
          statusForm={statusForm}
          setStatusForm={setStatusForm}
          onSubmit={handleCreateMarketplaceOrder}
          submitting={submitting}
        />
      </div>
    </div>
  );
}