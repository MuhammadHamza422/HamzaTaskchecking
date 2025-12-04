import React, { useState, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import {
  Card,
  Tag,
  Button,
  Spin,
  Image,
  Timeline,
  Empty,
  Steps,
  Avatar,
  Divider,
} from "antd";
import {
  ArrowLeft,
  Package,
  Truck,
  ShoppingCart,
  CheckCircle,
  Clock,
  User,
  MapPin,
  Phone,
  Mail,
  CreditCard,
  AlertCircle,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  ExternalLink,
} from "lucide-react";
import { format } from "date-fns";
import { getSSOTOrderDetails } from "../../api/ssot";
import Swal from "sweetalert2";

const { Step } = Steps;

const SsotDetailsPage = () => {
  const { platform, orderId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [orderData, setOrderData] = useState(null);
  const [expandedItems, setExpandedItems] = useState(new Set());

  useEffect(() => {
    if (platform && orderId) {
      loadOrderDetails();
    }
  }, [platform, orderId]);

  const loadOrderDetails = async () => {
    setLoading(true);
    try {
      const response = await getSSOTOrderDetails({
        platform: decodeURIComponent(platform),
        orderId: decodeURIComponent(orderId),
        orderNumber: location.state?.orderNumber,
      });

      if (response.success && response.data) {
        setOrderData(response.data);
      }
    } catch (error) {
      console.error("Error loading SSOT order details:", error);
      Swal.fire({
        icon: "error",
        title: "Failed to Load Details",
        text: error.message || "Unable to load order details.",
        confirmButtonColor: "#2563eb",
      }).then(() => navigate("/fulfillment/ssot"));
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    const s = status?.toLowerCase() || "";
    if (s.includes("completely") || s.includes("shipped") || s === "fulfilled") return "success";
    if (s.includes("partially") || s === "pending") return "warning";
    if (s.includes("unfulfilled") || s.includes("error")) return "error";
    return "default";
  };

  const formatStatus = (status) => {
    if (!status) return "N/A";
    return status.split("-").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
  };

  // Map stage names to display titles
  const getStageTitle = (stage) => {
    const stageMap = {
      PLACED: "Placed",
      PACKING: "Packing",
      PACKED: "Packed",
      DROPSHIP_PENDING: "Dropship",
      DROPSHIP_FULFILLED: "Dropship",
      SHIPPING: "Shipping",
      SHIPPED: "Shipped",
      DELIVERED: "Delivered",
      CANCELLED: "Cancelled",
    };
    return stageMap[stage] || stage;
  };

  const toggleItemExpansion = (itemId) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(itemId)) {
      newExpanded.delete(itemId);
    } else {
      newExpanded.add(itemId);
    }
    setExpandedItems(newExpanded);
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-slate-50"><Spin size="large" /></div>;
  if (!orderData) return null;

  const { journey, summary, orderDetails, packing, dropship, shipping, activities } = orderData;
  
  // Use journey from backend, fallback to calculated step if journey not available
  const currentStep = journey?.currentStep ?? 0;
  const journeyStages = journey?.stages || [];
  
  // Create step configuration - 5 steps total
  const stepConfig = [
    { key: "PLACED", title: "Placed" },
    { key: "PACKING", title: "Packed" },
    { key: "DROPSHIP", title: "Dropship" }, // Handles both DROPSHIP_PENDING and DROPSHIP_FULFILLED
    { key: "SHIPPING", title: "Shipped" },
    { key: "DELIVERED", title: "Delivered" },
  ];
  
  // Find stage info for each step
  const getStepInfo = (stepIndex) => {
    // Find stage that matches this step index
    // For step 2 (Dropship), check both DROPSHIP_PENDING and DROPSHIP_FULFILLED
    let stage;
    if (stepIndex === 2) {
      stage = journeyStages.find(s => 
        s.step === stepIndex && 
        (s.stage === "DROPSHIP_PENDING" || s.stage === "DROPSHIP_FULFILLED")
      );
    } else {
      stage = journeyStages.find(s => s.step === stepIndex);
    }
    
    if (stage) {
      return {
        status: stage.status || "wait",
        description: stage.timestamp ? format(new Date(stage.timestamp), "MM/dd HH:mm") : "-",
        completed: stage.completed,
      };
    }
    
    // Fallback to summary data if journey not available (backward compatibility)
    if (stepIndex === 0) {
      return {
        status: "finish",
        description: summary.timestamps?.orderTS ? format(new Date(summary.timestamps.orderTS), "MM/dd HH:mm") : "-",
        completed: true,
      };
    }
    if (stepIndex === 1) {
      return {
        status: summary.packing?.status !== "Not Packed" ? "finish" : "wait",
        description: summary.timestamps?.packedAt ? format(new Date(summary.timestamps.packedAt), "MM/dd") : "-",
        completed: summary.packing?.status !== "Not Packed",
      };
    }
    if (stepIndex === 2) {
      const hasDropship = summary.dropship?.items > 0;
      return {
        status: hasDropship ? (summary.dropship?.status === "Unfulfilled" ? "error" : "process") : "wait",
        description: "-",
        completed: false,
      };
    }
    if (stepIndex === 3) {
      return {
        status: summary.warehouseShipping?.status === "Shipped" ? "finish" : "wait",
        description: summary.timestamps?.shippedAt ? format(new Date(summary.timestamps.shippedAt), "MM/dd") : "-",
        completed: summary.warehouseShipping?.status === "Shipped",
      };
    }
    return { status: "wait", description: "-", completed: false };
  };

  return (
    <div className="min-h-screen bg-slate-50/50 font-sans pb-10">
      
      {/* Top Navigation Bar */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10 px-6 py-4 shadow-sm">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button icon={<ArrowLeft size={16} />} onClick={() => navigate("/fulfillment/ssot")} type="text" className="hover:bg-slate-100" />
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-xl font-bold text-slate-800 m-0">Order #{orderDetails?.orderNumber || summary.orderNumber}</h1>
                <Tag color={getStatusColor(summary.fulfillmentStatus)} className="rounded-full px-3 border-0 font-medium">
                  {formatStatus(summary.fulfillmentStatus)}
                </Tag>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
                <img 
                  src={summary.platform === 'shopify' ? '/shopify-icon.png' : summary.platform === 'woocommerce' ? '/woocommerce icon.png' : '/Walmart_App_icon.png'} 
                  alt={summary.platform} 
                  className="w-4 h-4 object-contain" 
                />
                <span className="capitalize">{summary.platform}</span>
                <span>•</span>
                <span>Placed {format(new Date(summary.timestamps?.orderTS), "MMM dd, yyyy HH:mm")}</span>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <Button type="primary" className="bg-blue-600 hover:bg-blue-700">Actions</Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        
        {/* Efficiency Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {[
            { label: "DEO Efficiency", value: summary.efficiency?.deoFE, icon: <Clock size={18} /> },
            { label: "Warehouse Efficiency", value: summary.efficiency?.whFE, icon: <Package size={18} /> },
            { label: "Overall Efficiency", value: summary.efficiency?.overallFE, icon: <CheckCircle size={18} /> },
          ].map((stat, i) => (
            <Card key={i} bordered={false} className="shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="text-slate-500 text-xs font-medium uppercase tracking-wider">{stat.label}</span>
                  <span className={`text-2xl font-bold mt-1 ${stat.value >= 100 ? "text-emerald-600" : "text-rose-600"}`}>
                    {stat.value ?? "-"}%
                  </span>
                </div>
                <div className={`p-3 rounded-full ${stat.value >= 100 ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"}`}>
                  {stat.icon}
                </div>
              </div>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* LEFT COLUMN - Main Content */}
          <div className="lg:col-span-2 space-y-8">
            
            {/* Order Journey Stepper */}
            <Card bordered={false} className="shadow-sm">
              <h3 className="text-base font-semibold text-slate-800 mb-6">Fulfillment Journey</h3>
              {journey && (
                <div className="mb-4 text-xs text-slate-500">
                  Current Stage: <span className="font-medium text-slate-700">{getStageTitle(journey.currentStage)}</span>
                </div>
              )}
              <Steps current={currentStep} size="small" labelPlacement="vertical">
                {stepConfig.map((step, index) => {
                  const stepInfo = getStepInfo(index);
                  return (
                    <Step
                      key={step.key}
                      title={step.title}
                      description={stepInfo.description}
                      status={stepInfo.status}
                    />
                  );
                })}
              </Steps>
              
              {/* Journey History (Optional - can be collapsed) */}
              {journey?.history && journey.history.length > 0 && (
                <div className="mt-6 pt-4 border-t border-gray-100">
                  <details className="cursor-pointer">
                    <summary className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                      Journey History ({journey.history.length})
                    </summary>
                    <div className="mt-2 space-y-2">
                      {journey.history.map((transition, idx) => (
                        <div key={idx} className="text-xs text-slate-600 bg-slate-50 rounded p-2">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{getStageTitle(transition.from)}</span>
                            <span>→</span>
                            <span className="font-medium">{getStageTitle(transition.to)}</span>
                            <span className="text-slate-400 ml-auto">
                              {format(new Date(transition.timestamp), "MMM dd, HH:mm")}
                            </span>
                          </div>
                          {transition.reason && (
                            <div className="text-[10px] text-slate-500 mt-1">
                              Reason: {transition.reason.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </details>
                </div>
              )}
            </Card>

            {/* Order Items */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
                <h3 className="text-base font-semibold text-slate-800 m-0">Order Items</h3>
                <span className="text-xs text-slate-500">{orderDetails?.orderLines?.length || 0} Items</span>
              </div>
              <div className="divide-y divide-gray-50">
                {orderDetails?.orderLines?.map((item) => {
                  const isExpanded = expandedItems.has(item.id);
                  const hasMissingProducts = item.missingProducts && item.missingProducts.length > 0;
                  
                  return (
                    <div key={item.id}>
                      <div 
                        className={`p-4 flex items-center gap-4 hover:bg-slate-50 transition-colors ${hasMissingProducts ? 'cursor-pointer' : ''}`}
                        onClick={() => hasMissingProducts && toggleItemExpansion(item.id)}
                      >
                        <div className="w-16 h-16 bg-gray-100 rounded-lg flex-shrink-0 overflow-hidden border border-gray-200">
                          {item.image ? (
                            <Image src={item.image} className="w-full h-full object-cover" width={64} />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-300"><Package size={20} /></div>
                          )}
                        </div>
                        <div className="flex-1">
                          <h4 className="text-sm font-medium text-slate-800">{item.name}</h4>
                          <p className="text-xs text-slate-500 mt-0.5">SKU: {item.sku || "N/A"}</p>
                          {item.variant && <p className="text-xs text-slate-400">{item.variant}</p>}
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold text-slate-700">x{item.quantity}</p>
                          <p className="text-xs text-slate-500">{orderDetails?.currency} {item.price}</p>
                        </div>
                        <div className="ml-2 flex items-center gap-2">
                          {item.missingProductsCount > 0 && (
                            <Tag color="error" className="m-0 flex items-center gap-1">
                              <AlertCircle size={12}/> {item.missingProductsCount} Missing
                            </Tag>
                          )}
                          {hasMissingProducts && (
                            <button className="text-slate-400 hover:text-slate-600">
                              {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                            </button>
                          )}
                        </div>
                      </div>
                      
                      {/* Expanded Missing Products Section */}
                      {isExpanded && hasMissingProducts && (
                        <div className="px-4 pb-4 bg-amber-50/30 border-l-4 border-l-amber-400">
                          <div className="pt-3 space-y-3">
                            <h5 className="text-xs font-semibold text-amber-800 uppercase tracking-wider">Missing Products</h5>
                            {item.missingProducts.map((missingProduct) => (
                              <div key={missingProduct.id} className="bg-white rounded-lg border border-amber-200 p-3 space-y-2">
                                <div className="flex items-start justify-between">
                                  <div className="flex-1">
                                    <p className="text-sm font-medium text-slate-800">{missingProduct.productName}</p>
                                    {missingProduct.notes && (
                                      <p className="text-xs text-slate-500 mt-1 italic">Note: {missingProduct.notes}</p>
                                    )}
                                    <p className="text-[10px] text-slate-400 mt-1">
                                      Added: {format(new Date(missingProduct.createdAt), "MMM dd, yyyy HH:mm")}
                                    </p>
                                  </div>
                                  <Tag color={missingProduct.fulfillmentStatus === "Fulfilled" ? "success" : "warning"} className="text-xs">
                                    {missingProduct.fulfillmentStatus || "Pending"}
                                  </Tag>
                                </div>
                                
                                {/* Fulfillment Details */}
                                {missingProduct.fulfillmentStatus === "Fulfilled" && (
                                  <div className="mt-3 pt-3 border-t border-gray-200 space-y-2">
                                    <div className="grid grid-cols-2 gap-2 text-xs">
                                      <div>
                                        <span className="text-slate-500">Fulfillment Type:</span>
                                        <span className="ml-2 font-medium text-slate-700 capitalize">{missingProduct.fulfillmentType || "-"}</span>
                                      </div>
                                      <div>
                                        <span className="text-slate-500">Courier:</span>
                                        <span className="ml-2 font-medium text-slate-700">{missingProduct.courierService || "-"}</span>
                                      </div>
                                      <div>
                                        <span className="text-slate-500">Tracking ID:</span>
                                        <span className="ml-2 font-mono font-semibold text-blue-600">{missingProduct.trackingId || "-"}</span>
                                      </div>
                                      <div>
                                        <span className="text-slate-500">Fulfilled At:</span>
                                        <span className="ml-2 text-slate-700">
                                          {missingProduct.fulfilledAt ? format(new Date(missingProduct.fulfilledAt), "MMM dd, HH:mm") : "-"}
                                        </span>
                                      </div>
                                    </div>
                                    {missingProduct.marketplaceName && (
                                      <div className="text-xs">
                                        <span className="text-slate-500">Marketplace:</span>
                                        <span className="ml-2 font-medium text-slate-700">{missingProduct.marketplaceName}</span>
                                        {missingProduct.marketplaceOrderNumber && (
                                          <span className="ml-2 text-slate-500">(Order: {missingProduct.marketplaceOrderNumber})</span>
                                        )}
                                      </div>
                                    )}
                                    {missingProduct.trackingLink && (
                                      <div className="flex items-center gap-2">
                                        <a 
                                          href={missingProduct.trackingLink} 
                                          target="_blank" 
                                          rel="noopener noreferrer"
                                          className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"
                                        >
                                          Track Package <ExternalLink size={12} />
                                        </a>
                                      </div>
                                    )}
                                    {missingProduct.fulfilledBy && (
                                      <div className="text-xs text-slate-500">
                                        Fulfilled by: <span className="font-medium text-slate-700">{missingProduct.fulfilledBy.name}</span>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Packing Section */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg"><Package size={18} /></div>
                  <h3 className="text-base font-semibold text-slate-800 m-0">Packing Details</h3>
                </div>
                <Tag color={getStatusColor(summary.packing?.status)}>{summary.packing?.status}</Tag>
              </div>
              
              {packing?.records?.length > 0 ? (
                <div className="space-y-4">
                  {packing.records.map((record, idx) => (
                    <div key={idx} className="border border-gray-100 rounded-lg p-4 bg-slate-50/50">
                      <div className="flex justify-between text-sm mb-3">
                        <span className="text-slate-500">Packed by <span className="text-slate-800 font-medium">{record.packedBy?.name}</span></span>
                        <span className="text-slate-400">{format(new Date(record.packedAt), "MMM dd HH:mm")}</span>
                      </div>
                      
                      {/* Packing Info */}
                      <div className="grid grid-cols-2 gap-3 mb-3 text-xs">
                        <div>
                          <span className="text-slate-500">Selected Items:</span>
                          <span className="ml-2 font-medium text-slate-700">{record.selectedItems?.length || 0}</span>
                        </div>
                        <div>
                          <span className="text-slate-500">Deselected Items:</span>
                          <span className="ml-2 font-medium text-slate-700">{record.deselectedItems?.length || 0}</span>
                        </div>
                      </div>
                      
                      {record.photoUrls?.length > 0 && (
                        <div className="flex gap-2 overflow-x-auto pb-2 mb-3">
                          {record.photoUrls.map((url, i) => (
                            <Image key={i} src={url} width={80} height={80} className="rounded-md border border-gray-200 object-cover" />
                          ))}
                        </div>
                      )}
                      
                      {record.notes && <p className="text-xs text-slate-500 mt-2 mb-3 italic">"{record.notes}"</p>}
                      
                      {/* Missing Products from Packing Record */}
                      {record.missingProducts && record.missingProducts.length > 0 && (
                        <div className="mt-4 pt-4 border-t border-gray-200">
                          <h5 className="text-xs font-semibold text-amber-800 uppercase tracking-wider mb-3">Missing Products ({record.missingProducts.length})</h5>
                          <div className="space-y-3">
                            {record.missingProducts.map((missingProduct) => (
                              <div key={missingProduct.missingProductId} className="bg-white rounded-lg border border-amber-200 p-3 space-y-2">
                                <div className="flex items-start justify-between">
                                  <div className="flex-1">
                                    <p className="text-sm font-medium text-slate-800">{missingProduct.productName}</p>
                                    {missingProduct.notes && (
                                      <p className="text-xs text-slate-500 mt-1 italic">Note: {missingProduct.notes}</p>
                                    )}
                                    <div className="flex items-center gap-3 mt-1 text-[10px] text-slate-400">
                                      <span>Added: {format(new Date(missingProduct.addedAt), "MMM dd, HH:mm")}</span>
                                      {missingProduct.addedBy && (
                                        <span>by {missingProduct.addedBy.name}</span>
                                      )}
                                    </div>
                                  </div>
                                  <Tag color={missingProduct.fulfillmentStatus === "Fulfilled" ? "success" : "warning"} className="text-xs">
                                    {missingProduct.fulfillmentStatus || "Pending"}
                                  </Tag>
                                </div>
                                
                                {/* Fulfillment Details */}
                                {missingProduct.fulfillmentStatus === "Fulfilled" && (
                                  <div className="mt-2 pt-2 border-t border-gray-100 space-y-2">
                                    <div className="grid grid-cols-2 gap-2 text-xs">
                                      <div>
                                        <span className="text-slate-500">Type:</span>
                                        <span className="ml-2 font-medium text-slate-700 capitalize">{missingProduct.fulfillmentType || "-"}</span>
                                      </div>
                                      <div>
                                        <span className="text-slate-500">Courier:</span>
                                        <span className="ml-2 font-medium text-slate-700">{missingProduct.courierService || "-"}</span>
                                      </div>
                                      <div className="col-span-2">
                                        <span className="text-slate-500">Tracking ID:</span>
                                        <span className="ml-2 font-mono font-semibold text-blue-600">{missingProduct.trackingId || "-"}</span>
                                      </div>
                                      <div>
                                        <span className="text-slate-500">Fulfilled:</span>
                                        <span className="ml-2 text-slate-700">
                                          {missingProduct.fulfilledAt ? format(new Date(missingProduct.fulfilledAt), "MMM dd, HH:mm") : "-"}
                                        </span>
                                      </div>
                                      {missingProduct.fulfilledBy && (
                                        <div>
                                          <span className="text-slate-500">By:</span>
                                          <span className="ml-2 text-slate-700">{missingProduct.fulfilledBy.name}</span>
                                        </div>
                                      )}
                                    </div>
                                    {missingProduct.marketplaceName && (
                                      <div className="text-xs">
                                        <span className="text-slate-500">Marketplace:</span>
                                        <span className="ml-2 font-medium text-slate-700">{missingProduct.marketplaceName}</span>
                                        {missingProduct.marketplaceOrderNumber && (
                                          <span className="ml-2 text-slate-500">(Order: {missingProduct.marketplaceOrderNumber})</span>
                                        )}
                                      </div>
                                    )}
                                    {missingProduct.trackingLink && (
                                      <div className="flex items-center gap-2">
                                        <a 
                                          href={missingProduct.trackingLink} 
                                          target="_blank" 
                                          rel="noopener noreferrer"
                                          className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"
                                        >
                                          Track Package <ExternalLink size={12} />
                                        </a>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : <Empty description="No packing records" image={Empty.PRESENTED_IMAGE_SIMPLE} />}
            </div>

            {/* Shipping Section */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg"><Truck size={18} /></div>
                  <h3 className="text-base font-semibold text-slate-800 m-0">Shipping Details</h3>
                </div>
                <Tag color={getStatusColor(summary.warehouseShipping?.status)}>{summary.warehouseShipping?.status}</Tag>
              </div>

              {shipping?.records?.length > 0 ? (
                <div className="space-y-4">
                  {shipping.records.map((record, idx) => (
                    <div key={idx} className="border border-gray-100 rounded-lg p-4 bg-slate-50/50">
                      <div className="flex flex-col sm:flex-row justify-between gap-4 mb-3">
                        <div>
                          <p className="text-xs text-slate-500 uppercase tracking-wider">Tracking Number</p>
                          <p className="text-sm font-mono font-semibold text-slate-800 flex items-center gap-2">
                            {record.trackingNumber}
                            <Button size="small" type="text" icon={<ChevronRight size={14} />} className="text-blue-500" />
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-slate-500 uppercase tracking-wider">Carrier</p>
                          <p className="text-sm font-medium text-slate-800">{record.carrierName || record.carrierCode}</p>
                        </div>
                      </div>
                      <div className="flex gap-2 mt-2">
                         {record.photoUrls?.map((url, i) => (
                            <Image key={i} src={url} width={60} height={60} className="rounded border border-gray-200 object-cover" />
                          ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : <Empty description="No shipping records" image={Empty.PRESENTED_IMAGE_SIMPLE} />}
            </div>

          </div>

          {/* RIGHT COLUMN - Sidebar */}
          <div className="space-y-6">
            
            {/* Customer Card */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Customer</h3>
              <div className="flex items-center gap-3 mb-4">
                <Avatar size={40} icon={<User />} className="bg-blue-100 text-blue-600" />
                <div>
                  <p className="text-sm font-bold text-slate-800">{orderDetails?.customerName || "Guest"}</p>
                  <p className="text-xs text-slate-500">Customer</p>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex items-start gap-3 text-sm text-slate-600">
                  <Mail size={16} className="mt-0.5 text-slate-400 flex-shrink-0" />
                  <span className="break-all">{orderDetails?.customerEmail || "-"}</span>
                </div>
                <div className="flex items-start gap-3 text-sm text-slate-600">
                  <Phone size={16} className="mt-0.5 text-slate-400 flex-shrink-0" />
                  <span>{orderDetails?.phone || "-"}</span>
                </div>
                {orderDetails?.shipTo && (
                  <div className="flex items-start gap-3 text-sm text-slate-600">
                    <MapPin size={16} className="mt-0.5 text-slate-400 flex-shrink-0" />
                    <div>
                      {orderDetails.shipTo.name && (
                        <p className="font-medium text-slate-800 mb-1">{orderDetails.shipTo.name}</p>
                      )}
                      {orderDetails.shipTo.address1 && (
                        <p>{orderDetails.shipTo.address1}</p>
                      )}
                      {orderDetails.shipTo.address2 && (
                        <p>{orderDetails.shipTo.address2}</p>
                      )}
                      {(orderDetails.shipTo.city || orderDetails.shipTo.state || orderDetails.shipTo.zip) && (
                        <p>
                          {[orderDetails.shipTo.city, orderDetails.shipTo.state, orderDetails.shipTo.zip].filter(Boolean).join(", ")}
                        </p>
                      )}
                      {orderDetails.shipTo.country && (
                        <p>{orderDetails.shipTo.country}</p>
                      )}
                      {orderDetails.shipTo.phone && (
                        <p className="text-xs text-slate-500 mt-1">Phone: {orderDetails.shipTo.phone}</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Financials */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Payment Summary</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between text-slate-600">
                  <span>Subtotal</span>
                  <span>{orderDetails?.currency} {orderDetails?.subtotal?.toFixed(2)}</span>
                </div>
                {orderDetails?.discount && orderDetails.discount > 0 && (
                  <div className="flex justify-between text-red-600">
                    <span>Discount</span>
                    <span>-{orderDetails.currency} {orderDetails.discount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-slate-600">
                  <span>Shipping</span>
                  <span>{orderDetails?.currency} {orderDetails?.shipping?.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Tax</span>
                  <span>{orderDetails?.currency} {orderDetails?.tax?.toFixed(2)}</span>
                </div>
                <Divider className="my-2" />
                <div className="flex justify-between font-bold text-slate-800 text-base">
                  <span>Total</span>
                  <span>{orderDetails?.currency} {orderDetails?.totalValue?.toFixed(2)}</span>
                </div>
                {orderDetails?.status && (
                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-slate-500">Status</span>
                      <Tag color={orderDetails.status === "PAID" ? "success" : "default"} className="text-xs">
                        {orderDetails.status}
                      </Tag>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Activity Timeline */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Activity Log</h3>
              {activities?.timeline?.length > 0 ? (
                <Timeline className="mt-2">
                  {activities.timeline.map((act, i) => (
                    <Timeline.Item 
                      key={i} 
                      color={act.type.includes('completed') ? 'green' : 'blue'}
                      className="pb-4"
                    >
                      <p className="text-xs font-medium text-slate-800 mb-0.5">{act.message}</p>
                      <p className="text-[10px] text-slate-400">
                        {format(new Date(act.timestamp), "MMM dd HH:mm")} by {act.user?.name || "System"}
                      </p>
                    </Timeline.Item>
                  ))}
                </Timeline>
              ) : <Empty description="No activities" image={Empty.PRESENTED_IMAGE_SIMPLE} />}
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};

export default SsotDetailsPage;
