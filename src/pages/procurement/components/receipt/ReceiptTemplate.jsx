import React from "react";
import ReceiptHeader from "./ReceiptHeader";
import ReceiptShippingInfo from "./ReceiptShippingInfo";
import ReceiptOrderDetails from "./ReceiptOrderDetails";
import ReceiptLineItemsTable from "./ReceiptLineItemsTable";
import ReceiptFinancialSummary from "./ReceiptFinancialSummary";
import TermsAndConditions from "./TermsAndConditions";
import { formatCurrency, formatDate } from "./utils";

const ReceiptTemplate = ({
  data,
  formatCurrency: formatCurrencyProp,
  formatDate: formatDateProp,
}) => {
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

  // Logo URL for print header
  const logoUrl = company?.logo || "/Retro vGame_logo.png";

  return (
    <>
      {/* Print Styles for Page Breaks and Logo Header */}
      <style>{`
        @media print {
          @page {
            margin: 0;
            size: A4;
          }
          
          /* Print header with logo - appears on every page */
          body::before {
            content: '';
            display: block;
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            height: 40px;
            background: white;
            z-index: 1000;
            border-bottom: 1px solid #e5e7eb;
          }
          
          .print-logo-header {
            position: fixed;
            top: 5px;
            left: 10mm;
            z-index: 1001;
            height: 220px;
          }
          
          .print-logo-header img {
            max-height: 200px;
            height:200px;
            width: auto;
            object-fit: contain;
          }
          
          /* Add spacing after header logo on all pages */
          .print-logo-header {
            margin-bottom: 50px;
          }
          
          /* Hide main header logo in print/PDF - only show small header logo on all pages */
          .receipt-main-header {
            display: none !important;
          }
          
          /* Prevent content from being cut */
          .receipt-content {
            page-break-inside: avoid;
          }
          
          .main-content {
            page-break-inside: avoid;
          }
          
          /* Allow page breaks between major sections */
          .receipt-section {
            page-break-inside: avoid;
            page-break-after: auto;
          }
          
          /* Prevent breaking inside important elements */
          table {
            page-break-inside: auto;
          }
          
          tr {
            page-break-inside: avoid;
            page-break-after: auto;
          }
          
          thead {
            display: table-header-group;
          }
          
          tfoot {
            display: table-footer-group;
          }
          
          /* Terms section - allow breaks but keep sections together */
          .terms-section {
            page-break-before: always;
          }
          
          .terms-section > div {
            page-break-inside: avoid;
          }
          
          /* Prevent orphaned headings */
          h3 {
            page-break-after: avoid;
            page-break-inside: avoid;
          }
          
          /* Keep lists together when possible */
          ul {
            page-break-inside: avoid;
          }
          
          /* Allow breaks between list items if needed */
          li {
            page-break-inside: avoid;
          }
          
          /* Prevent financial summary from being split across pages */
          .receipt-financial-summary {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            page-break-after: auto;
          }
          
          .receipt-financial-summary > div {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          
          /* Keep Total row together */
          .receipt-financial-summary .flex {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
        }
        
        /* Screen styles - show main header, hide small header */
        .print-logo-header {
          display: none;
        }
        
        .receipt-main-header {
          display: block;
        }
      `}</style>

      {/* Print Logo Header - Only visible in print/PDF */}
      <div className="print-logo-header">
        <img
          src={logoUrl}
          alt={company?.name ? `${company.name} Logo` : "Retro vGame Logo"}
          onError={(e) => {
            if (e.target.src !== "/Retro vGame_logo.png") {
              e.target.src = "/Retro vGame_logo.png";
            }
          }}
          className="w-full h-[200px] object-contain"
        />
      </div>

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
          className="main-content receipt-section"
          style={{
            display: "block",
            width: "100%",
            overflow: "visible",
            visibility: "visible",
            position: "relative",
          }}
        >
          {/* Header with Logo and Company Name - Hidden on first page in PDF, shown in print */}
          <div className="receipt-main-header">
            <ReceiptHeader company={company} />
          </div>

          {/* Spacing between header and content - at least 100px */}
          <div style={{ height: "20px", minHeight: "20px" }}></div>

          {/* Shipping and Vendor Information */}
          <ReceiptShippingInfo
            shippingAddress={shippingAddress}
            vendor={vendor}
            company={company}
          />
          <div
            className="receipt-section"
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

        {/* Terms and Conditions - Static Content (starts on new page) */}
        <div className="terms-section receipt-section" style={{ marginTop: "1000px" }}>
          <TermsAndConditions />
        </div>
      </div>
    </>
  );
};

export default ReceiptTemplate;
