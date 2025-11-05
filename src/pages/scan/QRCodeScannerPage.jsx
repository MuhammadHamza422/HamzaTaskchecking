import React, { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Card, Button, Space, Input, Form, Spin, Alert, Row, Col, Divider } from "antd";
import Swal from "sweetalert2";
import { ArrowLeft, QrCode, Camera, Search, Keyboard } from "lucide-react";
import QrScanner from "qr-scanner";
import { scanBox, scanProduct, scanKit } from "../../api/procurement";

const SCAN_METHODS = {
  CAMERA: "camera",
  SCANNER_DEVICE: "scanner_device",
  MANUAL: "manual",
};

const QRCodeScannerPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const videoRef = useRef(null);
  const qrScannerRef = useRef(null);
  const [form] = Form.useForm();
  
  const [selectedMethod, setSelectedMethod] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [hasPermission, setHasPermission] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [manualSearching, setManualSearching] = useState(false);
  const [scannerBuffer, setScannerBuffer] = useState("");
  const [lastScannerTime, setLastScannerTime] = useState(0);
  const scannerTimeoutRef = useRef(null);
  const scannerInputRef = useRef(null);
  
  const poId = searchParams.get("poId");

  useEffect(() => {
    return () => {
      stopScanning();
    };
  }, []);

  useEffect(() => {
    if (selectedMethod === SCAN_METHODS.CAMERA) {
      checkCameraAvailability();
    }
    if (selectedMethod === SCAN_METHODS.SCANNER_DEVICE) {
      setTimeout(() => {
        scannerInputRef.current?.focus();
      }, 100);
    }
  }, [selectedMethod]);

  const handleScannerInput = useCallback(async (scannedData) => {
    setLoading(true);
    setScannerBuffer("");

    try {
      let qrData;
      try {
        qrData = JSON.parse(scannedData);
      } catch (parseError) {
        const idType = detectIdType(scannedData);
        if (idType) {
          await handleDirectScan(scannedData, idType);
          return;
        }
        throw new Error("Invalid QR code format");
      }

      if (!qrData || typeof qrData !== "object" || !qrData.type) {
        throw new Error("Invalid QR code format: missing type");
      }

      await processQRCode(qrData);
    } catch (err) {
      console.error("Scanner error:", err);
      const errorMessage = err.message || err.response?.data?.error?.message || "Failed to process scan";
      Swal.fire({
        icon: "error",
        title: "Scan Failed",
        text: errorMessage,
        toast: true,
        position: "top-end",
        showConfirmButton: false,
        timer: 4000,
      });
    } finally {
      setLoading(false);
      setTimeout(() => {
        scannerInputRef.current?.focus();
      }, 100);
    }
  }, [poId]);

  useEffect(() => {
    if (selectedMethod !== SCAN_METHODS.SCANNER_DEVICE) return;

    const handleKeyPress = (e) => {
      if (document.activeElement?.tagName === "INPUT" && document.activeElement !== scannerInputRef.current) {
        return;
      }

      const currentTime = Date.now();
      setLastScannerTime((prevTime) => {
        const timeDiff = currentTime - prevTime;
        
        if (timeDiff > 100) {
          setScannerBuffer("");
        }
        return currentTime;
      });

      if (e.key.length === 1) {
        setScannerBuffer((prevBuffer) => {
          const newBuffer = prevBuffer + e.key;
          
          if (scannerTimeoutRef.current) {
            clearTimeout(scannerTimeoutRef.current);
          }

          scannerTimeoutRef.current = setTimeout(() => {
            if (newBuffer.length >= 3) {
              handleScannerInput(newBuffer);
              setScannerBuffer("");
            }
          }, 50);

          return newBuffer;
        });
      }

      if (e.key === "Enter") {
        setScannerBuffer((prevBuffer) => {
          if (prevBuffer.length >= 3) {
            e.preventDefault();
            handleScannerInput(prevBuffer);
            return "";
          }
          return prevBuffer;
        });
      }
    };

    document.addEventListener("keypress", handleKeyPress);
    return () => {
      document.removeEventListener("keypress", handleKeyPress);
      if (scannerTimeoutRef.current) {
        clearTimeout(scannerTimeoutRef.current);
      }
    };
  }, [selectedMethod, handleScannerInput]);

  const checkCameraAvailability = async () => {
    try {
      const hasCamera = await QrScanner.hasCamera();
      setHasPermission(hasCamera);
      if (!hasCamera) {
        setError("No camera found. Please ensure your device has a camera.");
      }
    } catch (err) {
      setHasPermission(false);
      setError("Unable to check camera availability.");
    }
  };

  const startScanning = async (scanBarcode = false) => {
    try {
      if (!videoRef.current) return;
      
      if (qrScannerRef.current) {
        stopScanning();
      }

      setError(null);
      setScanning(true);

      const qrScanner = new QrScanner(
        videoRef.current,
        (result) => handleScan(result.data),
        {
          returnDetailedScanResult: true,
          highlightScanRegion: true,
          highlightCodeOutline: true,
        }
      );

      qrScannerRef.current = qrScanner;
      await qrScanner.start();
      setHasPermission(true);
    } catch (err) {
      console.error("Failed to start scanner:", err);
      setScanning(false);
      setHasPermission(false);
      
      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        setError("Camera permission denied. Please allow camera access.");
      } else if (err.name === "NotFoundError") {
        setError("No camera found.");
      } else {
        setError(`Failed to access camera: ${err.message}`);
      }
    }
  };

  const stopScanning = () => {
    if (qrScannerRef.current) {
      qrScannerRef.current.stop();
      qrScannerRef.current.destroy();
      qrScannerRef.current = null;
    }
    setScanning(false);
  };

  const handleScan = async (scanDataString) => {
    stopScanning();
    setLoading(true);

    try {
      let qrData;
      try {
        qrData = JSON.parse(scanDataString);
      } catch (parseError) {
        const idType = detectIdType(scanDataString);
        if (idType) {
          await handleDirectScan(scanDataString, idType);
          return;
        }
        throw new Error("Invalid QR code format");
      }

      if (!qrData || typeof qrData !== "object" || !qrData.type) {
        throw new Error("Invalid QR code format: missing type");
      }

      await processQRCode(qrData);
    } catch (err) {
      console.error("Scan error:", err);
      const errorMessage = err.message || err.response?.data?.error?.message || "Failed to scan";
      Swal.fire({
        icon: "error",
        title: "Scan Failed",
        text: errorMessage,
        toast: true,
        position: "top-end",
        showConfirmButton: false,
        timer: 4000,
      });
      
      setTimeout(() => {
        if (selectedMethod === SCAN_METHODS.CAMERA) {
          startScanning(false);
        }
      }, 2000);
    } finally {
      setLoading(false);
    }
  };

  const handleDirectScan = async (id, idType) => {
    try {
      let scanData = null;
      let detectedType = null;

      if (idType === "kit") {
        scanData = await scanKit(id, { poId });
        detectedType = "kit";
      } else if (idType === "box") {
        scanData = await scanBox(id);
        detectedType = "box";
      } else if (idType === "objectId") {
        try {
          scanData = await scanBox(id);
          detectedType = "box";
        } catch {
          scanData = await scanProduct(id, { poId });
          detectedType = "product";
        }
      } else {
        throw new Error("Unable to determine item type from ID");
      }

      if (scanData?.success) {
        navigateToResult(scanData.data, detectedType, id);
      }
    } catch (err) {
      throw new Error(`ID "${id}" not found. Please verify the ID.`);
    }
  };

  const processQRCode = async (qrData) => {
    let scanData = null;
    let detectedType = null;

    switch (qrData.type) {
      case "product":
        if (!qrData.productId) throw new Error("Invalid product QR code: missing productId");
        scanData = await scanProduct(qrData.productId, { poId: qrData.poId || poId, sku: qrData.sku });
        detectedType = "product";
        break;

      case "kit":
        if (!qrData.kitId) throw new Error("Invalid kit QR code: missing kitId");
        scanData = await scanKit(qrData.kitId, { poId: qrData.poId || poId });
        detectedType = "kit";
        break;

      case "box":
        if (!qrData.boxId) throw new Error("Invalid box QR code: missing boxId");
        scanData = await scanBox(qrData.boxId);
        detectedType = "box";
        break;

      default:
        throw new Error(`Unknown QR code type: ${qrData.type}`);
    }

    if (scanData?.success) {
      navigateToResult(scanData.data, detectedType, qrData);
    } else {
      throw new Error(scanData?.error?.message || "Failed to scan: Invalid response");
    }
  };

  const navigateToResult = (scanData, type, qrDataOrId) => {
    const qrData = typeof qrDataOrId === "object" 
      ? qrDataOrId 
      : {
          type,
          [type === "box" ? "boxId" : type === "kit" ? "kitId" : "productId"]: qrDataOrId,
          poId: poId || undefined,
        };

    navigate(`/scan/result`, {
      state: {
        scanData,
        qrData,
        poId: qrData.poId || poId,
      },
    });
  };

  const detectIdType = (id) => {
    if (!id || typeof id !== "string") return null;
    const trimmedId = id.trim();

    if (/^KIT-[A-Z0-9]+-\d+$/i.test(trimmedId)) return "kit";
    if (/^[A-Z0-9]+-box-\d+$/i.test(trimmedId)) return "box";
    if (/^[0-9a-fA-F]{24}$/.test(trimmedId)) return "objectId";
    return null;
  };

  const handleManualSearch = async (values) => {
    const { searchId } = values;
    if (!searchId?.trim()) {
      Swal.fire({
        icon: "warning",
        title: "Missing ID",
        text: "Please enter an ID to search",
        toast: true,
        position: "top-end",
        showConfirmButton: false,
        timer: 3000,
      });
      return;
    }

    const trimmedId = searchId.trim();
    setManualSearching(true);
    setError(null);

    try {
      const idType = detectIdType(trimmedId);
      let scanData = null;
      let detectedType = null;

      if (idType === "kit") {
        scanData = await scanKit(trimmedId, { poId });
        detectedType = "kit";
      } else if (idType === "box") {
        scanData = await scanBox(trimmedId);
        detectedType = "box";
      } else if (idType === "objectId") {
        try {
          scanData = await scanBox(trimmedId);
          detectedType = "box";
        } catch {
          scanData = await scanProduct(trimmedId, { poId });
          detectedType = "product";
        }
      } else {
        if (trimmedId.toUpperCase().startsWith("KIT-")) {
          scanData = await scanKit(trimmedId, { poId });
          detectedType = "kit";
        } else if (trimmedId.toLowerCase().includes("-box-")) {
          scanData = await scanBox(trimmedId);
          detectedType = "box";
        } else {
          try {
            scanData = await scanBox(trimmedId);
            detectedType = "box";
          } catch {
            scanData = await scanProduct(trimmedId, { poId });
            detectedType = "product";
          }
        }
      }

      if (scanData?.success) {
        navigateToResult(scanData.data, detectedType, trimmedId);
      } else {
        throw new Error(scanData?.error?.message || "Failed to search");
      }
    } catch (err) {
      const errorMessage = err.message || err.response?.data?.error?.message || "Failed to search";
      setError(errorMessage);
      Swal.fire({
        icon: "error",
        title: "Search Failed",
        text: errorMessage.split('\n')[0],
        toast: true,
        position: "top-end",
        showConfirmButton: false,
        timer: 5000,
      });
    } finally {
      setManualSearching(false);
    }
  };

  const renderMethodSelection = () => (
    <div className="text-center py-8">
      <h2 className="text-xl font-semibold mb-6">Select Scan Method</h2>
      <Row gutter={[16, 16]} justify="center">
        <Col xs={24} sm={8}>
          <Card
            hoverable
            className="h-full cursor-pointer"
            onClick={() => setSelectedMethod(SCAN_METHODS.CAMERA)}
          >
            <div className="text-center py-4">
              <Camera size={48} className="mx-auto mb-3 text-blue-600" />
              <h3 className="font-semibold mb-2">Camera Scanner</h3>
              <p className="text-sm text-gray-600">Scan QR codes using camera</p>
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card
            hoverable
            className="h-full cursor-pointer"
            onClick={() => setSelectedMethod(SCAN_METHODS.SCANNER_DEVICE)}
          >
            <div className="text-center py-4">
              <Keyboard size={48} className="mx-auto mb-3 text-green-600" />
              <h3 className="font-semibold mb-2">Scanner Device</h3>
              <p className="text-sm text-gray-600">Use physical scanner device</p>
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card
            hoverable
            className="h-full cursor-pointer"
            onClick={() => setSelectedMethod(SCAN_METHODS.MANUAL)}
          >
            <div className="text-center py-4">
              <Search size={48} className="mx-auto mb-3 text-purple-600" />
              <h3 className="font-semibold mb-2">Manual Search</h3>
              <p className="text-sm text-gray-600">Enter ID manually to search</p>
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  );

  const renderCameraScanner = () => (
    <div>
      {error && (
        <Alert
          message="Camera Error"
          description={error}
          type="error"
          showIcon
          className="mb-4"
          closable
          onClose={() => setError(null)}
        />
      )}

      <div className="relative w-full bg-black rounded-lg overflow-hidden" style={{ aspectRatio: "4/3" }}>
        <video ref={videoRef} className="w-full h-full object-cover" playsInline />
        {scanning && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-900 bg-opacity-50">
            <Spin size="large" />
          </div>
        )}
        {!scanning && hasPermission !== false && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-900 bg-opacity-90">
            <div className="text-center text-white">
              <Camera size={48} className="mx-auto mb-2" />
              <p className="text-lg font-semibold mb-1">Camera Ready</p>
              <p className="text-sm text-gray-300">Click "Start Scanning" to begin</p>
            </div>
          </div>
        )}
      </div>

      <div className="mt-4 flex justify-center gap-2">
        {!scanning && hasPermission !== false && (
          <Button type="primary" icon={<Camera size={16} />} onClick={() => startScanning(false)} size="large">
            Start Scanning
          </Button>
        )}
        {scanning && (
          <Button icon={<ArrowLeft size={16} />} onClick={stopScanning} size="large">
            Stop Scanning
          </Button>
        )}
        <Button onClick={() => setSelectedMethod(null)} size="large">
          Back
        </Button>
      </div>

      <div className="mt-4 p-4 bg-gray-50 rounded-lg">
        <h3 className="font-semibold mb-2">Instructions:</h3>
        <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
          <li>Point your camera at a QR code</li>
          <li>Ensure the QR code is well-lit and clearly visible</li>
          <li>Hold the device steady until the code is scanned</li>
        </ul>
      </div>
    </div>
  );

  const renderScannerDevice = () => (
    <div>
      <div className="text-center py-8">
        <Keyboard size={64} className="mx-auto mb-4 text-green-600" />
        <h2 className="text-xl font-semibold mb-2">Scanner Device Ready</h2>
        <p className="text-gray-600 mb-6">
          Point your scanner device at a QR code and scan
        </p>
        
        <div className="max-w-md mx-auto">
          <Input
            ref={scannerInputRef}
            placeholder="Scan QR code with your scanner device..."
            size="large"
            autoFocus
            readOnly
            className="text-center"
            style={{ fontSize: "16px", letterSpacing: "2px" }}
            value={scannerBuffer || "Waiting for scan..."}
          />
        </div>

        {loading && (
          <div className="mt-4">
            <Spin size="large" />
            <p className="mt-2 text-gray-600">Processing scan...</p>
          </div>
        )}

        <div className="mt-6">
          <Button onClick={() => setSelectedMethod(null)} size="large">
            Back
          </Button>
        </div>
      </div>

      <div className="mt-6 p-4 bg-gray-50 rounded-lg">
        <h3 className="font-semibold mb-2">Instructions:</h3>
        <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
          <li>Connect your scanner device (USB/Bluetooth)</li>
          <li>Point the scanner at a QR code</li>
          <li>Press the scanner trigger button</li>
          <li>The scanned data will be processed automatically</li>
        </ul>
      </div>
    </div>
  );

  const renderManualSearch = () => (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <Search size={20} />
        <h2 className="text-lg font-semibold mb-0">Manual Search</h2>
      </div>

      {error && (
        <Alert
          message="Search Error"
          description={<div style={{ whiteSpace: "pre-line" }}>{error}</div>}
          type="error"
          showIcon
          className="mb-4"
          closable
          onClose={() => setError(null)}
        />
      )}

      <Form form={form} onFinish={handleManualSearch}>
        <div className="flex gap-2">
          <Form.Item
            name="searchId"
            rules={[{ required: true, message: "Please enter an ID to search" }]}
            style={{ flex: 1, marginBottom: 0 }}
          >
            <Input
              placeholder="Enter Box ID, Kit ID, or Product ID"
              size="large"
              disabled={manualSearching}
              onPressEnter={() => form.submit()}
            />
          </Form.Item>
          <Form.Item style={{ marginBottom: 0 }}>
            <Button
              type="primary"
              icon={<Search size={16} />}
              htmlType="submit"
              size="large"
              loading={manualSearching}
            >
              Search
            </Button>
          </Form.Item>
        </div>
      </Form>

      <div className="mt-4">
        <Button onClick={() => setSelectedMethod(null)} size="large" block>
          Back
        </Button>
      </div>

      <div className="mt-4 p-4 bg-gray-50 rounded-lg">
        <p className="font-semibold mb-2 text-sm">Supported ID formats:</p>
        <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
          <li><strong>Box:</strong> P00021-box-1 or MongoDB ObjectId</li>
          <li><strong>Kit:</strong> KIT-P00021-1</li>
          <li><strong>Product:</strong> MongoDB ObjectId (24 hex characters)</li>
        </ul>
      </div>
    </div>
  );

  return (
    <div className="p-4">
      <div className="max-w-4xl mx-auto">
        <div className="mb-4">
          <Button
            icon={<ArrowLeft size={14} />}
            onClick={() => navigate(-1)}
            className="mb-2"
            size="small"
          >
            Back
          </Button>
          <h1 className="text-2xl font-bold mb-0 flex items-center gap-2">
            <QrCode size={24} />
            Scan & Search
          </h1>
        </div>

        <Card>
          {error && error.includes && error.includes("Scanning") && (
            <Alert
              message="Scanning Error"
              description={error}
              type="error"
              showIcon
              className="mb-4"
              action={
                <Button size="small" onClick={() => startScanning(false)}>
                  Retry
                </Button>
              }
            />
          )}
          
          {error && error.includes && (error.includes("ID") || error.includes("format") || error.includes("not found")) && (
            <Alert
              message="Search Error"
              description={
                <div style={{ whiteSpace: "pre-line" }}>
                  {error}
                </div>
              }
              type="error"
              showIcon
              className="mb-4"
              closable
              onClose={() => setError(null)}
            />
          )}

          {hasPermission === false && !error && selectedMethod === SCAN_METHODS.CAMERA && (
            <Alert
              message="Camera Access Required"
              description="Please allow camera access to scan QR codes."
              type="warning"
              showIcon
              className="mb-4"
            />
          )}

          {loading && (
            <div className="text-center py-8">
              <Spin size="large" />
              <p className="mt-4 text-gray-600">Processing scan...</p>
            </div>
          )}

          {!loading && !selectedMethod && renderMethodSelection()}
          {!loading && selectedMethod === SCAN_METHODS.CAMERA && renderCameraScanner()}
          {!loading && selectedMethod === SCAN_METHODS.SCANNER_DEVICE && renderScannerDevice()}
          {!loading && selectedMethod === SCAN_METHODS.MANUAL && renderManualSearch()}
        </Card>
      </div>
    </div>
  );
};

export default QRCodeScannerPage;

