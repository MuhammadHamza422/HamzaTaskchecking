import React, { useState, useEffect, useRef } from "react";
import { Modal, Button, Spin, message } from "antd";
import { Printer, Download, X } from "lucide-react";
import html2canvas from "html2canvas-pro";
import jsPDF from "jspdf";
import Swal from "sweetalert2";
import { getPurchaseOrderReceipt } from "../../../api/procurement";
import ReceiptTemplate from "./receipt/ReceiptTemplate";
import { formatCurrency, formatDate } from "./receipt/utils";

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
      const res = await getPurchaseOrderReceipt(poId);
      console.log("raw API response:", res);
  
      // The API function already unwraps axios response, so res is { success: true, data: {...} }
      // Normalize payload: extract the actual data object
      let receiptData = null;

      if (res && typeof res === "object") {
        // If response has success and data properties (wrapped response)
        if (res.hasOwnProperty("success") && res.hasOwnProperty("data")) {
          if (res.success === true) {
            receiptData = res.data;
          } else {
            throw new Error(res.error?.message || "API reported failure");
          }
        }
        // If response is already the data object (unwrapped)
        else if (
          res.hasOwnProperty("company") ||
          res.hasOwnProperty("purchaseOrder")
        ) {
          receiptData = res;
        }
        // Fallback: try res.data if it exists
        else if (res.data) {
          receiptData = res.data;
        }
        // Last resort: use res as-is
        else {
          receiptData = res;
        }
      }

      if (!receiptData) {
        throw new Error("Empty response data");
      }
  
      console.log("Normalized receipt data:", receiptData);
      console.log("allLineItems:", receiptData.allLineItems);
      console.log("boxesSummary:", receiptData.boxesSummary);
      console.log("looseLineItems:", receiptData.looseLineItems);
      console.log("lineItems:", receiptData.lineItems);

      setReceiptData(receiptData);
    } catch (error) {
      console.error("Failed to load receipt:", error);
      message.error(error?.message || "Failed to load receipt data");
      Swal.fire({
        icon: "error",
        title: "Error",
        text: error?.message || "Failed to load receipt data",
      });
    } finally {
      setLoading(false);
    }
  };
  

  // Generate PDF with proper page breaks - static content starts on page 2
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

      // Find the main content and terms sections to split content
      const receiptElement = printRef.current;
      const mainContentElement = receiptElement.querySelector(".main-content");
      const termsElement = receiptElement.querySelector(".terms-section");
      
      // Create two separate canvases: one for main content, one for terms
      let mainCanvas, termsCanvas;
      
      // Capture main content (everything before terms)
      if (mainContentElement) {
        mainCanvas = await html2canvas(mainContentElement, {
          scale: 2,
          useCORS: true,
          logging: false,
          backgroundColor: "#ffffff",
          width: mainContentElement.scrollWidth,
          height: mainContentElement.scrollHeight,
        });
      } else {
        // Fallback: capture entire content if main content section not found
        mainCanvas = await html2canvas(receiptElement, {
          scale: 2,
          useCORS: true,
          logging: false,
          backgroundColor: "#ffffff",
          width: receiptElement.scrollWidth,
          height: receiptElement.scrollHeight,
        });
      }
      
      // Capture terms content separately
      if (termsElement) {
        termsCanvas = await html2canvas(termsElement, {
          scale: 2,
          useCORS: true,
          logging: false,
          backgroundColor: "#ffffff",
          width: termsElement.scrollWidth,
          height: termsElement.scrollHeight,
        });
      }

      // Add main content to first page(s)
      if (mainCanvas) {
        const mainImgWidth = contentWidth;
        const mainImgHeight =
          (mainCanvas.height * contentWidth) / mainCanvas.width;
        const mainPages = Math.ceil(mainImgHeight / contentHeight);

        for (let pageIndex = 0; pageIndex < mainPages; pageIndex++) {
          if (pageIndex > 0) {
            pdf.addPage();
          }

          const sourceY =
            (pageIndex * contentHeight * mainCanvas.width) / contentWidth;
          const sourceHeight = Math.min(
            (contentHeight * mainCanvas.width) / contentWidth,
            mainCanvas.height - sourceY
          );

          const pageCanvas = document.createElement("canvas");
          pageCanvas.width = mainCanvas.width;
          pageCanvas.height = sourceHeight;
          const pageCtx = pageCanvas.getContext("2d");

          pageCtx.fillStyle = "#ffffff";
          pageCtx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);

          pageCtx.drawImage(
            mainCanvas,
            0,
            sourceY,
            mainCanvas.width,
            sourceHeight,
            0,
            0,
            mainCanvas.width,
            sourceHeight
          );

          const pageImgData = pageCanvas.toDataURL("image/png", 0.95);
          const pageSliceHeight = Math.min(
            contentHeight,
            mainImgHeight - pageIndex * contentHeight
          );

          pdf.addImage(
            pageImgData,
            "PNG",
            margin,
            margin,
            contentWidth,
            pageSliceHeight
          );
        }
      }

      // Add terms content starting on a new page (page 2+)
      if (termsCanvas) {
        const termsImgWidth = contentWidth;
        const termsImgHeight =
          (termsCanvas.height * contentWidth) / termsCanvas.width;
        const termsPages = Math.ceil(termsImgHeight / contentHeight);

        for (let pageIndex = 0; pageIndex < termsPages; pageIndex++) {
          // Always start terms on a new page
          pdf.addPage();

          const sourceY =
            (pageIndex * contentHeight * termsCanvas.width) / contentWidth;
          const sourceHeight = Math.min(
            (contentHeight * termsCanvas.width) / contentWidth,
            termsCanvas.height - sourceY
          );

          const pageCanvas = document.createElement("canvas");
          pageCanvas.width = termsCanvas.width;
          pageCanvas.height = sourceHeight;
          const pageCtx = pageCanvas.getContext("2d");

          pageCtx.fillStyle = "#ffffff";
          pageCtx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);

          pageCtx.drawImage(
            termsCanvas,
            0,
            sourceY,
            termsCanvas.width,
            sourceHeight,
            0,
            0,
            termsCanvas.width,
            sourceHeight
          );

          const pageImgData = pageCanvas.toDataURL("image/png", 0.95);
          const pageSliceHeight = Math.min(
            contentHeight,
            termsImgHeight - pageIndex * contentHeight
          );

          pdf.addImage(
            pageImgData,
            "PNG",
            margin,
            margin,
            contentWidth,
            pageSliceHeight
          );
        }
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

  // if (!visible) return null;

  // if (!receiptData && !loading) {
  //   return null;
  // }

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
      <div 
        className="p-4"
        style={{
          overflow: "auto",
          maxHeight: "90vh",
        }}
      >
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
              overflow: "visible",
              visibility: "visible",
              display: "block",
              position: "relative",
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


export default PurchaseOrderReceiptModal;
