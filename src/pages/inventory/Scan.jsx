"use client";

import { useState, useRef, useEffect } from "react";
import {
  ArrowLeft,
  Camera,
  Type,
  Search,
  Scan,
  Package,
  Loader2,
  Keyboard,
  Plus,
} from "lucide-react";
import InventoryDisplay from "./inventory-display";
import apiClient from "../../api/client";

export default function ScanProduct() {
  const [mode, setMode] = useState("select");
  const [searchQuery, setSearchQuery] = useState("");
  const [isScanning, setIsScanning] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [totalInventory, setTotalInventory] = useState(0);
  const [qrDetected, setQrDetected] = useState(false);
  const [scannedData, setScannedData] = useState("");
  const [locationId, setLocationId] = useState("");
  const [cameraError, setCameraError] = useState("");
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [barcodeBuffer, setBarcodeBuffer] = useState("");
  const [lastBarcodeTime, setLastBarcodeTime] = useState(0);
  const [barcodeDetected, setBarcodeDetected] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [activeLocationCode, setActiveLocationCode] = useState("");

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const scanIntervalRef = useRef(null);
  const jsQRRef = useRef(null);
  const lastScanTimeRef = useRef(0);
  const scanningActiveRef = useRef(false);
  const barcodeTimeoutRef = useRef(null);
  const hiddenInputRef = useRef(null);

  useEffect(() => {
    const handleKeyPress = (e) => {
      if (mode === "manual" && document.activeElement?.tagName === "INPUT") {
        return;
      }

      const currentTime = Date.now();
      const timeDiff = currentTime - lastBarcodeTime;

      if (timeDiff > 100) {
        setBarcodeBuffer("");
      }

      // Add character to buffer
      if (e.key.length === 1) {
        setBarcodeBuffer((prev) => prev + e.key);
        setLastBarcodeTime(currentTime);

        if (barcodeTimeoutRef.current) {
          clearTimeout(barcodeTimeoutRef.current);
        }

        barcodeTimeoutRef.current = setTimeout(() => {
          const finalBarcode = barcodeBuffer + e.key;
          if (finalBarcode.length >= 3) {
            handleBarcodeDetection(finalBarcode);
            setBarcodeBuffer("");
          }
        }, 50);
      }

      // Handle Enter key
      if (e.key === "Enter" && barcodeBuffer.length >= 3) {
        e.preventDefault();
        handleBarcodeDetection(barcodeBuffer);
        setBarcodeBuffer("");
      }
    };

    // Add global keypress listener
    document.addEventListener("keypress", handleKeyPress);

    return () => {
      document.removeEventListener("keypress", handleKeyPress);
      if (barcodeTimeoutRef.current) {
        clearTimeout(barcodeTimeoutRef.current);
      }
    };
  }, [barcodeBuffer, lastBarcodeTime, mode]);

  const handleBarcodeDetection = async (barcode) => {
    console.log("Barcode detected:", barcode);
    setBarcodeDetected(true);
    setScannedData(barcode);

    document.body.style.backgroundColor = "#dcfce7";
    setTimeout(() => {
      document.body.style.backgroundColor = "";
    }, 300);

    // Set mode to scanner to show results page
    setMode("scanner");
    
    await handleSearch(barcode);

    setTimeout(() => {
      setBarcodeDetected(false);
    }, 3000);
  };

  const startCamera = async () => {
    try {
      setCameraError("");
      setIsCameraReady(false);

      if (!videoRef.current) return;

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });

      streamRef.current = stream;
      videoRef.current.srcObject = stream;

      videoRef.current.onloadedmetadata = () => {
        if (videoRef.current) {
          videoRef.current.play().then(() => {
            setIsCameraReady(true);
            setIsScanning(true);
            setQrDetected(false);
            startQRScanning();
          });
        }
      };
    } catch (error) {
      console.error("Error accessing camera:", error);
      setCameraError(
        "Unable to access camera. Please check permissions and try again."
      );
    }
  };

  const startQRScanning = async () => {
    try {
      if (!jsQRRef.current) {
        jsQRRef.current = (await import("jsqr")).default;
      }

      scanningActiveRef.current = true;

      const scanQRCode = () => {
        if (
          !videoRef.current ||
          !canvasRef.current ||
          !scanningActiveRef.current
        ) {
          return;
        }

        const video = videoRef.current;
        const canvas = canvasRef.current;
        const context = canvas.getContext("2d");

        if (!context || video.readyState < 2 || video.videoWidth === 0) {
          return;
        }

        const now = Date.now();
        if (now - lastScanTimeRef.current < 50) {
          return;
        }
        lastScanTimeRef.current = now;

        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        try {
          context.drawImage(video, 0, 0, canvas.width, canvas.height);
          const imageData = context.getImageData(
            0,
            0,
            canvas.width,
            canvas.height
          );

          const code = jsQRRef.current(
            imageData.data,
            imageData.width,
            imageData.height,
            {
              inversionAttempts: "dontInvert",
            }
          );

          if (code && code.data && scanningActiveRef.current) {
            console.log("Auto QR Code detected:", code.data);
            handleQRDetection(code.data);
          }
        } catch (error) {
          console.error("Error processing frame:", error);
        }
      };

      const animationFrame = () => {
        if (scanningActiveRef.current) {
          scanQRCode();
          requestAnimationFrame(animationFrame);
        }
      };

      requestAnimationFrame(animationFrame);
    } catch (error) {
      console.error("Error loading jsQR:", error);
      setCameraError(
        "QR scanner failed to load. Please refresh and try again."
      );
    }
  };

  const stopCamera = () => {
    scanningActiveRef.current = false;

    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setIsScanning(false);
    setIsCameraReady(false);
    setQrDetected(false);
    setScannedData("");
    setCameraError("");
    lastScanTimeRef.current = 0;
  };

  const searchProducts = async (query) => {
    setIsSearching(true);

    try {
      const { data } = await apiClient.get(
        `/api/v1/inventry/all?search=${encodeURIComponent(query)}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      setIsSearching(false);

      if (data) {
        setLocationId(data.locations[0]._id);
        console.log("Search results:", data.locations[0]._id);
        setSearchResults(data.inventry);
        setTotalInventory(data.totalInventry);
        return { items: data.inventry, total: data.totalInventry };
      } else {
        throw new Error("Invalid response format");
      }
    } catch (error) {
      console.error("API call failed, using mock data:", error);

      setIsSearching(false);
    }
  };

  const handleSearch = async (query) => {
    if (!query.trim()) return;

    try {
      const { items, total } = await searchProducts(query);

      setSearchResults(items);
      setTotalInventory(total);
    } catch (error) {
      console.error("Search failed:", error);
      setSearchResults([]);
      setTotalInventory(0);
    }
  };

  const handleManualSearch = (e) => {
    e.preventDefault();
    handleSearch(searchQuery);
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter") {
      handleSearch(searchQuery);
    }
  };

  const handleQRDetection = async (qrData) => {
    if (qrDetected && scannedData === qrData) return;

    setQrDetected(true);
    setScannedData(qrData);

    const video = videoRef.current;
    if (video) {
      video.style.filter = "brightness(1.5) saturate(1.2)";
      setTimeout(() => {
        if (video) video.style.filter = "none";
      }, 300);
    }

    await handleSearch(qrData);

    setTimeout(() => {
      setQrDetected(false);
    }, 2000);
  };

  const goBack = () => {
    if (mode === "camera") {
      stopCamera();
    }
    setMode("select");
    setSearchResults([]);
    setSearchQuery("");
    setTotalInventory(0);
    setScannedData("");
    setBarcodeDetected(false);
  };

  const manualScanQR = async () => {
    if (!videoRef.current || !canvasRef.current || !isCameraReady) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext("2d");

    if (!context) return;

    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;

    try {
      context.drawImage(video, 0, 0, canvas.width, canvas.height);

      video.style.filter = "brightness(1.8)";
      setTimeout(() => {
        if (video) video.style.filter = "none";
      }, 150);

      const jsQR = jsQRRef.current || (await import("jsqr")).default;
      if (!jsQRRef.current) jsQRRef.current = jsQR;

      const imageData = context.getImageData(0, 0, canvas.width, canvas.height);

      const code = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: "dontInvert",
      });

      if (code && code.data) {
        console.log("Manual QR Code scan:", code.data);
        handleQRDetection(code.data);
      } else {
        setScannedData("No QR code detected in current view");
        setTimeout(() => setScannedData(""), 2000);
      }
    } catch (error) {
      console.error("Error during manual scan:", error);
      setScannedData("Scan failed - please try again");
      setTimeout(() => setScannedData(""), 2000);
    }
  };

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  return (
    <div className="min-h-screen bg-slate-50">
      <input
        ref={hiddenInputRef}
        style={{ position: "absolute", left: "-9999px", opacity: 0 }}
        tabIndex={-1}
        aria-hidden="true"
      />

      <div className="bg-white border-b rounded-xl border-slate-200 px-6 py-4 shadow-sm">
        <div className="flex items-center gap-4">
          {mode !== "select" && (
            <button
              onClick={goBack}
              className="p-2 hover:bg-slate-100 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <ArrowLeft className="h-5 w-5 text-slate-600" />
            </button>
          )}
          <div>
            <h1 className="text-xl font-bold text-slate-900 font-sans">
              Location Search
            </h1>
            {mode !== "select" && (
              <p className="text-sm text-slate-500 font-sans">
                {mode === "scanner"
                  ? "Barcode Scanner Results"
                  : mode === "camera"
                  ? "Scan QR Code"
                  : "Manual Search"}
              </p>
            )}
          </div>
        </div>
      </div>

      {barcodeDetected && (
        <div className="bg-green-500 text-white px-6 py-3 text-center">
          <div className="flex items-center justify-center gap-2">
            <Keyboard className="h-4 w-4" />
            <span className="font-semibold">Barcode Scanner Detected!</span>
            <span className="text-green-100">Searching: {scannedData}</span>
          </div>
        </div>
      )}

      <div className="py-6">
        {mode === "select" && (
          <div className="space-y-6 cursor-pointer">
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-slate-800 font-sans">
                Choose Search Method
              </h2>

              <div className="grid grid-cols-1 gap-4">
                <div
                  onClick={() => setMode("scanner")}
                  className="p-4 bg-green-50 border-2 border-green-200 rounded-xl"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-100 rounded-lg">
                      <Keyboard className="h-5 w-5 text-green-600" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-green-900 font-sans">
                        Barcode Scanner Ready
                      </h3>
                      <p className="text-sm text-green-700 font-sans">
                        Physical barcode scanners will auto-search location
                      </p>
                    </div>
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  </div>
                </div>

                <div
                  className="p-6 bg-white rounded-xl border-2 border-slate-200 hover:border-blue-300 hover:shadow-lg transition-all duration-200 cursor-pointer group"
                  onClick={() => {
                    setMode("camera");
                    setTimeout(startCamera, 100);
                  }}
                >
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-blue-100 rounded-xl group-hover:bg-blue-200 transition-colors">
                      <Scan className="h-6 w-6 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-slate-900 font-sans">
                        Scan Location
                      </h3>
                      <p className="text-sm text-slate-500 font-sans">
                        Auto-detect and scan QR codes
                      </p>
                    </div>
                    <Camera className="h-5 w-5 text-slate-400" />
                  </div>
                </div>

                <div
                  className="p-6 bg-white rounded-xl border-2 border-slate-200 hover:border-sky-300 hover:shadow-lg transition-all duration-200 cursor-pointer group"
                  onClick={() => setMode("manual")}
                >
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-sky-100 rounded-xl group-hover:bg-sky-200 transition-colors">
                      <Type className="h-6 w-6 text-sky-600" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-slate-900 font-sans">
                        Manual Search
                      </h3>
                      <p className="text-sm text-slate-500 font-sans">
                        Type location name or code
                      </p>
                    </div>
                    <Search className="h-5 w-5 text-slate-400" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {mode === "scanner" && (
          <div className="space-y-4">
            {scannedData && (
              <div className={`p-3 border rounded-lg ${
                barcodeDetected
                  ? "bg-green-50 border-green-200"
                  : "bg-blue-50 border-blue-200"
              }`}>
                <p className={`text-sm font-sans ${
                  barcodeDetected ? "text-green-700" : "text-blue-700"
                }`}>
                  <span className="font-semibold">
                    Scanned Barcode:
                  </span>{" "}
                  {scannedData}
                </p>
              </div>
            )}

            <InventoryDisplay
              items={searchResults}
              setItems={setSearchResults}
              totalCount={totalInventory}
              isLoading={isSearching}
              scannedData={scannedData}
              locationid={locationId}
            />
          </div>
        )}

        {mode === "camera" && (
          <div className="space-y-6">
            {mode === "camera" && !searchResults.length > 0 && (
              <>
                <div className="p-6 bg-white rounded-xl border-2 border-slate-200 shadow-sm">
                  <div className="relative bg-slate-900 rounded-xl overflow-hidden">
                    <video
                      ref={videoRef}
                      className="w-full h-64 object-cover"
                      playsInline
                      muted
                      style={{ transform: "scaleX(-1)" }}
                    />

                    <canvas ref={canvasRef} className="hidden" />

                    {cameraError && (
                      <div className="absolute inset-0 flex items-center justify-center bg-slate-900/80">
                        <div className="text-center p-4">
                          <Camera className="h-12 w-12 text-red-400 mx-auto mb-3" />
                          <p className="text-red-100 text-sm font-sans font-semibold mb-2">
                            Camera Error
                          </p>
                          <p className="text-red-200 text-xs font-sans">
                            {cameraError}
                          </p>
                          <button
                            onClick={startCamera}
                            className="mt-3 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg font-sans transition-colors"
                          >
                            Try Again
                          </button>
                        </div>
                      </div>
                    )}

                    {isCameraReady && !cameraError && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div
                          className={`w-48 h-48 border-2 rounded-xl flex items-center justify-center transition-all duration-300 ${
                            qrDetected
                              ? "border-green-400 bg-green-400/20 border-solid"
                              : "border-blue-400 border-dashed animate-pulse"
                          }`}
                        >
                          <div className="text-center">
                            {qrDetected ? (
                              <>
                                <div className="w-8 h-8 bg-green-400 rounded-full mx-auto mb-2 flex items-center justify-center">
                                  <svg
                                    className="w-5 h-5 text-white"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2}
                                      d="M5 13l4 4L19 7"
                                    />
                                  </svg>
                                </div>
                                <p className="text-green-100 text-sm font-sans font-semibold">
                                  QR Code Scanned!
                                </p>
                                {scannedData && (
                                  <p className="text-green-200 text-xs font-sans mt-1 truncate max-w-32">
                                    {scannedData}
                                  </p>
                                )}
                              </>
                            ) : (
                              <>
                                <Scan className="h-8 w-8 text-blue-400 mx-auto mb-2 animate-pulse" />
                                <p className="text-blue-100 text-sm font-sans">
                                  Scanning continuously...
                                </p>
                                <p className="text-blue-200 text-xs font-sans mt-1">
                                  Just show QR code to camera
                                </p>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {!isCameraReady && !cameraError && (
                      <div className="absolute inset-0 flex items-center justify-center bg-slate-900/80">
                        <div className="text-center">
                          <Loader2 className="h-8 w-8 text-blue-400 mx-auto mb-2 animate-spin" />
                          <p className="text-blue-100 text-sm font-sans">
                            Starting camera...
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="text-center space-y-2">
                  <p className="text-sm text-slate-600 font-sans">
                    {qrDetected
                      ? "QR code processed! Ready for next scan..."
                      : "Auto-scanning active - just show QR code to camera"}
                  </p>
                  {isSearching && (
                    <div className="flex items-center justify-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                      <span className="text-sm text-blue-600 font-sans">
                        Searching location...
                      </span>
                    </div>
                  )}
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={goBack}
                    className="flex-1 px-4 py-3 border border-slate-300 hover:bg-slate-100 active:bg-slate-200 rounded-xl transition-colors bg-white focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2 font-sans"
                  >
                    Cancel Scan
                  </button>
                  <button
                    onClick={manualScanQR}
                    disabled={
                      !isCameraReady || cameraError !== "" || qrDetected
                    }
                    className="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:bg-slate-300 disabled:cursor-not-allowed text-white rounded-xl transition-colors font-sans focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 flex items-center justify-center gap-2"
                  >
                    <Scan className="h-4 w-4" />
                    Scan QR Code
                  </button>
                </div>
              </>
            )}

            {/* Scanned Results */}
            {searchResults.length > 0 && (
              <div className="space-y-4">
                {scannedData && (
                  <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                    <p className="text-sm text-green-700 font-sans">
                      <span className="font-semibold">Scanned QR Code:</span>{" "}
                      {scannedData}
                    </p>
                  </div>
                )}

                <InventoryDisplay
                  items={searchResults}
                  setItems={setSearchResults}
                  totalCount={totalInventory}
                  isLoading={isSearching}
                  scannedData={scannedData || searchQuery}
                  locationid={locationId}
                />
              </div>
            )}
          </div>
        )}

        {mode === "manual" && (
          <div className="space-y-6">
            <div className="p-6 bg-white rounded-xl border-2 border-slate-200 shadow-sm">
              <form onSubmit={handleManualSearch} className="space-y-4">
                <div className="space-y-2">
                  <label
                    htmlFor="search"
                    className="text-sm font-semibold text-slate-700 font-sans"
                  >
                    Search Location
                  </label>
                  <input
                    id="search"
                    type="text"
                    placeholder="Type location code..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyPress={handleKeyPress}
                    className="w-full h-12 px-4 border border-slate-300 rounded-xl focus:border-sky-500 focus:ring-2 focus:ring-sky-500 focus:ring-opacity-20 font-sans transition-colors focus:outline-none disabled:bg-slate-100 disabled:cursor-not-allowed"
                    autoFocus
                    disabled={isSearching}
                  />
                </div>
                <button
                  type="submit"
                  disabled={!searchQuery.trim() || isSearching}
                  className="w-full bg-sky-600 hover:bg-sky-700 active:bg-sky-800 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-semibold py-3 px-4 rounded-xl transition-colors font-sans focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 flex items-center justify-center"
                >
                  {isSearching ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Searching...
                    </>
                  ) : (
                    <>
                      <Search className="h-4 w-4 mr-2" />
                      Search
                    </>
                  )}
                </button>
              </form>
            </div>

            {searchResults.length > 0 && (
              <div className="space-y-4">
                {searchQuery && (
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm text-blue-700 font-sans">
                      <span className="font-semibold">Search Query:</span>{" "}
                      {searchQuery}
                    </p>
                  </div>
                )}

                <InventoryDisplay
                  items={searchResults}
                  setItems={setSearchResults}
                  totalCount={totalInventory}
                  isLoading={isSearching}
                  scannedData={searchQuery}
                  locationid={locationId}
                />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}