import React from "react";
import ReceiptHeader from "./ReceiptHeader";
import ReceiptShippingInfo from "./ReceiptShippingInfo";
import ReceiptOrderDetails from "./ReceiptOrderDetails";
import ReceiptLineItemsTable from "./ReceiptLineItemsTable";
import ReceiptFinancialSummary from "./ReceiptFinancialSummary";
import TermsAndConditions from "./TermsAndConditions";
import { formatCurrency, formatDate } from "./utils";

/**
 * Receipt Template Component
 * Main component that composes all receipt sections
 */
const ReceiptTemplate = ({
  data,
  formatCurrency: formatCurrencyProp,
  formatDate: formatDateProp,
}) => {
  // Debug: Log received data
  React.useEffect(() => {
    console.log("ReceiptTemplate - received data:", data);
    console.log("ReceiptTemplate - allLineItems:", data?.allLineItems);
    console.log("ReceiptTemplate - boxesSummary:", data?.boxesSummary);
    console.log("ReceiptTemplate - looseLineItems:", data?.looseLineItems);
    console.log("ReceiptTemplate - lineItems:", data?.lineItems);
  }, [data]);

  const {
    company,
    purchaseOrder,
    buyer,
    shippingAddress,
    vendor,
    orderDetails,
    allLineItems,
    lineItems,
    looseLineItems,
    boxesSummary,
    financialSummary,
  } = data || {};

  const currency = purchaseOrder?.currency || "USD";
  const formatCurrencyFn = formatCurrencyProp || formatCurrency;
  const formatDateFn = formatDateProp || formatDate;

  return (
    <div
      className="receipt-content"
      style={{
        display: "block",
        width: "100%",
        overflow: "visible",
        visibility: "visible",
        position: "relative",
      }}
    >
      {/* Main Content Section */}
      <div
        className="main-content"
        style={{
          display: "block",
          width: "100%",
          overflow: "visible",
          visibility: "visible",
          position: "relative",
        }}
      >
        {/* Header with Logo and Company Name */}
        <ReceiptHeader company={company} />

        {/* Shipping and Vendor Information */}
        <ReceiptShippingInfo
          shippingAddress={shippingAddress}
          vendor={vendor}
          company={company}
        />
        <div
          style={{
            display: "block",
            width: "100%",
            overflow: "visible",
            visibility: "visible",
            position: "relative",
          }}
        >
          {/* Purchase Order Number and Order Details */}
          <ReceiptOrderDetails
            purchaseOrder={purchaseOrder}
            orderDetails={orderDetails}
            buyer={buyer}
            formatDate={formatDateFn}
          />

          {/* Combined Line Items Table - Boxes and Loose Items */}
          <ReceiptLineItemsTable
            allLineItems={allLineItems}
            boxesSummary={boxesSummary}
            looseLineItems={looseLineItems}
            lineItems={lineItems}
            currency={currency}
            formatCurrency={formatCurrencyFn}
          />
        </div>

        {/* Financial Summary */}
        <ReceiptFinancialSummary
          financialSummary={financialSummary}
          currency={currency}
          formatCurrency={formatCurrencyFn}
        />
      </div>

      {/* Terms and Conditions - Static Content (starts on page 2) */}
      <div className="terms-section mt-[400px]">
        <TermsAndConditions />
      </div>
    </div>
  );
};

export default ReceiptTemplate;
