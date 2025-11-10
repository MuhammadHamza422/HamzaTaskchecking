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

  // Clear data when modal closes
  useEffect(() => {
    if (!visible) {
      setReceiptData(null);
      setLoading(false);
    }
  }, [visible]);

  // Load fresh data every time modal opens
  useEffect(() => {
    if (visible && poId) {
      // Always load fresh data when modal opens
      loadReceiptData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, poId]);

  const loadReceiptData = async () => {
    // Clear old data first
    setReceiptData(null);
    setLoading(true);
    try {
      // Always fetch fresh data - add timestamp to prevent caching
      const res = await getPurchaseOrderReceipt(poId);
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
        else if (
          res.hasOwnProperty("company") ||
          res.hasOwnProperty("purchaseOrder")
        ) {
          receiptData = res;
        }
        else if (res.data) {
          receiptData = res.data;
        }
        else {
          receiptData = res;
        }
      }

      if (!receiptData) {
        throw new Error("Empty response data");
      }
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
  

  // Helper function to load image and convert to base64
  const loadImageAsBase64 = (url) => {
    return new Promise((resolve, reject) => {
      // If it's a data URL or base64, return as is
      if (url.startsWith("data:") || url.startsWith("blob:")) {
        resolve(url);
        return;
      }
      
      const img = new Image();
      // Try with CORS first
      img.crossOrigin = "anonymous";
      
      img.onload = () => {
        try {
          const canvas = document.createElement("canvas");
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext("2d");
          ctx.drawImage(img, 0, 0);
          const base64 = canvas.toDataURL("image/png");
          resolve(base64);
        } catch (e) {
          // If canvas fails, try fallback
          if (url !== "/Retro vGame_logo.png") {
            loadImageAsBase64("/Retro vGame_logo.png").then(resolve).catch(reject);
          } else {
            reject(e);
          }
        }
      };
      
      img.onerror = () => {
        // Try fallback logo
        if (url !== "/Retro vGame_logo.png") {
          loadImageAsBase64("/Retro vGame_logo.png").then(resolve).catch(reject);
        } else {
          // If fallback also fails, try without CORS
          const img2 = new Image();
          img2.onload = () => {
            try {
              const canvas = document.createElement("canvas");
              canvas.width = img2.width;
              canvas.height = img2.height;
              const ctx = canvas.getContext("2d");
              ctx.drawImage(img2, 0, 0);
              const base64 = canvas.toDataURL("image/png");
              resolve(base64);
            } catch (e) {
              reject(e);
            }
          };
          img2.onerror = () => reject(new Error("Failed to load logo"));
          img2.src = "/Retro vGame_logo.png";
        }
      };
      
      img.src = url;
    });
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
        compress: true, // Enable PDF compression for smaller file size
      });

      // A4 dimensions in mm
      const pageWidth = 210;
      const pageHeight = 297;
      const margin = 10;
      const logoHeaderHeight = 30; // Space reserved for logo header (height of logo)
      const headerContentSpacing = 15; // 50px spacing between header and content (50px ≈ 15mm)
      const contentWidth = pageWidth - 2 * margin;
      const contentHeight = pageHeight - 2 * margin - logoHeaderHeight - headerContentSpacing; // Reserve space for logo and spacing
      
      // Load logo image
      const logoUrl = receiptData?.company?.logo || "/Retro vGame_logo.png";
      let logoBase64 = null;
      try {
        logoBase64 = await loadImageAsBase64(logoUrl);
      } catch (error) {
        console.warn("Failed to load logo, continuing without it:", error);
      }
      
      // Function to add logo header to a page (synchronous for simplicity)
      const addLogoHeader = (pdfPage) => {
        if (logoBase64) {
          try {
            // Use PNG as-is for logo (small file, already loaded)
            // Logo is small so compression impact is minimal
            pdfPage.addImage(
              logoBase64,
              "PNG",
              margin,
              3, // top margin
              50, // logo width in mm
              30  // logo height in mm
            );
          } catch (error) {
            console.warn("Failed to add logo to page:", error);
          }
        }
      };

      // Find the main content and terms sections to split content
      const receiptElement = printRef.current;
      const mainContentElement = receiptElement.querySelector(".main-content");
      const termsElement = receiptElement.querySelector(".terms-section");
      
      // Hide main header logo for PDF generation (we use small header logo instead)
      const mainHeader = receiptElement.querySelector(".receipt-main-header");
      const originalMainHeaderDisplay = mainHeader?.style.display;
      if (mainHeader) {
        mainHeader.style.display = "none";
      }
      
      // Create two separate canvases: one for main content, one for terms
      let mainCanvas, termsCanvas;
      
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
      
      // Restore main header display after capture
      if (mainHeader) {
        if (originalMainHeaderDisplay) {
          mainHeader.style.display = originalMainHeaderDisplay;
        } else {
          mainHeader.style.display = "";
        }
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

          // Add logo header to every page
          addLogoHeader(pdf);

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

          // Use JPEG format with compression for much smaller file size
          const pageImgData = pageCanvas.toDataURL("image/jpeg", 0.80); // JPEG at 80% quality
          const pageSliceHeight = Math.min(
            contentHeight,
            mainImgHeight - pageIndex * contentHeight
          );

          // Add content below logo header with spacing (logo + spacing)
          pdf.addImage(
            pageImgData,
            "JPEG",
            margin,
            margin + logoHeaderHeight + headerContentSpacing, 
            contentWidth,
            pageSliceHeight
          );
        }
      }

      if (termsCanvas) {
        const termsImgWidth = contentWidth;
        const termsImgHeight =
          (termsCanvas.height * contentWidth) / termsCanvas.width;
        const termsPages = Math.ceil(termsImgHeight / contentHeight);

        for (let pageIndex = 0; pageIndex < termsPages; pageIndex++) {
          pdf.addPage();

          addLogoHeader(pdf);

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

          // Use JPEG format with compression for much smaller file size
          const pageImgData = pageCanvas.toDataURL("image/jpeg", 0.80);
          const pageSliceHeight = Math.min(
            contentHeight,
            termsImgHeight - pageIndex * contentHeight
          );

          // Add content below logo header with spacing (logo + spacing)
          pdf.addImage(
            pageImgData,
            "JPEG", 
            margin,
            margin + logoHeaderHeight + headerContentSpacing, 
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
        timer: 1000,
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
    const logoUrl = receiptData?.company?.logo || "/Retro vGame_logo.png";
    const printWindow = window.open("", "_blank");
    printWindow.document.write(`
      <html>
        <head>
          <title>Purchase Order Receipt - ${
            receiptData?.purchaseOrder?.reference || ""
          }</title>
          <style>
            body { 
              margin: 0; 
              padding: 0; 
              font-family: Arial, sans-serif;
            }
            @media print {
              @page { 
                margin: 0; 
                size: A4;
              }
              body { 
                margin: 0; 
                padding: 0; 
              }
              
              /* Print header with logo - appears on every page */
              .print-logo-header {
                position: fixed;
                top: 5mm;
                left: 10mm;
                z-index: 1001;
                height: 220px;
              }
              
              .print-logo-header img {
                height:150px;
                width: auto;
                object-fit: contain;
              }
              
              /* Prevent content from being cut */
              .receipt-content {
                page-break-inside: avoid;
              }
              
              .main-content {
                page-break-inside: avoid;
              }
              
              .receipt-section {
                page-break-inside: avoid;
                page-break-after: auto;
              }
              
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
              
              .terms-section {
                page-break-before: always;
              }
              
              .terms-section > div {
                page-break-inside: avoid;
              }
              
              h3 {
                page-break-after: avoid;
                page-break-inside: avoid;
              }
              
              ul {
                page-break-inside: avoid;
              }
              
              li {
                page-break-inside: avoid;
              }
            }
            
            /* Screen styles */
            .print-logo-header {
              display: block;
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
            {/* <Button
              icon={<Printer size={16} />}
              onClick={handlePrint}
              disabled={loading || !receiptData}
            >
              Print
            </Button> */}
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

        {/* Receipt Content - Only show when not loading and data exists */}
        {!loading && receiptData && (
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
