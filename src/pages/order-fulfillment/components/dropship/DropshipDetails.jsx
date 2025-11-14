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
import DropshipItemsDisplay from "./DropshipItemsDisplay";
import AuditLogsCard from "../common/AuditLogsCard";
import DropshipInfoCard from "./DropshipInfoCard";
import StatusUpdateModal from "./StatusUpdateModal";
import MarketplaceOrderModal from "./MarketplaceOrderModal";
import ItemFulfillmentModal from "./ItemFulfillmentModal";
import OrderDetailsSkeleton from "../common/OrderDetailsSkeleton";
import { getDropshipOrderDetails, updateDropshipStatus, createMarketplaceOrder, fulfillDropshipItem, getPackingOrderDetails } from "../../../../api/fulfillment";
import Swal from "sweetalert2";

export default function DropshipDetails() {
  const navigate = useNavigate();
  const { dropshipId } = useParams();
  const [loading, setLoading] = useState(true);
  const [dropshipData, setDropshipData] = useState(null);
  const [error, setError] = useState(null);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showMarketplaceModal, setShowMarketplaceModal] = useState(false);
  const [showFulfillmentModal, setShowFulfillmentModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [statusForm, setStatusForm] = useState({
    status: "",
    marketplaceName: "",
    marketplaceOrderNumber: "",
    notes: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [fulfillingItem, setFulfillingItem] = useState(false);

  useEffect(() => {
    // Scroll to top on mount
    window.scrollTo({ top: 0, behavior: "smooth" });
    
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

        // Handle 404 error - dropship order was deleted (all items fulfilled)
        if (error.response?.status === 404 || error.status === 404 || error.code === "DROPSHIP_NOT_FOUND") {
          Swal.fire({
            icon: "info",
            title: "Order Completed",
            text: "This dropship order has been completed and removed. All items have been fulfilled.",
            confirmButtonColor: "#2563eb",
            confirmButtonText: "OK",
          }).then(() => {
            navigate("/fulfillment/dropship");
          });
        } else {
          Swal.fire({
            icon: "error",
            title: "Failed to Load",
            text: error.message || "Unable to fetch dropship details. Please try again.",
            confirmButtonColor: "#2563eb",
            confirmButtonText: "OK",
          }).then(() => {
            navigate("/fulfillment/dropship");
          });
        }
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

  const handleFulfillItemClick = (item) => {
    if (item.fulfillmentStatus === "Fulfilled") {
      return; // Don't open modal for already fulfilled items
    }
    setSelectedItem(item);
    setShowFulfillmentModal(true);
  };

  const handleFulfillItem = async (fulfillmentData) => {
    if (!selectedItem || !dropshipId) return;

    setFulfillingItem(true);

    try {
      const result = await fulfillDropshipItem(dropshipId, selectedItem.id, fulfillmentData);

      if (result.success) {
        const packingOrderNumber = result.data.packingOrderNumber || result.data.packingId;
        const originalOrderNumber = dropshipData?.originalOrderNumber;
        const originalPackingId = dropshipData?.packingOrders?.[0]?.packingId;
        const dropshipDeleted = result.data.dropshipDeleted === true;
        const dropshipStatus = result.data.dropshipStatus;

        // Check if dropship was deleted (all items fulfilled)
        if (dropshipDeleted) {
          // Show success message with details
          await Swal.fire({
            icon: "success",
            title: "All Items Fulfilled!",
            html: `
              <p>${result.data.message || "All items have been fulfilled successfully."}</p>
              <p class="mt-2 text-sm text-gray-600">
                Packing Order: <strong>${packingOrderNumber}</strong>
              </p>
              <p class="mt-2 text-xs text-gray-500">
                The dropship order has been removed and the packing order has been updated.
              </p>
            `,
            confirmButtonColor: "#2563eb",
            confirmButtonText: "OK",
          });

          // Refresh packing order details if it exists
          if (originalPackingId) {
            try {
              await getPackingOrderDetails(originalPackingId);
              console.log("Packing order refreshed after dropship fulfillment");
            } catch (packingError) {
              console.warn("Failed to refresh packing order:", packingError);
              // Non-critical error, don't show to user
            }
          }

          // Redirect to dropship list since order is deleted
          navigate("/fulfillment/dropship");
          return;
        }

        // Show success message for partial fulfillment
        await Swal.fire({
          icon: "success",
          title: "Item Fulfilled",
          html: `
            <p>The item has been fulfilled successfully.</p>
            <p class="mt-2 text-sm text-gray-600">
              Packing Order: <strong>${packingOrderNumber}</strong>
            </p>
            ${dropshipStatus === "Partially Fulfilled" ? '<p class="mt-2 text-xs text-gray-500">Some items are still pending fulfillment.</p>' : ''}
          `,
          confirmButtonColor: "#2563eb",
          confirmButtonText: "OK",
        });

        // Try to reload dropship details to get updated data
        try {
          const updatedResult = await getDropshipOrderDetails(dropshipId);
          if (updatedResult.success && updatedResult.data) {
            setDropshipData(updatedResult.data);
          }
        } catch (reloadError) {
          // If 404, dropship order was deleted (shouldn't happen here, but handle gracefully)
          if (reloadError.response?.status === 404 || reloadError.status === 404 || reloadError.code === "DROPSHIP_NOT_FOUND") {
            await Swal.fire({
              icon: "info",
              title: "Order Completed",
              text: "This dropship order has been completed and removed.",
              confirmButtonColor: "#2563eb",
              confirmButtonText: "OK",
            });
            navigate("/fulfillment/dropship");
            return;
          }
          console.warn("Failed to reload dropship details:", reloadError);
        }

        // If packing order was updated (not created new), refresh packing order details
        // Check if packingOrderNumber matches originalOrderNumber (indicates update, not new creation)
        if (packingOrderNumber === originalOrderNumber && originalPackingId) {
          try {
            // Refresh packing order details in the background
            await getPackingOrderDetails(originalPackingId);
            console.log("Packing order refreshed after dropship fulfillment");
          } catch (packingError) {
            console.warn("Failed to refresh packing order:", packingError);
            // Non-critical error, don't show to user
          }
        }

        setShowFulfillmentModal(false);
        setSelectedItem(null);
      }
    } catch (error) {
      console.error("Error fulfilling item:", error);
      Swal.fire({
        icon: "error",
        title: "Failed to Fulfill Item",
        text: error.message || "Unable to fulfill item. Please try again.",
        confirmButtonColor: "#2563eb",
        confirmButtonText: "OK",
      });
    } finally {
      setFulfillingItem(false);
    }
  };

  if (error || (!loading && !dropshipData)) {
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

        {dropshipData && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6"
          >
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
                  {dropshipData.dropshipId || "N/A"}
                </h1>
                <p className="text-sm sm:text-base text-gray-600">Original Order: {dropshipData.originalOrderNumber || "N/A"}</p>
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
        )}

        {loading ? (
          <OrderDetailsSkeleton />
        ) : dropshipData ? (
          <>
            {/* Mobile-first: Order Items on top, other info below */}
            <div className="flex flex-col lg:flex-col-reverse gap-6 mb-6">
          {/* Order Items - First on mobile, last on desktop */}
          <div className="order-1 lg:order-2">
            <DropshipItemsDisplay
              items={dropshipData.deselectedItems || []}
              currency={dropshipData.currency}
              title="Dropship Items"
              dropshipId={dropshipData.dropshipId}
              onFulfillClick={handleFulfillItemClick}
              fulfilledItemsCount={dropshipData.fulfilledItemsCount || 0}
              remainingItemsCount={dropshipData.remainingItemsCount || dropshipData.deselectedItems?.length || 0}
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
                fulfilledItemsCount={dropshipData.fulfilledItemsCount || 0}
                remainingItemsCount={dropshipData.remainingItemsCount || dropshipData.deselectedItems?.length || 0}
                createdAt={dropshipData.createdAt}
                marketplaceName={dropshipData.marketplaceName}
                marketplaceOrderNumber={dropshipData.marketplaceOrderNumber}
              />
              <CustomerInfoCard
                customerName={dropshipData.customerName || dropshipData.shipTo?.name}
                customerEmail={dropshipData.customerEmail || dropshipData.shipTo?.email}
                phone={dropshipData.phone || dropshipData.shipTo?.phone}
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

            {/* Packing Orders Section */}
            {dropshipData.packingOrders && dropshipData.packingOrders.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-xl border-2 border-gray-200 shadow-lg p-6"
              >
                <div className="flex items-center gap-2 mb-4">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Package className="w-5 h-5 text-blue-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">Linked Packing Orders</h3>
                </div>
                <div className="space-y-3">
                  {dropshipData.packingOrders.map((packingOrder) => (
                    <div
                      key={packingOrder.packingId}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors cursor-pointer"
                      onClick={() => navigate(`/fulfillment/packing/${packingOrder.packingId}`)}
                    >
                      <div>
                        <p className="text-sm font-semibold text-gray-900">
                          {packingOrder.packingOrderNumber || packingOrder.packingId}
                        </p>
                        <p className="text-xs text-gray-500">
                          {packingOrder.itemsCount} item{packingOrder.itemsCount !== 1 ? "s" : ""} •{" "}
                          {packingOrder.createdAt
                            ? new Date(packingOrder.createdAt).toLocaleDateString()
                            : "N/A"}
                        </p>
                      </div>
                      <StatusBadge status={packingOrder.status} />
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </>
        ) : null}

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

        {/* Item Fulfillment Modal */}
        {selectedItem && (
          <ItemFulfillmentModal
            open={showFulfillmentModal}
            onCancel={() => {
              setShowFulfillmentModal(false);
              setSelectedItem(null);
            }}
            item={selectedItem}
            onSubmit={handleFulfillItem}
            submitting={fulfillingItem}
          />
        )}
      </div>
    </div>
  );
}