import React, { useState, useEffect } from "react";
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
  getVendors,
  getCompanies,
  getUsers,
  updatePurchaseOrderStatus,
  toggleFavorite,
} from "../../api/procurement";
import { useGlobalScanner } from "../../contexts/GlobalScannerContext";
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
  const [activeTab, setActiveTab] = useState("overview");
  const [isFavorite, setIsFavorite] = useState(false);
  const [vendors, setVendors] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [buyers, setBuyers] = useState([]);
  const [enrichedPO, setEnrichedPO] = useState(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [receiptModalVisible, setReceiptModalVisible] = useState(false);

  useEffect(() => {
    loadPurchaseOrder();
    loadDropdownData();
  }, [poId]);

  const loadDropdownData = async () => {
    try {
      const [vendorsData, companiesData, buyersData] = await Promise.all([
        getVendors({ limit: 1000 }),
        getCompanies(),
        getUsers(),
      ]);
      setVendors(vendorsData || []);
      setCompanies(companiesData || []);
      setBuyers(buyersData || []);
    } catch (error) {
      console.error("Failed to load dropdown data:", error);
    }
  };

  const loadPurchaseOrder = async () => {
    setLoading(true);
    try {
      const data = await getPurchaseOrder(poId);
      setPurchaseOrder(data);
      setIsFavorite(data.isFavorite || false);
      enrichPurchaseOrder(data);
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

  // Enrich purchase order with names from IDs
  const enrichPurchaseOrder = (po) => {
    if (!po) return;

    const enriched = { ...po };

    // Enrich vendor
    if (po.vendor && (po.vendor.id || po.vendor._id)) {
      const vendorId = po.vendor.id || po.vendor._id;
      const vendor = vendors.find(
        (v) => v.id === vendorId || v._id === vendorId
      );
      if (vendor) {
        enriched.vendor = {
          ...po.vendor,
          name: vendor.name,
          email: vendor.email || po.vendor.email,
          phone: vendor.phone || po.vendor.phone,
          address: vendor.address || po.vendor.address,
        };
      }
    }

    // Enrich company
    if (po.company && (po.company.id || po.company._id)) {
      const companyId = po.company.id || po.company._id;
      const company = companies.find(
        (c) => c.id === companyId || c._id === companyId
      );
      if (company) {
        enriched.company = {
          ...po.company,
          name: company.name,
        };
      }
    }

    // Enrich buyer
    if (po.buyer && (po.buyer.id || po.buyer._id)) {
      const buyerId = po.buyer.id || po.buyer._id;
      const buyer = buyers.find((b) => b.id === buyerId || b._id === buyerId);
      if (buyer) {
        enriched.buyer = {
          ...po.buyer,
          name: buyer.name,
          email: buyer.email || po.buyer.email,
          avatar: buyer.avatar || po.buyer.avatar,
        };
      }
    }

    setEnrichedPO(enriched);
  };

  // Re-enrich when dropdowns are loaded
  useEffect(() => {
    if (
      purchaseOrder &&
      vendors.length > 0 &&
      companies.length > 0 &&
      buyers.length > 0
    ) {
      enrichPurchaseOrder(purchaseOrder);
    }
  }, [purchaseOrder, vendors, companies, buyers]);

  // Handle status change
  const handleStatusChange = async (newStatus) => {
    try {
      setUpdatingStatus(true);
      await updatePurchaseOrderStatus(poId, newStatus);
      message.success(
        `Status updated to ${
          PO_STATUS_LABELS[newStatus] || newStatus.replace("_", " ")
        }`
      );
      // Reload purchase order to get updated status
      await loadPurchaseOrder();
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

  const po = enrichedPO || purchaseOrder;

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
      children: <OverviewTab purchaseOrder={po} />,
    },
    {
      key: "products",
      label: (
        <Space size={6}>
          <Package size={16} />
          <span>Products</span>
        </Space>
      ),
      children: (
        <ProductsTab
          purchaseOrder={po}
          poId={poId}
          onReload={loadPurchaseOrder}
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
      children: (
        <PackingListTab
          purchaseOrder={po}
          poId={poId}
          onReload={loadPurchaseOrder}
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
      children: <ShippingReceiptTab purchaseOrder={po} poId={poId} />,
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
      <div className="max-w-7xl mx-auto">
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
              {po?.status === "in_transit" ? (
                <ReceiptBadge status="ready_to_receive" />
              ) : (
                <ReceiptBadge status={po?.receiptStatus || "none"} />
              )}
            </Space>
          </div>
        </div>

        <Row gutter={16}>
          {/* Main Content */}
          <Col xs={24} lg={16}>
            {/* Status Workflow */}
            <Card size="small" className="mb-4 bg-gray-100">
              {/* Desktop Horizontal View */}
              <div className="hidden sm:flex items-center justify-between ">
                {statusFlow.map((status, index) => {
                  const isActive = po?.status === status;
                  const isCompleted = currentIndex > index;
                  const isCurrent = index === currentIndex;

                  return (
                    <React.Fragment key={status}>
                      <div className="flex items-center flex-1 min-w-0">
                        <div
                          className={`flex-1 flex items-center min-w-0 ${
                            isActive || isCompleted
                              ? "text-green-600"
                              : "text-gray-400"
                          }`}
                        >
                          <div
                            className={`w-6 h-6 rounded-full border-2 flex items-center justify-center text-xs font-medium shrink-0 ${
                              isActive
                                ? "border-green-600 bg-green-50 text-green-700"
                                : isCompleted
                                ? "border-green-600 bg-green-100 text-green-700"
                                : "border-gray-300 bg-gray-50"
                            }`}
                          >
                            {index + 1}
                          </div>
                          <div className="ml-2 text-xs">
                            {PO_STATUS_LABELS[status] ||
                              status.replace("_", " ")}
                          </div>
                        </div>
                      </div>
                      {index < statusFlow.length - 1 && (
                        <div
                          className={`h-0.5 flex-1 mx-2 min-w-[20px] ${
                            isCompleted || isActive
                              ? "bg-green-600"
                              : "bg-gray-300"
                          }`}
                        />
                      )}
                    </React.Fragment>
                  );
                })}
              </div>

              {/* Mobile Vertical View */}
              <div className="sm:hidden space-y-3 bg-gray-100">
                {statusFlow.map((status, index) => {
                  const isActive = po?.status === status;
                  const isCompleted = currentIndex > index;

                  return (
                    <div key={status} className="flex items-center gap-3">
                      <div
                        className={`w-8 h-8 rounded-full border-2 flex items-center justify-center text-sm font-medium shrink-0 ${
                          isActive
                            ? "border-green-600 bg-green-50 text-green-700"
                            : isCompleted
                            ? "border-green-600 bg-green-100 text-green-700"
                            : "border-gray-300 bg-gray-50 text-gray-400"
                        }`}
                      >
                        {index + 1}
                      </div>
                      <div className="flex-1">
                        <div
                          className={`text-sm font-medium ${
                            isActive || isCompleted
                              ? "text-green-700"
                              : "text-gray-400"
                          }`}
                        >
                          {PO_STATUS_LABELS[status] || status.replace("_", " ")}
                        </div>
                        {isActive && (
                          <div className="text-xs text-gray-500 mt-1">
                            Current Status
                          </div>
                        )}
                      </div>
                      {isCompleted && (
                        <CheckCircle
                          size={18}
                          className="text-green-600 shrink-0"
                        />
                      )}
                    </div>
                  );
                })}
              </div>

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
