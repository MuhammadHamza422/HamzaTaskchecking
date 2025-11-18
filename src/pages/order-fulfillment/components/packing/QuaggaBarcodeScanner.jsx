import { useEffect, useRef, useState } from "react";
import Quagga from "quagga";
import { X, Search } from "lucide-react";
import { searchOrder } from "../../../../api/fulfillment";
import Swal from "sweetalert2";

export default function QuaggaBarcodeScanner({ onScanSuccess, onManualSearch, onClose }) {
  const scannerRef = useRef(null);
  const canvasRef = useRef(null);
  const [isScanning, setIsScanning] = useState(false);
  const [detectedBoxes, setDetectedBoxes] = useState([]);
  const [validatedBox, setValidatedBox] = useState(null);
  const [isValidating, setIsValidating] = useState(false);
  const lastScannedCodeRef = useRef("");
  const validationTimeoutRef = useRef(null);
  const resizeTimeoutRef = useRef(null);

  // Play success sound
  const playSuccessSound = () => {
    try {
      // Try to play audio file first, fallback to Web Audio API
      const audio = new Audio("/scansound.mp3");
      audio.volume = 0.5;
      audio.play().catch((err) => {
        // Fallback to Web Audio API
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        oscillator.frequency.value = 800;
        oscillator.type = "sine";

        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);

        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.3);
      });
    } catch (error) {
      console.error("Error playing sound:", error);
      // Final fallback - try Web Audio API directly
      try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        oscillator.frequency.value = 800;
        oscillator.type = "sine";

        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);

        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.3);
      } catch (fallbackError) {
        console.error("Fallback sound also failed:", fallbackError);
      }
    }
  };

  // Draw boxes on canvas overlay with retry mechanism
  const drawBoxes = (boxes, color = "red", retryCount = 0) => {
    if (!canvasRef.current || !scannerRef.current) {
      // Retry if refs not ready (max 5 retries)
      if (retryCount < 5) {
        setTimeout(() => drawBoxes(boxes, color, retryCount + 1), 50);
      } else {
        console.warn("drawBoxes: Canvas or scanner ref not available");
      }
      return;
    }

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const video = scannerRef.current?.querySelector("video");
    const drawingCanvas = scannerRef.current?.querySelector("canvas.drawingBuffer");

    // Retry if video element not ready yet
    if (!video && !drawingCanvas) {
      if (retryCount < 10) {
        setTimeout(() => drawBoxes(boxes, color, retryCount + 1), 50);
      } else {
        console.warn("drawBoxes: Video element not found");
      }
      return;
    }

    // Get container dimensions
    const containerWidth = scannerRef.current.clientWidth || window.innerWidth;
    const containerHeight = scannerRef.current.clientHeight || window.innerHeight;

    // Get the displayed video dimensions (what user sees)
    const displayedWidth = video?.clientWidth || containerWidth;
    const displayedHeight = video?.clientHeight || containerHeight;

    // Get the native video dimensions (actual video resolution)
    // Use drawingCanvas dimensions if video dimensions not available
    let nativeWidth = video?.videoWidth || 0;
    let nativeHeight = video?.videoHeight || 0;
    
    if (nativeWidth === 0 || nativeHeight === 0) {
      nativeWidth = drawingCanvas?.width || displayedWidth;
      nativeHeight = drawingCanvas?.height || displayedHeight;
    }

    // Ensure we have valid dimensions
    if (displayedWidth === 0 || displayedHeight === 0 || nativeWidth === 0 || nativeHeight === 0) {
      if (retryCount < 10) {
        setTimeout(() => drawBoxes(boxes, color, retryCount + 1), 50);
      } else {
        console.warn("drawBoxes: Invalid dimensions", { displayedWidth, displayedHeight, nativeWidth, nativeHeight });
      }
      return;
    }

    // Calculate visible video area accounting for object-fit: cover
    // When object-fit: cover is used, the video maintains aspect ratio and fills the container
    // The video element itself is sized to the container, but the video content is scaled/cropped
    const containerAspect = containerWidth / containerHeight;
    const videoAspect = nativeWidth / nativeHeight;
    
    let scaleX, scaleY, videoOffsetX, videoOffsetY;
    
    // Handle edge cases (avoid division by zero, invalid aspect ratios)
    if (isNaN(containerAspect) || isNaN(videoAspect) || containerAspect <= 0 || videoAspect <= 0) {
      // Fallback to simple scaling if aspect ratio calculation fails
      scaleX = containerWidth / nativeWidth;
      scaleY = containerHeight / nativeHeight;
      videoOffsetX = 0;
      videoOffsetY = 0;
    } else if (videoAspect > containerAspect) {
      // Video is wider than container - video height matches container height
      // Width is scaled proportionally and cropped on sides
      const scale = containerHeight / nativeHeight;
      scaleX = scale;
      scaleY = scale;
      const scaledVideoWidth = nativeWidth * scale;
      videoOffsetX = (containerWidth - scaledVideoWidth) / 2;
      videoOffsetY = 0;
    } else {
      // Video is taller than container - video width matches container width
      // Height is scaled proportionally and cropped on top/bottom
      const scale = containerWidth / nativeWidth;
      scaleX = scale;
      scaleY = scale;
      videoOffsetX = 0;
      const scaledVideoHeight = nativeHeight * scale;
      videoOffsetY = (containerHeight - scaledVideoHeight) / 2;
    }

    // Set canvas size to match container (full overlay)
    // Account for device pixel ratio for crisp rendering on high-DPI displays
    const devicePixelRatio = window.devicePixelRatio || 1;
    canvas.width = containerWidth * devicePixelRatio;
    canvas.height = containerHeight * devicePixelRatio;
    canvas.style.width = `${containerWidth}px`;
    canvas.style.height = `${containerHeight}px`;
    canvas.style.position = "absolute";
    canvas.style.top = "0";
    canvas.style.left = "0";
    canvas.style.zIndex = "100";
    canvas.style.pointerEvents = "none";
    canvas.style.backgroundColor = "transparent";
    
    // Scale context to account for device pixel ratio
    ctx.scale(devicePixelRatio, devicePixelRatio);

    // Clear canvas using container dimensions (not device pixel ratio scaled)
    ctx.clearRect(0, 0, containerWidth, containerHeight);

    boxes.forEach((box) => {
      if (!box) {
        console.warn("drawBoxes: Invalid box", box);
        return;
      }

      // QuaggaJS box format: array of 4 points, each point is {x, y}
      // Handle both array of objects and array of arrays
      let points = [];
      if (Array.isArray(box) && box.length === 4) {
        points = box.map((point) => {
          if (typeof point === 'object' && point !== null) {
            // Point is an object with x, y properties
            return {
              x: point.x || 0,
              y: point.y || 0,
            };
          } else if (Array.isArray(point) && point.length >= 2) {
            // Point is an array [x, y]
            return {
              x: point[0] || 0,
              y: point[1] || 0,
            };
          }
          return { x: 0, y: 0 };
        });
      } else {
        console.warn("drawBoxes: Box format not recognized", box);
        return;
      }

      ctx.strokeStyle = color;
      ctx.lineWidth = color === "green" ? 4 : 3; // Thicker line for success
      ctx.beginPath();
      
      // Transform coordinates:
      // 1. Scale from native video size to visible video size
      // 2. Offset to account for video positioning (centering due to object-fit: cover)
      // Note: ctx.scale() already handles device pixel ratio, so we use container dimensions directly
      const scaledPoints = points.map((point) => ({
        x: (point.x * scaleX) + videoOffsetX,
        y: (point.y * scaleY) + videoOffsetY,
      }));

      ctx.moveTo(scaledPoints[0].x, scaledPoints[0].y);
      for (let i = 1; i < scaledPoints.length; i++) {
        ctx.lineTo(scaledPoints[i].x, scaledPoints[i].y);
      }
      ctx.closePath();
      ctx.stroke();

      // Add a subtle glow effect for green boxes (success)
      if (color === "green") {
        ctx.shadowColor = "rgba(34, 197, 94, 0.8)";
        ctx.shadowBlur = 10;
        ctx.stroke();
        ctx.shadowBlur = 0; // Reset shadow
      }

      console.log("drawBoxes: Drew box", { 
        color, 
        points, 
        scaledPoints, 
        scaleX, 
        scaleY, 
        videoOffsetX, 
        videoOffsetY,
        nativeWidth,
        nativeHeight,
        containerWidth,
        containerHeight
      });
    });
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
          const video = container.querySelector('video');
          const drawingBuffer = container.querySelector('canvas.drawingBuffer');
          
          if (video) {
            video.style.width = '100%';
            video.style.height = '100%';
            video.style.objectFit = 'cover';
            video.style.position = 'absolute';
            video.style.top = '0';
            video.style.left = '0';
            video.style.zIndex = '1';
          }
          
          if (drawingBuffer) {
            drawingBuffer.style.width = '100%';
            drawingBuffer.style.height = '100%';
            drawingBuffer.style.position = 'absolute';
            drawingBuffer.style.top = '0';
            drawingBuffer.style.left = '0';
            drawingBuffer.style.zIndex = '1';
            drawingBuffer.style.pointerEvents = 'none';
          }

          // If video not ready yet, retry
          if (!video && attempt < 10) {
            setTimeout(() => setupVideoStyles(attempt + 1), 100);
          }
        }
      };

      // Start setup after a short delay
      setTimeout(() => setupVideoStyles(), 100);

      setIsScanning(true);
      Quagga.start();

      // Handle detection
      Quagga.onDetected((result) => {
        const code = result.codeResult.code;
        const box = result.codeResult.box;

        // Avoid processing the same code multiple times
        if (code === lastScannedCodeRef.current || isValidating) {
          return;
        }

        lastScannedCodeRef.current = code;

        // Clear previous validation timeout
        if (validationTimeoutRef.current) {
          clearTimeout(validationTimeoutRef.current);
        }

        // Show red box for detected barcode
        if (box && box.length === 4) {
          console.log("onDetected: Barcode detected", { code, box });
          setDetectedBoxes([box]);
          // Use requestAnimationFrame for smoother rendering
          requestAnimationFrame(() => {
            drawBoxes([box], "red");
          });
        } else {
          console.warn("onDetected: Invalid box format", box);
        }

        // Debounce validation
        validationTimeoutRef.current = setTimeout(async () => {
          setIsValidating(true);
          
          try {
            const searchResult = await searchOrder(code.trim());

            if (searchResult.success && searchResult.data) {
              const { isAlreadyPacked, packingInfo } = searchResult.data;

              // Check if already packed
              if (isAlreadyPacked && packingInfo) {
                setIsValidating(false);
                setDetectedBoxes([]);
                setValidatedBox(null);
                
                await Swal.fire({
                  icon: "warning",
                  title: "Order Already Packed",
                  html: `
                    <div class="text-left">
                      <p class="mb-4 text-gray-700">This order has already been packed.</p>
                      <div class="bg-gray-50 rounded-lg p-4 mb-4">
                        <p class="text-sm"><span class="font-medium">Packing ID:</span> ${packingInfo.packingId || "N/A"}</p>
                        <p class="text-sm"><span class="font-medium">Status:</span> ${packingInfo.status || "N/A"}</p>
                      </div>
                    </div>
                  `,
                  confirmButtonColor: "#2563eb",
                  confirmButtonText: "OK",
                });
                
                // Continue scanning
                lastScannedCodeRef.current = "";
                return;
              }

              // Success - show green box and play sound
              if (box && box.length === 4) {
                setValidatedBox(box);
                // Use requestAnimationFrame for smoother rendering
                requestAnimationFrame(() => {
                  drawBoxes([box], "green");
                });
                playSuccessSound();
              }

              // Call success handler
              if (onScanSuccess) {
                setIsValidating(false);
                // Stop Quagga and release camera before navigating
                try {
                  Quagga.stop();
                  Quagga.offDetected();
                  Quagga.offProcessed();
                } catch (error) {
                  console.error("Error stopping Quagga:", error);
                }
                // Clear canvas
                if (canvasRef.current) {
                  const ctx = canvasRef.current.getContext("2d");
                  ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
                }
                onScanSuccess(code, searchResult.data);
              }
            }
          } catch (error) {
            console.error("Error validating barcode:", error);
            setIsValidating(false);
            setDetectedBoxes([]);
            setValidatedBox(null);
            
            Swal.fire({
              icon: "error",
              title: "Order Not Found",
              text: error.message || "No order found with this barcode.",
              confirmButtonColor: "#2563eb",
              confirmButtonText: "OK",
            });
            
            // Continue scanning
            lastScannedCodeRef.current = "";
          }
        }, 500);
      });

      // Handle process result for drawing boxes (shows red boxes on detected barcodes)
      Quagga.onProcessed((result) => {
        if (!validatedBox && !isValidating) {
          // Use requestAnimationFrame for smoother rendering
          requestAnimationFrame(() => {
            if (result && result.codeResult && result.codeResult.box) {
              const box = result.codeResult.box;
              const code = result.codeResult.code;
              // Only draw if it's a different code or no code was scanned yet
              if (box && box.length === 4 && code !== lastScannedCodeRef.current) {
                console.log("onProcessed: Drawing red box", { code, box });
                setDetectedBoxes([box]);
                drawBoxes([box], "red");
              }
            }
            // Don't clear boxes immediately - let them persist for better UX
            // Only clear if we have a validated box or are validating
          });
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
      // Clear canvas
      if (canvasRef.current) {
        const ctx = canvasRef.current.getContext("2d");
        const containerWidth = scannerRef.current?.clientWidth || 0;
        const containerHeight = scannerRef.current?.clientHeight || 0;
        if (containerWidth > 0 && containerHeight > 0) {
          ctx.clearRect(0, 0, containerWidth, containerHeight);
        }
      }
      if (resizeTimeoutRef.current) {
        clearTimeout(resizeTimeoutRef.current);
      }
    };
  }, [validatedBox, isValidating, onScanSuccess, onClose]);

  // Handle window resize and orientation changes (important for mobile)
  useEffect(() => {
    const handleResize = () => {
      // Debounce resize to avoid excessive redraws
      if (resizeTimeoutRef.current) {
        clearTimeout(resizeTimeoutRef.current);
      }
      
      resizeTimeoutRef.current = setTimeout(() => {
        // Redraw boxes if we have any detected boxes
        if (detectedBoxes.length > 0) {
          requestAnimationFrame(() => {
            drawBoxes(detectedBoxes, "red");
          });
        }
        if (validatedBox) {
          requestAnimationFrame(() => {
            drawBoxes([validatedBox], "green");
          });
        }
      }, 150);
    };

    window.addEventListener("resize", handleResize);
    window.addEventListener("orientationchange", handleResize);
    
    // Some mobile browsers fire resize on orientation change with delay
    const orientationTimeout = setTimeout(handleResize, 500);

    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("orientationchange", handleResize);
      clearTimeout(orientationTimeout);
      if (resizeTimeoutRef.current) {
        clearTimeout(resizeTimeoutRef.current);
      }
    };
  }, [detectedBoxes, validatedBox]);

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
    // Clear canvas
    if (canvasRef.current && scannerRef.current) {
      const ctx = canvasRef.current.getContext("2d");
      const containerWidth = scannerRef.current.clientWidth || 0;
      const containerHeight = scannerRef.current.clientHeight || 0;
      if (containerWidth > 0 && containerHeight > 0) {
        ctx.clearRect(0, 0, containerWidth, containerHeight);
      }
    }
    if (resizeTimeoutRef.current) {
      clearTimeout(resizeTimeoutRef.current);
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
          <span>Manual Search</span>
        </button>
        <button
          onClick={handleClose}
          className="p-2 bg-white/20 hover:bg-white/30 text-white rounded-full transition-colors"
          aria-label="Close scanner"
        >
          <X className="w-6 h-6" />
        </button>
      </div>

      {/* Scanner Container */}
      <div ref={scannerRef} className="quagga-scanner-container flex-1 flex items-center justify-center w-full h-full relative overflow-hidden">
        <canvas
          ref={canvasRef}
          className="absolute inset-0 pointer-events-none"
          style={{ 
            width: "100%", 
            height: "100%",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 100,
            position: "absolute",
            backgroundColor: "transparent",
          }}
        />
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

      {/* Status Bar */}
      <div className="absolute bottom-0 left-0 right-0 z-20 bg-black/70 backdrop-blur-sm p-4">
        <div className="text-center">
          {isValidating ? (
            <div className="flex items-center justify-center gap-2 text-yellow-400">
              <div className="w-4 h-4 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-sm font-medium">Validating barcode...</p>
            </div>
          ) : validatedBox ? (
            <div className="flex items-center justify-center gap-2 text-green-400">
              <div className="w-4 h-4 bg-green-400 rounded-full"></div>
              <p className="text-sm font-medium">Barcode validated! Loading order...</p>
            </div>
          ) : isScanning ? (
            <div className="flex items-center justify-center gap-2 text-blue-400">
              <div className="w-4 h-4 bg-blue-400 rounded-full animate-pulse"></div>
              <p className="text-sm font-medium">Point camera at barcode</p>
            </div>
          ) : (
            <div className="flex items-center justify-center gap-2 text-gray-400">
              <p className="text-sm">Initializing camera...</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
