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
  const [isScanning, setIsScanning] = useState(false); // Visual feedback: detecting but not confirmed
  const lastScannedCodeRef = useRef("");
  const isCameraReleasedRef = useRef(true);
  const isInitializingRef = useRef(false);
  
  // Stability check: Detection buffer
  const detectionBufferRef = useRef([]);
  const stableCodeRef = useRef(null);
  const stableCodeStartTimeRef = useRef(null);
  const cooldownUntilRef = useRef(0); // Timestamp when cooldown ends
  
  // Constants for stability and quality
  const REQUIRED_CONSECUTIVE_DETECTIONS = 2; // Need 2 same codes in a row
  const BUFFER_SIZE = 3; // Track last 3 detections
  const MIN_DETECTION_DURATION_MS = 200; // Must detect for 300ms
  const CONFIDENCE_THRESHOLD = 0.12; // 85% confidence (was 0.25 = 75%)
  const COOLDOWN_AFTER_ERROR_MS =1000; // 2 seconds cooldown after failed API
  const MIN_CODE_LENGTH = 3; // Minimum barcode length

  // Validate code quality and length
  const isValidCode = (code, error) => {
    if (!code || typeof code !== 'string') return false;
    
    const trimmedCode = code.trim();
    
    // Check minimum length
    if (trimmedCode.length < MIN_CODE_LENGTH) return false;
    
    // Check confidence threshold (85% confidence)
    if (error >= CONFIDENCE_THRESHOLD) return false;
    
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
          error: recent[0].error, // Use first detection's error
          timestamp: firstDetection.timestamp
        };
      }
    }
    
    return null;
  };

  // Properly release camera (async) - optimized for immediate release
  const releaseCamera = async () => {
    try {
      console.log("QuaggaBarcodeScanner: Starting IMMEDIATE camera release...");
      
      // STEP 1: Stop Quagga immediately (synchronous)
      Quagga.stop();
      // Remove event handlers
      Quagga.offDetected();
      Quagga.offProcessed();
      
      // STEP 2: CRITICAL - Explicitly stop all MediaStream tracks IMMEDIATELY
      // Some mobile devices don't fully release camera without this
      try {
        const container = scannerRef.current;
        if (container) {
          const video = container.querySelector("video");
          if (video && video.srcObject) {
            const stream = video.srcObject;
            if (stream instanceof MediaStream) {
              const tracks = stream.getTracks();
              tracks.forEach((track) => {
                track.stop();
                console.log("Stopped Quagga video track:", track.kind, track.label);
              });
              video.srcObject = null;
            }
          }
        }
      } catch (trackError) {
        console.warn("Error stopping video tracks:", trackError);
      }
      
      // STEP 3: Release camera via Quagga API (async but fast)
      try {
        await Quagga.CameraAccess.release();
        console.log("Quagga.CameraAccess.release() completed");
      } catch (releaseError) {
        console.warn("Quagga.CameraAccess.release() error (may already be released):", releaseError);
      }
      
      // STEP 4: Mark as released immediately (don't wait for verification)
      // CameraCapture will handle verification when it tries to access
      isCameraReleasedRef.current = true;
      
      console.log("Camera release completed - ready for next component");
    } catch (error) {
      console.error("Error releasing camera:", error);
      // Still mark as released to prevent blocking
      isCameraReleasedRef.current = true;
    }
  };

  // Handle barcode detection - call API after stable code confirmed
  const handleBarcodeDetected = useCallback(async (code, result) => {
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

    // CRITICAL: Release camera IMMEDIATELY before validation
    // This allows CameraCapture to start initializing while validation is happening
    console.log("Releasing camera immediately before validation...");
    await releaseCamera();
    console.log("Camera released, proceeding with validation...");

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

        // Valid order found - camera is already released, proceed immediately
        console.log("Validation successful, camera already released, proceeding to next step");
        
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

      // Restart scanner for re-scan (camera was already released, just need to reinitialize)
      console.log("Validation failed, restarting scanner...");

      try {
        // Request camera again (like initial setup)
        try {
          await Quagga.CameraAccess.request(null, {});
          await Quagga.CameraAccess.release();
        } catch (permError) {
          console.warn("Permission request warning on restart:", permError);
        }
        
        // Camera should be released now, restart Quagga
        if (isCameraReleasedRef.current) {
          console.log("Restarting Quagga scanner...");
          await Quagga.start();
          Quagga.onDetected(errorCheck);
          Quagga.onProcessed(handleProcessed);
          isCameraReleasedRef.current = false;
          console.log("Scanner restarted successfully");
        }
      } catch (err) {
        console.error("Error restarting scanner:", err);
        isCameraReleasedRef.current = true;
      }
    }
  }, [isValidating, onScanSuccess, onClose]);

  // Error check callback - with stability and quality checks
  const errorCheck = useCallback(
    (result) => {
      // Skip if in cooldown period
      if (Date.now() < cooldownUntilRef.current) {
        return;
      }

      if (isValidating) return;
      if (!result || !result.codeResult || !result.codeResult.code) {
        setIsScanning(false);
        return;
      }

      const code = result.codeResult.code;
      const err = getMedianOfCodeErrors(result.codeResult.decodedCodes || []);

      // Skip if already processed and validated
      if (code === lastScannedCodeRef.current) {
        return;
      }

      // Validate code quality
      if (!isValidCode(code, err)) {
        setIsScanning(false);
        return;
      }

      // Add to detection buffer
      const now = Date.now();
      detectionBufferRef.current.push({
        code: code.trim(),
        error: err,
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
            handleBarcodeDetected(stable.code, result);
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
            width: { ideal: 1920, min: 1280 }, 
            height: { ideal: 1080, min: 720 },
            facingMode: "environment",
            focusMode: "continuous", 
          },
          target: scannerRef.current,
          willReadFrequently: true,
      },
      locator: {
        patchSize: "large",
        halfSample: true,
          willReadFrequently: true,
      },
        frequency: 5, // Scan every 5th frame (was 1 = every frame) - reduces false positives
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
      
      // Also try to stop all media tracks immediately (synchronously)
      try {
        const container = scannerRef.current;
        if (container) {
          const video = container.querySelector("video");
          if (video && video.srcObject instanceof MediaStream) {
            video.srcObject.getTracks().forEach((track) => {
              track.stop();
            });
            video.srcObject = null;
          }
        }
      } catch (syncStopError) {
        console.warn("Error in synchronous track stop:", syncStopError);
      }
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

        {/* Scanning Status Display */}
        {isScanning && !isValidating && scannedCode && (
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
