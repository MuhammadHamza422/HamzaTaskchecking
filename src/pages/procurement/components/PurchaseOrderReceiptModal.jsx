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
        } else if (
          res.hasOwnProperty("company") ||
          res.hasOwnProperty("purchaseOrder")
        ) {
          receiptData = res;
        } else if (res.data) {
          receiptData = res.data;
        } else {
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
            loadImageAsBase64("/Retro vGame_logo.png")
              .then(resolve)
              .catch(reject);
          } else {
            reject(e);
          }
        }
      };

      img.onerror = () => {
        // Try fallback logo
        if (url !== "/Retro vGame_logo.png") {
          loadImageAsBase64("/Retro vGame_logo.png")
            .then(resolve)
            .catch(reject);
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
      const contentHeight =
        pageHeight - 2 * margin - logoHeaderHeight - headerContentSpacing; // Reserve space for logo and spacing

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
              30 // logo height in mm
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

      // Helper function to find row boundaries in the DOM (before canvas capture)
      const getRowBoundaries = (element) => {
        const rows = [];
        if (!element) return rows;

        const tableRows = element.querySelectorAll(
          "table tbody tr, table thead tr"
        );

        tableRows.forEach((row) => {
          const rect = row.getBoundingClientRect();
          const containerRect = element.getBoundingClientRect();
          const relativeTop = rect.top - containerRect.top;
          const relativeBottom = rect.bottom - containerRect.top;

          rows.push({
            top: relativeTop,
            bottom: relativeBottom,
            height: relativeBottom - relativeTop,
          });
        });

        // Also check for financial summary section
        const financialSummary = element.querySelector(
          ".receipt-financial-summary"
        );
        if (financialSummary) {
          const rect = financialSummary.getBoundingClientRect();
          const containerRect = element.getBoundingClientRect();
          const relativeTop = rect.top - containerRect.top;
          const relativeBottom = rect.bottom - containerRect.top;

          rows.push({
            top: relativeTop,
            bottom: relativeBottom,
            height: relativeBottom - relativeTop,
            isFinancialSummary: true,
          });
        }

        return rows.sort((a, b) => a.top - b.top);
      };

      // Get row boundaries BEFORE capturing canvas (positions are relative to element)
      const targetElement = mainContentElement || receiptElement;
      const rowBoundaries = getRowBoundaries(targetElement);

      // Create two separate canvases: one for main content, one for terms
      let mainCanvas, termsCanvas;
      const canvasScale = 2; // html2canvas scale factor

      if (mainContentElement) {
        mainCanvas = await html2canvas(mainContentElement, {
          scale: canvasScale,
          useCORS: true,
          logging: false,
          backgroundColor: "#ffffff",
          width: mainContentElement.scrollWidth,
          height: mainContentElement.scrollHeight,
        });
      } else {
        // Fallback: capture entire content if main content section not found
        mainCanvas = await html2canvas(receiptElement, {
          scale: canvasScale,
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
          scale: canvasScale,
          useCORS: true,
          logging: false,
          backgroundColor: "#ffffff",
          width: termsElement.scrollWidth,
          height: termsElement.scrollHeight,
        });
      }

      // Helper function to find safe slice position (avoid cutting rows)
      // Returns the safe end position and info about which row would be cut
      const findSafeSlicePosition = (
        startY,
        endY,
        canvasHeight,
        canvasWidth,
        elementHeight,
        pageContentHeight
      ) => {
        // Convert canvas Y coordinates to DOM coordinates
        const domStartY = startY / canvasScale;
        const domEndY = endY / canvasScale;

        // Find the first row that would actually be cut by the desired end position
        // We only care about rows that would be cut, not rows that fit completely
        let firstCutRow = null;
        let firstCutRowTop = null;
        let financialSummaryRow = null;

        for (const row of rowBoundaries) {
          const rowTop = row.top;
          const rowBottom = row.bottom;

          // Track financial summary BEFORE skipping - we need to check it even if it's after desired end
          if (row.isFinancialSummary) {
            financialSummaryRow = row;
            // Don't process it here, we'll handle it after checking all table rows
            continue;
          }

          // Skip rows that are completely before the slice start (already on previous pages)
          if (rowBottom <= domStartY) {
            continue;
          }

          // Skip rows that are completely after the desired end (will be on next page anyway)
          if (rowTop >= domEndY) {
            continue;
          }

          // Check if this row would be cut (intersects with the slice but not completely contained)
          // A row is "cut" if the slice end falls somewhere in the middle of the row
          if (rowTop < domEndY && rowBottom > domEndY && rowTop > domStartY) {
            // This row would be cut - the slice end falls in the middle of this row
            // Record it but continue checking to find the first one
            if (!firstCutRow || rowTop < firstCutRowTop) {
              firstCutRow = row;
              firstCutRowTop = rowTop;
            }
          }
        }

        // If we found a row that would be cut, end the page at that row's top
        if (firstCutRow) {
          return {
            safeEndY: firstCutRowTop * canvasScale,
            cutRow: firstCutRow,
          };
        }

        // No table row would be cut
        // Now check if financial summary is on this page and can fit
        if (financialSummaryRow) {
          const fsTop = financialSummaryRow.top;
          const fsBottom = financialSummaryRow.bottom;
          const fsHeight = financialSummaryRow.height;

          // Check if financial summary is on this page (starts after page start)
          if (fsTop >= domStartY) {
            const pageContentHeightPx =
              pageContentHeight || domEndY - domStartY;
            const spaceNeeded = fsBottom - domStartY; // Total space needed from page start to end of financial summary

            // Allow extending up to 80% more than normal page height to include financial summary
            // This gives plenty of room if there's space after the table
            const maxPageHeight = pageContentHeightPx * 1.8;

            // If financial summary is completely within the desired end, it's fine
            if (fsBottom <= domEndY) {
              // Financial summary fits completely - no action needed
              // Use the desired end position
            }
            // If financial summary extends beyond desired end (or starts after it)
            else {
              // Check if it can fit by extending the page
              if (spaceNeeded <= maxPageHeight) {
                // It can fit - extend page to include the full financial summary
                return {
                  safeEndY: fsBottom * canvasScale,
                  cutRow: null,
                };
              } else {
                // Can't fit even with extension - move to next page
                // Only do this if financial summary starts within the page
                // If it starts after desired end and can't fit, let it go to next page naturally
                if (fsTop < domEndY) {
                  return {
                    safeEndY: fsTop * canvasScale,
                    cutRow: financialSummaryRow,
                  };
                }
                // Otherwise, it will naturally go to next page
              }
            }
          }
        }

        // No row would be cut, use the desired end position
        return {
          safeEndY: endY,
          cutRow: null,
        };
      };

      // Add main content to first page(s)
      if (mainCanvas) {
        const mainImgWidth = contentWidth;
        const mainImgHeight =
          (mainCanvas.height * contentWidth) / mainCanvas.width;

        // Calculate safe page slices
        // Convert contentHeight (mm) to canvas pixels
        // contentHeight is in mm, we need to convert to pixels at the canvas scale
        const elementHeight = targetElement.scrollHeight; // DOM element height in pixels
        const canvasToElementRatio = mainCanvas.height / elementHeight; // Should be close to canvasScale

        let currentY = 0;
        const pages = [];

        while (currentY < mainCanvas.height) {
          // Calculate desired page end in canvas coordinates
          // contentHeight is in mm, convert to pixels: 1mm ≈ 3.7795px at 96dpi
          const contentHeightPx = contentHeight * 3.7795 * canvasScale;
          let desiredPageEndY = currentY + contentHeightPx;

          // Ensure we don't exceed canvas height
          if (desiredPageEndY >= mainCanvas.height) {
            desiredPageEndY = mainCanvas.height;
          }

          // Find safe slice position to avoid cutting rows
          const sliceResult = findSafeSlicePosition(
            currentY,
            desiredPageEndY,
            mainCanvas.height,
            mainCanvas.width,
            elementHeight,
            contentHeightPx / canvasScale // Pass page content height in DOM pixels
          );

          let pageEndY = sliceResult.safeEndY;

          // If a row would be cut, we end exactly at that row's top
          // This means only that row will appear on the next page
          // If no row would be cut, use the desired end position
          if (sliceResult.cutRow) {
            // We're ending at a row boundary - this is correct
            // The row will start on the next page
            pageEndY = sliceResult.safeEndY;
          } else {
            // No row would be cut, use desired position
            pageEndY = desiredPageEndY;
          }

          // Ensure we don't exceed canvas height
          if (pageEndY > mainCanvas.height) {
            pageEndY = mainCanvas.height;
          }

          // Safety check to prevent infinite loop
          if (pageEndY <= currentY) {
            // Force progress if stuck
            pageEndY = currentY + 100;
            if (pageEndY > mainCanvas.height) {
              pageEndY = mainCanvas.height;
            }
          }

          pages.push({
            startY: currentY,
            endY: pageEndY,
            height: pageEndY - currentY,
          });

          currentY = pageEndY;

          // Final safety check
          if (currentY >= mainCanvas.height) {
            break;
          }
        }

        // Render each page
        for (let pageIndex = 0; pageIndex < pages.length; pageIndex++) {
          if (pageIndex > 0) {
            pdf.addPage();
          }

          // Add logo header to every page
          addLogoHeader(pdf);

          const { startY, endY, height } = pages[pageIndex];
          const sourceHeight = endY - startY;

          const pageCanvas = document.createElement("canvas");
          pageCanvas.width = mainCanvas.width;
          pageCanvas.height = sourceHeight;
          const pageCtx = pageCanvas.getContext("2d");

          pageCtx.fillStyle = "#ffffff";
          pageCtx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);

          pageCtx.drawImage(
            mainCanvas,
            0,
            startY,
            mainCanvas.width,
            sourceHeight,
            0,
            0,
            mainCanvas.width,
            sourceHeight
          );

          // Use JPEG format with compression for much smaller file size
          const pageImgData = pageCanvas.toDataURL("image/jpeg", 0.8); // JPEG at 80% quality
          const pageSliceHeight =
            (sourceHeight * contentWidth) / mainCanvas.width;

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
          const pageImgData = pageCanvas.toDataURL("image/jpeg", 0.8);
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

  return (
    <Modal
      open={visible}
      onCancel={onCancel}
      footer={null}
      width="90%"
      style={{ maxWidth: 1200 }}
      className="receipt-modal"
      closeIcon={
        <X size={16} className="absolute -top-5 -right-5 text-base p-1.5 w-10 h-10 bg-black text-white rounded-full" onClick={onCancel} />
      }
    >
      <div className="relative">
        <div
          className="p-2"
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
      </div>
    </Modal>
  );
};

export default PurchaseOrderReceiptModal;
