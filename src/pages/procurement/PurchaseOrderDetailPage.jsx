import React, { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  Card,
  Tabs,
  Button,
  Space,
  Tag,
  Row,
  Col,
  Descriptions,
  message,
  Popconfirm,
  Breadcrumb,
  Skeleton,
} from "antd";
import {
  ArrowLeft,
  Star,
  CheckCircle,
  FileText,
  Send,
  Lock,
  XCircle,
  AlertCircle,
  Package,
  Truck,
  FolderOpen,
  ArrowRight,
  Keyboard,
  Edit,
  Printer,
} from "lucide-react";
import {
  getPurchaseOrder,
  updatePurchaseOrderStatus,
  toggleFavorite,
  getShippingDetails,
} from "../../api/procurement";
import { useGlobalScanner } from "../../contexts/GlobalScannerContext";
import { useProcurementData } from "../../contexts/ProcurementDataContext";
import Swal from "sweetalert2";
import {
  PO_STATUS,
  PO_STATUS_LABELS,
  PO_STATUS_FLOW,
  PO_STATUS_TRANSITIONS,
} from "./constants/procurementConstants";
import StatusBadge from "./components/StatusBadge";
import ReceiptBadge from "./components/ReceiptBadge";
import ActivityLog from "./components/ActivityLog";
import OverviewTab from "./components/tabs/OverviewTab";
import ProductsTab from "./components/tabs/ProductsTab";
import PackingListTab from "./components/tabs/PackingListTab";
import DocumentsTab from "./components/tabs/DocumentsTab";
import ShippingReceiptTab from "./components/tabs/ShippingReceiptTab";
import { DetailPageFullSkeleton } from "./components/DetailPageSkeleton";
import PurchaseOrderReceiptModal from "./components/PurchaseOrderReceiptModal";

/**
 * Purchase Order Detail Page
 * Compact design with Ant Design components
 */
const PurchaseOrderDetailPage = () => {
  const { poId } = useParams();
  const navigate = useNavigate();
  const {
    isEnabled: scannerEnabled,
    setIsEnabled: setScannerEnabled,
    isProcessing: scannerProcessing,
  } = useGlobalScanner();
  const [purchaseOrder, setPurchaseOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingPO, setLoadingPO] = useState(false); // Separate loading state for PO data only
  const [activeTab, setActiveTab] = useState("overview");
  const [isFavorite, setIsFavorite] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [receiptModalVisible, setReceiptModalVisible] = useState(false);
  const [hasUnsavedProducts, setHasUnsavedProducts] = useState(false);
  const [shippingDetails, setShippingDetails] = useState(null);
  const productsTabValidateRef = React.useRef(null);
  
  // Use shared dropdown data from context
  const { vendors, companies, buyers } = useProcurementData();

  useEffect(() => {
    loadPurchaseOrder();
    loadShippingDetails();
  }, [poId]);

  const loadShippingDetails = async () => {
    try {
      const response = await getShippingDetails(poId);
      setShippingDetails(response?.data || null);
    } catch (error) {
      console.error("Failed to load shipping details:", error);
      setShippingDetails(null);
    }
  };

  // Load PO data only (for box updates) - doesn't affect other APIs
  const loadPurchaseOrderOnly = async () => {
    setLoadingPO(true);
    try {
      const data = await getPurchaseOrder(poId);
      setPurchaseOrder(data);
      setIsFavorite(data.isFavorite || false);
    } catch (error) {
      console.error("Failed to load purchase order:", error);
      // Don't set to null on error, keep existing data
    } finally {
      setLoadingPO(false);
    }
  };

  // Full page load (initial load)
  const loadPurchaseOrder = async () => {
    setLoading(true);
    try {
      const data = await getPurchaseOrder(poId);
      setPurchaseOrder(data);
      setIsFavorite(data.isFavorite || false);
    } catch (error) {
      console.error("Failed to load purchase order:", error);
      setPurchaseOrder(null);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleFavorite = async () => {
    setUpdatingStatus(true);
    try {
      const response = await toggleFavorite(poId);
      if (response.success) {
        setIsFavorite(response.data.isFavorite);
        setPurchaseOrder({
          ...purchaseOrder,
          isFavorite: response.data.isFavorite,
        });
        Swal.fire({
          icon: "success",
          title: response.data.isFavorite
            ? "Added to Favorites"
            : "Removed from Favorites",
          text: response.data.isFavorite
            ? "This purchase order has been marked as favorite"
            : "This purchase order has been removed from favorites",
          toast: true,
          position: "top-end",
          showConfirmButton: false,
          timer: 3000,
          timerProgressBar: true,
        });
      }
    } catch (error) {
      console.error("Failed to toggle favorite:", error);
      Swal.fire({
        icon: "error",
        title: "Failed to Update Favorite",
        text:
          error?.response?.data?.error?.message ||
          "Failed to update favorite status",
        toast: true,
        position: "top-end",
        showConfirmButton: false,
        timer: 4000,
        timerProgressBar: true,
      });
    } finally {
      setUpdatingStatus(false);
    }
  };

  // Enrich purchase order with names from IDs - memoized to avoid unnecessary recalculations
  const enrichedPO = useMemo(() => {
    if (!purchaseOrder || vendors.length === 0 || companies.length === 0 || buyers.length === 0) {
      return purchaseOrder;
    }

    const enriched = { ...purchaseOrder };

    // Enrich vendor
    if (purchaseOrder.vendor && (purchaseOrder.vendor.id || purchaseOrder.vendor._id)) {
      const vendorId = purchaseOrder.vendor.id || purchaseOrder.vendor._id;
      const vendor = vendors.find(
        (v) => v.id === vendorId || v._id === vendorId
      );
      if (vendor) {
        enriched.vendor = {
          ...purchaseOrder.vendor,
          name: vendor.name,
          email: vendor.email || purchaseOrder.vendor.email,
          phone: vendor.phone || purchaseOrder.vendor.phone,
          address: vendor.address || purchaseOrder.vendor.address,
        };
      }
    }

    // Enrich company
    if (purchaseOrder.company && (purchaseOrder.company.id || purchaseOrder.company._id)) {
      const companyId = purchaseOrder.company.id || purchaseOrder.company._id;
      const company = companies.find(
        (c) => c.id === companyId || c._id === companyId
      );
      if (company) {
        enriched.company = {
          ...purchaseOrder.company,
          name: company.name,
        };
      }
    }

    // Enrich buyer
    if (purchaseOrder.buyer && (purchaseOrder.buyer.id || purchaseOrder.buyer._id)) {
      const buyerId = purchaseOrder.buyer.id || purchaseOrder.buyer._id;
      const buyer = buyers.find((b) => b.id === buyerId || b._id === buyerId);
      if (buyer) {
        enriched.buyer = {
          ...purchaseOrder.buyer,
          name: buyer.name,
          email: buyer.email || purchaseOrder.buyer.email,
          avatar: buyer.avatar || purchaseOrder.buyer.avatar,
        };
      }
    }

    return enriched;
  }, [purchaseOrder, vendors, companies, buyers]);

  // Check if shipping details exist
  const hasShippingDetails = () => {
    if (!shippingDetails) return false;
    // At least one of these should be present
    return !!(
      shippingDetails.bookingDate ||
      shippingDetails.crd ||
      shippingDetails.trackingId ||
      shippingDetails.trackingLink
    );
  };

  // Handle status change
  const handleStatusChange = async (newStatus) => {
    // Validate shipping details when moving from confirmed to pickup_scheduled
    if (
      purchaseOrder?.status === PO_STATUS.CONFIRMED &&
      newStatus === PO_STATUS.PICKUP_SCHEDULED &&
      !hasShippingDetails()
    ) {
      message.warning(
        "Please add shipping details before scheduling pickup. Go to Shipping & Receipt tab to add details."
      );
      // Switch to shipping tab
      setActiveTab("shipping");
      return;
    }

    try {
      setUpdatingStatus(true);
      await updatePurchaseOrderStatus(poId, newStatus);
      message.success(
        `Status updated to ${
          PO_STATUS_LABELS[newStatus] || newStatus.replace("_", " ")
        }`
      );
      // Update local state instead of full refetch
      setPurchaseOrder((prev) => prev ? { ...prev, status: newStatus } : null);
      // Reload shipping details in case they were updated
      await loadShippingDetails();
    } catch (error) {
      console.error("Failed to update status:", error);
      message.error(
        error?.response?.data?.error?.message || "Failed to update status"
      );
    } finally {
      setUpdatingStatus(false);
    }
  };

  // Get allowed next statuses based on current status
  const getAllowedNextStatuses = (currentStatus) => {
    if (!currentStatus) return [];
    return PO_STATUS_TRANSITIONS[currentStatus] || [];
  };

  // Get next status in workflow (first allowed transition)
  const getNextStatus = (currentStatus) => {
    const allowed = getAllowedNextStatuses(currentStatus);
    // Return first allowed status (excluding cancelled)
    const nextStatus = allowed.find((status) => status !== PO_STATUS.CANCELLED);
    return nextStatus || null;
  };

  // Get status label for button
  const getStatusButtonLabel = (status) => {
    const labels = {
      [PO_STATUS.CONFIRMED]: "Confirm Order",
      [PO_STATUS.PICKUP_SCHEDULED]: "Schedule Pickup",
      [PO_STATUS.IN_TRANSIT]: "Mark as In Transit",
      [PO_STATUS.RECEIVED]: "Mark as Received",
      [PO_STATUS.CANCELLED]: "Cancel Order",
    };
    return (
      labels[status] || PO_STATUS_LABELS[status] || status.replace("_", " ")
    );
  };

  const po = enrichedPO;

  if (loading) {
    return <DetailPageFullSkeleton />;
  }

  if (!purchaseOrder) {
    return (
      <div className="p-4">
        <Card>
          <div className="text-center py-12">
            <AlertCircle
              className="text-5xl text-red-400 mb-4 mx-auto"
              size={48}
            />
            <h2 className="text-xl font-bold mb-2">Purchase Order Not Found</h2>
            <p className="text-gray-600 mb-6">
              The purchase order you're looking for doesn't exist.
            </p>
            <Button onClick={() => navigate("/procurement/orders")}>
              Back to Purchase Orders
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  const statusFlow = PO_STATUS_FLOW;
  const currentStatus = po?.status || PO_STATUS.DRAFT;
  const currentIndex = statusFlow.indexOf(currentStatus);
  const nextStatus = getNextStatus(currentStatus);
  const allowedNextStatuses = getAllowedNextStatuses(currentStatus);

  const tabItems = [
    {
      key: "overview",
      label: (
        <Space size={6}>
          <FileText size={16} />
          <span>Overview</span>
        </Space>
      ),
      children: loadingPO ? (
        <Card size="small">
          <Skeleton active paragraph={{ rows: 6 }} />
        </Card>
      ) : (
        <OverviewTab purchaseOrder={po} />
      ),
    },
    {
      key: "products",
      label: (
        <Space size={6}>
          <Package size={16} />
          <span>Products</span>
        </Space>
      ),
      children: loadingPO ? (
        <Card size="small">
          <Skeleton active paragraph={{ rows: 6 }} />
        </Card>
      ) : (
        <ProductsTab
          purchaseOrder={po}
          poId={poId}
          onReload={loadPurchaseOrderOnly}
          onValidate={productsTabValidateRef}
          onUnsavedChangesChange={setHasUnsavedProducts}
        />
      ),
    },
    {
      key: "packing",
      label: (
        <Space size={6}>
          <FileText size={16} />
          <span>Packing List</span>
        </Space>
      ),
      children: loadingPO ? (
        <Card size="small">
          <Skeleton active paragraph={{ rows: 6 }} />
        </Card>
      ) : (
        <PackingListTab
          purchaseOrder={po}
          poId={poId}
          onReload={loadPurchaseOrderOnly}
          onUnsavedChangesChange={() => {}} // Boxes auto-update, no need to track
        />
      ),
    },
    {
      key: "shipping",
      label: (
        <Space size={6}>
          <Truck size={16} />
          <span>Shipping & Receipt</span>
        </Space>
      ),
      children: (
        <ShippingReceiptTab
          purchaseOrder={po}
          poId={poId}
          onShippingDetailsUpdated={loadShippingDetails}
        />
      ),
    },
    {
      key: "documents",
      label: (
        <Space size={6}>
          <FolderOpen size={16} />
          <span>Documents</span>
        </Space>
      ),
      children: <DocumentsTab purchaseOrder={po} poId={poId} />,
    },
  ];

  return (
    <div className="p-4">
      <div className="max-w-[1480px] mx-auto">
        {/* Breadcrumbs */}
        <Breadcrumb className="mb-4">
          <Breadcrumb.Item>
            <Link to="/">Home</Link>
          </Breadcrumb.Item>
          <Breadcrumb.Item>
            <Link to="/procurement">Procurement</Link>
          </Breadcrumb.Item>
          <Breadcrumb.Item>
            <Link to="/procurement/orders">Purchase Orders</Link>
          </Breadcrumb.Item>
          <Breadcrumb.Item>{po?.reference || poId}</Breadcrumb.Item>
        </Breadcrumb>

        {/* Header */}
        <div className="mb-4">
          <button
            onClick={() => navigate("/procurement/orders")}
            className="mb-2 bg-black text-white hover:bg-black flex items-center gap-2 p-1.5 rounded"
          >
            <ArrowLeft />
            Back
          </button>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0">
            <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-bold mb-0">
                {po?.reference || poId}
              </h1>
              <Button
                type="text"
                icon={
                  <Star
                    className={
                      isFavorite ? "fill-yellow-400 text-yellow-500" : ""
                    }
                    size={16}
                  />
                }
                onClick={handleToggleFavorite}
                size="small"
                loading={updatingStatus}
              />
            </div>
            <Space className="flex-wrap" size={[8, 8]}>
              {hasUnsavedProducts && (
                <Button
                  type="primary"
                  onClick={async () => {
                    // Validate products if there are unsaved changes
                    if (productsTabValidateRef.current) {
                      await productsTabValidateRef.current();
                    }
                  }}
                  size="small"
                  className="text-xs"
                >
                  Validate & Save
                </Button>
              )}
              <Button
                type="default"
                icon={<Printer size={16} />}
                onClick={() => setReceiptModalVisible(true)}
                size="small"
                className="text-xs"
              >
                <span>Print Purchase Order</span>
              </Button>
              {po?.status === "draft" && (
                <Button
                  type="default"
                  icon={<Edit size={16} />}
                  onClick={() => navigate(`/procurement/orders/${poId}/edit`)}
                  size="small"
                  className="text-xs"
                >
                  <span className="hidden sm:inline">Edit Order</span>
                  <span className="sm:hidden">Edit</span>
                </Button>
              )}
              {/* <Button
                type={scannerEnabled ? "primary" : "default"}
                icon={<Keyboard size={16} />}
                onClick={() => setScannerEnabled(!scannerEnabled)}
                size="small"
                danger={scannerEnabled}
                loading={scannerProcessing}
                className="text-xs"
              >
                <span className="hidden sm:inline">
                  {scannerEnabled ? "Disable Scanner" : "Enable Scanner"}
                </span>
                <span className="sm:hidden">Scanner</span>
              </Button> */}
              <StatusBadge status={po?.status} />
              {po?.status === "in_transit" && (
                <ReceiptBadge status="ready_to_receive" />
              )}
            </Space>
          </div>
        </div>

        <Row gutter={16}>
          {/* Main Content */}
          <Col xs={24} lg={16}>
            {/* Show skeleton only for PO-related sections when loadingPO is true */}
            {loadingPO ? (
              <>
                <Card size="small" className="mb-4">
                  <Skeleton active paragraph={{ rows: 4 }} />
                </Card>
                <Card size="small">
                  <Skeleton active paragraph={{ rows: 6 }} />
                </Card>
              </>
            ) : (
              <>
            {/* Status Workflow */}
            <Card 
              size="small" 
              className="mb-4 shadow-md border"
              style={{
                background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
                borderColor: currentStatus === PO_STATUS.CANCELLED ? '#ef4444' : '#e2e8f0'
              }}
            >
              <div className="mb-4">
                <h3 className="text-base font-semibold text-gray-800 mb-1">Order Status</h3>
                <div className="text-xs text-gray-500">Track the progress of your purchase order</div>
              </div>

              {/* Desktop Horizontal View - Improved */}
              <div className="hidden lg:block">
                <div className="flex items-center justify-between py-4 px-2">
                  {statusFlow.map((status, index) => {
                    const isActive = po?.status === status;
                    const isCompleted = currentIndex > index;
                    const isPending = currentIndex < index;
                    const lineCompleted = currentIndex > index;

                    return (
                      <React.Fragment key={status}>
                        <div className="flex flex-col items-center flex-1 min-w-0 relative z-10">
                          {/* Status Circle */}
                          <div
                            className={`w-7 h-7 rounded-full border-2 flex items-center justify-center text-sm font-semibold shrink-0 transition-all relative ${
                              isActive
                                ? "border-blue-600 bg-blue-50 text-blue-700 shadow-lg scale-110 ring-4 ring-blue-100"
                                : isCompleted
                                ? "border-green-600 bg-green-50 text-green-700 shadow-md"
                                : "border-gray-300 bg-white text-gray-400"
                            }`}
                            style={{ borderWidth: '3px' }}
                          >
                            {isCompleted ? (
                              <CheckCircle size={20} className="text-green-600" />
                            ) : (
                              <span className={isActive ? "text-blue-700" : ""}>{index + 1}</span>
                            )}
                          </div>
                          {/* Status Label */}
                          <div className={`mt-2 text-center ${
                            isActive
                              ? "text-blue-700 font-semibold"
                              : isCompleted
                              ? "text-green-700 font-medium"
                              : "text-gray-500"
                          }`}>
                            <div className="text-xs font-medium whitespace-nowrap">
                              {PO_STATUS_LABELS[status] || status.replace("_", " ")}
                            </div>
                          </div>
                        </div>
                        {/* Connecting Line - Much More Prominent */}
                        {index < statusFlow.length - 1 && (
                          <div className="flex-1 mx-2 relative" style={{ minWidth: '40px', maxWidth: '120px' }}>
                            <div className="relative h-1.5 bg-gray-200 rounded-full overflow-hidden">
                              {/* Progress Fill */}
                              <div
                                className={`absolute top-0 left-0 h-full rounded-full transition-all duration-500 ${
                                  lineCompleted
                                    ? "bg-gradient-to-r from-green-500 to-green-600 w-full"
                                    : isActive
                                    ? "bg-gradient-to-r from-blue-400 to-blue-500 w-1/2"
                                    : "bg-gray-300 w-0"
                                }`}
                                style={{
                                  boxShadow: lineCompleted 
                                    ? '0 2px 8px rgba(34, 197, 94, 0.4)' 
                                    : isActive 
                                    ? '0 2px 8px rgba(59, 130, 246, 0.4)' 
                                    : 'none'
                                }}
                              />
                              {/* Animated Shine Effect for Active */}
                              {isActive && (
                                <div 
                                  className="absolute top-0 left-0 h-full w-full bg-gradient-to-r from-transparent via-white/40 to-transparent opacity-50 animate-pulse"
                                />
                              )}
                            </div>
                          </div>
                        )}
                      </React.Fragment>
                    );
                  })}
                </div>
              </div>

              {/* Tablet/Medium Screen View */}
              <div className="hidden md:block lg:hidden">
                <div className="flex items-center justify-between py-3 px-1">
                  {statusFlow.map((status, index) => {
                    const isActive = po?.status === status;
                    const isCompleted = currentIndex > index;
                    const lineCompleted = currentIndex > index;

                    return (
                      <React.Fragment key={status}>
                        <div className="flex flex-col items-center flex-1 min-w-0 relative z-10">
                          <div
                            className={`w-10 h-10 rounded-full border-3 flex items-center justify-center text-xs font-bold shrink-0 transition-all ${
                              isActive
                                ? "border-blue-600 bg-blue-50 text-blue-700 shadow-lg scale-110 ring-4 ring-blue-100"
                                : isCompleted
                                ? "border-green-600 bg-green-50 text-green-700 shadow-md"
                                : "border-gray-300 bg-white text-gray-400"
                            }`}
                            style={{ borderWidth: '3px' }}
                          >
                            {isCompleted ? (
                              <CheckCircle size={18} className="text-green-600" />
                            ) : (
                              index + 1
                            )}
                          </div>
                          <div className={`mt-1.5 text-center ${
                            isActive ? "text-blue-700 font-semibold" : isCompleted ? "text-green-700" : "text-gray-500"
                          }`}>
                            <div className="text-xs font-medium leading-tight">
                              {PO_STATUS_LABELS[status]?.split(' ')[0] || status.replace("_", " ")}
                            </div>
                          </div>
                        </div>
                        {index < statusFlow.length - 1 && (
                          <div className="flex-1 mx-1.5 relative" style={{ minWidth: '20px' }}>
                            <div className="relative h-2 bg-gray-200 rounded-full overflow-hidden">
                              <div
                                className={`absolute top-0 left-0 h-full rounded-full transition-all duration-500 ${
                                  lineCompleted
                                    ? "bg-gradient-to-r from-green-500 to-green-600 w-full"
                                    : isActive
                                    ? "bg-gradient-to-r from-blue-400 to-blue-500 w-1/2"
                                    : "bg-gray-300 w-0"
                                }`}
                              />
                            </div>
                          </div>
                        )}
                      </React.Fragment>
                    );
                  })}
                </div>
              </div>

              {/* Mobile Vertical View - Improved */}
              <div className="md:hidden">
                <div className="space-y-2">
                  {statusFlow.map((status, index) => {
                    const isActive = po?.status === status;
                    const isCompleted = currentIndex > index;
                    const hasNext = index < statusFlow.length - 1;

                    return (
                      <React.Fragment key={status}>
                        <div className="flex items-start gap-3 relative">
                          {/* Vertical Line */}
                          {hasNext && (
                            <div className="absolute left-5 top-12 bottom-0 w-0.5 z-0">
                              <div className={`h-full w-full rounded-full ${
                                isCompleted ? "bg-green-500" : "bg-gray-300"
                              }`} />
                            </div>
                          )}
                          {/* Status Circle */}
                          <div
                            className={`w-10 h-10 rounded-full border-3 flex items-center justify-center text-sm font-bold shrink-0 transition-all relative z-10 ${
                              isActive
                                ? "border-blue-600 bg-blue-50 text-blue-700 shadow-lg ring-4 ring-blue-100"
                                : isCompleted
                                ? "border-green-600 bg-green-50 text-green-700 shadow-md"
                                : "border-gray-300 bg-white text-gray-400"
                            }`}
                            style={{ borderWidth: '3px' }}
                          >
                            {isCompleted ? (
                              <CheckCircle size={18} className="text-green-600" />
                            ) : (
                              index + 1
                            )}
                          </div>
                          {/* Status Content */}
                          <div className="flex-1 pt-1 pb-4">
                            <div
                              className={`text-sm font-medium ${
                                isActive
                                  ? "text-blue-700 font-semibold"
                                  : isCompleted
                                  ? "text-green-700"
                                  : "text-gray-500"
                              }`}
                            >
                              {PO_STATUS_LABELS[status] || status.replace("_", " ")}
                            </div>
                            {isActive && (
                              <div className="text-xs text-blue-600 mt-0.5 font-medium">
                                Current Status
                              </div>
                            )}
                          </div>
                        </div>
                      </React.Fragment>
                    );
                  })}
                </div>
              </div>

              {/* Shipping Details Warning */}
              {currentStatus === PO_STATUS.CONFIRMED &&
                nextStatus === PO_STATUS.PICKUP_SCHEDULED &&
                !hasShippingDetails() && (
                  <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <div className="flex items-start gap-2">
                      <span className="text-yellow-600 text-lg">⚠️</span>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-yellow-800 mb-1">
                          Shipping Details Required
                        </p>
                        <p className="text-xs text-yellow-700">
                          Please add shipping details (booking date, tracking ID, etc.) in the{" "}
                          <button
                            onClick={() => setActiveTab("shipping")}
                            className="text-yellow-800 underline font-medium hover:text-yellow-900"
                          >
                            Shipping & Receipt
                          </button>{" "}
                          tab before scheduling pickup.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

              {/* Next Step Button */}
              {allowedNextStatuses.length > 0 &&
                currentStatus !== PO_STATUS.RECEIVED &&
                currentStatus !== PO_STATUS.CANCELLED && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <Space direction="vertical" style={{ width: "100%" }}>
                      <div className="flex items-center gap-2 flex-wrap">
                        {nextStatus && nextStatus !== PO_STATUS.CANCELLED && (
                          <Popconfirm
                            title={`Move to ${PO_STATUS_LABELS[nextStatus]}?`}
                            description={`This will update the order status from "${
                              PO_STATUS_LABELS[currentStatus] || currentStatus
                            }" to "${PO_STATUS_LABELS[nextStatus]}"`}
                            onConfirm={() => handleStatusChange(nextStatus)}
                            okText="Yes, Update"
                            cancelText="Cancel"
                          >
                            <Button
                              type="primary"
                              icon={<ArrowRight size={16} />}
                              loading={updatingStatus}
                              size="small"
                            >
                              {getStatusButtonLabel(nextStatus)}
                            </Button>
                          </Popconfirm>
                        )}
                        {allowedNextStatuses.includes(PO_STATUS.CANCELLED) && (
                          <Popconfirm
                            title="Cancel this order?"
                            description="This will cancel the purchase order. This action cannot be undone."
                            onConfirm={() =>
                              handleStatusChange(PO_STATUS.CANCELLED)
                            }
                            okText="Yes, Cancel"
                            cancelText="No"
                            okButtonProps={{ danger: true }}
                          >
                            <Button
                              danger
                              icon={<XCircle size={16} />}
                              loading={updatingStatus}
                              size="small"
                            >
                              Cancel Order
                            </Button>
                          </Popconfirm>
                        )}
                      </div>
                      <div className="text-xs text-gray-500">
                        Current:{" "}
                        <strong>
                          {PO_STATUS_LABELS[currentStatus] || currentStatus}
                        </strong>
                        {nextStatus &&
                          ` → Next: ${PO_STATUS_LABELS[nextStatus]}`}
                      </div>
                    </Space>
                  </div>
                )}
            </Card>

            {/* Action Buttons */}
            {/* 
              Action Buttons Purpose:
              - Receive Products: Marks items as physically received, updates inventory, triggers payment processing
              - Cancel: Terminates purchase order, prevents further processing, updates order status to cancelled
              - Lock: Prevents further modifications once order is finalized/sent to vendor, ensures data integrity
            */}
            {/* <Card size="small" className="mb-4">
              <Space wrap>
                {po?.receiptStatus === "ready_to_receive" && (
                  <Button
                    type="primary"
                    icon={<CheckCircle size={16} />}
                    size="small"
                    onClick={() => {
                      // TODO: Implement receive products functionality
                      message.info(
                        "Receive Products functionality coming soon"
                      );
                    }}
                  >
                    Receive Products
                  </Button>
                )}
                <Button
                  danger
                  icon={<XCircle size={16} />}
                  size="small"
                  onClick={() => {
                    // TODO: Implement cancel order functionality
                    message.info("Cancel order functionality coming soon");
                  }}
                >
                  Cancel
                </Button>
                {!po?.isLocked && (
                  <Button
                    icon={<Lock size={16} />}
                    size="small"
                    onClick={() => {
                      // TODO: Implement lock order functionality
                      message.info("Lock order functionality coming soon");
                    }}
                  >
                    Lock
                  </Button>
                )}
              </Space>
            </Card> */}

            {/* Tabs */}
            <Card size="small">
              <Tabs
                activeKey={activeTab}
                onChange={setActiveTab}
                items={tabItems}
                size="small"
              />
            </Card>
              </>
            )}
          </Col>

          {/* Activity Sidebar */}
          <Col xs={24} lg={8}>
            <ActivityLog poId={poId} purchaseOrder={po} />
          </Col>
        </Row>
      </div>

      {/* Receipt Modal */}
      <PurchaseOrderReceiptModal
        visible={receiptModalVisible}
        onCancel={() => setReceiptModalVisible(false)}
        poId={poId}
      />
    </div>
  );
};

export default PurchaseOrderDetailPage;
