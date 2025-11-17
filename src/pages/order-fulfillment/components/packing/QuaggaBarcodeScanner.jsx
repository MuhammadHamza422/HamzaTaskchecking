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

  // Play success sound
  const playSuccessSound = () => {
    try {
      // Try to play audio file first, fallback to Web Audio API
      const audio = new Audio("/sounds/success-beep.mp3");
      audio.volume = 0.5;
      audio.play().catch((err) => {
        console.log("Audio file not found, using Web Audio API:", err);
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

  // Draw boxes on canvas overlay
  const drawBoxes = (boxes, color = "red") => {
    if (!canvasRef.current || !scannerRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const video = scannerRef.current?.querySelector("video");
    const drawingCanvas = scannerRef.current?.querySelector("canvas.drawingBuffer");

    if (!video && !drawingCanvas) return;

    // Get the displayed video dimensions (what user sees)
    const displayedWidth = video.clientWidth || scannerRef.current.clientWidth;
    const displayedHeight = video.clientHeight || scannerRef.current.clientHeight;

    // Get the native video dimensions (actual video resolution)
    const nativeWidth = video.videoWidth || drawingCanvas?.width || displayedWidth;
    const nativeHeight = video.videoHeight || drawingCanvas?.height || displayedHeight;

    // Calculate scale factors
    const scaleX = displayedWidth / nativeWidth;
    const scaleY = displayedHeight / nativeHeight;

    // Set canvas size to match displayed video size
    canvas.width = displayedWidth;
    canvas.height = displayedHeight;
    canvas.style.width = `${displayedWidth}px`;
    canvas.style.height = `${displayedHeight}px`;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    boxes.forEach((box) => {
      if (!box || box.length !== 4) return;

      ctx.strokeStyle = color;
      ctx.lineWidth = color === "green" ? 4 : 3; // Thicker line for success
      ctx.beginPath();
      
      // Scale coordinates from native video size to displayed size
      const scaledBox = box.map((point) => ({
        x: point.x * scaleX,
        y: point.y * scaleY,
      }));

      ctx.moveTo(scaledBox[0].x, scaledBox[0].y);
      for (let i = 1; i < scaledBox.length; i++) {
        ctx.lineTo(scaledBox[i].x, scaledBox[i].y);
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
      setTimeout(() => {
        const container = scannerRef.current;
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
          }
          if (drawingBuffer) {
            drawingBuffer.style.width = '100%';
            drawingBuffer.style.height = '100%';
            drawingBuffer.style.position = 'absolute';
            drawingBuffer.style.top = '0';
            drawingBuffer.style.left = '0';
          }
        }
      }, 100);

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
          setDetectedBoxes([box]);
          drawBoxes([box], "red");
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
                drawBoxes([box], "green");
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

      // Handle process result for drawing boxes
      Quagga.onProcessed((result) => {
        if (!validatedBox && !isValidating) {
          // Use requestAnimationFrame for smoother rendering
          requestAnimationFrame(() => {
            if (result && result.codeResult && result.codeResult.box) {
              const box = result.codeResult.box;
              if (box && box.length === 4) {
                setDetectedBoxes([box]);
                drawBoxes([box], "red");
              }
            } else {
              // Clear boxes if no detection (but only if we're not showing a validated box)
              if (!validatedBox) {
                setDetectedBoxes([]);
                if (canvasRef.current) {
                  const ctx = canvasRef.current.getContext("2d");
                  ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
                }
              }
            }
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
        ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      }
    };
  }, [validatedBox, isValidating]);

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
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext("2d");
      ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    }
    if (onClose) {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      {/* Top Bar */}
      <div className="absolute top-0 left-0 right-0 z-20 bg-black/70 backdrop-blur-sm p-4 flex items-center justify-between">
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
          className="absolute inset-0 pointer-events-none z-10"
          style={{ 
            width: "100%", 
            height: "100%",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0
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
        }
        .quagga-scanner-container > div {
          width: 100% !important;
          height: 100% !important;
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

