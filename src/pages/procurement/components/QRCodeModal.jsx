import React, { useState, useRef, useEffect } from "react";
import { Modal, Button, Row, Col, InputNumber, Slider, Image, Radio, Space, message, Checkbox, Divider } from "antd";
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
  const [unit, setUnit] = useState("mm"); // "in" or "mm" - default to mm
  
  // Font size states (in pixels)
  const [boxNameFontSize, setBoxNameFontSize] = useState(14);
  const [boxIdFontSize, setBoxIdFontSize] = useState(12);
  const [skuFontSize, setSkuFontSize] = useState(12);
  const [productNameFontSize, setProductNameFontSize] = useState(14);
  
  // Show/hide states
  const [showBoxName, setShowBoxName] = useState(true);
  const [showBoxId, setShowBoxId] = useState(true);
  const [showSku, setShowSku] = useState(true);
  const [showProductName, setShowProductName] = useState(false);
  
  // Default values: reasonable label sizes
  // 2.7 inches = ~68.58mm, 2.8 inches = ~71.12mm
  const defaultWidthMm = 70; // ~2.75 inches
  const defaultHeightMm = 71; // ~2.8 inches
  const defaultWidthIn = 2.7;
  const defaultHeightIn = 2.8;
  
  // Initialize with mm defaults (convert to inches for internal storage)
  const [pageWidth, setPageWidth] = useState(defaultWidthMm / 25.4);
  const [pageHeight, setPageHeight] = useState(defaultHeightMm / 25.4);

  // Convert inches to mm with proper rounding
  const inchesToMm = (inches) => {
    const mm = inches * 25.4;
    // Round to 2 decimal places to avoid floating-point precision issues
    return Math.round(mm * 100) / 100;
  };

  // Convert mm to inches with proper rounding
  const mmToInches = (mm) => {
    const inches = mm / 25.4;
    // Round to 4 decimal places for inches (more precision needed)
    return Math.round(inches * 10000) / 10000;
  };

  // Round value to appropriate precision based on unit
  const roundValue = (value, currentUnit) => {
    if (value === null || value === undefined) return value;
    if (currentUnit === "mm") {
      // Round mm to 2 decimal places
      return Math.round(value * 100) / 100;
    } else {
      // Round inches to 4 decimal places
      return Math.round(value * 10000) / 10000;
    }
  };

  // Get display values based on unit
  const getDisplayWidth = () => {
    if (unit === "mm") {
      return roundValue(inchesToMm(pageWidth), "mm");
    }
    return roundValue(pageWidth, "in");
  };

  const getDisplayHeight = () => {
    if (unit === "mm") {
      return roundValue(inchesToMm(pageHeight), "mm");
    }
    return roundValue(pageHeight, "in");
  };

  // Handle unit change
  const handleUnitChange = (e) => {
    const newUnit = e.target.value;
    
    // When switching units, reset to defaults for that unit
    if (newUnit === "mm") {
      // Set to mm defaults (convert to inches for storage)
      setPageWidth(defaultWidthMm / 25.4);
      setPageHeight(defaultHeightMm / 25.4);
    } else {
      // Set to inch defaults
      setPageWidth(defaultWidthIn);
      setPageHeight(defaultHeightIn);
    }
    
    setUnit(newUnit);
  };
  
  // Reset to defaults when modal opens (only on visibility change, not unit change)
  useEffect(() => {
    if (visible) {
      // Reset to defaults based on current unit
      if (unit === "mm") {
        setPageWidth(defaultWidthMm / 25.4);
        setPageHeight(defaultHeightMm / 25.4);
      } else {
        setPageWidth(defaultWidthIn);
        setPageHeight(defaultHeightIn);
      }
      setQrSize(200); // Reset QR size to default
      // Reset font sizes to defaults
      setBoxNameFontSize(14);
      setBoxIdFontSize(12);
      setSkuFontSize(12);
      setProductNameFontSize(14);
      // Reset show/hide to defaults
      setShowBoxName(true);
      setShowBoxId(true);
      setShowSku(true);
      setShowProductName(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]); // Only depend on visible, not unit (unit change is handled separately

  // Handle width change
  const handleWidthChange = (value) => {
    if (value === null || value === undefined) return;
    
    // Round the input value based on current unit
    const roundedValue = roundValue(value, unit);
    
    if (unit === "mm") {
      // Convert mm input to inches for internal storage
      const inchesValue = mmToInches(roundedValue);
      setPageWidth(inchesValue);
    } else {
      // Store inches directly
      setPageWidth(roundedValue);
    }
  };

  // Handle height change
  const handleHeightChange = (value) => {
    if (value === null || value === undefined) return;
    
    // Round the input value based on current unit
    const roundedValue = roundValue(value, unit);
    
    if (unit === "mm") {
      // Convert mm input to inches for internal storage
      const inchesValue = mmToInches(roundedValue);
      setPageHeight(inchesValue);
    } else {
      // Store inches directly
      setPageHeight(roundedValue);
    }
  };

  // Get box name separately - returns empty string if no name exists (NO FALLBACKS)
  const getBoxName = () => {
    if (!qrData || qrData.type !== "box") return "";
    // Only check actual box name fields, no fallbacks to product name or generated names
    const boxName = (
      qrData.box?.name || 
      qrData.qrData?.box?.name || 
      qrData.name || 
      ""
    );
    // Return empty string if name is empty/null/undefined (strictly no fallback)
    // Also filter out any names that look like generated fallbacks (e.g., "Box P00014-box-3")
    if (!boxName) return "";
    // If the name starts with "Box " followed by what looks like a box ID pattern, it's likely a fallback
    if (boxName.trim().match(/^Box\s+P\d+-box-\d+/i)) return "";
    return boxName.trim();
  };

  // Get box ID separately
  const getBoxId = () => {
    if (!qrData || qrData.type !== "box") return "";
    return (
      qrData.qrData?.boxId || 
      qrData.boxId || 
      qrData.box?.boxId || 
      ""
    );
  };

  // Get label text based on type (for filename/title purposes)
  const getLabelText = () => {
    if (!qrData) return "";
    if (qrData.type === "kit") {
      return qrData.qrData?.kitId || qrData.product?.kitId || "";
    } else if (qrData.type === "box") {
      const boxName = getBoxName();
      const boxId = getBoxId();
      if (boxName && boxId) {
        return `${boxName}-${boxId}`;
      }
      return boxId || boxName || "";
    } else {
      return qrData.qrData?.sku || qrData.product?.sku || "";
    }
  };

  // Get product name
  const getProductName = () => {
    if (!qrData || qrData.type === "box") return "";
    return qrData.product?.name || qrData.product?.pro_title || qrData.qrData?.product?.name || "";
  };

  // Get SKU
  const getSku = () => {
    if (!qrData || qrData.type === "box") return "";
    return qrData.qrData?.sku || qrData.product?.sku || "";
  };

  // Generate PDF
  const generatePDF = async () => {
    if (!printRef.current || !qrData?.qrCode) {
      message.error("QR code element not found");
      return;
    }

    setDownloading(true);
    try {
      // pageWidth and pageHeight are always stored in inches internally
      const widthIn = pageWidth;
      const heightIn = pageHeight;

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

    // pageWidth and pageHeight are always stored in inches internally
    const widthIn = pageWidth;
    const heightIn = pageHeight;
    
    // Calculate constrained QR code size for print
    const containerWidthPx = widthIn * 96;
    const containerHeightPx = heightIn * 96;
    const paddingPx = 20;
    const textHeightPx = 30;
    const maxQrWidth = Math.max(0, containerWidthPx - paddingPx * 2);
    const maxQrHeight = Math.max(0, containerHeightPx - paddingPx * 2 - textHeightPx);
    const constrainedQrSize = Math.min(qrSize, maxQrWidth, maxQrHeight);

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
              font-size: 14px;
              text-align: center;
              word-break: break-word;
            }
            .box-name {
              font-weight: bold;
              font-size: ${boxNameFontSize}px;
              margin-bottom: 2px;
              ${!showBoxName ? 'display: none;' : ''}
            }
            .box-id {
              font-size: ${boxIdFontSize}px;
              color: #666;
              ${!showBoxId ? 'display: none;' : ''}
            }
            .product-name {
              font-weight: bold;
              font-size: ${productNameFontSize}px;
              margin-bottom: 2px;
              ${!showProductName ? 'display: none;' : ''}
            }
            .sku-text {
              font-size: ${skuFontSize}px;
              color: #666;
              ${!showSku ? 'display: none;' : ''}
            }
            .label-text {
              font-weight: bold;
            }
          </style>
        </head>
        <body>
          <div class="print-container">
            <img src="${qrData.qrCode}" alt="QR Code" style="width: ${constrainedQrSize}px; height: ${constrainedQrSize}px; max-width: 100%; max-height: 70%; object-fit: contain;" />
            ${qrData?.type === "box" 
              ? `<div class="label-info">
                  ${showBoxName && getBoxName() ? `<div class="box-name">${getBoxName()}</div>` : ""}
                  ${showBoxId && getBoxId() ? `<div class="box-id">${getBoxId()}</div>` : ""}
                </div>`
              : `<div class="label-info">
                  ${showProductName && getProductName() ? `<div class="product-name">${getProductName()}</div>` : ""}
                  ${showSku && getSku() ? `<div class="sku-text">${getSku()}</div>` : ""}
                </div>`
            }
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
  // pageWidth and pageHeight are stored in inches internally
  const displayWidthPx = pageWidth * 96; // Convert inches to pixels (96 DPI)
  const displayHeightPx = pageHeight * 96; // Convert inches to pixels (96 DPI)
  
  // Calculate max QR code size to fit within label (leave space for text)
  const paddingPx = 20; // Padding inside label
  const textHeightPx = 30; // Estimated space for text below QR code
  const maxQrWidth = Math.max(0, displayWidthPx - paddingPx * 2);
  const maxQrHeight = Math.max(0, displayHeightPx - paddingPx * 2 - textHeightPx);
  const constrainedQrSize = Math.min(qrSize, maxQrWidth, maxQrHeight);

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
                  max={unit === "mm" ? 500 : 20}
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
                  max={unit === "mm" ? 500 : 20}
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

        {/* Text Customization Controls - Compact Layout */}
        <div className="border border-gray-200 rounded p-3 bg-gray-50 mb-4">
          <h4 className="font-medium mb-3 text-sm">Customize text</h4>
          
          <Row gutter={16}>
            <Col span={12}>
              <div>
                <label className="block text-xs font-medium mb-1">Show/Hide</label>
                <Space direction="vertical" size="small" style={{ width: "100%" }}>
                  {qrData?.type === "box" ? (
                    <>
                      <Checkbox checked={showBoxName} onChange={(e) => setShowBoxName(e.target.checked)} size="small">
                        Box Name
                      </Checkbox>
                      <Checkbox checked={showBoxId} onChange={(e) => setShowBoxId(e.target.checked)} size="small">
                        Box ID
                      </Checkbox>
                    </>
                  ) : (
                    <>
                      <Checkbox checked={showProductName} onChange={(e) => setShowProductName(e.target.checked)} size="small">
                        Product Name
                      </Checkbox>
                      <Checkbox checked={showSku} onChange={(e) => setShowSku(e.target.checked)} size="small">
                        SKU
                      </Checkbox>
                    </>
                  )}
                </Space>
              </div>
            </Col>
            <Col span={12}>
              <div>
                <label className="block text-xs font-medium mb-1">Font Sizes</label>
                <div className="space-y-2">
                  {qrData?.type === "box" ? (
                    <>
                      <div>
                        <div className="flex items-center justify-between mb-0.5">
                          <span className="text-xs">Name: {boxNameFontSize}px</span>
                        </div>
                        <Slider
                          min={8}
                          max={24}
                          value={boxNameFontSize}
                          onChange={setBoxNameFontSize}
                          step={1}
                          disabled={!showBoxName}
                          style={{ margin: "4px 0" }}
                        />
                      </div>
                      <div>
                        <div className="flex items-center justify-between mb-0.5">
                          <span className="text-xs">ID: {boxIdFontSize}px</span>
                        </div>
                        <Slider
                          min={8}
                          max={20}
                          value={boxIdFontSize}
                          onChange={setBoxIdFontSize}
                          step={1}
                          disabled={!showBoxId}
                          style={{ margin: "4px 0" }}
                        />
                      </div>
                    </>
                  ) : (
                    <>
                      <div>
                        <div className="flex items-center justify-between mb-0.5">
                          <span className="text-xs">Name: {productNameFontSize}px</span>
                        </div>
                        <Slider
                          min={8}
                          max={24}
                          value={productNameFontSize}
                          onChange={setProductNameFontSize}
                          step={1}
                          disabled={!showProductName}
                          style={{ margin: "4px 0" }}
                        />
                      </div>
                      <div>
                        <div className="flex items-center justify-between mb-0.5">
                          <span className="text-xs">SKU: {skuFontSize}px</span>
                        </div>
                        <Slider
                          min={8}
                          max={20}
                          value={skuFontSize}
                          onChange={setSkuFontSize}
                          step={1}
                          disabled={!showSku}
                          style={{ margin: "4px 0" }}
                        />
                      </div>
                    </>
                  )}
                </div>
              </div>
            </Col>
          </Row>
        </div>

        {/* Preview */}
        <div className="text-center mt-6">
          <div className="mb-2">
            <strong>Preview:</strong> {unit === "mm" ? getDisplayWidth().toFixed(2) : getDisplayWidth().toFixed(3)}{unit === "mm" ? "mm" : '"'} × {unit === "mm" ? getDisplayHeight().toFixed(2) : getDisplayHeight().toFixed(3)}{unit === "mm" ? "mm" : '"'} | QR Size: {qrSize}px
          </div>
          <div
            ref={printRef}
            className="border-2 border-dashed border-gray-300 rounded p-4 bg-white inline-block"
            style={{
              width: `${displayWidthPx}px`,
              height: `${displayHeightPx}px`,
            }}
          >
            <div className="w-full h-full flex flex-col items-center justify-center p-2">
              <Image
                src={qrData.qrCode}
                alt="QR Code"
                style={{
                  width: `${constrainedQrSize}px`,
                  height: `${constrainedQrSize}px`,
                  maxWidth: "100%",
                  maxHeight: "100%",
                  objectFit: "contain",
                }}
                preview={false}
              />
              {qrData?.type === "box" ? (
                <div className="mt-2 text-center">
                  {showBoxName && getBoxName() && (
                    <p className="font-bold mb-1" style={{ fontSize: `${boxNameFontSize}px` }}>{getBoxName()}</p>
                  )}
                  {showBoxId && getBoxId() && (
                    <p className="mb-0" style={{ fontSize: `${boxIdFontSize}px`, color: '#666' }}>{getBoxId()}</p>
                  )}
                </div>
              ) : (
                <div className="mt-2 text-center">
                  {showProductName && getProductName() && (
                    <p className="font-bold mb-1" style={{ fontSize: `${productNameFontSize}px` }}>{getProductName()}</p>
                  )}
                  {showSku && getSku() && (
                    <p className="mb-0" style={{ fontSize: `${skuFontSize}px`, color: '#666' }}>{getSku()}</p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default QRCodeModal;

