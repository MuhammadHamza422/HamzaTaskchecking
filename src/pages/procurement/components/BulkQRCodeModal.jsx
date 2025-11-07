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
  
  // Default values: 1767mm width, 1802mm height (converted to inches for internal storage)
  const defaultWidthMm = 1767;
  const defaultHeightMm = 1802;
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
        
        tempContainer.innerHTML = `
          <img src="${item.qrCode}" alt="QR Code" style="width: ${qrSize}px; height: ${qrSize}px; max-width: 100%; max-height: 70%; object-fit: contain;" />
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
          
          return `
      <div class="label-page" style="width: ${widthIn}in; height: ${heightIn}in; padding: 10px; margin: 0; page-break-after: always; display: flex; flex-direction: column; align-items: center; justify-content: center; border: 1px solid #ddd; box-sizing: border-box;">
        <img src="${item.qrCode}" alt="QR Code" style="width: ${qrSize}px; height: ${qrSize}px; max-width: 100%; max-height: 70%; object-fit: contain;" />
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
                  value={getDisplayWidth()}
                  onChange={(value) => {
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
                  }}
                  min={unit === "mm" ? 10 : 0.5}
                  max={undefined}
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
                  value={getDisplayHeight()}
                  onChange={(value) => {
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
                  }}
                  min={unit === "mm" ? 10 : 0.5}
                  max={undefined}
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
                      setPageWidth(defaultWidthMm / 25.4);
                      setPageHeight(defaultHeightMm / 25.4);
                    } else {
                      // Set to inch defaults
                      setPageWidth(defaultWidthIn);
                      setPageHeight(defaultHeightIn);
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
            ))}
          </Row>
        </div>
      )}
    </Modal>
  );
};

export default BulkQRCodeModal;

