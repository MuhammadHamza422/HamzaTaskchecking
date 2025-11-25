import { useEffect, useRef, useState, useLayoutEffect, useCallback } from "react";
import Quagga from "@ericblade/quagga2";
import { X, Search, Keyboard } from "lucide-react";
import { searchOrder } from "../../../../api/fulfillment";
import Swal from "sweetalert2";

// Helper function to get median (from official example)
function getMedian(arr) {
  const newArr = [...arr];
  newArr.sort((a, b) => a - b);
  const half = Math.floor(newArr.length / 2);
  if (newArr.length % 2 === 1) {
    return newArr[half];
  }
  return (newArr[half - 1] + newArr[half]) / 2;
}

// Helper function to get median of code errors (from official example)
function getMedianOfCodeErrors(decodedCodes) {
  const errors = decodedCodes.flatMap((x) => x.error);
  const medianOfErrors = getMedian(errors);
  return medianOfErrors;
}

export default function QuaggaBarcodeScanner({
  onScanSuccess,
  onManualSearch,
  onClose,
}) {
  const scannerRef = useRef(null);
  const frameCanvasRef = useRef(null);
  const [isValidating, setIsValidating] = useState(false);
  const [scannedCode, setScannedCode] = useState("");
  const lastScannedCodeRef = useRef("");
  const isCameraReleasedRef = useRef(true);
  const isInitializingRef = useRef(false);

  // Error check callback - accepts code if median error < 0.25 (75% confidence)
  const errorCheck = useCallback(
    (result) => {
      if (isValidating) return;
      if (!result || !result.codeResult || !result.codeResult.code) return;

      const code = result.codeResult.code;

      // Skip if already processed
      if (code === lastScannedCodeRef.current) {
        return;
      }

      const err = getMedianOfCodeErrors(result.codeResult.decodedCodes || []);

      // If Quagga is at least 75% certain that it read correctly, accept the code
      if (err < 0.25) {
        handleBarcodeDetected(code, result);
      }
    },
    [isValidating]
  );

  // Properly release camera (async)
  const releaseCamera = async () => {
    try {
      // Stop Quagga first
      Quagga.stop();
      // Remove event handlers
      Quagga.offDetected();
      Quagga.offProcessed();
      // Explicitly release camera (critical for mobile)
      await Quagga.CameraAccess.release();
      isCameraReleasedRef.current = true;
    } catch (error) {
      console.error("Error releasing camera:", error);
      // Still mark as released to prevent blocking
      isCameraReleasedRef.current = true;
    }
  };

  // Handle barcode detection - call API immediately
  const handleBarcodeDetected = async (code, result) => {
    if (isValidating) return;
    if (code === lastScannedCodeRef.current) return;

    setIsValidating(true);
    lastScannedCodeRef.current = code;
    setScannedCode(code);

    // Stop Quagga and release camera properly
    await releaseCamera();

    // Call API immediately
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

          if (onClose) {
            onClose();
          }
          return;
        }

        // Valid order found
        if (onScanSuccess) {
          onScanSuccess(barcodeValue, searchData);
        }

        setIsValidating(false);
      } else {
        throw new Error("Order not found");
      }
    } catch (error) {
      console.error("Error validating barcode:", error);

      setIsValidating(false);
      lastScannedCodeRef.current = "";

      await Swal.fire({
        icon: "error",
        title: "Order Not Found",
        text: error.message || "No order found with this barcode. Please try again.",
        confirmButtonColor: "#2563eb",
        confirmButtonText: "OK",
      });

      // Restart scanner for re-scan (ensure camera is released first)
      try {
        // Longer delay on mobile to ensure camera is fully released
        await new Promise((resolve) => setTimeout(resolve, 500));
        
        // Request camera again (like initial setup)
        try {
          await Quagga.CameraAccess.request(null, {});
          await Quagga.CameraAccess.release();
          await new Promise((resolve) => setTimeout(resolve, 200));
        } catch (permError) {
          console.warn("Permission request warning on restart:", permError);
        }
        
        // Camera should be released now
        if (isCameraReleasedRef.current) {
          await Quagga.start();
          Quagga.onDetected(errorCheck);
          Quagga.onProcessed(handleProcessed);
          isCameraReleasedRef.current = false;
        }
      } catch (err) {
        console.error("Error restarting scanner:", err);
        isCameraReleasedRef.current = true;
      }
    }
  };

  // Handle processed result - draw blue rectangle and red line (from official example)
  const handleProcessed = (result) => {
    try {
      const drawingCtx = Quagga.canvas.ctx.overlay;
      const drawingCanvas = Quagga.canvas.dom.overlay;

      if (!drawingCtx || !drawingCanvas) return;

      drawingCtx.font = "24px Arial";
      drawingCtx.fillStyle = "green";

      if (result) {
        // Clear previous drawings
        drawingCtx.clearRect(
          0,
          0,
          parseInt(drawingCanvas.getAttribute("width")),
          parseInt(drawingCanvas.getAttribute("height"))
        );

        // Draw boxes (purple)
        if (result.boxes) {
          result.boxes
            .filter((box) => box !== result.box)
            .forEach((box) => {
              Quagga.ImageDebug.drawPath(
                box,
                { x: 0, y: 1 },
                drawingCtx,
                { color: "purple", lineWidth: 2 }
              );
            });
        }

        // Draw main box (blue rectangle)
        if (result.box) {
          Quagga.ImageDebug.drawPath(
            result.box,
            { x: 0, y: 1 },
            drawingCtx,
            { color: "blue", lineWidth: 2 }
          );
        }

        // Draw scan line (red line)
        if (result.codeResult && result.codeResult.code && result.line) {
          Quagga.ImageDebug.drawPath(
            result.line,
            { x: "x", y: "y" },
            drawingCtx,
            { color: "red", lineWidth: 3 }
          );

          // Display code text
          drawingCtx.font = "24px Arial";
          drawingCtx.fillStyle = "green";
          drawingCtx.fillText(result.codeResult.code, 10, 20);
        }
      }
    } catch (error) {
      // Silently ignore drawing errors
    }
  };

  // Initialize Quagga (following official example pattern)
  useLayoutEffect(() => {
    if (!scannerRef.current) return;

    let ignoreStart = false;

    const init = async () => {
      // Prevent concurrent initialization
      if (isInitializingRef.current) {
        return;
      }

      // Wait one tick to see if component unmounts
      await new Promise((resolve) => setTimeout(resolve, 1));

      if (ignoreStart || !scannerRef.current) {
        return;
      }

      // CRITICAL: Request camera permission first (triggers prompt on mobile)
      // Then release it immediately, then initialize Quagga
      // This is the pattern from the official example
      try {
        // Step 1: Request camera access (triggers permission prompt)
        await Quagga.CameraAccess.request(null, {});
        
        // Step 2: Release it immediately (so Quagga can use it)
        await Quagga.CameraAccess.release();
        
        // Step 3: Small delay to ensure camera is fully released (longer on mobile)
        await new Promise((resolve) => setTimeout(resolve, 500));
      } catch (error) {
        // If permission is denied, we'll catch it in Quagga.init
        // But don't block initialization - some browsers handle this differently
        console.warn("Camera permission request warning:", error);
        
        // If it's a permission error, try to release anyway
        try {
          await Quagga.CameraAccess.release();
        } catch (releaseError) {
          // Ignore release errors if we never got access
        }
        
        // Still proceed with initialization - Quagga.init will handle permission errors
      }

      if (ignoreStart || !scannerRef.current) {
        return;
      }

      isInitializingRef.current = true;

      const config = {
        inputStream: {
          type: "LiveStream",
          constraints: {
            width: { ideal: 640 },
            height: { ideal: 480 },
            facingMode: "environment",
          },
          target: scannerRef.current,
          willReadFrequently: true,
        },
        locator: {
          patchSize: "medium",
          halfSample: true,
          willReadFrequently: true,
        },
        decoder: {
          readers: [
            "code_128_reader",
            "ean_reader",
            "ean_8_reader",
            "code_39_reader",
            "upc_reader",
            "upc_e_reader",
          ],
        },
        locate: true,
      };

      Quagga.init(config, async (err) => {
        if (ignoreStart || !scannerRef.current) return;

        if (err) {
          console.error("Error initializing Quagga2:", err);

          let errorTitle = "Camera Error";
          let errorText = "Failed to access camera. Please check permissions.";

          if (err.name === "NotAllowedError") {
            errorTitle = "Camera Permission Denied";
            errorText = "Please allow camera access in your browser settings.";
          } else if (err.name === "NotFoundError") {
            errorTitle = "No Camera Found";
            errorText = "No camera device detected on this device.";
          } else if (err.name === "NotReadableError") {
            errorTitle = "Camera In Use";
            errorText = "Camera is already being used by another application.";
          }

          Swal.fire({
            icon: "error",
            title: errorTitle,
            text: errorText,
            confirmButtonColor: "#2563eb",
          });

          if (onClose) onClose();
          return;
        }

        // Setup event handlers
        Quagga.onProcessed(handleProcessed);

        if (scannerRef && scannerRef.current) {
          await Quagga.start();
          isCameraReleasedRef.current = false;
        }

        Quagga.onDetected(errorCheck);
        isInitializingRef.current = false;
      });
    };

    init();

    // Cleanup - properly release camera
    return () => {
      ignoreStart = true;
      isInitializingRef.current = false;
      
      // Cleanup must be synchronous, but we can start async cleanup
      // React cleanup functions can't be async, so we fire and forget
      const cleanup = async () => {
        try {
          // Stop Quagga first
          Quagga.stop();
          // Remove event handlers
          Quagga.offDetected(errorCheck);
          Quagga.offProcessed(handleProcessed);
          // Explicitly release camera (critical for mobile)
          await Quagga.CameraAccess.release();
          isCameraReleasedRef.current = true;
        } catch (error) {
          console.error("Error in cleanup:", error);
          // Still mark as released to prevent blocking
          isCameraReleasedRef.current = true;
        }
      };
      
      // Start cleanup (fire and forget - React cleanup can't await)
      cleanup();
    };
  }, [errorCheck]);

  // Setup video styles after Quagga initializes
  useEffect(() => {
    const setupStyles = () => {
      if (!scannerRef.current) return;

      const container = scannerRef.current;
      const video = container.querySelector("video");
      const drawingBuffer = container.querySelector("canvas.drawingBuffer");

      if (video) {
        video.style.width = "100%";
        video.style.height = "100%";
        video.style.objectFit = "cover";
        video.style.position = "absolute";
        video.style.top = "0";
        video.style.left = "0";
        video.style.zIndex = "1";
      }

      if (drawingBuffer) {
        drawingBuffer.style.width = "100%";
        drawingBuffer.style.height = "100%";
        drawingBuffer.style.position = "absolute";
        drawingBuffer.style.top = "0";
        drawingBuffer.style.left = "0";
        drawingBuffer.style.zIndex = "2";
        drawingBuffer.style.pointerEvents = "none";
      }
    };

    // Try to setup styles after a delay
    const timeoutId = setTimeout(setupStyles, 300);
    const intervalId = setInterval(setupStyles, 500);

    return () => {
      clearTimeout(timeoutId);
      clearInterval(intervalId);
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
        className="quagga-scanner-container flex-1 flex items-center justify-center w-full h-full relative overflow-hidden"
      >
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

        {/* Scanned Code Display */}
        {scannedCode && !isValidating && (
          <div className="absolute top-24 left-1/2 transform -translate-x-1/2 z-[200] flex flex-col items-center gap-2">
            <div className="bg-black/70 backdrop-blur-sm rounded-lg p-3 flex items-center justify-center">
              <svg
                className="w-8 h-8 text-white"
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
            <p className="text-white text-lg font-semibold bg-black/70 backdrop-blur-sm px-4 py-2 rounded-lg">
              {scannedCode}
            </p>
          </div>
        )}
      </div>

      {/* Global styles for Quagga video */}
      <style>{`
        .quagga-scanner-container video {
          width: 100% !important;
          height: 100% !important;
          object-fit: cover !important;
          position: absolute !important;
          top: 0 !important;
          left: 0 !important;
          z-index: 1 !important;
          pointer-events: none !important;
        }
        .quagga-scanner-container canvas.drawingBuffer {
          width: 100% !important;
          height: 100% !important;
          object-fit: cover !important;
          position: absolute !important;
          top: 0 !important;
          left: 0 !important;
          z-index: 2 !important;
          pointer-events: none !important;
          display: block !important;
          opacity: 1 !important;
        }
        .quagga-scanner-container canvas:not(.drawingBuffer) {
          display: block !important;
          opacity: 1 !important;
        }
        .quagga-scanner-container > div {
          width: 100% !important;
          height: 100% !important;
          position: relative !important;
        }
      `}</style>

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
