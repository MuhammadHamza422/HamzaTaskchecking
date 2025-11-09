import React, { useState, useRef, useEffect } from "react";
import { Modal, Button, Row, Col, InputNumber, Slider, Space, Spin, message, Radio } from "antd";
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
  const [unit, setUnit] = useState("mm"); // "in" or "mm" - default to mm
  const [labelsPerRow, setLabelsPerRow] = useState(2); // Number of labels per row
  
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

  // Get display values based on unit - memoized to prevent infinite loops
  const getDisplayWidth = React.useMemo(() => {
    if (unit === "mm") {
      return roundValue(inchesToMm(pageWidth), "mm");
    }
    return roundValue(pageWidth, "in");
  }, [unit, pageWidth]);

  const getDisplayHeight = React.useMemo(() => {
    if (unit === "mm") {
      return roundValue(inchesToMm(pageHeight), "mm");
    }
    return roundValue(pageHeight, "in");
  }, [unit, pageHeight]);

  // Use refs to track last values to prevent circular updates
  const lastWidthRef = React.useRef(null);
  const lastHeightRef = React.useRef(null);
  
  // Helper to check if value actually changed (with tolerance for floating point)
  const hasValueChanged = (newValue, oldValue, tolerance = 0.001) => {
    if (oldValue === null || oldValue === undefined) return true;
    return Math.abs(newValue - oldValue) > tolerance;
  };

  // Reset to defaults when modal opens (only on visibility change, not unit change)
  useEffect(() => {
    if (visible) {
      // Reset to defaults based on current unit
      if (unit === "mm") {
        const newWidth = defaultWidthMm / 25.4;
        const newHeight = defaultHeightMm / 25.4;
        setPageWidth(newWidth);
        setPageHeight(newHeight);
        lastWidthRef.current = newWidth;
        lastHeightRef.current = newHeight;
      } else {
        setPageWidth(defaultWidthIn);
        setPageHeight(defaultHeightIn);
        lastWidthRef.current = defaultWidthIn;
        lastHeightRef.current = defaultHeightIn;
      }
      setQrSize(200); // Reset QR size to default
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]); // Only depend on visible, not unit (unit change is handled separately

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
            // For boxes, preserve the box name from the original item (NO FALLBACKS)
            const boxData = response.data.box || response.data;
            // Only use actual box name, no fallbacks
            const actualBoxName = item.name || boxData?.name || response.data.box?.name || "";
            // Filter out generated fallback names (e.g., "Box P00014-box-3")
            const cleanBoxName = actualBoxName && !actualBoxName.trim().match(/^Box\s+P\d+-box-\d+/i) 
              ? actualBoxName.trim() 
              : "";
            
            return {
              ...item,
              qrCode: response.data.qrCode,
              qrData: response.data.qrData,
              product: response.data.product || response.data.kit || boxData,
              box: boxData ? { ...boxData, name: cleanBoxName } : item.box,
              // Only set name if it's a real name, not a fallback
              name: cleanBoxName,
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

  // Get box name separately - returns empty string if no name exists (NO FALLBACKS)
  const getBoxName = (item) => {
    if (!item || item.type !== "box") return "";
    // Only check actual box name fields, no fallbacks to product name or generated names
    const boxName = 
      item.name || 
      item.box?.name || 
      item.qrData?.box?.name || 
      "";
    // Return empty string if name is empty/null/undefined (strictly no fallback)
    // Also filter out any names that look like generated fallbacks (e.g., "Box P00014-box-3")
    if (!boxName) return "";
    // If the name starts with "Box " followed by what looks like a box ID pattern, it's likely a fallback
    if (boxName.trim().match(/^Box\s+P\d+-box-\d+/i)) return "";
    return boxName.trim();
  };

  // Get box ID separately
  const getBoxId = (item) => {
    if (!item || item.type !== "box") return "";
    return item.qrData?.boxId || item.boxId || "";
  };

  // Get label text based on type (for non-box items)
  const getLabelText = (item, index = 0) => {
    if (!item) return "";
    if (item.type === "kit") {
      return item.qrData?.kitId || item.kitId || "";
    } else if (item.type === "box") {
      // For boxes, return box ID (name is handled separately)
      return getBoxId(item);
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
      // pageWidth and pageHeight are always stored in inches internally
      const widthIn = pageWidth;
      const heightIn = pageHeight;

      // Convert to mm for jsPDF
      const widthMm = inchesToMm(widthIn);
      const heightMm = inchesToMm(heightIn);

      // PDF settings: Use the labelsPerRow state variable
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
        // For boxes, show name and ID separately
        const labelHtml = item.type === "box" 
          ? (() => {
              const boxName = getBoxName(item);
              const boxId = getBoxId(item);
              if (boxName && boxId) {
                return `<div style="margin-top: 8px; font-size: 10px; text-align: center; word-break: break-word;">
                  <div style="font-weight: bold; font-size: 11px; margin-bottom: 2px;">${boxName}</div>
                  <div style="font-size: 9px; color: #666;">${boxId}</div>
                </div>`;
              } else if (boxName) {
                return `<div style="margin-top: 8px; font-size: 10px; text-align: center; word-break: break-word;">
                  <div style="font-weight: bold; font-size: 11px;">${boxName}</div>
                </div>`;
              } else if (boxId) {
                return `<div style="margin-top: 8px; font-size: 10px; text-align: center; word-break: break-word;">
                  <div style="font-size: 11px;">${boxId}</div>
                </div>`;
              }
              return "";
            })()
          : `<div style="margin-top: 8px; font-size: 10px; text-align: center; word-break: break-word; white-space: pre-line;">
              ${getLabelText(item, i)}
            </div>`;
        
        // Calculate max QR code size to fit within label (leave space for text)
        const paddingPx = 20; // Padding inside label
        const textHeightPx = 30; // Estimated space for text below QR code
        const containerWidthPx = widthIn * 96; // Convert inches to pixels
        const containerHeightPx = heightIn * 96; // Convert inches to pixels
        const maxQrWidth = Math.max(0, containerWidthPx - paddingPx * 2);
        const maxQrHeight = Math.max(0, containerHeightPx - paddingPx * 2 - textHeightPx);
        const constrainedQrSize = Math.min(qrSize, maxQrWidth, maxQrHeight);
        
        tempContainer.innerHTML = `
          <img src="${item.qrCode}" alt="QR Code" style="width: ${constrainedQrSize}px; height: ${constrainedQrSize}px; max-width: 100%; max-height: 70%; object-fit: contain;" />
          ${labelHtml}
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

    // pageWidth and pageHeight are always stored in inches internally
    const widthIn = pageWidth;
    const heightIn = pageHeight;

    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      message.error("Unable to open print window. Please allow popups.");
      return;
    }

    // Create one label per page
    const labelsHtml = qrCodes
      .map(
        (item, index) => {
          // For boxes, show name and ID separately
          const labelContent = item.type === "box" 
            ? (() => {
                const boxName = getBoxName(item);
                const boxId = getBoxId(item);
                if (boxName && boxId) {
                  return `<div style="margin-top: 8px; font-size: 10px; text-align: center; word-break: break-word;">
                    <div style="font-weight: bold; font-size: 11px; margin-bottom: 2px;">${boxName}</div>
                    <div style="font-size: 9px; color: #666;">${boxId}</div>
                  </div>`;
                } else if (boxName) {
                  return `<div style="margin-top: 8px; font-size: 10px; text-align: center; word-break: break-word;">
                    <div style="font-weight: bold; font-size: 11px;">${boxName}</div>
                  </div>`;
                } else if (boxId) {
                  return `<div style="margin-top: 8px; font-size: 10px; text-align: center; word-break: break-word;">
                    <div style="font-size: 11px;">${boxId}</div>
                  </div>`;
                }
                return "";
              })()
            : `<div style="margin-top: 8px; font-size: 10px; text-align: center; word-break: break-word; white-space: pre-line;">
                ${getLabelText(item, index)}
              </div>`;
          
          // Calculate max QR code size to fit within label (leave space for text)
          const paddingPx = 20; // Padding inside label
          const textHeightPx = 30; // Estimated space for text below QR code
          const containerWidthPx = widthIn * 96; // Convert inches to pixels
          const containerHeightPx = heightIn * 96; // Convert inches to pixels
          const maxQrWidth = Math.max(0, containerWidthPx - paddingPx * 2);
          const maxQrHeight = Math.max(0, containerHeightPx - paddingPx * 2 - textHeightPx);
          const constrainedQrSize = Math.min(qrSize, maxQrWidth, maxQrHeight);
          
          return `
      <div class="label-page" style="width: ${widthIn}in; height: ${heightIn}in; padding: 10px; margin: 0; page-break-after: always; display: flex; flex-direction: column; align-items: center; justify-content: center; border: 1px solid #ddd; box-sizing: border-box;">
        <img src="${item.qrCode}" alt="QR Code" style="width: ${constrainedQrSize}px; height: ${constrainedQrSize}px; max-width: 100%; max-height: 70%; object-fit: contain;" />
        ${labelContent}
      </div>
    `;
        }
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
                  value={getDisplayWidth}
                  onChange={(value) => {
                    if (value === null || value === undefined) return;
                    
                    // Limit maximum values to prevent overflow and crashes
                    const maxValue = unit === "mm" ? 500 : 20; // Max 500mm or 20 inches
                    const clampedValue = Math.min(value, maxValue);
                    
                    // Round the input value based on current unit
                    const roundedValue = roundValue(clampedValue, unit);
                    
                    // Calculate what the new internal value would be
                    let newInternalValue;
                    if (unit === "mm") {
                      // Convert mm input to inches for internal storage
                      newInternalValue = mmToInches(roundedValue);
                    } else {
                      // Store inches directly
                      newInternalValue = roundedValue;
                    }
                    
                    // Only update if the value actually changed (prevent circular updates)
                    const tolerance = unit === "mm" ? 0.01 : 0.0001; // More tolerance for mm
                    if (hasValueChanged(newInternalValue, lastWidthRef.current, tolerance)) {
                      lastWidthRef.current = newInternalValue;
                      setPageWidth(newInternalValue);
                    }
                  }}
                  min={unit === "mm" ? 10 : 0.5}
                  max={unit === "mm" ? 500 : 20}
                  step={unit === "mm" ? 1 : 0.1}
                  style={{ width: "100%" }}
                  addonAfter={unit === "mm" ? "mm" : "in"}
                />
              </div>
            </Col>
            <Col span={8}>
              <div>
                <label className="text-sm font-medium mb-1 block">
                  Page Height ({unit === "mm" ? "mm" : "inches"})
                </label>
                <InputNumber
                  value={getDisplayHeight}
                  onChange={(value) => {
                    if (value === null || value === undefined) return;
                    
                    // Limit maximum values to prevent overflow and crashes
                    const maxValue = unit === "mm" ? 500 : 20; // Max 500mm or 20 inches
                    const clampedValue = Math.min(value, maxValue);
                    
                    // Round the input value based on current unit
                    const roundedValue = roundValue(clampedValue, unit);
                    
                    // Calculate what the new internal value would be
                    let newInternalValue;
                    if (unit === "mm") {
                      // Convert mm input to inches for internal storage
                      newInternalValue = mmToInches(roundedValue);
                    } else {
                      // Store inches directly
                      newInternalValue = roundedValue;
                    }
                    
                    // Only update if the value actually changed (prevent circular updates)
                    const tolerance = unit === "mm" ? 0.01 : 0.0001; // More tolerance for mm
                    if (hasValueChanged(newInternalValue, lastHeightRef.current, tolerance)) {
                      lastHeightRef.current = newInternalValue;
                      setPageHeight(newInternalValue);
                    }
                  }}
                  min={unit === "mm" ? 10 : 0.5}
                  max={unit === "mm" ? 500 : 20}
                  step={unit === "mm" ? 1 : 0.1}
                  style={{ width: "100%" }}
                  addonAfter={unit === "mm" ? "mm" : "in"}
                />
              </div>
            </Col>
            <Col span={8}>
              <div>
                <label className="text-sm font-medium mb-1 block">Unit</label>
                <Radio.Group 
                  value={unit} 
                  onChange={(e) => {
                    const newUnit = e.target.value;
                    
                    // When switching units, reset to defaults for that unit
                    if (newUnit === "mm") {
                      // Set to mm defaults (convert to inches for storage)
                      const newWidth = defaultWidthMm / 25.4;
                      const newHeight = defaultHeightMm / 25.4;
                      setPageWidth(newWidth);
                      setPageHeight(newHeight);
                      lastWidthRef.current = newWidth;
                      lastHeightRef.current = newHeight;
                    } else {
                      // Set to inch defaults
                      setPageWidth(defaultWidthIn);
                      setPageHeight(defaultHeightIn);
                      lastWidthRef.current = defaultWidthIn;
                      lastHeightRef.current = defaultHeightIn;
                    }
                    
                    setUnit(newUnit);
                  }}
                >
                  <Radio value="in">Inches</Radio>
                  <Radio value="mm">Millimeters</Radio>
                </Radio.Group>
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
            {qrCodes.map((item, index) => {
              // Convert dimensions for display (convert to pixels for preview)
              // pageWidth and pageHeight are stored in inches internally
              // Cap at reasonable max to prevent overflow (500mm = ~19685px, but we'll cap at 2000px for safety)
              const maxPixels = 2000;
              const rawWidthPx = pageWidth * 96; // Convert inches to pixels (96 DPI)
              const rawHeightPx = pageHeight * 96;
              const displayWidthPx = Math.min(rawWidthPx, maxPixels);
              const displayHeightPx = Math.min(rawHeightPx, maxPixels);
              
              // Calculate max QR code size to fit within label (leave space for text)
              const paddingPx = 20; // Padding inside label
              const textHeightPx = 30; // Estimated space for text below QR code
              const maxQrWidth = Math.max(0, displayWidthPx - paddingPx * 2);
              const maxQrHeight = Math.max(0, displayHeightPx - paddingPx * 2 - textHeightPx);
              const constrainedQrSize = Math.min(qrSize, maxQrWidth, maxQrHeight);
              
              return (
                <Col key={index} span={24 / labelsPerRow}>
                  <div
                    className="border border-gray-300 p-4 rounded flex flex-col items-center justify-center"
                    style={{
                      width: `${displayWidthPx}px`,
                      height: `${displayHeightPx}px`,
                      backgroundColor: "#ffffff",
                      boxSizing: "border-box",
                      overflow: "hidden",
                    }}
                  >
                    <img
                      src={item.qrCode}
                      alt="QR Code"
                      style={{ 
                        width: `${constrainedQrSize}px`, 
                        height: `${constrainedQrSize}px`,
                        maxWidth: "100%",
                        maxHeight: "70%",
                        objectFit: "contain",
                      }}
                    />
                    {item.type === "box" ? (
                      <div className="mt-2 text-center">
                        {getBoxName(item) && getBoxId(item) ? (
                          <>
                            <div className="text-lg font-bold mb-0">{getBoxName(item)}</div>
                            <div className="text-xs text-gray-600 mb-0">{getBoxId(item)}</div>
                          </>
                        ) : getBoxName(item) ? (
                          <div className="text-xs font-bold mb-0">{getBoxName(item)}</div>
                        ) : getBoxId(item) ? (
                          <div className="text-base mb-0">{getBoxId(item)}</div>
                        ) : null}
                      </div>
                    ) : (
                      <div className="mt-2 text-xs text-center text-gray-600 whitespace-pre-line">
                        {getLabelText(item, index)}
                      </div>
                    )}
                  </div>
                </Col>
              );
            })}
          </Row>
        </div>
      )}
    </Modal>
  );
};

export default BulkQRCodeModal;

