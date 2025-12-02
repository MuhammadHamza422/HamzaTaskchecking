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

  const getStepStatus = (summary) => {
    let current = 0;
    if (summary.packing?.status !== "Not Packed") current = 1;
    if (summary.dropship?.items > 0) current = 2; // If dropship exists, show focus there too
    if (summary.warehouseShipping?.status === "Shipped") current = 3;
    if (summary.fulfillmentStatus === "completely-fulfilled") current = 4;
    return current;
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-slate-50"><Spin size="large" /></div>;
  if (!orderData) return null;

  const { summary, orderDetails, packing, dropship, shipping, activities } = orderData;
  const currentStep = getStepStatus(summary);

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
              <Steps current={currentStep} size="small" labelPlacement="vertical">
                <Step title="Placed" description={format(new Date(summary.timestamps.orderTS), "MM/dd HH:mm")} />
                <Step title="Packed" description={summary.timestamps.packedAt ? format(new Date(summary.timestamps.packedAt), "MM/dd") : "-"} />
                <Step title="Dropship" status={summary.dropship?.status === "Unfulfilled" ? "error" : "process"} />
                <Step title="Shipped" description={summary.timestamps.shippedAt ? format(new Date(summary.timestamps.shippedAt), "MM/dd") : "-"} />
                <Step title="Delivered" />
              </Steps>
            </Card>

            {/* Order Items */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
                <h3 className="text-base font-semibold text-slate-800 m-0">Order Items</h3>
                <span className="text-xs text-slate-500">{orderDetails?.orderLines?.length || 0} Items</span>
              </div>
              <div className="divide-y divide-gray-50">
                {orderDetails?.orderLines?.map((item) => (
                  <div key={item.id} className="p-4 flex items-center gap-4 hover:bg-slate-50 transition-colors">
                    <div className="w-16 h-16 bg-gray-100 rounded-lg flex-shrink-0 overflow-hidden border border-gray-200">
                      {item.image ? (
                        <Image src={item.image} className="w-full h-full object-cover" width={64} />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-300"><Package size={20} /></div>
                      )}
                    </div>
                    <div className="flex-1">
                      <h4 className="text-sm font-medium text-slate-800">{item.name}</h4>
                      <p className="text-xs text-slate-500 mt-0.5">SKU: {item.sku}</p>
                      {item.variant && <p className="text-xs text-slate-400">{item.variant}</p>}
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-slate-700">x{item.quantity}</p>
                      <p className="text-xs text-slate-500">{orderDetails?.currency} {item.price}</p>
                    </div>
                    <div className="ml-2">
                        {item.missingProductsCount > 0 && (
                            <Tag color="error" className="m-0 flex items-center gap-1"><AlertCircle size={12}/> Missing</Tag>
                        )}
                    </div>
                  </div>
                ))}
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
                      {record.photoUrls?.length > 0 && (
                        <div className="flex gap-2 overflow-x-auto pb-2">
                          {record.photoUrls.map((url, i) => (
                            <Image key={i} src={url} width={80} height={80} className="rounded-md border border-gray-200 object-cover" />
                          ))}
                        </div>
                      )}
                      {record.notes && <p className="text-xs text-slate-500 mt-2 italic">"{record.notes}"</p>}
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
                  <Mail size={16} className="mt-0.5 text-slate-400" />
                  <span className="break-all">{orderDetails?.customerEmail || "-"}</span>
                </div>
                <div className="flex items-start gap-3 text-sm text-slate-600">
                  <Phone size={16} className="mt-0.5 text-slate-400" />
                  <span>{orderDetails?.phone || "-"}</span>
                </div>
                <div className="flex items-start gap-3 text-sm text-slate-600">
                  <MapPin size={16} className="mt-0.5 text-slate-400" />
                  <span>
                    {orderDetails?.shipTo?.address1}<br/>
                    {orderDetails?.shipTo?.city}, {orderDetails?.shipTo?.state} {orderDetails?.shipTo?.zip}<br/>
                    {orderDetails?.shipTo?.country}
                  </span>
                </div>
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
