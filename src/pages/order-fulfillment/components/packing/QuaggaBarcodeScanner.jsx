import { useEffect, useRef, useState } from "react";
import Quagga from "quagga";
import { X, Search, Keyboard } from "lucide-react";
import { scanOrderWithDetails } from "../../../../api/fulfillment";
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

  // Play success sound
  const playSuccessSound = () => {
    try {
      // Try to play audio file first, fallback to Web Audio API
      const audio = new Audio("/scansound.mp3");
      audio.volume = 0.5;
      audio.play().catch((err) => {
        // Fallback to Web Audio API
        const audioContext = new (window.AudioContext ||
          window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        oscillator.frequency.value = 800;
        oscillator.type = "sine";

        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(
          0.01,
          audioContext.currentTime + 0.3
        );

        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.3);
      });
    } catch (error) {
      console.error("Error playing sound:", error);
      // Final fallback - try Web Audio API directly
      try {
        const audioContext = new (window.AudioContext ||
          window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        oscillator.frequency.value = 800;
        oscillator.type = "sine";

        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(
          0.01,
          audioContext.currentTime + 0.3
        );

        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.3);
      } catch (fallbackError) {
        console.error("Fallback sound also failed:", fallbackError);
      }
    }
  };

  useEffect(() => {
    if (!scannerRef.current) return;

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
      numOfWorkers: 2,
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
      },
      locate: true,
    };

    Quagga.init(config, (err) => {
      if (err) {
        console.error("Error initializing QuaggaJS:", err);
        Swal.fire({
          icon: "error",
          title: "Camera Error",
          text: "Failed to access camera. Please check permissions.",
          confirmButtonColor: "#2563eb",
        });
        if (onClose) onClose();
        return;
      }

      // Ensure video element fills container after Quagga initializes
      // Use multiple attempts to ensure video is ready
      const setupVideoStyles = (attempt = 0) => {
        const container = scannerRef.current;
        if (!container && attempt < 10) {
          setTimeout(() => setupVideoStyles(attempt + 1), 100);
          return;
        }

        if (container) {
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
            drawingBuffer.style.zIndex = "1";
            drawingBuffer.style.pointerEvents = "none";
          }

          // If video not ready yet, retry
          if (!video && attempt < 10) {
            setTimeout(() => setupVideoStyles(attempt + 1), 100);
          }
        }
      };

      // Start setup after a short delay
      setTimeout(() => setupVideoStyles(), 100);

      Quagga.start();

      // Handle detection
      Quagga.onDetected((result) => {
        const code = result.codeResult.code;

        // Avoid processing the same code multiple times
        if (code === lastScannedCodeRef.current || isValidating) {
          return;
        }

        // Set validating flag immediately to prevent duplicate processing
        setIsValidating(true);
        lastScannedCodeRef.current = code;

        // Stop Quagga immediately to prevent re-scanning the same barcode
        try {
          Quagga.stop();
          Quagga.offDetected();
          Quagga.offProcessed();
        } catch (error) {
          console.error("Error stopping Quagga:", error);
        }

        // Clear previous validation timeout
        if (validationTimeoutRef.current) {
          clearTimeout(validationTimeoutRef.current);
        }

        // Validate barcode immediately with combined API (search + details in one call)
        (async () => {
          const barcodeValue = String(code).trim();
          try {
            // Single API call - gets both search metadata and full order details
            const result = await scanOrderWithDetails(barcodeValue);

            if (result.success && result.data) {
              const { search, order } = result.data;

              // Check if already packed - show warning and don't navigate
              if (search.isAlreadyPacked && search.packingInfo) {
                // Reset validating flag and scanned code
                setIsValidating(false);
                lastScannedCodeRef.current = "";

                // Show alert
                await Swal.fire({
                  icon: "warning",
                  title: "Order Already Packed",
                  html: `
                    <div class="text-left">
                      <p class="mb-4 text-gray-700">This order has already been packed.</p>
                      <div class="bg-gray-50 rounded-lg p-4 mb-4">
                        <p class="text-sm"><span class="font-medium">Packing ID:</span> ${search.packingInfo.packingId || "N/A"
                    }</p>
                        <p class="text-sm"><span class="font-medium">Status:</span> ${search.packingInfo.status || "N/A"
                    }</p>
                      </div>
                    </div>
                  `,
                  confirmButtonColor: "#2563eb",
                  confirmButtonText: "OK",
                });

                // Close scanner and return to landing page
                if (onClose) {
                  onClose();
                }
                return;
              }

              // Valid order - play sound and navigate immediately
              playSuccessSound();

              // Navigate immediately with full order data (no need for second API call)
              if (onScanSuccess) {
                onScanSuccess(barcodeValue, order);
              }

              // Reset validating flag after navigation
              setIsValidating(false);
            } else {
              throw new Error("Order not found");
            }
          } catch (error) {
            console.error("Error validating barcode:", error);

            // Reset validating flag and scanned code on error
            setIsValidating(false);
            lastScannedCodeRef.current = "";

            // Show error alert
            await Swal.fire({
              icon: "error",
              title: "Order Not Found",
              text: error.message || "No order found with this barcode. Please try again.",
              confirmButtonColor: "#2563eb",
              confirmButtonText: "OK",
            });

            // Close scanner and return to landing page
            if (onClose) {
              onClose();
            }
          }
        })();
      });

      // Handle process result - update scanned code display
      Quagga.onProcessed((result) => {
        // Only update scanned code display if we haven't detected a code yet
        if (!isValidating && !lastScannedCodeRef.current) {
          if (result && result.codeResult && result.codeResult.code) {
            const code = result.codeResult.code;
            // Update scanned code in real time
            if (code && code !== scannedCode) {
              setScannedCode(code);
            }
          }
        }
      });
    });

    return () => {
      // Properly stop Quagga and release camera
      try {
        Quagga.stop();
        Quagga.offDetected();
        Quagga.offProcessed();
      } catch (error) {
        console.error("Error stopping Quagga:", error);
      }
      if (validationTimeoutRef.current) {
        clearTimeout(validationTimeoutRef.current);
      }
    };
  }, [onScanSuccess, onClose]);

  // Handle window resize and orientation changes (important for mobile)
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
      const containerWidth =
        scannerRef.current.clientWidth || window.innerWidth;
      const containerHeight =
        scannerRef.current.clientHeight || window.innerHeight;

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
      const isLargeScreen = containerWidth >= 1024; // Desktop/large screens
      let frameWidth, frameHeight;

      if (isLargeScreen) {
        // Large screens: narrower width, taller height
        frameWidth = containerWidth * 0.5; // 50% width (narrower)
        frameHeight = containerHeight * 0.6; // 60% height (taller)
      } else {
        // Mobile/small screens: original dimensions
        frameWidth = containerWidth * 0.7; // 70% width
        frameHeight = containerHeight * 0.4; // 40% height
      }

      const frameX = (containerWidth - frameWidth) / 2;
      const frameY = (containerHeight - frameHeight) / 2;
      const cornerLength = 40;
      const lineWidth = 4;

      // Draw semi-transparent black overlay covering entire screen
      ctx.fillStyle = "rgba(0, 0, 0, 0.7)"; // 70% opacity black
      ctx.fillRect(0, 0, containerWidth, containerHeight);

      // Use composite operation to cut out the scanning area (make it transparent)
      ctx.globalCompositeOperation = "destination-out";
      ctx.fillStyle = "rgba(0, 0, 0, 1)"; // Fully opaque to cut out
      ctx.fillRect(frameX, frameY, frameWidth, frameHeight);

      // Reset composite operation to draw the blue corners
      ctx.globalCompositeOperation = "source-over";

      // Calculate blinking opacity (smooth pulse between 0.5 and 1.0)
      blinkPhase += 0.05; // Animation speed
      if (blinkPhase > Math.PI * 2) blinkPhase = 0;
      const opacity = 0.5 + (Math.sin(blinkPhase) + 1) * 0.25; // Range: 0.5 to 1.0

      // Draw blue L-shaped corners with blinking effect
      ctx.strokeStyle = `rgba(59, 130, 246, ${opacity})`; // Blue color with opacity
      ctx.lineWidth = lineWidth;
      ctx.lineCap = "round";
      ctx.shadowColor = `rgba(59, 130, 246, ${opacity * 0.5})`; // Glow effect
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

    // Start animation
    drawFrame();

    // Handle resize and orientation change
    const handleResize = () => {
      // Animation will automatically redraw with new dimensions
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
    // Properly stop Quagga and release camera
    try {
      Quagga.stop();
      Quagga.offDetected();
      Quagga.offProcessed();
    } catch (error) {
      console.error("Error stopping Quagga:", error);
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
        {/* Frame overlay canvas (blue L-shaped corners) */}
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

      {/* Global styles for Quagga video to fill full width */}
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

      {/* Simplified Bottom Bar - Only Manual Input Button */}
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