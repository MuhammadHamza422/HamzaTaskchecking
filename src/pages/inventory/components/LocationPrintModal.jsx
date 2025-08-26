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

  const filteredLocations = locations.filter(
    (l) => selectedIds.size === 0 || selectedIds.has(l.id)
  );

  // Calculate pagination info
  const itemsPerPage = 10;
  const totalPages = Math.ceil(filteredLocations.length / itemsPerPage);

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
          <div className="flex items-center justify-between border-b px-4 pb-2">
            <div>
              <h3 className="text-lg font-semibold">Print Preview</h3>
              <p className="text-sm text-gray-600">
                {filteredLocations.length} items • {totalPages} pages • {itemsPerPage} items per page
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={onClose}
                className="rounded border px-3 py-1.5 text-sm"
              >
                Close
              </button>
              <button
                onClick={generatePDF}
                disabled={downloading}
                className="rounded bg-blue-600 text-white px-3 py-1.5 text-sm disabled:opacity-60"
              >
                {downloading ? "Generating…" : "Download PDF"}
              </button>
            </div>
          </div>
          <div className="overflow-auto p-3">
            {/* Preview all pages */}
            <div ref={printRef}>
              {Array.from({ length: totalPages }, (_, pageIndex) => {
                const startIndex = pageIndex * itemsPerPage;
                const endIndex = Math.min(startIndex + itemsPerPage, filteredLocations.length);
                const pageLocations = filteredLocations.slice(startIndex, endIndex);

                return (
                  // NOTE: .pdf-page is important — generator will render each .pdf-page individually
                  <div key={pageIndex} className="mb-8">
                    <div
                      className="pdf-page mx-auto bg-whiteshadow-sm"
                      // style={{
                      //   width: "210mm", // A4 width
                      //   minHeight: "297mm", // A4 height
                      //   padding: "22mm",
                      //   pageBreakAfter: pageIndex < totalPages - 1 ? "always" : "auto",
                      //   boxSizing: "border-box",
                      // }}
                      style={{ 
                        width: "282mm", 
                        minHeight: "300mm", 
                        padding: "22mm",
                        pageBreakAfter: pageIndex < totalPages - 1 ? "always" : "auto"
                      }}
                    >
                      {/* Grid: two per row, max 10 items */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-[2.6rem]">
                        {pageLocations.map((loc) => (
                          <div
                            key={loc.id}
                            className="border border-black flex items-center"
                            // fixed height to ensure rows are consistent and don't overflow/split
                            style={{ height: "48mm", boxSizing: "border-box" }}
                          >
                            <div className="flex items-center justify-center p-2">
                              <QRCodeSVG
                                value={String(loc.code || "")}
                                size={174}
                                level="L"
                              />
                            </div>
                            <div className="border-l border-black text-black flex-1 h-full">
                              <div className="grid grid-cols-3 text-center border-b border-black overflow-hidden">
                                <p className="col-span-3 py-[9px] uppercase text-lg font-bold tracking-[0.35em]">
                                  {(loc.type || "").toUpperCase()}
                                </p>
                              </div>
                              <div className="grid grid-cols-2 border-b text-sm border-black">
                                <p className="px-2 py-3 uppercase border-r border-black font-medium">
                                  Zone
                                </p>
                                <p className="px-2 py-3">{loc.zone?.name || zoneName || ""}</p>
                              </div>
                              <div className="grid grid-cols-2 border-b text-sm border-black">
                                <p className="px-2 py-3 uppercase border-r border-black font-medium">
                                  LABEL
                                </p>
                                <p className="px-2 py-3">{loc.code}</p>
                              </div>
                              <div className="grid grid-cols-2 text-sm h-fit">
                                <p className="px-2 py-3 uppercase border-r border-black font-medium">
                                  STATUS
                                </p>
                                <p className="px-2 py-3"></p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}

// New PDF generation: render each .pdf-page separately (prevents items from being cut)
// - Added compression and optional maxWidthPx downscale to reduce file size.
// - Exports JPEGs (smaller than PNG) and optionally downsamples very large canvases.
export async function generatePDFFromNodePaginated({
  node,
  fileName = "locations_labels.pdf",
  scale = 1.2,                 // <-- reduce to ~1.0-1.5 for smaller PDFs
  html2canvas,
  jsPDF,
  compression = 0.7,           // <-- JPEG quality 0.0 - 1.0 (lower = smaller file)
  maxWidthPx = 2000,           // <-- max canvas width in pixels before downscale
  onProgress = () => {},
}) {
  if (!node) throw new Error("No DOM node provided");
  if (!html2canvas) throw new Error("html2canvas instance required");
  if (!jsPDF) throw new Error("jsPDF constructor required");

  const notify = (payload) => {
    try { onProgress(payload); } catch (e) { /* ignore callback errors */ }
  };

  notify({ downloading: true });

  try {
    // Inline images (same as before)
    await convertImagesToDataUrl(node);
    await new Promise((r) => setTimeout(r, 200)); // allow DOM to update

    const pageEls = Array.from(node.querySelectorAll(".pdf-page"));
    if (!pageEls.length) throw new Error("No .pdf-page elements found");

    // Create PDF
    const pdf = new jsPDF("p", "mm", "a4");
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();

    for (let i = 0; i < pageEls.length; i++) {
      const pageEl = pageEls[i];
      notify({ downloading: true, progress: (i / pageEls.length) });

      // render this page element only
      const canvas = await html2canvas(pageEl, {
        scale,
        useCORS: true,
        allowTaint: false,
        backgroundColor: "#ffffff",
        logging: false,
        imageTimeout: 0,
        removeContainer: true,
        onclone: (clonedDoc) => {
          // keep image srcs consistent between original and cloned
          const clonedImages = clonedDoc.querySelectorAll("img");
          const originalImages = pageEl.querySelectorAll("img");
          clonedImages.forEach((cImg, idx) => {
            if (originalImages[idx]) cImg.src = originalImages[idx].src;
          });
        },
      });

      // If the rendered canvas is very large, downscale it before encoding to JPEG
      let finalDataUrl;
      if (canvas.width > maxWidthPx) {
        const downscale = maxWidthPx / canvas.width;
        const tmp = document.createElement("canvas");
        tmp.width = Math.round(canvas.width * downscale);
        tmp.height = Math.round(canvas.height * downscale);
        const ctx = tmp.getContext("2d");
        // White background to avoid JPEG artifacts on transparent areas
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, tmp.width, tmp.height);
        ctx.drawImage(canvas, 0, 0, tmp.width, tmp.height);
        finalDataUrl = tmp.toDataURL("image/jpeg", compression);
      } else {
        // directly export canvas to JPEG with compression
        finalDataUrl = canvas.toDataURL("image/jpeg", compression);
      }

      // compute image size in mm to fit page width
      let imgWidth = pageWidth;
      let imgHeight = (canvas.height * imgWidth) / canvas.width;

      // if image is slightly taller than page, scale down to fit
      if (imgHeight > pageHeight) {
        const scaleFactor = pageHeight / imgHeight;
        imgWidth *= scaleFactor;
        imgHeight *= scaleFactor;
      }

      // center horizontally
      const x = (pageWidth - imgWidth) / 2;
      const y = 0;

      if (i > 0) pdf.addPage();
      // IMPORTANT: use 'JPEG' so jsPDF knows the format
      pdf.addImage(finalDataUrl, "JPEG", x, y, imgWidth, imgHeight);

      notify({ downloading: true, progress: ((i + 1) / pageEls.length) });
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


// helper functions unchanged (copied from your file)
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
