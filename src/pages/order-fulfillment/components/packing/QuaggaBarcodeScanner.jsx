import { useEffect, useRef, useState, useCallback } from "react";
import { X, Search, Keyboard, Camera, Loader2 } from "lucide-react";
import { searchOrder } from "../../../../api/fulfillment";
import Swal from "sweetalert2";
import { BrowserMultiFormatReader } from "@zxing/library";

export default function QuaggaBarcodeScanner({
  onScanSuccess,
  onManualSearch,
  onClose,
}) {
  const scannerRef = useRef(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const frameCanvasRef = useRef(null);
  const streamRef = useRef(null);
  const scanningActiveRef = useRef(false);
  const barcodeDetectorRef = useRef(null);
  const zxingReaderRef = useRef(null);
  const isScannerActiveRef = useRef(true); // Track if scanner is still active/mounted
  
  const [isValidating, setIsValidating] = useState(false);
  const [scannedCode, setScannedCode] = useState("");
  const [isScanning, setIsScanning] = useState(false); // Visual feedback: detecting but not confirmed
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const [scannerMethod, setScannerMethod] = useState(null); // 'native' or 'zxing'
  
  const lastScannedCodeRef = useRef("");
  const lastScanTimeRef = useRef(0);
  
  // Stability check: Detection buffer
  const detectionBufferRef = useRef([]);
  const stableCodeRef = useRef(null);
  const stableCodeStartTimeRef = useRef(null);
  const cooldownUntilRef = useRef(0); // Timestamp when cooldown ends
  
  // Constants for stability and quality
  const REQUIRED_CONSECUTIVE_DETECTIONS = 2; // Need 2 same codes in a row
  const BUFFER_SIZE = 3; // Track last 3 detections
  const MIN_DETECTION_DURATION_MS = 200; // Must detect for 200ms
  const COOLDOWN_AFTER_ERROR_MS = 1000; // 1 second cooldown after failed API
  const MIN_CODE_LENGTH = 3; // Minimum barcode length
  const SCAN_INTERVAL_MS = 100; // Scan every 100ms

  // Validate code quality and length
  const isValidCode = (code) => {
    if (!code || typeof code !== 'string') return false;
    
    const trimmedCode = code.trim();
    
    // Check minimum length
    if (trimmedCode.length < MIN_CODE_LENGTH) return false;
    
    return true;
  };

  // Check if we have a stable code (same code detected multiple times)
  const checkStableCode = () => {
    const buffer = detectionBufferRef.current;
    if (buffer.length < REQUIRED_CONSECUTIVE_DETECTIONS) {
      return null;
    }

    // Get last N detections
    const recent = buffer.slice(-REQUIRED_CONSECUTIVE_DETECTIONS);
    
    // Check if all recent detections are the same code
    const firstCode = recent[0].code;
    const allSame = recent.every(detection => detection.code === firstCode);
    
    if (allSame) {
      // Check if we've been detecting this code for minimum duration
      const firstDetection = recent[0];
      const now = Date.now();
      const duration = now - firstDetection.timestamp;
      
      if (duration >= MIN_DETECTION_DURATION_MS) {
        return {
          code: firstCode,
          timestamp: firstDetection.timestamp
        };
      }
    }
    
    return null;
  };

  // Properly release camera - stop all tracks
  const releaseCamera = async () => {
    try {
      
      // Stop scanning loop
      scanningActiveRef.current = false;
      
      // Stop all media stream tracks
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => {
          track.stop();
        });
        streamRef.current = null;
      }
      
      // Clear video source
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
      
      setIsCameraReady(false);
      setIsScanning(false);
      
    } catch (error) {
      console.error("Error releasing camera:", error);
    }
  };

  // Handle barcode detection - call API after stable code confirmed
  const handleBarcodeDetected = useCallback(async (code) => {
    if (isValidating) return;
    if (code === lastScannedCodeRef.current) return;

    // Clear detection buffer and stable code tracking
    detectionBufferRef.current = [];
    stableCodeRef.current = null;
    stableCodeStartTimeRef.current = null;
    setIsScanning(false);

    setIsValidating(true);
    lastScannedCodeRef.current = code;
    setScannedCode(code);

    // Release camera IMMEDIATELY before validation
    await releaseCamera();

    // Call API immediately (camera is already released)
    const barcodeValue = String(code).trim();
    try {
      const searchResult = await searchOrder(barcodeValue);

      if (searchResult.success && searchResult.data) {
        const searchData = searchResult.data;

        // Check if already packed
        if (searchData.isAlreadyPacked && searchData.packingInfo) {
          setIsValidating(false);
          lastScannedCodeRef.current = "";

          await Swal.fire({
            icon: "warning",
            title: "Order Already Packed",
            html: `
              <div class="text-left">
                <p class="mb-4 text-gray-700">This order has already been packed.</p>
                <div class="bg-gray-50 rounded-lg p-4 mb-4">
                  <p class="text-sm"><span class="font-medium">Packing ID:</span> ${searchData.packingInfo.packingId || "N/A"}</p>
                  <p class="text-sm"><span class="font-medium">Status:</span> ${searchData.packingInfo.status || "N/A"}</p>
                </div>
              </div>
            `,
            confirmButtonColor: "#2563eb",
            confirmButtonText: "OK",
          });

          // Camera already released, just close
          if (onClose) {
            onClose();
          }
          return;
        }

        
        setIsValidating(false);
        
        if (onScanSuccess) {
          onScanSuccess(barcodeValue, searchData);
        }
      } else {
        throw new Error("Order not found");
      }
    } catch (error) {
      console.error("Error validating barcode:", error);

      setIsValidating(false);
      lastScannedCodeRef.current = "";
      
      // Clear detection buffer on error
      detectionBufferRef.current = [];
      stableCodeRef.current = null;
      stableCodeStartTimeRef.current = null;
      setIsScanning(false);
      setScannedCode("");

      // Set cooldown period
      cooldownUntilRef.current = Date.now() + COOLDOWN_AFTER_ERROR_MS;

      await Swal.fire({
        icon: "error",
        title: "Order Not Found",
        text: error.message || "No order found with this barcode. Please try again.",
        confirmButtonColor: "#2563eb",
        confirmButtonText: "OK",
      });

      try {
        await startCamera();
      } catch (err) {
        console.error("Error restarting scanner:", err);
      }
    }
  }, [isValidating, onScanSuccess, onClose]);

  // Process detected barcodes - with stability and quality checks
  const processBarcodeDetection = useCallback(
    (code) => {
      // Skip if in cooldown period
      if (Date.now() < cooldownUntilRef.current) {
        return;
      }

      if (isValidating) return;
      if (!code) {
        setIsScanning(false);
        return;
      }

      // Skip if already processed and validated
      if (code === lastScannedCodeRef.current) {
        return;
      }

      // Validate code quality
      if (!isValidCode(code)) {
        setIsScanning(false);
        return;
      }

      // Add to detection buffer
      const now = Date.now();
      detectionBufferRef.current.push({
        code: code.trim(),
        timestamp: now
      });

      // Keep buffer size manageable
      if (detectionBufferRef.current.length > BUFFER_SIZE) {
        detectionBufferRef.current.shift();
      }

      // Show "Scanning..." feedback
      setIsScanning(true);
      setScannedCode(code);

      // Check for stable code
      const stable = checkStableCode();
      
      if (stable) {
        // We have a stable code - check if it's the same as previous stable code
        if (stableCodeRef.current?.code === stable.code) {
          // Same stable code - check duration
          const stableDuration = now - stableCodeStartTimeRef.current;
          if (stableDuration >= MIN_DETECTION_DURATION_MS) {
            // Stable code detected for minimum duration - accept it
            stableCodeRef.current = null;
            stableCodeStartTimeRef.current = null;
            detectionBufferRef.current = [];
            setIsScanning(false);
            handleBarcodeDetected(stable.code);
          }
        } else {
          // New stable code - start tracking
          stableCodeRef.current = stable;
          stableCodeStartTimeRef.current = now;
        }
      } else {
        // Not stable yet - reset stable code tracking
        stableCodeRef.current = null;
        stableCodeStartTimeRef.current = null;
      }
    },
    [isValidating, handleBarcodeDetected]
  );

  // Start camera with native getUserMedia
  const startCamera = async () => {
    try {
      setCameraError("");
      setIsCameraReady(false);

      if (!videoRef.current) return;

      // Request camera access with high quality settings
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 1920, min: 1280 },
          height: { ideal: 1080, min: 720 },
        },
      });

      // Check if scanner is still active after async camera init
      if (!isScannerActiveRef.current) {
        stream.getTracks().forEach(track => track.stop());
        return;
      }

      streamRef.current = stream;
      videoRef.current.srcObject = stream;

      videoRef.current.onloadedmetadata = () => {
        // Check again if scanner is still active
        if (videoRef.current && isScannerActiveRef.current) {
          videoRef.current.play().then(() => {
            if (isScannerActiveRef.current) {
              setIsCameraReady(true);
              startBarcodeScanning();
            }
          });
        }
      };
    } catch (error) {
      console.error("Error accessing camera:", error);
      
      // Only show error and close if scanner is still active
      if (!isScannerActiveRef.current) {
        return;
      }
      
      let errorTitle = "Camera Error";
      let errorText = "Failed to access camera. Please check permissions.";

      if (error.name === "NotAllowedError") {
        errorTitle = "Camera Permission Denied";
        errorText = "Please allow camera access in your browser settings.";
      } else if (error.name === "NotFoundError") {
        errorTitle = "No Camera Found";
        errorText = "No camera device detected on this device.";
      } else if (error.name === "NotReadableError") {
        errorTitle = "Camera In Use";
        errorText = "Camera is already being used by another application.";
      }

      setCameraError(errorText);
      
      await Swal.fire({
        icon: "error",
        title: errorTitle,
        text: errorText,
        confirmButtonColor: "#2563eb",
      });

      // Only call onClose if scanner is still active
      if (isScannerActiveRef.current && onClose) {
        onClose();
      }
    }
  };

  // Start barcode scanning with BarcodeDetector (mobile) or ZXing (desktop fallback)
  const startBarcodeScanning = async () => {
    try {
      // Check if BarcodeDetector is supported (mainly mobile browsers)
      if ('BarcodeDetector' in window) {
        setScannerMethod('native');
        
        // Initialize BarcodeDetector with supported formats
        barcodeDetectorRef.current = new window.BarcodeDetector({
          formats: [
            "code_128",
            "code_39",
            "ean_13",
            "ean_8",
            "upc_a",
            "upc_e",
          ],
        });

        scanningActiveRef.current = true;

        const scanBarcodeNative = async () => {
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
          if (now - lastScanTimeRef.current < SCAN_INTERVAL_MS) {
            return;
          }
          lastScanTimeRef.current = now;

          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;

          try {
            context.drawImage(video, 0, 0, canvas.width, canvas.height);

            // Detect barcodes using BarcodeDetector API
            const barcodes = await barcodeDetectorRef.current.detect(canvas);

            if (barcodes && barcodes.length > 0 && scanningActiveRef.current) {
              const barcode = barcodes[0]; // Take first detected barcode
              if (barcode.rawValue) {
                processBarcodeDetection(barcode.rawValue);
              }
            }
          } catch (error) {
            console.error("Error processing frame:", error);
          }
        };

        const animationFrame = () => {
          if (scanningActiveRef.current) {
            scanBarcodeNative();
            requestAnimationFrame(animationFrame);
          }
        };

        requestAnimationFrame(animationFrame);
      } else {
        // Fallback to ZXing for desktop browsers
        setScannerMethod('zxing');
        
        // Initialize ZXing reader
        zxingReaderRef.current = new BrowserMultiFormatReader();
        
        scanningActiveRef.current = true;

        const scanBarcodeZXing = async () => {
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
          if (now - lastScanTimeRef.current < SCAN_INTERVAL_MS) {
            return;
          }
          lastScanTimeRef.current = now;

          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;

          try {
            context.drawImage(video, 0, 0, canvas.width, canvas.height);

            // Detect barcodes using ZXing
            try {
              const result = await zxingReaderRef.current.decodeFromCanvas(canvas);
              
              if (result && result.getText() && scanningActiveRef.current) {
                processBarcodeDetection(result.getText());
              }
            } catch (decodeError) {
              // No barcode detected in this frame, continue scanning
              if (decodeError.name !== 'NotFoundException') {
                console.warn("ZXing decode error:", decodeError);
              }
            }
          } catch (error) {
            console.error("Error processing frame with ZXing:", error);
          }
        };

        const animationFrame = () => {
          if (scanningActiveRef.current) {
            scanBarcodeZXing();
            requestAnimationFrame(animationFrame);
          }
        };

        requestAnimationFrame(animationFrame);
      }
    } catch (error) {
      console.error("Error starting barcode scanner:", error);
      setCameraError("Barcode scanner failed to load. Please refresh and try again.");
    }
  };

  // Initialize camera on mount
  useEffect(() => {
    // Mark scanner as active on mount
    isScannerActiveRef.current = true;
    startCamera();

    // Cleanup on unmount
    return () => {
      // Mark scanner as inactive immediately on unmount
      isScannerActiveRef.current = false;
      scanningActiveRef.current = false;
      
      // Clean up ZXing reader
      if (zxingReaderRef.current) {
        try {
          zxingReaderRef.current.reset();
        } catch (e) {
          console.warn("Error resetting ZXing reader:", e);
        }
        zxingReaderRef.current = null;
      }
      
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => {
          track.stop();
        });
        streamRef.current = null;
      }

      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    };
  }, []);


  // Draw blue L-shaped corner frame overlay
  useEffect(() => {
    let animationFrameId;
    let blinkPhase = 0;

    const drawFrame = () => {
      if (!frameCanvasRef.current || !scannerRef.current) return;

      const canvas = frameCanvasRef.current;
      const ctx = canvas.getContext("2d");
      const containerWidth =
        scannerRef.current.clientWidth || window.innerWidth;
      const containerHeight =
        scannerRef.current.clientHeight || window.innerHeight;

      const devicePixelRatio = window.devicePixelRatio || 1;
      canvas.width = containerWidth * devicePixelRatio;
      canvas.height = containerHeight * devicePixelRatio;
      canvas.style.width = `${containerWidth}px`;
      canvas.style.height = `${containerHeight}px`;

      ctx.scale(devicePixelRatio, devicePixelRatio);
      ctx.clearRect(0, 0, containerWidth, containerHeight);

      const isLargeScreen = containerWidth >= 1024;
      let frameWidth, frameHeight;

      if (isLargeScreen) {
        frameWidth = containerWidth * 0.5;
        frameHeight = containerHeight * 0.6;
      } else {
        frameWidth = containerWidth * 0.7;
        frameHeight = containerHeight * 0.4;
      }

      const frameX = (containerWidth - frameWidth) / 2;
      const frameY = (containerHeight - frameHeight) / 2;
      const cornerLength = 40;
      const lineWidth = 4;

      // Draw semi-transparent black overlay
      ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
      ctx.fillRect(0, 0, containerWidth, containerHeight);

      // Cut out scanning area
      ctx.globalCompositeOperation = "destination-out";
      ctx.fillStyle = "rgba(0, 0, 0, 1)";
      ctx.fillRect(frameX, frameY, frameWidth, frameHeight);
      ctx.globalCompositeOperation = "source-over";

      // Calculate blinking opacity
      blinkPhase += 0.05;
      if (blinkPhase > Math.PI * 2) blinkPhase = 0;
      const opacity = 0.5 + (Math.sin(blinkPhase) + 1) * 0.25;

      // Draw blue L-shaped corners
      ctx.strokeStyle = `rgba(59, 130, 246, ${opacity})`;
      ctx.lineWidth = lineWidth;
      ctx.lineCap = "round";
      ctx.shadowColor = `rgba(59, 130, 246, ${opacity * 0.5})`;
      ctx.shadowBlur = 8;

      // Top-left corner
      ctx.beginPath();
      ctx.moveTo(frameX, frameY + cornerLength);
      ctx.lineTo(frameX, frameY);
      ctx.lineTo(frameX + cornerLength, frameY);
      ctx.stroke();

      // Top-right corner
      ctx.beginPath();
      ctx.moveTo(frameX + frameWidth - cornerLength, frameY);
      ctx.lineTo(frameX + frameWidth, frameY);
      ctx.lineTo(frameX + frameWidth, frameY + cornerLength);
      ctx.stroke();

      // Bottom-left corner
      ctx.beginPath();
      ctx.moveTo(frameX, frameY + frameHeight - cornerLength);
      ctx.lineTo(frameX, frameY + frameHeight);
      ctx.lineTo(frameX + cornerLength, frameY + frameHeight);
      ctx.stroke();

      // Bottom-right corner
      ctx.beginPath();
      ctx.moveTo(frameX + frameWidth - cornerLength, frameY + frameHeight);
      ctx.lineTo(frameX + frameWidth, frameY + frameHeight);
      ctx.lineTo(frameX + frameWidth, frameY + frameHeight - cornerLength);
      ctx.stroke();

      ctx.shadowBlur = 0;
      animationFrameId = requestAnimationFrame(drawFrame);
    };

    drawFrame();

    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, []);

  const handleClose = async () => {
    // Mark scanner as inactive immediately to prevent any pending operations
    isScannerActiveRef.current = false;
    
    // Clear all buffers and state
    detectionBufferRef.current = [];
    stableCodeRef.current = null;
    stableCodeStartTimeRef.current = null;
    setIsScanning(false);
    setScannedCode("");
    
    // Properly release camera before closing
    await releaseCamera();
    if (onClose) {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      {/* Top Bar */}
      <div className="absolute top-0 left-0 right-0 z-[9999] bg-black/70 backdrop-blur-sm p-4 flex items-center justify-between">
        <button
          onClick={onManualSearch}
          className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-lg font-medium transition-colors"
        >
          <Search className="w-4 h-4" />
          <span className="hidden sm:inline">Manual Search</span>
        </button>
        <h2 className="text-white text-lg font-semibold">Scan to Pack</h2>
        <button
          onClick={handleClose}
          className="p-2 bg-white/20 hover:bg-white/30 text-white rounded-full transition-colors"
          aria-label="Close scanner"
        >
          <X className="w-6 h-6" />
        </button>
      </div>

      {/* Scanner Container */}
      <div
        ref={scannerRef}
        className="flex-1 flex items-center justify-center w-full h-full relative overflow-hidden bg-black"
      >
        {/* Video element */}
        <video
          ref={videoRef}
          className="absolute inset-0 w-full h-full object-cover"
          playsInline
          muted
          style={{ zIndex: 1 }}
        />

        {/* Hidden canvas for barcode detection */}
        <canvas ref={canvasRef} className="hidden" />

        {/* Frame overlay canvas */}
        <canvas
          ref={frameCanvasRef}
          className="absolute inset-0 pointer-events-none"
          style={{
            width: "100%",
            height: "100%",
            zIndex: 50,
            position: "absolute",
            backgroundColor: "transparent",
          }}
        />

        {/* Camera Error Display */}
        {cameraError && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-[100]">
            <div className="text-center p-4">
              <Camera className="h-12 w-12 text-red-400 mx-auto mb-3" />
              <p className="text-red-100 text-sm font-semibold mb-2">
                Camera Error
              </p>
              <p className="text-red-200 text-xs">
                {cameraError}
              </p>
              <button
                onClick={startCamera}
                className="mt-3 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition-colors"
              >
                Try Again
              </button>
            </div>
          </div>
        )}

        {/* Camera Loading Display */}
        {!isCameraReady && !cameraError && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-[100]">
            <div className="text-center">
              <Loader2 className="h-8 w-8 text-blue-400 mx-auto mb-2 animate-spin" />
              <p className="text-blue-100 text-sm">
                Starting camera...
              </p>
            </div>
          </div>
        )}


        {/* Scanning Status Display */}
        {isScanning && !isValidating && scannedCode && isCameraReady && (
          <div className="absolute top-24 left-1/2 transform -translate-x-1/2 z-[200] flex flex-col items-center gap-2">
            <div className="bg-blue-500/70 backdrop-blur-sm rounded-lg p-3 flex items-center justify-center">
              <svg
                className="w-8 h-8 text-white animate-pulse"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"
                />
              </svg>
            </div>
            <p className="text-blue-200 text-sm font-medium bg-blue-500/70 backdrop-blur-sm px-4 py-2 rounded-lg">
              Scanning...
            </p>
            <p className="text-white text-lg font-semibold bg-black/70 backdrop-blur-sm px-4 py-2 rounded-lg">
              {scannedCode}
            </p>
          </div>
        )}
      </div>

      {/* Validation Overlay */}
      {isValidating && (
        <div className="absolute inset-0 z-[10000] bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center">
          <div className="bg-white/10 p-4 rounded-full mb-4">
            <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
          <h3 className="text-white text-xl font-semibold mb-2">Validating...</h3>
          <p className="text-gray-300 text-center max-w-xs">
            Checking barcode: <span className="font-mono text-white">{lastScannedCodeRef.current}</span>
          </p>
        </div>
      )}

      {/* Bottom Bar */}
      {!isValidating && (
        <div className="absolute bottom-0 left-0 right-0 z-[9999] bg-black/70 backdrop-blur-sm p-4 flex items-center justify-center">
          <button
            onClick={onManualSearch}
            className="flex items-center justify-center gap-2 px-6 py-3 bg-white/20 hover:bg-white/30 text-white rounded-full font-medium transition-colors"
          >
            <Keyboard className="w-5 h-5" />
            <span>Manual Input</span>
          </button>
        </div>
      )}
    </div>
  );
}
