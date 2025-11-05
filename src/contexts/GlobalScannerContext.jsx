import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import Swal from "sweetalert2";
import { scanBox, scanProduct, scanKit } from "../api/procurement";

const GlobalScannerContext = createContext();

export const useGlobalScanner = () => {
  const context = useContext(GlobalScannerContext);
  if (!context) {
    throw new Error("useGlobalScanner must be used within GlobalScannerProvider");
  }
  return context;
};

export const GlobalScannerProvider = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isEnabled, setIsEnabled] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [scannerBuffer, setScannerBuffer] = useState("");
  const [lastScanTime, setLastScanTime] = useState(0);
  const scannerTimeoutRef = useRef(null);
  const lastScannedRef = useRef("");

  const getPoIdFromUrl = () => {
    const pathMatch = location.pathname.match(/\/procurement\/orders\/([^/]+)/);
    return pathMatch ? pathMatch[1] : null;
  };

  const detectIdType = (id) => {
    if (!id || typeof id !== "string") return null;
    const trimmedId = id.trim();

    if (/^KIT-[A-Z0-9]+-\d+$/i.test(trimmedId)) return "kit";
    if (/^[A-Z0-9]+-box-\d+$/i.test(trimmedId)) return "box";
    if (/^[0-9a-fA-F]{24}$/.test(trimmedId)) return "objectId";
    return null;
  };

  const handleDirectScan = useCallback(async (id, idType) => {
    const poId = getPoIdFromUrl();
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
      }

      if (scanData?.success) {
        const qrData = {
          type: detectedType,
          [detectedType === "box" ? "boxId" : detectedType === "kit" ? "kitId" : "productId"]: id,
          poId: poId || undefined,
        };

                navigate(`/scan/result`, {
          state: {
            scanData: scanData.data,
            qrData,
            poId: poId || undefined,
          },
        });

        Swal.fire({
          icon: "success",
          title: "Scan Detected!",
          text: "Navigating to item details...",
          toast: true,
          position: "top-end",
          showConfirmButton: false,
          timer: 2000,
        });
        return true;
      }
    } catch (err) {
      console.error("Direct scan error:", err);
      return false;
    }
    return false;
  }, [navigate, location]);

  const processQRCode = useCallback(async (qrData) => {
    const poId = getPoIdFromUrl();
    try {
      let scanData = null;
      let detectedType = null;

      switch (qrData.type) {
        case "product":
          if (!qrData.productId) return false;
          scanData = await scanProduct(qrData.productId, {
            poId: qrData.poId || poId,
            sku: qrData.sku,
          });
          detectedType = "product";
          break;

        case "kit":
          if (!qrData.kitId) return false;
          scanData = await scanKit(qrData.kitId, { poId: qrData.poId || poId });
          detectedType = "kit";
          break;

        case "box":
          if (!qrData.boxId) return false;
          scanData = await scanBox(qrData.boxId);
          detectedType = "box";
          break;

        default:
          return false;
      }

              if (scanData?.success) {
                navigate(`/scan/result`, {
                  state: {
                    scanData: scanData.data,
                    qrData,
                    poId: qrData.poId || poId,
                  },
                });

        Swal.fire({
          icon: "success",
          title: "Scan Detected!",
          text: "Navigating to item details...",
          toast: true,
          position: "top-end",
          showConfirmButton: false,
          timer: 2000,
        });
        return true;
      }
    } catch (err) {
      console.error("QR code processing error:", err);
      return false;
    }
    return false;
  }, [navigate, location]);

  const handleScan = useCallback(async (scannedData) => {
    if (lastScannedRef.current === scannedData) return;
    lastScannedRef.current = scannedData;

    setIsProcessing(true);

    try {
      let qrData;
      try {
        qrData = JSON.parse(scannedData);
      } catch (parseError) {
        const idType = detectIdType(scannedData);
        if (idType) {
          const success = await handleDirectScan(scannedData, idType);
          if (!success) {
            throw new Error("Invalid QR code or ID not found");
          }
          return;
        }
        throw new Error("Invalid QR code format");
      }

      if (!qrData || typeof qrData !== "object" || !qrData.type) {
        throw new Error("Invalid QR code format: missing type");
      }

      const success = await processQRCode(qrData);
      if (!success) {
        throw new Error("Failed to process QR code");
      }
    } catch (err) {
      console.error("Scan processing error:", err);
      Swal.fire({
        icon: "error",
        title: "Scan Failed",
        text: err.message || "Failed to process scan",
        toast: true,
        position: "top-end",
        showConfirmButton: false,
        timer: 4000,
      });
    } finally {
      setIsProcessing(false);
      setTimeout(() => {
        lastScannedRef.current = "";
      }, 2000);
    }
  }, [handleDirectScan, processQRCode]);

  useEffect(() => {
    if (!isEnabled) {
      setScannerBuffer("");
      if (scannerTimeoutRef.current) {
        clearTimeout(scannerTimeoutRef.current);
      }
      return;
    }

    const handleKeyPress = (e) => {
      const activeElement = document.activeElement;
      const isTyping =
        activeElement?.tagName === "INPUT" ||
        activeElement?.tagName === "TEXTAREA" ||
        activeElement?.isContentEditable;

      if (isTyping) return;

      const currentTime = Date.now();
      setLastScanTime((prevTime) => {
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
              handleScan(newBuffer);
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
            handleScan(prevBuffer);
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
  }, [isEnabled, handleScan]);

  const value = {
    isEnabled,
    setIsEnabled,
    isProcessing,
  };

  return (
    <GlobalScannerContext.Provider value={value}>
      {children}
      {isEnabled && (
        <div className="fixed bottom-4 right-4 z-50 bg-green-500 text-white px-4 py-3 rounded-lg shadow-2xl flex items-center gap-3 border-2 border-green-400">
          <div className="w-3 h-3 bg-white rounded-full animate-pulse"></div>
          <span className="text-sm font-semibold">Scanner Active</span>
          {isProcessing && (
            <span className="text-xs opacity-75">Processing...</span>
          )}
        </div>
      )}
    </GlobalScannerContext.Provider>
  );
};

