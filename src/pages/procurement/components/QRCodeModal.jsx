import React, { useState, useRef } from "react";
import { Modal, Button, Row, Col, InputNumber, Slider, Image, Radio, Space, message } from "antd";
import { Printer, Download } from "lucide-react";
import html2canvas from "html2canvas-pro";
import jsPDF from "jspdf";
import Swal from "sweetalert2";

/**
 * Reusable QR Code Modal Component
 * Supports products, kits, and boxes
 * Includes unit selector (mm/inches) and customization options
 */
const QRCodeModal = ({ visible, onCancel, qrData }) => {
  const printRef = useRef(null);
  const [downloading, setDownloading] = useState(false);
  const [qrSize, setQrSize] = useState(200); // Default QR code size in pixels
  const [pageWidth, setPageWidth] = useState(2.7); // Default 2 inches width
  const [pageHeight, setPageHeight] = useState(2.8); // Default 1 inch height
  const [unit, setUnit] = useState("in"); // "in" or "mm"

  // Convert inches to mm
  const inchesToMm = (inches) => inches * 25.4;
  // Convert mm to inches
  const mmToInches = (mm) => mm / 25.4;

  // Get display values based on unit
  const getDisplayWidth = () => {
    return unit === "mm" ? inchesToMm(pageWidth) : pageWidth;
  };

  const getDisplayHeight = () => {
    return unit === "mm" ? inchesToMm(pageHeight) : pageHeight;
  };

  // Handle unit change
  const handleUnitChange = (e) => {
    const newUnit = e.target.value;
    if (newUnit === "mm") {
      // Convert from inches to mm
      setPageWidth(inchesToMm(pageWidth));
      setPageHeight(inchesToMm(pageHeight));
    } else {
      // Convert from mm to inches
      setPageWidth(mmToInches(pageWidth));
      setPageHeight(mmToInches(pageHeight));
    }
    setUnit(newUnit);
  };

  // Handle width change
  const handleWidthChange = (value) => {
    setPageWidth(value);
  };

  // Handle height change
  const handleHeightChange = (value) => {
    setPageHeight(value);
  };

  // Get label text based on type
  const getLabelText = () => {
    if (!qrData) return "";
    if (qrData.type === "kit") {
      return qrData.qrData?.kitId || qrData.product?.kitId || "";
    } else if (qrData.type === "box") {
      const boxId = qrData.qrData?.boxId || qrData.boxId || qrData.box?.boxId || "";
      // Try multiple possible locations for box name
      const boxName = 
        qrData.box?.name || 
        qrData.qrData?.box?.name || 
        qrData.name || 
        "";
      if (boxName && boxId) {
        return `${boxName}\n${boxId}`;
      }
      return boxId || "";
    } else {
      return qrData.qrData?.sku || qrData.product?.sku || "";
    }
  };

  // Generate PDF
  const generatePDF = async () => {
    if (!printRef.current || !qrData?.qrCode) {
      message.error("QR code element not found");
      return;
    }

    setDownloading(true);
    try {
      // Convert dimensions based on unit
      const widthIn = unit === "mm" ? mmToInches(pageWidth) : pageWidth;
      const heightIn = unit === "mm" ? mmToInches(pageHeight) : pageHeight;

      // Convert to mm for jsPDF (jsPDF uses mm as default unit)
      const widthMm = inchesToMm(widthIn);
      const heightMm = inchesToMm(heightIn);

      const canvas = await html2canvas(printRef.current, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: "#ffffff",
      });

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({
        orientation: widthMm > heightMm ? "landscape" : "portrait",
        unit: "mm",
        format: [widthMm, heightMm],
      });

      // Calculate QR code size in mm
      const qrSizeMm = (qrSize / 96) * 25.4; // Convert pixels to mm (assuming 96 DPI)

      // Center the QR code
      const x = (widthMm - qrSizeMm) / 2;
      const y = (heightMm - qrSizeMm) / 2 - 5; // Slight offset for label

      pdf.addImage(imgData, "PNG", 0, 0, widthMm, heightMm);
      pdf.save(`qr-code-${getLabelText() || "label"}.pdf`);
      
      Swal.fire({
        icon: "success",
        title: "PDF Generated!",
        text: "QR code PDF has been downloaded",
        timer: 2000,
        showConfirmButton: false,
      });
    } catch (err) {
      console.error("PDF generation error:", err);
      Swal.fire(
        "Error",
        "Failed to generate PDF. Check console for details.",
        "error"
      );
    } finally {
      setDownloading(false);
    }
  };

  // Handle print
  const handlePrint = () => {
    if (!printRef.current || !qrData?.qrCode) {
      message.error("QR code element not found");
      return;
    }

    // Convert dimensions to inches for print
    const widthIn = unit === "mm" ? mmToInches(pageWidth) : pageWidth;
    const heightIn = unit === "mm" ? mmToInches(pageHeight) : pageHeight;

    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      message.error("Unable to open print window. Please allow popups.");
      return;
    }

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>QR Code - ${getLabelText() || "Label"}</title>
          <style>
            @page {
              size: ${widthIn}in ${heightIn}in;
              margin: 0;
            }
            body {
              margin: 0;
              padding: 0;
              display: flex;
              align-items: center;
              justify-content: center;
              width: ${widthIn}in;
              height: ${heightIn}in;
            }
            .print-container {
              width: 100%;
              height: 100%;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              padding: 10px;
            }
            img {
              max-width: 100%;
              max-height: 100%;
              object-fit: contain;
            }
            .label-info {
              margin-top: 5px;
              font-size: 10px;
              text-align: center;
              white-space: pre-line;
              word-break: break-word;
            }
          </style>
        </head>
        <body>
          <div class="print-container">
            <img src="${qrData.qrCode}" alt="QR Code" style="width: ${qrSize}px; height: ${qrSize}px;" />
            <div class="label-info">${getLabelText()}</div>
          </div>
        </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();

    setTimeout(() => {
      try {
        printWindow.print();
        printWindow.close();
      } catch (err) {
        console.error("Print error:", err);
      }
    }, 500);
  };

  if (!qrData?.qrCode) {
    return (
      <Modal
        title="QR Code"
        open={visible}
        onCancel={onCancel}
        footer={[
          <Button key="close" onClick={onCancel}>
            Close
          </Button>,
        ]}
        width={500}
      >
        <div className="text-center py-8 text-gray-400">
          QR Code not available
        </div>
      </Modal>
    );
  }

  // Convert dimensions for display (convert to pixels for preview)
  const displayWidthPx = unit === "mm" 
    ? (pageWidth / 25.4) * 96 
    : pageWidth * 96;
  const displayHeightPx = unit === "mm"
    ? (pageHeight / 25.4) * 96
    : pageHeight * 96;

  return (
    <Modal
      title="QR Code - Print & Download"
      open={visible}
      onCancel={onCancel}
      footer={[
        <Button key="close" onClick={onCancel}>
          Close
        </Button>,
        <Button
          key="print"
          icon={<Printer size={16} />}
          onClick={handlePrint}
          type="default"
        >
          Print
        </Button>,
        <Button
          key="download"
          icon={<Download size={16} />}
          onClick={generatePDF}
          type="primary"
          loading={downloading}
        >
          {downloading ? "Generating..." : "Download PDF"}
        </Button>,
      ]}
      width={600}
    >
      <div className="space-y-4">
        {/* Unit Selector */}
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">Unit:</label>
          <Radio.Group value={unit} onChange={handleUnitChange}>
            <Radio value="in">Inches</Radio>
            <Radio value="mm">Millimeters</Radio>
          </Radio.Group>
        </div>

        {/* Customization Controls */}
        <div className="border border-gray-200 rounded p-4 bg-gray-50 mb-6">
          <h4 className="font-medium mb-4">Customize label size</h4>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                QR Code Size: {qrSize}px
              </label>
              <Slider
                min={100}
                max={400}
                value={qrSize}
                onChange={setQrSize}
                step={10}
              />
            </div>

            <Row gutter={16}>
              <Col span={12}>
                <label className="block text-sm font-medium mb-2">
                  Width ({unit === "mm" ? "mm" : "inches"})
                </label>
                <InputNumber
                  min={unit === "mm" ? 10 : 0.5}
                  max={unit === "mm" ? 200 : 8}
                  step={unit === "mm" ? 1 : 0.1}
                  value={getDisplayWidth()}
                  onChange={handleWidthChange}
                  style={{ width: "100%" }}
                  addonAfter={unit === "mm" ? "mm" : "in"}
                />
              </Col>
              <Col span={12}>
                <label className="block text-sm font-medium mb-2">
                  Height ({unit === "mm" ? "mm" : "inches"})
                </label>
                <InputNumber
                  min={unit === "mm" ? 10 : 0.5}
                  max={unit === "mm" ? 200 : 8}
                  step={unit === "mm" ? 1 : 0.1}
                  value={getDisplayHeight()}
                  onChange={handleHeightChange}
                  style={{ width: "100%" }}
                  addonAfter={unit === "mm" ? "mm" : "in"}
                />
              </Col>
            </Row>
          </div>
        </div>

        {/* Preview */}
        <div className="text-center mt-6">
          <div className="mb-2">
            <strong>Preview:</strong> {getDisplayWidth().toFixed(1)}{unit === "mm" ? "mm" : '"'} × {getDisplayHeight().toFixed(1)}{unit === "mm" ? "mm" : '"'} | QR Size: {qrSize}px
          </div>
          <div
            ref={printRef}
            className="border-2 border-dashed border-gray-300 rounded p-4 bg-white inline-block"
            style={{
              width: `${displayWidthPx}px`,
              height: `${displayHeightPx}px`,
            }}
          >
            <div className="print-page w-full h-full flex flex-col items-center justify-center">
              <Image
                src={qrData.qrCode}
                alt="QR Code"
                style={{
                  width: `${qrSize}px`,
                  height: `${qrSize}px`,
                }}
                preview={false}
              />
              <p className="mt-2 text-sm font-medium whitespace-pre-line">{getLabelText()}</p>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default QRCodeModal;

