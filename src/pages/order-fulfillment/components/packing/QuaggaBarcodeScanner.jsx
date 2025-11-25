import { useEffect, useRef, useState } from "react";
import Quagga from "@ericblade/quagga2";
import { X, Search, Keyboard } from "lucide-react";
import { searchOrder } from "../../../../api/fulfillment";
import Swal from "sweetalert2";

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
  const validationTimeoutRef = useRef(null);
  
  // Refs to access latest state values in event handlers
  const isValidatingRef = useRef(false);
  const scannedCodeRef = useRef("");
  const stableCodeTimeoutRef = useRef(null);
  const stableCodeRef = useRef("");
  
  // Buffer for tracking consecutive detections (for accuracy)
  const detectionBufferRef = useRef([]);
  const REQUIRED_DETECTIONS = 2; // Need 2 consecutive same reads (reduced for mobile)
  const DETECTION_WINDOW_MS = 1500; // Within 1.5 seconds (increased for mobile)
  const MAX_ERROR_THRESHOLD = 0.35; // Maximum average error per character (relaxed for mobile)
  const STABLE_CODE_DELAY_MS = 1000; // If same code for 1 second, proceed
  
  // Keep refs in sync with state
  useEffect(() => {
    isValidatingRef.current = isValidating;
  }, [isValidating]);
  
  useEffect(() => {
    scannedCodeRef.current = scannedCode;
  }, [scannedCode]);

  useEffect(() => {
    if (!scannerRef.current) return;

    let isMounted = true;
    let isQuaggaInitialized = false;
    let isQuaggaStarted = false;
    let handlersSetup = false;

    // Global error handler for Quagga2 internal errors
    const handleQuaggaError = (error) => {
      // Only log if it's not the null 'x' error (which we handle gracefully)
      if (error && error.message && error.message.includes("Cannot read properties of null")) {
        console.warn("Quagga2 dimension error (handled):", error);
        return;
      }
      console.warn("Quagga2 internal error (handled):", error);
    };

    // Add error event listener
    window.addEventListener('error', handleQuaggaError);

    // Wait for container to have dimensions before initializing
    const waitForContainer = (attempt = 0) => {
      if (!isMounted || !scannerRef.current) return;

      const container = scannerRef.current;
      const rect = container.getBoundingClientRect();
      
      // Check if container has valid dimensions
      if (rect.width === 0 || rect.height === 0) {
        if (attempt < 20) {
          setTimeout(() => waitForContainer(attempt + 1), 100);
          return;
        }
        console.warn("Container dimensions not available after retries");
      }

      initializeQuagga();
    };

    const initializeQuagga = () => {
      if (!isMounted || !scannerRef.current) return;

      const config = {
        inputStream: {
          name: "Live",
          type: "LiveStream",
          target: scannerRef.current,
          constraints: {
            width: { ideal: 1280 },
            height: { ideal: 720 },
            facingMode: "environment", // Back camera
          },
        },
        locator: {
          patchSize: "medium",
          halfSample: true,
        },
        frequency: 10, // Scan every 10th frame to reduce errors
        numOfWorkers: navigator.hardwareConcurrency || 2,
        decoder: {
          readers: [
            "code_128_reader",
            "ean_reader",
            "ean_8_reader",
            "code_39_reader",
            "code_39_vin_reader",
            "codabar_reader",
            "upc_reader",
            "upc_e_reader",
            "i2of5_reader",
          ],
          multiple: false,
          debug: {
            drawBoundingBox: false,
            showFrequency: false,
            drawScanline: false,
            showPattern: false,
          },
        },
        locate: true,
      };

      Quagga.init(config, (err) => {
        if (!isMounted) return;

        if (err) {
          console.error("Error initializing Quagga2:", err);
          
          // Detailed error handling
          let errorTitle = "Camera Error";
          let errorText = "Failed to access camera. Please check permissions.";
          
          if (err.name === 'NotAllowedError') {
            errorTitle = "Camera Permission Denied";
            errorText = "Please allow camera access in your browser settings.";
          } else if (err.name === 'NotFoundError') {
            errorTitle = "No Camera Found";
            errorText = "No camera device detected on this device.";
          } else if (err.name === 'NotReadableError') {
            errorTitle = "Camera In Use";
            errorText = "Camera is already being used by another application.";
          } else if (err.name === 'OverconstrainedError') {
            errorTitle = "Camera Constraints Error";
            errorText = "Camera does not meet the required specifications.";
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

        isQuaggaInitialized = true;

        // Wait for video element to be created and have dimensions before starting
        const waitForVideo = (attempt = 0) => {
          if (!isMounted || !scannerRef.current) return;

          const container = scannerRef.current;
          const video = container.querySelector("video");
          const drawingBuffer = container.querySelector("canvas.drawingBuffer");

          if (video) {
            // Check if video has valid dimensions
            const videoRect = video.getBoundingClientRect();
            const videoWidth = video.videoWidth || videoRect.width;
            const videoHeight = video.videoHeight || videoRect.height;

            if (videoWidth > 0 && videoHeight > 0) {
              // Video is ready, setup styles and start
              setupVideoStyles(video, drawingBuffer);
              
              if (!isQuaggaStarted) {
                try {
                  Quagga.start();
                  isQuaggaStarted = true;
                  
                  // Setup event handlers after Quagga starts (only once)
                  if (!handlersSetup) {
                    setupEventHandlers();
                    handlersSetup = true;
                  }
                } catch (error) {
                  console.error("Error starting Quagga2:", error);
                }
              }
              return;
            }
          }

          // Retry if video not ready yet
          if (attempt < 30) {
            setTimeout(() => waitForVideo(attempt + 1), 100);
          } else {
            console.warn("Video element not ready after retries, starting anyway");
            if (!isQuaggaStarted) {
              try {
                Quagga.start();
                isQuaggaStarted = true;
                
                // Setup event handlers after Quagga starts (only once)
                if (!handlersSetup) {
                  setupEventHandlers();
                  handlersSetup = true;
                }
              } catch (error) {
                console.error("Error starting Quagga2:", error);
              }
            }
          }
        };

        // Start checking for video element
        setTimeout(() => waitForVideo(), 200);
      });
    };

    // Trigger validation - can be called from detection or timeout
    const triggerValidation = async (code) => {
      if (!isMounted) return;
      if (isValidatingRef.current) return;
      if (code === lastScannedCodeRef.current) return;

      // Clear stable code timeout
      if (stableCodeTimeoutRef.current) {
        clearTimeout(stableCodeTimeoutRef.current);
      }

      setIsValidating(true);
      isValidatingRef.current = true;
      lastScannedCodeRef.current = code;

      // Stop Quagga immediately to prevent re-scanning
      try {
        Quagga.stop();
        Quagga.offDetected();
        Quagga.offProcessed();
      } catch (error) {
        console.error("Error stopping Quagga2:", error);
      }

      // Clear detection buffer
      detectionBufferRef.current = [];

      // Clear previous validation timeout
      if (validationTimeoutRef.current) {
        clearTimeout(validationTimeoutRef.current);
      }

      // Fast search API call
      const barcodeValue = String(code).trim();
      try {
        console.log("Calling searchOrder API for:", barcodeValue);
        const searchResult = await searchOrder(barcodeValue);
        console.log("searchOrder result:", searchResult);

        if (searchResult.success && searchResult.data) {
          const searchData = searchResult.data;

          // Check if already packed
          if (searchData.isAlreadyPacked && searchData.packingInfo) {
            setIsValidating(false);
            isValidatingRef.current = false;
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
          console.log("Valid order found, calling onScanSuccess");
          if (onScanSuccess) {
            onScanSuccess(barcodeValue, searchData);
          }

          setIsValidating(false);
          isValidatingRef.current = false;
        } else {
          throw new Error("Order not found");
        }
      } catch (error) {
        console.error("Error validating barcode:", error);

        setIsValidating(false);
        isValidatingRef.current = false;
        lastScannedCodeRef.current = "";

        await Swal.fire({
          icon: "error",
          title: "Order Not Found",
          text: error.message || "No order found with this barcode. Please try again.",
          confirmButtonColor: "#2563eb",
          confirmButtonText: "OK",
        });

        if (onClose) {
          onClose();
        }
      }
    };

    const setupEventHandlers = () => {
      if (!isMounted) return;

      console.log("Setting up Quagga event handlers");

      // Handle detection
      Quagga.onDetected((result) => {
        if (!isMounted) return;
        
        try {
          // Safety check for result structure
          if (!result || !result.codeResult || !result.codeResult.code) {
            return;
          }

          const code = result.codeResult.code;
          const now = Date.now();

          console.log("=== Barcode detected ===", code);

          // Skip if already validating (use ref to get latest value)
          if (isValidatingRef.current) {
            console.log("Already validating, skipping...");
            return;
          }

          // Check if we've already processed this code
          if (code === lastScannedCodeRef.current) {
            console.log("Code already processed, skipping...");
            return;
          }

          // Quality check: Calculate average error per character
          const decodedCodes = result.codeResult.decodedCodes || [];
          const errors = decodedCodes
            .map((d) => d && d.error)
            .filter((e) => typeof e === "number" && e >= 0 && !isNaN(e));
          
          const avgError = errors.length > 0
            ? errors.reduce((sum, e) => sum + e, 0) / errors.length
            : 0;

          console.log("Quality check - avgError:", avgError.toFixed(3), "threshold:", MAX_ERROR_THRESHOLD);

          // Reject low-quality detections (but log it)
          if (avgError > MAX_ERROR_THRESHOLD) {
            console.log("Detection rejected due to quality:", avgError.toFixed(3));
            return;
          }

          // High-quality detection - add to buffer
          detectionBufferRef.current.push({
            code: code,
            timestamp: now,
            quality: avgError,
          });

          // Clean up old detections outside the time window
          detectionBufferRef.current = detectionBufferRef.current.filter(
            (detection) => now - detection.timestamp < DETECTION_WINDOW_MS
          );

          // Count consecutive detections of the same code
          const recentDetections = detectionBufferRef.current;
          const sameCodeCount = recentDetections.filter(
            (detection) => detection.code === code
          ).length;

          console.log("Detection count:", sameCodeCount, "/", REQUIRED_DETECTIONS, "for code:", code);

          // Update display with current code being scanned
          if (code && code !== scannedCodeRef.current) {
            setScannedCode(code);
            scannedCodeRef.current = code;
            
            // Set up stable code fallback timer
            if (stableCodeTimeoutRef.current) {
              clearTimeout(stableCodeTimeoutRef.current);
            }
            stableCodeRef.current = code;
            stableCodeTimeoutRef.current = setTimeout(() => {
              console.log("Stable code timeout triggered for:", code);
              triggerValidation(code);
            }, STABLE_CODE_DELAY_MS);
          }

          // Proceed if we have enough consecutive detections
          if (sameCodeCount >= REQUIRED_DETECTIONS) {
            console.log("Enough detections! Triggering validation for:", code);
            triggerValidation(code);
          } else {
            console.log(`Waiting for more detections: ${sameCodeCount}/${REQUIRED_DETECTIONS}`);
          }
        } catch (error) {
          console.error("Error in onDetected handler:", error);
          // Reset state on error
          setIsValidating(false);
          isValidatingRef.current = false;
          lastScannedCodeRef.current = "";
        }
      });

      // Handle process result - with error handling
      Quagga.onProcessed((result) => {
        if (!isMounted) return;
        
        try {
          // Use refs to get latest values
          if (!isValidatingRef.current && !lastScannedCodeRef.current) {
            if (result && result.codeResult && result.codeResult.code) {
              const code = result.codeResult.code;
              if (code && code !== scannedCodeRef.current) {
                setScannedCode(code);
                scannedCodeRef.current = code;
              }
            }
          }
        } catch (error) {
          // Silently ignore processing errors to prevent crashes
          console.warn("Processing error (non-critical):", error);
        }
      });
    };

    const setupVideoStyles = (video, drawingBuffer) => {
      if (!video) return;

      video.style.width = "100%";
      video.style.height = "100%";
      video.style.objectFit = "cover";
      video.style.position = "absolute";
      video.style.top = "0";
      video.style.left = "0";
      video.style.zIndex = "1";

      if (drawingBuffer) {
        drawingBuffer.style.width = "100%";
        drawingBuffer.style.height = "100%";
        drawingBuffer.style.position = "absolute";
        drawingBuffer.style.top = "0";
        drawingBuffer.style.left = "0";
        drawingBuffer.style.zIndex = "1";
        drawingBuffer.style.pointerEvents = "none";
      }
    };

    // Start initialization process
    setTimeout(() => waitForContainer(), 100);

    return () => {
      // Mark as unmounted to prevent further operations
      isMounted = false;
      
      // Remove error handler
      window.removeEventListener('error', handleQuaggaError);
      
      // Clear all timeouts
      if (validationTimeoutRef.current) {
        clearTimeout(validationTimeoutRef.current);
      }
      if (stableCodeTimeoutRef.current) {
        clearTimeout(stableCodeTimeoutRef.current);
      }
      
      // Only stop Quagga if it was initialized
      if (isQuaggaInitialized || isQuaggaStarted) {
        try {
          Quagga.stop();
          Quagga.offDetected();
          Quagga.offProcessed();
        } catch (error) {
          console.error("Error stopping Quagga2:", error);
        }
      }
      
      detectionBufferRef.current = [];
    };
  }, [onScanSuccess, onClose, isValidating, scannedCode]);

  // Handle window resize and orientation changes
  useEffect(() => {
    const handleResize = () => {
      // Resize handler - for future use if needed
    };

    window.addEventListener("resize", handleResize);
    window.addEventListener("orientationchange", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("orientationchange", handleResize);
    };
  }, []);

  // Draw blue L-shaped corner frame overlay with black background outside
  useEffect(() => {
    let animationFrameId;
    let blinkPhase = 0;

    const drawFrame = () => {
      if (!frameCanvasRef.current || !scannerRef.current) return;

      const canvas = frameCanvasRef.current;
      const ctx = canvas.getContext("2d");
      const containerWidth = scannerRef.current.clientWidth || window.innerWidth;
      const containerHeight = scannerRef.current.clientHeight || window.innerHeight;

      // Set canvas size
      const devicePixelRatio = window.devicePixelRatio || 1;
      canvas.width = containerWidth * devicePixelRatio;
      canvas.height = containerHeight * devicePixelRatio;
      canvas.style.width = `${containerWidth}px`;
      canvas.style.height = `${containerHeight}px`;

      ctx.scale(devicePixelRatio, devicePixelRatio);

      // Clear canvas
      ctx.clearRect(0, 0, containerWidth, containerHeight);

      // Calculate frame dimensions - responsive for large screens
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

      // Cut out the scanning area
      ctx.globalCompositeOperation = "destination-out";
      ctx.fillStyle = "rgba(0, 0, 0, 1)";
      ctx.fillRect(frameX, frameY, frameWidth, frameHeight);

      // Reset composite operation
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

      // Reset shadow
      ctx.shadowBlur = 0;

      // Continue animation loop
      animationFrameId = requestAnimationFrame(drawFrame);
    };

    drawFrame();

    const handleResize = () => {
      // Animation will automatically redraw
    };

    window.addEventListener("resize", handleResize);
    window.addEventListener("orientationchange", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("orientationchange", handleResize);
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, []);

  const handleClose = () => {
    try {
      Quagga.stop();
      Quagga.offDetected();
      Quagga.offProcessed();
    } catch (error) {
      console.error("Error stopping Quagga2:", error);
    }
    if (validationTimeoutRef.current) {
      clearTimeout(validationTimeoutRef.current);
    }
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
        .quagga-scanner-container video,
        .quagga-scanner-container canvas.drawingBuffer {
          width: 100% !important;
          height: 100% !important;
          object-fit: cover !important;
          position: absolute !important;
          top: 0 !important;
          left: 0 !important;
          z-index: 1 !important;
          pointer-events: none !important;
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