import { useState, useRef, useEffect } from "react";
import { Search, Scan, Camera } from "lucide-react";
import CameraBarcodeScanner from "./CameraBarcodeScanner";

export default function ScanInput({ onScan, onSearch, placeholder = "Scan or enter order number" }) {
  const [inputValue, setInputValue] = useState("");
  const [scanMethod, setScanMethod] = useState("scanner");
  const [showCamera, setShowCamera] = useState(false);
  const inputRef = useRef(null);
  const scannerBufferRef = useRef("");
  const lastScanTimeRef = useRef(0);

  useEffect(() => {
    if (scanMethod === "scanner") {
      // Auto-focus input when scanner mode is active
      inputRef.current?.focus();
    }
  }, [scanMethod]);

  useEffect(() => {
    if (scanMethod !== "scanner") return;

    // Global keyboard listener for barcode scanner detection
    // Works even when input is not focused (like inventory scan)
    const handleKeyPress = (e) => {
      // Allow scanner to work globally, but skip if user is typing in other inputs
      // Only skip if it's a text input/textarea and not our scanner input
      const activeElement = document.activeElement;
      if (
        activeElement?.tagName === "INPUT" &&
        activeElement !== inputRef.current &&
        (activeElement.type === "text" || activeElement.type === "search" || activeElement.type === "number")
      ) {
        return;
      }
      if (activeElement?.tagName === "TEXTAREA") {
        return;
      }

      const currentTime = Date.now();
      const timeDiff = currentTime - lastScanTimeRef.current;

      // Reset buffer if more than 100ms passed (new scan started)
      if (timeDiff > 100) {
        scannerBufferRef.current = "";
      }
      lastScanTimeRef.current = currentTime;

      // Collect characters (barcode scanners send characters very quickly)
      if (e.key.length === 1) {
        scannerBufferRef.current += e.key;
        
        // Clear existing timeout
        if (window.scannerTimeout) {
          clearTimeout(window.scannerTimeout);
        }
        
        // Set timeout to detect end of scan (barcode scanners send Enter after data)
        window.scannerTimeout = setTimeout(() => {
          if (scannerBufferRef.current.length >= 3) {
            handleScanComplete(scannerBufferRef.current);
            scannerBufferRef.current = "";
          }
        }, 50);
      } 
      // Handle Enter key (barcode scanners typically send Enter after scanning)
      else if (e.key === "Enter" && scannerBufferRef.current.length >= 3) {
        e.preventDefault();
        handleScanComplete(scannerBufferRef.current);
        scannerBufferRef.current = "";
      }
    };

    // Use keypress for character detection (more reliable for scanners)
    document.addEventListener("keypress", handleKeyPress);
    
    return () => {
      document.removeEventListener("keypress", handleKeyPress);
      if (window.scannerTimeout) {
        clearTimeout(window.scannerTimeout);
      }
    };
  }, [scanMethod]);

  const handleScanComplete = (value) => {
    if (onScan && value.trim()) {
      onScan(value.trim());
      setInputValue("");
    }
  };

  const handleCameraScan = (scannedValue) => {
    if (scannedValue && scannedValue.trim()) {
      handleScanComplete(scannedValue.trim());
      setShowCamera(false);
    }
  };

  const handleOpenCamera = () => {
    setShowCamera(true);
  };

  const handleManualSearch = () => {
    if (inputValue.trim() && onSearch) {
      onSearch(inputValue.trim());
      setInputValue("");
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleManualSearch();
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div className="flex gap-2 mb-4 flex-wrap">
        <button
          onClick={() => setScanMethod("scanner")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
            scanMethod === "scanner"
              ? "bg-blue-600 text-white"
              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
          }`}
        >
          <Scan className="w-4 h-4" />
          Scanner Device
        </button>
        <button
          onClick={handleOpenCamera}
          className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors bg-green-600 hover:bg-green-700 text-white"
        >
          <Camera className="w-4 h-4" />
          Camera Scan
        </button>
        <button
          onClick={() => setScanMethod("manual")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
            scanMethod === "manual"
              ? "bg-blue-600 text-white"
              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
          }`}
        >
          <Search className="w-4 h-4" />
          Manual Search
        </button>
      </div>

      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="w-full px-6 py-3 pr-12 text-lg border-2 border-gray-300 rounded-xl focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition-all"
          autoFocus={scanMethod === "manual"}
        />
        {scanMethod === "manual" && (
          <button
            onClick={handleManualSearch}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-gray-500 hover:text-blue-600 transition-colors"
          >
            <Search className="w-5 h-5" />
          </button>
        )}
        {scanMethod === "scanner" && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <Scan className="w-5 h-5 text-blue-600 animate-pulse" />
          </div>
        )}
      </div>
      {scanMethod === "scanner" && (
        <div className="mt-2 space-y-1">
          <p className="text-sm text-gray-500 text-center">
            Ready to scan... Point your scanner and scan the barcode
          </p>
          <div className="flex items-center justify-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <p className="text-xs text-green-600 font-medium">Scanner Active - Auto-detect enabled</p>
          </div>
        </div>
      )}

      {showCamera && (
        <CameraBarcodeScanner
          onScan={handleCameraScan}
          onClose={() => setShowCamera(false)}
        />
      )}
    </div>
  );
}

