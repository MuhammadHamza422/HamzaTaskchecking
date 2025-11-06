import React, { useState, useEffect, useRef } from "react";
import { Modal, Button, Spin, message } from "antd";
import { Printer, Download, X } from "lucide-react";
import html2canvas from "html2canvas-pro";
import jsPDF from "jspdf";
import Swal from "sweetalert2";
import { getPurchaseOrderReceipt } from "../../../api/procurement";
import dayjs from "dayjs";

/**
 * Purchase Order Receipt Modal
 * Displays receipt preview and allows PDF download
 */
const PurchaseOrderReceiptModal = ({ visible, onCancel, poId }) => {
  const [receiptData, setReceiptData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const printRef = useRef(null);

  useEffect(() => {
    if (visible && poId) {
      loadReceiptData();
    }
  }, [visible, poId]);

  const loadReceiptData = async () => {
    setLoading(true);
    try {
      const response = await getPurchaseOrderReceipt(poId);
      if (response.success) {
        setReceiptData(response.data);
      } else {
        throw new Error(
          response.error?.message || "Failed to load receipt data"
        );
      }
    } catch (error) {
      console.error("Failed to load receipt:", error);
      message.error(
        error?.response?.data?.error?.message || "Failed to load receipt data"
      );
      Swal.fire({
        icon: "error",
        title: "Error",
        text:
          error?.response?.data?.error?.message ||
          "Failed to load receipt data",
      });
    } finally {
      setLoading(false);
    }
  };

  // Format currency
  const formatCurrency = (amount, currency = "USD") => {
    if (!amount && amount !== 0) {
      if (currency === "JPY") return "¥0";
      return "$0.00";
    }

    // JPY doesn't use decimal places
    if (currency === "JPY") {
      return new Intl.NumberFormat("ja-JP", {
        style: "currency",
        currency: "JPY",
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(amount);
    }

    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency || "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  // Format date
  const formatDate = (isoString) => {
    if (!isoString) return "-";
    return dayjs(isoString).format("MM/DD/YYYY");
  };

  // Generate PDF with proper page breaks
  const generatePDF = async () => {
    if (!printRef.current || !receiptData) {
      message.error("Receipt content not found");
      return;
    }

    setDownloading(true);
    try {
      // Wait for images to load
      await new Promise((resolve) => setTimeout(resolve, 500));

      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      // A4 dimensions in mm
      const pageWidth = 210;
      const pageHeight = 297;
      const margin = 10;
      const contentWidth = pageWidth - 2 * margin;
      const contentHeight = pageHeight - 2 * margin;

      // Capture the entire receipt content
      const canvas = await html2canvas(printRef.current, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: "#ffffff",
        width: printRef.current.scrollWidth,
        height: printRef.current.scrollHeight,
        windowWidth: printRef.current.scrollWidth,
        windowHeight: printRef.current.scrollHeight,
      });

      // Calculate image dimensions in PDF units (mm)
      const imgWidth = contentWidth; // Use full content width
      const imgHeight = (canvas.height * contentWidth) / canvas.width;

      // Calculate number of pages needed
      const totalPages = Math.ceil(imgHeight / contentHeight);

      // Process each page with proper cropping to avoid duplication
      for (let pageIndex = 0; pageIndex < totalPages; pageIndex++) {
        if (pageIndex > 0) {
          pdf.addPage();
        }

        // Calculate the source position in the canvas (in pixels)
        const sourceY = (pageIndex * contentHeight * canvas.width) / contentWidth;
        const sourceHeight = Math.min(
          (contentHeight * canvas.width) / contentWidth,
          canvas.height - sourceY
        );

        // Create a temporary canvas for this page slice
        const pageCanvas = document.createElement("canvas");
        pageCanvas.width = canvas.width;
        pageCanvas.height = sourceHeight;
        const pageCtx = pageCanvas.getContext("2d");

        // Fill with white background
        pageCtx.fillStyle = "#ffffff";
        pageCtx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);

        // Draw the cropped portion from the original canvas
        pageCtx.drawImage(
          canvas,
          0, // source x
          sourceY, // source y (start position)
          canvas.width, // source width
          sourceHeight, // source height (how much to take)
          0, // destination x
          0, // destination y
          canvas.width, // destination width
          sourceHeight // destination height
        );

        // Convert to image data
        const pageImgData = pageCanvas.toDataURL("image/png", 0.95);

        // Calculate the height of this page slice in mm
        const pageSliceHeight = Math.min(
          contentHeight,
          imgHeight - pageIndex * contentHeight
        );

        // Add the cropped image to PDF at the top of the page
        pdf.addImage(
          pageImgData,
          "PNG",
          margin, // x position
          margin, // y position (start at top)
          contentWidth, // width
          pageSliceHeight // height (only this page's portion)
        );
      }

      // Save PDF
      const fileName = `receipt-${
        receiptData.purchaseOrder.reference || poId
      }.pdf`;
      pdf.save(fileName);

      Swal.fire({
        icon: "success",
        title: "PDF Generated!",
        text: "Receipt PDF has been downloaded",
        timer: 2000,
        showConfirmButton: false,
      });
    } catch (error) {
      console.error("PDF generation error:", error);
      Swal.fire({
        icon: "error",
        title: "PDF Generation Failed",
        text: error.message || "Failed to generate PDF",
      });
    } finally {
      setDownloading(false);
    }
  };

  // Handle print
  const handlePrint = () => {
    if (!printRef.current) return;
    const printWindow = window.open("", "_blank");
    printWindow.document.write(`
      <html>
        <head>
          <title>Purchase Order Receipt - ${
            receiptData?.purchaseOrder?.reference || ""
          }</title>
          <style>
            body { margin: 0; padding: 0; }
            @media print {
              @page { margin: 0; }
              body { margin: 0; padding: 0; }
            }
          </style>
        </head>
        <body>
          ${printRef.current.innerHTML}
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  };

  if (!receiptData && !loading) {
    return null;
  }

  return (
    <Modal
      open={visible}
      onCancel={onCancel}
      footer={null}
      width="90%"
      style={{ maxWidth: 1200 }}
      className="receipt-modal"
      closeIcon={<X size={20} />}
    >
      <div className="p-4">
        {/* Header with Actions */}
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Purchase Order Receipt</h2>
          <div className="flex gap-2">
            <Button
              icon={<Printer size={16} />}
              onClick={handlePrint}
              disabled={loading || !receiptData}
            >
              Print
            </Button>
            <Button
              type="primary"
              icon={<Download size={16} />}
              onClick={generatePDF}
              loading={downloading}
              disabled={loading || !receiptData}
            >
              Download PDF
            </Button>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex justify-center items-center py-20">
            <Spin size="large" />
          </div>
        )}

        {/* Receipt Content */}
        {receiptData && (
          <div
            ref={printRef}
            className="bg-white p-8 receipt-print-area"
            style={{
              minHeight: "297mm",
              width: "210mm",
              margin: "0 auto",
              fontFamily: "Arial, sans-serif",
              fontSize: "14px",
              lineHeight: "1.6",
              color: "#000",
            }}
          >
            {/* Receipt Template will be rendered here */}
            <ReceiptTemplate
              data={receiptData}
              formatCurrency={formatCurrency}
              formatDate={formatDate}
            />
          </div>
        )}
      </div>
    </Modal>
  );
};

/**
 * Receipt Template Component
 * Renders the actual receipt content
 */
const ReceiptTemplate = ({ data, formatCurrency, formatDate }) => {
  const {
    company,
    purchaseOrder,
    buyer,
    shippingAddress,
    vendor,
    orderDetails,
    lineItems,
    boxesSummary,
    kitsSummary,
    financialSummary,
  } = data;

  const currency = purchaseOrder?.currency || "USD";

  return (
    <div className="receipt-content">
      {/* Header with Logo and Company Name - Matching Image Design */}
      <div className="mb-10">
        <div className="flex items-start gap-4 mb-4">
          {/* Logo Container - Square with blue background */}
          <div className="rounded w-[150px] h-auto flex flex-col items-center justify-center p-2 shrink-0">
            <img
              src="/Retro vGame_logo.png"
              alt="Logo"
              className="object-contain"
            />
          </div>
          {/* Company Name */}
          {/* <div className="pt-2">
            <h1 className="text-[22px] font-bold text-gray-900">
              {company?.name || "Retro vGames"}
            </h1>
          </div> */}
        </div>
      </div>

      {/* Shipping and Vendor Information - Two Column Layout */}
      <div className="flex justify-between mb-10">
        {/* Shipping Address */}
        <div>
          <h3 className="text-sm font-semibold text-gray-900 mb-2">
            Shipping address:
          </h3>
          <div className="text-sm text-gray-900 leading-relaxed">
            <div className="font-medium">{shippingAddress?.name || ""}</div>
            <div>{shippingAddress?.country || ""}</div>
          </div>
        </div>

        {/* Vendor Information */}
        <div className="text-sm text-gray-900 leading-relaxed">
          <div className="font-semibold mb-1">{vendor?.name || ""}</div>
          <div>
            {[vendor?.address?.country || "", vendor?.address?.zipCode || ""]
              .filter(Boolean)
              .join(", ")}
          </div>
          <div>{vendor?.address?.addressLine1 || ""}</div>
          <div>{vendor?.address?.city || ""}</div>
          <div>{vendor?.address?.province || ""}</div>
          {vendor?.phone && (
            <div className="mt-2 flex items-center gap-1">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
              </svg>
              <span>{vendor.phone}</span>
            </div>
          )}
        </div>
      </div>

      {/* Purchase Order Number - Large Blue Text */}
      <div className="text-center mb-10">
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
            {formatDate(orderDetails?.orderDate || purchaseOrder?.createdDate)}
          </div>
        </div>
        <div>
          <div className="font-semibold text-orange-600 mb-2">
            Expected Arrival:
          </div>
          <div className="text-gray-900 font-medium">
            {formatDate(
              orderDetails?.expectedArrival || purchaseOrder?.orderDeadline
            )}
          </div>
        </div>
      </div>

      {/* Line Items Table */}
      <div className="mb-10">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b-2 border-gray-400 bg-gray-50">
              <th className="text-left py-3 px-4 font-bold text-gray-900">
                Description
              </th>
              <th className="text-right py-3 px-4 font-bold text-gray-900">
                Qty
              </th>
              <th className="text-right py-3 px-4 font-bold text-gray-900 whitespace-nowrap">
                Unit Price
              </th>
              <th className="text-right py-3 px-4 font-bold text-gray-900">
                Disc.
              </th>
              <th className="text-right py-3 px-4 font-bold text-gray-900">
                Taxes
              </th>
              <th className="text-right py-3 px-4 font-bold text-gray-900">
                Amount
              </th>
            </tr>
          </thead>
          <tbody>
            {lineItems?.map((item, index) => (
              <tr key={index} className="border-b border-gray-300">
                <td className="py-3 px-4 text-gray-900">
                  <div className="font-medium">{item.name || "-"}</div>
                  {item.type === "kit" && item.components && (
                    <div className="text-xs text-gray-600 mt-1 italic">
                      Components:{" "}
                      {item.components.map((comp, i) => (
                        <span key={i}>
                          {comp.name} x{comp.quantity}
                          {i < item.components.length - 1 && ", "}
                        </span>
                      ))}
                    </div>
                  )}
                  {item.sku && (
                    <div className="text-xs text-gray-500 mt-1">
                      SKU: {item.sku}
                    </div>
                  )}
                </td>
                <td className="py-3 px-4 text-right text-gray-900 whitespace-nowrap">
                  {item.quantity?.toLocaleString() || 0} {item.uom || ""}
                </td>
                <td className="py-3 px-4 text-right text-gray-900">
                  {formatCurrency(item.unitPrice || 0, currency)}
                </td>
                <td className="py-3 px-4 text-right text-gray-900">
                  {item.discount?.toFixed(2) || "0.00"}%
                </td>
                <td className="py-3 px-4 text-right text-gray-900">
                  {item.taxes ? formatCurrency(item.taxes, currency) : "-"}
                </td>
                <td className="py-3 px-4 text-right text-gray-900 font-semibold">
                  {formatCurrency(
                    item.totalAmount || item.amount || 0,
                    currency
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Financial Summary */}
      <div className="flex justify-end mb-10">
        <div className="w-96 text-sm">
          <div className="flex justify-between py-3 border-b-2 border-gray-300">
            <span className="text-gray-900 font-semibold text-base">
              Untaxed Amount
            </span>
            <span className="text-gray-900 font-semibold text-base">
              {formatCurrency(financialSummary?.untaxedAmount || 0, currency)}
            </span>
          </div>
          <div className="flex justify-between py-4 mt-2">
            <span className="text-blue-600 font-bold text-xl">Total</span>
            <span className="text-blue-600 font-bold text-xl">
              {formatCurrency(financialSummary?.total || 0, currency)}
            </span>
          </div>
        </div>
      </div>

      {/* Payment Terms */}
      {/* <div className="mb-10 text-sm pb-6 border-b-2 border-gray-300">
        <span className="font-semibold text-gray-900">Payment Terms:</span>
        <span className="text-gray-900 ml-2">
          {orderDetails?.paymentTerms || "-"}
        </span>
      </div> */}

      {/* Boxes Summary (if exists) - Table Format */}
      {boxesSummary && boxesSummary.totalBoxes > 0 && (
        <div className="mb-8 text-sm pb-6">
          <h3 className="font-bold text-gray-900 mb-4 text-base">
            Boxes Created ({boxesSummary.totalBoxes})
          </h3>
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b-2 border-gray-400 bg-gray-50">
                <th className="text-left py-2 px-3 font-bold text-gray-900">
                  Box ID
                </th>
                <th className="text-left py-2 px-3 font-bold text-gray-900">
                  Name
                </th>
                <th className="text-right py-2 px-3 font-bold text-gray-900">
                  Items Count
                </th>
                <th className="text-right py-2 px-3 font-bold text-gray-900">
                  Total Quantity
                </th>
              </tr>
            </thead>
            <tbody>
              {boxesSummary.boxes?.map((box, index) => (
                <tr
                  key={index}
                  className="border-b border-gray-200 hover:bg-gray-50"
                >
                  <td className="py-2 px-3 text-gray-900 font-medium">
                    {box.boxId}
                  </td>
                  <td className="py-2 px-3 text-gray-900">{box.name || "-"}</td>
                  <td className="py-2 px-3 text-right text-gray-900">
                    {box.itemsCount || 0}
                  </td>
                  <td className="py-2 px-3 text-right text-gray-900 font-medium">
                    {box.totalQuantity || 0}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Kits Summary (if exists) - Table Format */}
      {kitsSummary && kitsSummary.totalKits > 0 && (
        <div className="mb-8 text-sm pb-6">
          <h3 className="font-bold text-gray-900 mb-4 text-base">
            Kits Created ({kitsSummary.totalKits})
          </h3>
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b-2 border-gray-400 bg-gray-50">
                <th className="text-left py-2 px-3 font-bold text-gray-900">
                  Kit ID
                </th>
                <th className="text-left py-2 px-3 font-bold text-gray-900">
                  Kit Name
                </th>
                <th className="text-right py-2 px-3 font-bold text-gray-900">
                  Quantity
                </th>
                <th className="text-right py-2 px-3 font-bold text-gray-900">
                  Components
                </th>
              </tr>
            </thead>
            <tbody>
              {kitsSummary.kits?.map((kit, index) => (
                <tr
                  key={index}
                  className="border-b border-gray-200 hover:bg-gray-50"
                >
                  <td className="py-2 px-3 text-gray-900 font-medium">
                    {kit.kitId}
                  </td>
                  <td className="py-2 px-3 text-gray-900">{kit.name || "-"}</td>
                  <td className="py-2 px-3 text-right text-gray-900">
                    {kit.quantity || 0}
                  </td>
                  <td className="py-2 px-3 text-right text-gray-900 font-medium">
                    {kit.componentsCount || 0}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Terms and Conditions - Static Content */}
      <TermsAndConditions />
    </div>
  );
};

/**
 * Terms and Conditions Component
 * Static content that appears after the table
 */
const TermsAndConditions = () => {
  return (
    <div className="mt-10 text-xs text-gray-900 space-y-5 pt-4">
      <p className="mb-4 text-xl font-bold">Payment Terms:</p>
      <div>
        <h3 className="font-medium text-lg mb-3 text-gray-900">
          Quality Standards
        </h3>
        <p className="mb-2 text-gray-900">
          <strong>Refurbished Items:</strong> s: All items must meet the
          required specifications outlined in the purchase order, ensuring they
          are defect-free and fully functional
        </p>
        <p className="mb-2 text-gray-900">
          <strong>1.2 Adherence to Retro VGames Standards:</strong>
        </p>
        <ul className="list-disc list-inside ml-4 space-y-1 text-gray-900">
          <li>
            Complete functionality testing (graphics, audio, and connectivity)
          </li>
          <li>Professional repair of defects.</li>
          <li>
            Aesthetic restoration to a near-new condition (removal of stickers,
            scratches, etc.).
          </li>
          <li>
            Update to the latest North American/English firmware version and
            factory reset where applicable.
          </li>
        </ul>
      </div>

      <div>
        <h3 className="font-bold text-base mb-3 text-gray-900">
          Packaging Requirements
        </h3>
        <p className="mb-2 text-gray-900">
          <strong>2.1 Secure Packaging:</strong> Items must be packaged securely
          to prevent damage during transit. Use durable materials, such as
          bubble wrap and sturdy boxes, to minimize movement.
        </p>
        <p className="mb-2 text-gray-900">
          <strong>2.2 Specific Packaging for Consoles and Accessories:</strong>
        </p>
        <ul className="list-disc list-inside ml-4 space-y-1 text-gray-900">
          <li>
            <strong>Consoles (Wii, N64, Xbox, PlayStation):</strong> Must be
            bundled with all required accessories (controllers, cords, etc.) in
            a single bubble-wrapped package.
          </li>
          <li>
            <strong>Handheld Consoles:</strong> Must include accessories such as
            adapters, styluses, and SD cards, and be packed together securely.
          </li>
        </ul>
        <p className="mb-2 text-gray-900">
          <strong>2.3 Clear Labeling:</strong> Packages must include accurate
          labels indicating the contents and any special handling instructions.
        </p>
      </div>

      <div>
        <h3 className="font-bold text-base mb-3 text-gray-900">
          Battery Requirements for Handheld Devices
        </h3>
        <p className="text-gray-900">
          <strong>3.1 Battery Capacity:</strong> All handheld devices must have
          a battery capacity of at least 80% of the original specification.
        </p>
      </div>

      <div>
        <h3 className="font-bold text-base mb-3 text-gray-900">
          Delivery and Lead Times
        </h3>
        <p className="mb-2 text-gray-900">
          <strong>4.1 Timely Delivery:</strong> Suppliers must adhere to the
          delivery timelines agreed upon in the purchase order. Late deliveries
          may incur penalties.
        </p>
        <p className="text-gray-900">
          <strong>4.2 Communication:</strong> Notify Retro VGames immediately of
          any potential delays or issues affecting order fulfillment.
        </p>
      </div>

      <div>
        <h3 className="font-bold text-base mb-3 text-gray-900">
          Legal Compliance
        </h3>
        <p className="text-gray-900">
          <strong>5.1 Regulatory Adherence:</strong> All items must comply with
          applicable local and international laws, including product safety,
          import/export regulations, and intellectual property laws.
        </p>
      </div>

      <div>
        <h3 className="font-bold text-base mb-3 text-gray-900">
          Payment Terms
        </h3>
        <p className="text-gray-900">
          <strong>6.1 Invoicing and Payment:</strong> Payments will be processed
          as per the terms outlined in the purchase order. Any discrepancies in
          goods or invoices must be resolved promptly to avoid payment delays.
        </p>
      </div>

      <div>
        <h3 className="font-bold text-base mb-3 text-gray-900">
          Inspection and Returns
        </h3>
        <p className="mb-2 text-gray-900">
          <strong>7.1 Quality Inspection:</strong> Retro VGames reserves the
          right to inspect items upon receipt. Items that do not meet the
          specified quality standards will be rejected.
        </p>
        <p className="text-gray-900">
          <strong>7.2 Replacement and Refunds:</strong> Rejected items must be
          replaced or refunded at the supplier's expense, including return
          shipping costs.
        </p>
      </div>

      <div>
        <h3 className="font-bold text-base mb-3 text-gray-900">
          Confidentiality
        </h3>
        <p className="text-gray-900">
          <strong>8.1 Supplier Obligation:</strong> All details of transactions,
          specifications, and agreements must remain confidential unless Retro
          VGames provides written approval for disclosure.
        </p>
      </div>

      <div>
        <h3 className="font-bold text-base mb-3 text-gray-900">
          Inbound Shipment Organization and Packaging
        </h3>
        <p className="text-gray-900">
          <strong>9.1 Palletization Requirement:</strong> For large inbound
          shipments containing hundreds of games, all items must be palletized
          for easy handling and inventory management. Each box should be clearly
          labeled with a number that corresponds to a detailed inventory sheet,
          outlining the contents of each box.
        </p>
      </div>

      <div>
        <h3 className="font-bold text-base mb-3 text-gray-900">
          Termination of Agreement
        </h3>
        <p className="text-gray-900">
          <strong>10.1 Grounds for Termination:</strong> Retro VGames reserves
          the right to terminate agreements with suppliers who repeatedly breach
          quality, delivery, or compliance terms.
        </p>
      </div>
    </div>
  );
};

export default PurchaseOrderReceiptModal;
