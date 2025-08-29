import { useRef, useState } from "react";
import { Modal } from "antd";
import { QRCodeSVG } from "qrcode.react";
import useFullscreen from "../../../components/useFullscreen.jsx";
import html2canvas from "html2canvas-pro";
import jsPDF from "jspdf";
import Swal from "sweetalert2";

export default function LocationPrintModal({
  isOpen,
  onClose,
  locations = [],
  selectedIds = new Set(),
  zoneName = "",
}) {
  const { ref: fullscreenRef, isFullscreen, getContainer } = useFullscreen();
  const [downloading, setDownloading] = useState(false);
  const printRef = useRef(null);

  const generatePDF = async () => {
    try {
      setDownloading(true);
      await generatePDFFromNodePaginated({
        node: printRef.current,
        fileName: "locations_labels.pdf",
        scale: 2,
        html2canvas,
        jsPDF,
        onProgress: ({ downloading, warning, error, progress }) => {
          setDownloading(Boolean(downloading));
          if (warning) console.warn(warning);
          if (error) console.error(error);
        },
      });
    } catch (err) {
      Swal.fire(
        "Error",
        "Failed to generate PDF. Check console for details.",
        "error"
      );
    } finally {
      setDownloading(false);
    }
  };

  const handlePrint = () => {
    const printContent = printRef.current?.innerHTML ?? "";
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Print Labels</title>
          <style>
            @page { size: 4in 2in; margin: 0 4px; }
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { margin: 0; padding: 0; font-family: Arial, sans-serif; background: white; }
            .print-page { width: 4in !important; height: 2in !important; page-break-after: always; margin: 0 !important; padding: 0 !important; display: flex !important; align-items: center !important; justify-content: center !important; background: white !important; }
            .print-page:last-child { page-break-after: auto; }
            .label-card { width: 100% !important; height: 100% !important; border: 1px solid black !important; display: flex !important; background: white !important; }
            .qr-container { width: 1.8in !important; height: 100% !important; display: flex !important; align-items: center !important; justify-content: center !important; }
            .info-container { flex: 1 !important; border-left: 1px solid black !important; height: 100% !important; display: flex !important; flex-direction: column !important; }
            .type-header { text-align: center !important; padding: 0.10in 0.05in !important; text-transform: uppercase !important; font-weight: bold !important; font-size: 16px !important; letter-spacing: 1px !important; background: #f8f8f8 !important; color: black !important; }
            .info-row { display: flex !important; border-top: 1px solid black !important; font-size: 16px !important; height: 0.45in !important; color: black !important; }
            .info-row:last-child { border-bottom: none !important; flex: 1 !important; }
            .info-label { width: 0.8in !important; padding: 0.05in !important; text-transform: uppercase !important; font-weight: 600 !important; border-right: 1px solid black !important; background: #f8f8f8 !important; display: flex !important; align-items: center !important; font-size: 12px !important; color: black !important; }
            .info-value { flex: 1 !important; padding: 0.05in !important; display: flex !important; align-items: center !important; font-size: 14px !important; color: black !important; }
            .no-print { display: none !important; }
          </style>
        </head>
        <body>
          ${printContent}
        </body>
      </html>
    `;

    try {
      // create hidden iframe
      const iframe = document.createElement("iframe");
      iframe.style.position = "fixed";
      iframe.style.right = "0";
      iframe.style.bottom = "0";
      iframe.style.width = "0";
      iframe.style.height = "0";
      iframe.style.border = "0";
      iframe.setAttribute("aria-hidden", "true");
      document.body.appendChild(iframe);

      const idoc = iframe.contentDocument || iframe.contentWindow.document;
      idoc.open();
      idoc.write(html);
      idoc.close();

      // helper to actually print and then cleanup
      const doPrintAndCleanup = () => {
        try {
          // focus the iframe window then print
          iframe.contentWindow.focus();
          // calling print()
          iframe.contentWindow.print();
        } catch (err) {
          console.error("Print error (iframe):", err);
        } finally {
          // remove iframe after small delay so print dialog can use it
          setTimeout(() => {
            try {
              document.body.removeChild(iframe);
            } catch (e) {
              /* ignore */
            }
          }, 1000);
        }
      };

      // Wait for images inside iframe to load (helps with QR codes)
      const imgs = idoc.images || [];
      if (imgs.length > 0) {
        let loaded = 0;
        for (let i = 0; i < imgs.length; i++) {
          const img = imgs[i];
          if (img.complete) {
            loaded++;
          } else {
            img.addEventListener("load", () => {
              loaded++;
              if (loaded === imgs.length) doPrintAndCleanup();
            });
            img.addEventListener("error", () => {
              loaded++;
              if (loaded === imgs.length) doPrintAndCleanup();
            });
          }
        }
        if (loaded === imgs.length) {
          // all already loaded
          setTimeout(doPrintAndCleanup, 150);
        }
      } else {
        // no images — small delay to ensure rendering, then print
        // some browsers fire onload not reliably for dynamically written iframes, so use timeout
        setTimeout(doPrintAndCleanup, 200);
      }
    } catch (e) {
      console.error("Iframe print failed, falling back to window.open:", e);
      // fallback: open in new window like original (if iframe blocked)
      const printWindow = window.open("", "_blank");
      if (!printWindow) {
        alert(
          "Unable to open print window — please allow popups for this site or try printing from the page."
        );
        return;
      }
      printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
        try {
      printWindow.print();
      printWindow.close();
        } catch (err) {
          console.error(err);
        }
    }, 1000);
    }
  };

  const filteredLocations = locations.filter(
    (l) => selectedIds.size === 0 || selectedIds.has(l.id)
  );

  const itemsPerPage = 1;
  const totalPages = filteredLocations.length;

  return (
    <div ref={fullscreenRef}>
      <Modal
        getContainer={getContainer}
        key={String(isFullscreen)}
        open={isOpen}
        onCancel={onClose}
        centered
        footer={null}
        width={1152}
        closable={false}
        title={null}
        className="max-h-[95vh] overflow-y-auto"
      >
        <div className="bg-white w-full">
          <div className="flex items-center justify-between border-b px-4 pb-2 no-print">
            <div>
              <h3 className="text-lg font-semibold">Print Preview (4" × 2")</h3>
              <p className="text-sm text-gray-600">
                {filteredLocations.length} labels • {totalPages} pages • 1 label
                per page
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={onClose}
                className="rounded border border-gray-300 hover:border-gray-400 px-3 py-1.5 text-sm bg-white hover:bg-gray-50 transition-colors"
              >
                Close
              </button>
              <button
                onClick={handlePrint}
                className="rounded bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 text-sm transition-colors"
              >
                Print Labels
              </button>
              {/* <button
                onClick={generatePDF}
                disabled={downloading}
                className="rounded bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 text-sm disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
              >
                {downloading ? "Generating…" : "Download PDF"}
              </button> */}
            </div>
          </div>
          
          <div className="overflow-auto p-4 max-w-4xl mx-auto">
            <div ref={printRef} className="grid grid-cols-2 gap-4">
              {filteredLocations.map((loc, pageIndex) => (
                <div key={pageIndex} className="mb-6">
                  <div
                    className="print-page mx-auto bg-white shadow-lg border border-gray-200 flex items-center justify-center"
                    style={{ 
                      width: "4in", 
                      height: "2in",
                      transformOrigin: "center top",
                    }}
                  >
                    {/* Single label container */}
                    <div className="label-card w-full h-full border border-black flex bg-white">
                      {/* QR Code Section */}
                      <div
                        className="qr-container flex items-center justify-center bg-white"
                        style={{ width: "2in" }}
                      >
                        <QRCodeSVG
                          value={String(loc.code || "")}
                          level="H"
                          size={250}
                        />
                      </div>
                      
                      {/* Info Section */}
                      <div className="info-container border-l border-black text-black flex-1 h-full flex flex-col">
                        {/* Type Header */}
                        <div className="type-header text-center border-b border-black bg-gray-50 py-3 px-1">
                          <p className="uppercase text-base font-semibold tracking-widest text-black">
                            {(loc.type || "").toUpperCase()}
                          </p>
                        </div>
                        
                        {/* Zone Row */}
                        <div
                          className="info-row flex border-b border-black"
                          style={{ height: "0.35in" }}
                        >
                          <div
                            className="info-label border-r border-black bg-gray-50 flex items-center justify-center text-center"
                            style={{ width: "0.8in" }}
                          >
                            <span className="uppercase text-sm font-semibold text-black">
                              Zone
                            </span>
                          </div>
                          <div className="info-value flex items-center px-1">
                            <span className="text-sm text-black">
                              {loc.zone?.name || zoneName || ""}
                            </span>
                          </div>
                        </div>
                        
                        {/* Label Row */}
                        <div
                          className="info-row flex border-b border-black"
                          style={{ height: "0.35in" }}
                        >
                          <div
                            className="info-label border-r border-black bg-gray-50 flex items-center justify-center text-center"
                            style={{ width: "0.8in" }}
                          >
                            <span className="uppercase text-sm font-semibold text-black">
                              Label
                            </span>
                          </div>
                          <div className="info-value flex items-center px-1">
                            <span className="text-sm font-medium text-black">
                              {loc.code}
                            </span>
                          </div>
                        </div>
                        
                        {/* Status Row */}
                        <div className="info-row flex flex-1">
                          <div
                            className="info-label border-r border-black bg-gray-50 flex items-center justify-center text-center"
                            style={{ width: "0.8in" }}
                          >
                            <span className="uppercase text-sm font-semibold text-black">
                              Status
                            </span>
                          </div>
                          <div className="info-value flex items-center px-1">
                            <span className="text-sm text-black"></span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}

// Modified PDF generation for 4x2 inch pages
export async function generatePDFFromNodePaginated({
  node,
  fileName = "locations_labels.pdf",
  scale = 3, // Increased for better quality
  html2canvas,
  jsPDF,
  compression = 0.8,
  maxWidthPx = 1200,
  onProgress = () => {},
}) {
  if (!node) throw new Error("No DOM node provided");
  if (!html2canvas) throw new Error("html2canvas instance required");
  if (!jsPDF) throw new Error("jsPDF constructor required");

  const notify = (payload) => {
    try {
      onProgress(payload);
    } catch (e) {
      /* ignore callback errors */
    }
  };

  notify({ downloading: true });

  try {
    // Inline images
    await convertImagesToDataUrl(node);
    await new Promise((r) => setTimeout(r, 300));

    const pageEls = Array.from(node.querySelectorAll(".print-page"));
    if (!pageEls.length) throw new Error("No .print-page elements found");

    // Create PDF with custom 4x2 inch page size
    const pdf = new jsPDF({
      orientation: "landscape", // 4 inch width > 2 inch height
      unit: "in",
      format: [4, 2], // width, height in inches
    });
    
    const pageWidth = 4; // inches
    const pageHeight = 2; // inches

    for (let i = 0; i < pageEls.length; i++) {
      const pageEl = pageEls[i];
      notify({ downloading: true, progress: i / pageEls.length });

      // Temporarily remove transform for capturing
      const originalTransform = pageEl.style.transform;
      pageEl.style.transform = "none";

      const canvas = await html2canvas(pageEl, {
        scale,
        useCORS: true,
        allowTaint: false,
        backgroundColor: "#ffffff",
        logging: false,
        imageTimeout: 0,
        removeContainer: true,
        width: 288, // 4 inches * 72 DPI
        height: 144, // 2 inches * 72 DPI
      });

      // Restore transform
      pageEl.style.transform = originalTransform;

      let finalDataUrl = canvas.toDataURL("image/jpeg", compression);

      if (i > 0) pdf.addPage();
      
      // Add image to fill entire page
      pdf.addImage(finalDataUrl, "JPEG", 0, 0, pageWidth, pageHeight);

      notify({ downloading: true, progress: (i + 1) / pageEls.length });
    }

    pdf.save(fileName);
    notify({ downloading: false });
    return { success: true };
  } catch (err) {
    console.error("generatePDFFromNodePaginated error:", err);
    notify({ downloading: false, error: err.message || String(err) });
    throw err;
  }
}

// Helper functions (unchanged)
async function fetchImageAsDataUrl(src) {
  if (!src) return null;
  if (src.startsWith("data:")) return src;

  try {
    const resp = await fetch(src, { mode: "cors" });
    if (!resp.ok) throw new Error("fetch failed");
    const blob = await resp.blob();
    return await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (fetchErr) {
    try {
      const img = new Image();
      img.crossOrigin = "anonymous";
      return await new Promise((resolve, reject) => {
        img.onload = () => {
          try {
            const canvas = document.createElement("canvas");
            canvas.width = img.naturalWidth || 200;
            canvas.height = img.naturalHeight || 200;
            const ctx = canvas.getContext("2d");
            ctx.fillStyle = "#ffffff";
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0);
            const dataUrl = canvas.toDataURL("image/png", 1.0);
            resolve(dataUrl);
          } catch (drawErr) {
            reject(drawErr);
          }
        };
        img.onerror = (e) => reject(e);
        img.src = src;
      });
    } catch (imgErr) {
      console.warn("Both fetch and image fallback failed for:", src, imgErr);
      return null;
    }
  }
}

async function convertImagesToDataUrl(nodeEl) {
  const images = Array.from(nodeEl.querySelectorAll("img"));
  const results = await Promise.all(
    images.map(async (img) => {
      const originalSrc = img.src || "";
      try {
        if (/^data:/.test(originalSrc)) return originalSrc;
        const dataUrl = await fetchImageAsDataUrl(originalSrc);
        if (dataUrl) {
          img.src = dataUrl;
          return dataUrl;
        } else {
          console.warn("Could not inline image:", originalSrc);
          return null;
        }
      } catch (err) {
        console.warn("Error converting image:", originalSrc, err);
        return null;
      }
    })
  );

  return results;
}
