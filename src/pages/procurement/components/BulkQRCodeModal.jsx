import React, { useState, useRef, useEffect } from "react";
import { Modal, Button, Row, Col, InputNumber, Slider, Space, Spin, message } from "antd";
import { Printer, Download } from "lucide-react";
import html2canvas from "html2canvas-pro";
import jsPDF from "jspdf";
import Swal from "sweetalert2";

/**
 * Bulk QR Code Modal Component
 * Displays multiple QR codes for bulk printing/downloading
 */
const BulkQRCodeModal = ({ visible, onCancel, items, poId, getQRCodeFunction, isBox = false }) => {
  const printRef = useRef(null);
  const [downloading, setDownloading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [qrCodes, setQrCodes] = useState([]);
  const [qrSize, setQrSize] = useState(200); // Default QR code size in pixels
  const [pageWidth, setPageWidth] = useState(2.7); // Default 2.7 inches width
  const [pageHeight, setPageHeight] = useState(2.8); // Default 2.8 inches height
  const [unit, setUnit] = useState("in"); // "in" or "mm"
  const [labelsPerRow, setLabelsPerRow] = useState(2); // Number of labels per row

  // Convert inches to mm
  const inchesToMm = (inches) => inches * 25.4;
  // Convert mm to inches
  const mmToInches = (mm) => mm / 25.4;

  // Load QR codes for all items
  useEffect(() => {
    if (visible && items.length > 0 && getQRCodeFunction) {
      // For boxes, poId is not required, for products/kits it is
      if (isBox || poId) {
        loadQRCodes();
      }
    }
  }, [visible, items, poId, isBox]);

  const loadQRCodes = async () => {
    setLoading(true);
    setQrCodes([]);
    try {
      const qrCodePromises = items.map(async (item) => {
        try {
          // Determine the ID to use based on item type
          let itemId;
          if (item.type === "box" || isBox) {
            itemId = item.boxId;
          } else if (item.type === "kit") {
            itemId = item.kitId;
          } else {
            itemId = item.productId || item._id;
          }
          
          // Box QR codes don't need poId, they only need boxId
          let response;
          if (isBox || item.type === "box") {
            if (!itemId) {
              console.error(`Box missing boxId:`, item);
              return null;
            }
            response = await getQRCodeFunction(itemId, { format: "json" });
          } else {
            if (!poId || !itemId) {
              console.error(`Missing poId or itemId:`, { poId, itemId, item });
              return null;
            }
            response = await getQRCodeFunction(poId, itemId, { format: "json" });
          }
          
          if (response?.success && response?.data) {
            return {
              ...item,
              qrCode: response.data.qrCode,
              qrData: response.data.qrData,
              product: response.data.product || response.data.kit || response.data.box,
              type: item.type || "product",
            };
          }
          console.warn(`Invalid response for ${item.name || itemId}:`, response);
          return null;
        } catch (error) {
          console.error(`Failed to load QR code for ${item.name || itemId}:`, error);
          console.error(`Error details:`, error.response?.data || error.message);
          return null;
        }
      });

      const results = await Promise.all(qrCodePromises);
      const validCodes = results.filter((code) => code !== null);
      setQrCodes(validCodes);
      
      if (validCodes.length < items.length) {
        message.warning(
          `Loaded ${validCodes.length} of ${items.length} QR codes. Some failed to load.`
        );
      }
    } catch (error) {
      console.error("Failed to load QR codes:", error);
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "Failed to load QR codes. Please try again.",
        toast: true,
        position: "top-end",
        showConfirmButton: false,
        timer: 3000,
      });
    } finally {
      setLoading(false);
    }
  };

  // Get label text based on type
  const getLabelText = (item) => {
    if (!item) return "";
    if (item.type === "kit") {
      return item.qrData?.kitId || item.kitId || "";
    } else if (item.type === "box") {
      return item.qrData?.boxId || item.boxId || "";
    } else {
      return item.qrData?.sku || item.sku || "";
    }
  };

  // Generate PDF - 2 labels per row with proper gaps
  const generatePDF = async () => {
    if (!printRef.current || qrCodes.length === 0) {
      message.error("QR codes not loaded");
      return;
    }

    setDownloading(true);
    try {
      // Convert dimensions based on unit
      const widthIn = unit === "mm" ? mmToInches(pageWidth) : pageWidth;
      const heightIn = unit === "mm" ? mmToInches(pageHeight) : pageHeight;

      // Convert to mm for jsPDF
      const widthMm = inchesToMm(widthIn);
      const heightMm = inchesToMm(heightIn);

      // PDF settings: 2 labels per row with gaps
      const labelsPerRow = 2;
      const gapMm = 10; // Gap between labels in mm
      const marginMm = 10; // Page margin in mm
      
      // Calculate page dimensions (A4 or larger if needed)
      const pageWidthMm = Math.max(210, widthMm * labelsPerRow + gapMm * (labelsPerRow - 1) + marginMm * 2);
      const pageHeightMm = 297; // Standard A4 height
      
      // Calculate how many rows fit on one page
      const rowsPerPage = Math.floor((pageHeightMm - marginMm * 2) / (heightMm + gapMm));
      const labelsPerPage = rowsPerPage * labelsPerRow;
      const totalPages = Math.ceil(qrCodes.length / labelsPerPage);

      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: [pageWidthMm, pageHeightMm],
      });

      // Process each label
      for (let i = 0; i < qrCodes.length; i++) {
        const item = qrCodes[i];
        const pageIndex = Math.floor(i / labelsPerPage);
        const labelIndex = i % labelsPerPage;
        const row = Math.floor(labelIndex / labelsPerRow);
        const col = labelIndex % labelsPerRow;

        // Add new page if needed
        if (i > 0 && i % labelsPerPage === 0) {
          pdf.addPage();
        }

        // Create a temporary container for this label
        const tempContainer = document.createElement("div");
        tempContainer.style.width = `${widthIn}in`;
        tempContainer.style.height = `${heightIn}in`;
        tempContainer.style.padding = "10px";
        tempContainer.style.display = "flex";
        tempContainer.style.flexDirection = "column";
        tempContainer.style.alignItems = "center";
        tempContainer.style.justifyContent = "center";
        tempContainer.style.border = "1px solid #ddd";
        tempContainer.style.backgroundColor = "#ffffff";
        tempContainer.style.boxSizing = "border-box";
        tempContainer.innerHTML = `
          <img src="${item.qrCode}" alt="QR Code" style="width: ${qrSize}px; height: ${qrSize}px; max-width: 100%; max-height: 70%; object-fit: contain;" />
          <div style="margin-top: 8px; font-size: 10px; text-align: center; word-break: break-word;">
            ${getLabelText(item)}
          </div>
        `;
        document.body.appendChild(tempContainer);

        try {
          const canvas = await html2canvas(tempContainer, {
            scale: 2,
            useCORS: true,
            logging: false,
            backgroundColor: "#ffffff",
            width: tempContainer.offsetWidth,
            height: tempContainer.offsetHeight,
          });

          const imgData = canvas.toDataURL("image/png", 0.95);
          
          // Calculate position on PDF with proper gaps
          const x = marginMm + col * (widthMm + gapMm);
          const y = marginMm + row * (heightMm + gapMm);

          pdf.addImage(imgData, "PNG", x, y, widthMm, heightMm);
        } finally {
          document.body.removeChild(tempContainer);
        }
      }

      pdf.save(`qr-codes-bulk-${qrCodes.length}-labels.pdf`);
      
      Swal.fire({
        icon: "success",
        title: "PDF Generated!",
        text: `Downloaded PDF with ${qrCodes.length} QR code labels`,
        toast: true,
        position: "top-end",
        showConfirmButton: false,
        timer: 3000,
      });
    } catch (err) {
      console.error("PDF generation error:", err);
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "Failed to generate PDF. Please try again.",
        toast: true,
        position: "top-end",
        showConfirmButton: false,
        timer: 3000,
      });
    } finally {
      setDownloading(false);
    }
  };

  // Handle print - Each QR code on its own page
  const handlePrint = () => {
    if (!printRef.current || qrCodes.length === 0) {
      message.error("QR codes not loaded");
      return;
    }

    const widthIn = unit === "mm" ? mmToInches(pageWidth) : pageWidth;
    const heightIn = unit === "mm" ? mmToInches(pageHeight) : pageHeight;

    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      message.error("Unable to open print window. Please allow popups.");
      return;
    }

    // Create one label per page
    const labelsHtml = qrCodes
      .map(
        (item) => `
      <div class="label-page" style="width: ${widthIn}in; height: ${heightIn}in; padding: 10px; margin: 0; page-break-after: always; display: flex; flex-direction: column; align-items: center; justify-content: center; border: 1px solid #ddd; box-sizing: border-box;">
        <img src="${item.qrCode}" alt="QR Code" style="width: ${qrSize}px; height: ${qrSize}px; max-width: 100%; max-height: 70%; object-fit: contain;" />
        <div style="margin-top: 8px; font-size: 10px; text-align: center; word-break: break-word;">
          ${getLabelText(item)}
        </div>
      </div>
    `
      )
      .join("");

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>QR Code Labels - Bulk Print</title>
          <style>
            @page {
              size: ${widthIn}in ${heightIn}in;
              margin: 0;
            }
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            body {
              margin: 0;
              padding: 0;
              width: ${widthIn}in;
              height: ${heightIn}in;
            }
            .label-page {
              width: ${widthIn}in;
              height: ${heightIn}in;
              page-break-after: always;
              page-break-inside: avoid;
            }
            .label-page:last-child {
              page-break-after: auto;
            }
          </style>
        </head>
        <body>
          ${labelsHtml}
        </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
    setTimeout(() => {
      printWindow.print();
    }, 250);
  };

  return (
    <Modal
      title={`Bulk QR Code Labels (${qrCodes.length} selected)`}
      open={visible}
      onCancel={onCancel}
      width={1200}
      footer={[
        <Button key="cancel" onClick={onCancel}>
          Cancel
        </Button>,
        <Button
          key="print"
          icon={<Printer size={16} />}
          onClick={handlePrint}
          disabled={loading || qrCodes.length === 0}
        >
          Print
        </Button>,
        <Button
          key="download"
          type="primary"
          icon={<Download size={16} />}
          onClick={generatePDF}
          loading={downloading}
          disabled={loading || qrCodes.length === 0}
        >
          Download PDF
        </Button>,
      ]}
    >
      <div className="mb-4">
        <Space direction="vertical" style={{ width: "100%" }} size="middle">
          <Row gutter={16}>
            <Col span={12}>
              <div>
                <label className="text-sm font-medium mb-1 block">QR Code Size (px)</label>
                <Slider
                  min={100}
                  max={400}
                  value={qrSize}
                  onChange={setQrSize}
                  marks={{ 100: "100px", 200: "200px", 300: "300px", 400: "400px" }}
                />
              </div>
            </Col>
            <Col span={12}>
              <div>
                <label className="text-sm font-medium mb-1 block">Labels Per Row</label>
                <Slider
                  min={1}
                  max={4}
                  value={labelsPerRow}
                  onChange={setLabelsPerRow}
                  marks={{ 1: "1", 2: "2", 3: "3", 4: "4" }}
                />
              </div>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={8}>
              <div>
                <label className="text-sm font-medium mb-1 block">
                  Page Width ({unit === "mm" ? "mm" : "inches"})
                </label>
                <InputNumber
                  value={unit === "mm" ? inchesToMm(pageWidth) : pageWidth}
                  onChange={(value) => {
                    if (unit === "mm") {
                      setPageWidth(mmToInches(value));
                    } else {
                      setPageWidth(value);
                    }
                  }}
                  min={0.5}
                  max={unit === "mm" ? 200 : 8}
                  step={unit === "mm" ? 1 : 0.1}
                  style={{ width: "100%" }}
                />
              </div>
            </Col>
            <Col span={8}>
              <div>
                <label className="text-sm font-medium mb-1 block">
                  Page Height ({unit === "mm" ? "mm" : "inches"})
                </label>
                <InputNumber
                  value={unit === "mm" ? inchesToMm(pageHeight) : pageHeight}
                  onChange={(value) => {
                    if (unit === "mm") {
                      setPageHeight(mmToInches(value));
                    } else {
                      setPageHeight(value);
                    }
                  }}
                  min={0.5}
                  max={unit === "mm" ? 200 : 8}
                  step={unit === "mm" ? 1 : 0.1}
                  style={{ width: "100%" }}
                />
              </div>
            </Col>
            <Col span={8}>
              <div>
                <label className="text-sm font-medium mb-1 block">Unit</label>
                <Space>
                  <Button
                    type={unit === "in" ? "primary" : "default"}
                    onClick={() => {
                      if (unit === "mm") {
                        setPageWidth(mmToInches(pageWidth));
                        setPageHeight(mmToInches(pageHeight));
                      }
                      setUnit("in");
                    }}
                  >
                    Inches
                  </Button>
                  <Button
                    type={unit === "mm" ? "primary" : "default"}
                    onClick={() => {
                      if (unit === "in") {
                        setPageWidth(inchesToMm(pageWidth));
                        setPageHeight(inchesToMm(pageHeight));
                      }
                      setUnit("mm");
                    }}
                  >
                    Millimeters
                  </Button>
                </Space>
              </div>
            </Col>
          </Row>
        </Space>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <Spin size="large" />
          <p className="mt-4 text-gray-600">Loading QR codes...</p>
        </div>
      ) : qrCodes.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <p>No QR codes loaded</p>
        </div>
      ) : (
        <div ref={printRef} className="border border-gray-200 p-4 rounded">
          <Row gutter={[16, 16]}>
            {qrCodes.map((item, index) => (
              <Col key={index} span={24 / labelsPerRow}>
                <div
                  className="border border-gray-300 p-4 rounded flex flex-col items-center justify-center"
                  style={{
                    minHeight: "250px",
                    backgroundColor: "#ffffff",
                  }}
                >
                  <img
                    src={item.qrCode}
                    alt="QR Code"
                    style={{ width: `${qrSize}px`, height: `${qrSize}px` }}
                  />
                  <div className="mt-2 text-xs text-center text-gray-600">
                    {getLabelText(item)}
                  </div>
                  <div className="mt-1 text-xs text-center text-gray-500">
                    {item.name || item.product?.name || ""}
                  </div>
                </div>
              </Col>
            ))}
          </Row>
        </div>
      )}
    </Modal>
  );
};

export default BulkQRCodeModal;

