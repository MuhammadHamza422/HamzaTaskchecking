import { useState, useRef, useEffect } from "react";
import { Search, Scan } from "lucide-react";

export default function ScanInput({ onScan, onSearch, placeholder = "Scan or enter order number" }) {
  const [inputValue, setInputValue] = useState("");
  const [scanMethod, setScanMethod] = useState("scanner");
  const inputRef = useRef(null);
  const scannerBufferRef = useRef("");
  const lastScanTimeRef = useRef(0);

  useEffect(() => {
    if (scanMethod === "scanner") {
      inputRef.current?.focus();
    }
  }, [scanMethod]);

  useEffect(() => {
    if (scanMethod !== "scanner") return;

    const handleKeyPress = (e) => {
      if (document.activeElement?.tagName === "INPUT" && document.activeElement !== inputRef.current) {
        return;
      }

      const currentTime = Date.now();
      if (currentTime - lastScanTimeRef.current > 100) {
        scannerBufferRef.current = "";
      }
      lastScanTimeRef.current = currentTime;

      if (e.key.length === 1) {
        scannerBufferRef.current += e.key;
        clearTimeout(window.scannerTimeout);
        
        window.scannerTimeout = setTimeout(() => {
          if (scannerBufferRef.current.length > 3) {
            handleScanComplete(scannerBufferRef.current);
            scannerBufferRef.current = "";
          }
        }, 150);
      } else if (e.key === "Enter" && scannerBufferRef.current) {
        e.preventDefault();
        handleScanComplete(scannerBufferRef.current);
        scannerBufferRef.current = "";
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => {
      window.removeEventListener("keydown", handleKeyPress);
      clearTimeout(window.scannerTimeout);
    };
  }, [scanMethod]);

  const handleScanComplete = (value) => {
    if (onScan && value.trim()) {
      onScan(value.trim());
      setInputValue("");
    }
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
      <div className="flex gap-2 mb-4">
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
          className="w-full px-6 py-4 pr-12 text-lg border-2 border-gray-300 rounded-lg focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition-all"
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
        <p className="mt-2 text-sm text-gray-500 text-center">
          Ready to scan... Point your scanner and scan the barcode
        </p>
      )}
    </div>
  );
}

