import React from "react";
import { formatDate } from "./utils";

/**
 * Receipt Order Details Component
 * Displays purchase order reference and order details grid
 */
const ReceiptOrderDetails = ({
  purchaseOrder,
  orderDetails,
  buyer,
  formatDate: formatDateProp,
}) => {
  const formatDateFn = formatDateProp || formatDate;

  return (
    <>
      {/* Purchase Order Number - Large Blue Text */}
      <div className="mb-10">
        <h2 className="text-4xl font-bold text-blue-600">
          Purchase Order #{purchaseOrder?.reference || ""}
        </h2>
      </div>

      {/* Order Details - Four Column Grid with Orange Labels */}
      <div className="grid grid-cols-4 gap-6 mb-10 text-sm">
        <div>
          <div className="font-semibold text-orange-600 mb-2">Buyer</div>
          <div className="text-gray-900 font-medium">
            {orderDetails?.buyer || buyer?.name || ""}
          </div>
        </div>
        <div>
          <div className="font-semibold text-orange-600 mb-2">
            Your Order Reference
          </div>
          <div className="text-gray-900 font-medium">
            {orderDetails?.vendorReference?.join(", ") || "-"}
          </div>
        </div>
        <div>
          <div className="font-semibold text-orange-600 mb-2">Order Date:</div>
          <div className="text-gray-900 font-medium">
            {formatDateFn(
              orderDetails?.orderDate || purchaseOrder?.createdDate
            )}
          </div>
        </div>
        <div>
          <div className="font-semibold text-orange-600 mb-2">
            Expected Arrival:
          </div>
          <div className="text-gray-900 font-medium">
            {formatDateFn(
              orderDetails?.expectedArrival || purchaseOrder?.orderDeadline
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default ReceiptOrderDetails;

