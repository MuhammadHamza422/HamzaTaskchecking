import { useEffect, useRef, useState, useCallback } from "react";
import Quagga from "quagga";
import Webcam from "react-webcam";
import { X, Search } from "lucide-react";
import { searchOrder } from "../../../../api/fulfillment";
import Swal from "sweetalert2";

const videoConstraints = {
  width: { ideal: 1280 },
  height: { ideal: 720 },
  facingMode: { ideal: "environment" },
};

export default function QuaggaBarcodeScanner({ onScanSuccess, onManualSearch, onClose }) {
  const scannerRef = useRef(null);
  const canvasRef = useRef(null);
  const webcamRef = useRef(null);
  const [isScanning, setIsScanning] = useState(false);
  const [detectedBoxes, setDetectedBoxes] = useState([]);
  const [validatedBox, setValidatedBox] = useState(null);
  const [isValidating, setIsValidating] = useState(false);
  const lastScannedCodeRef = useRef("");
  const validationTimeoutRef = useRef(null);
  const processingIntervalRef = useRef(null);

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

  // Stop webcam stream
  const stopWebcamStream = useCallback(() => {
    if (webcamRef.current?.video?.srcObject) {
      const stream = webcamRef.current.video.srcObject;
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
      webcamRef.current.video.srcObject = null;
    }
  }, []);

  // Draw boxes on canvas overlay
  const drawBoxes = useCallback((boxes, color = "red") => {
    if (!canvasRef.current || !webcamRef.current?.video) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const video = webcamRef.current.video;

    if (!video || video.readyState !== video.HAVE_ENOUGH_DATA) return;

    // Get the displayed video dimensions (what user sees)
    const displayedWidth = video.clientWidth || scannerRef.current?.clientWidth || video.videoWidth;
    const displayedHeight = video.clientHeight || scannerRef.current?.clientHeight || video.videoHeight;

    // Get the native video dimensions (actual video resolution)
    const nativeWidth = video.videoWidth || displayedWidth;
    const nativeHeight = video.videoHeight || displayedHeight;

    // Calculate scale factors
    const scaleX = nativeWidth > 0 ? displayedWidth / nativeWidth : 1;
    const scaleY = nativeHeight > 0 ? displayedHeight / nativeHeight : 1;

    // Set canvas size to match displayed video size
    canvas.width = displayedWidth;
    canvas.height = displayedHeight;
    canvas.style.width = `${displayedWidth}px`;
    canvas.style.height = `${displayedHeight}px`;
    canvas.style.position = "absolute";
    canvas.style.top = "0";
    canvas.style.left = "0";
    canvas.style.zIndex = "100";

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
  }, []);

  // Process video frame with Quagga
  const processFrame = useCallback(() => {
    if (!webcamRef.current?.video || isValidating) return;

    const video = webcamRef.current.video;
    if (video.readyState !== video.HAVE_ENOUGH_DATA) return;

    try {
      Quagga.decodeSingle(
        {
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
          src: video,
        },
        (result) => {
          if (result && result.codeResult && result.codeResult.code) {
            const code = result.codeResult.code;
            const box = result.codeResult.box;

            // Avoid processing the same code multiple times
            if (code === lastScannedCodeRef.current || isValidating) {
              // Still draw red box for visual feedback
              if (box && box.length === 4 && !validatedBox) {
                drawBoxes([box], "red");
              }
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
                    // Stop processing and release camera before navigating
                    if (processingIntervalRef.current) {
                      clearInterval(processingIntervalRef.current);
                      processingIntervalRef.current = null;
                    }
                    stopWebcamStream();
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
          } else {
            // No barcode detected - clear red boxes if not showing validated box
            if (!validatedBox && !isValidating) {
              setDetectedBoxes([]);
              if (canvasRef.current) {
                const ctx = canvasRef.current.getContext("2d");
                ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
              }
            }
          }
        }
      );
    } catch (error) {
      console.error("Error processing frame:", error);
    }
  }, [isValidating, validatedBox, onScanSuccess, stopWebcamStream, drawBoxes, playSuccessSound]);

  // Handle camera ready
  const handleUserMedia = useCallback((stream) => {
    // Camera stream is ready
    if (webcamRef.current?.video) {
      const video = webcamRef.current.video;
      
      // Detect mobile device for performance optimization
      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
      // Mobile: Process less frequently to save battery/CPU, Desktop: More frequent for better UX
      const processingInterval = isMobile ? 200 : 100; // Mobile: 200ms, Desktop: 100ms

      // Wait for video to be ready
      const handleVideoReady = () => {
        setIsScanning(true);
        
        // Start processing frames periodically
        if (processingIntervalRef.current) {
          clearInterval(processingIntervalRef.current);
        }
        processingIntervalRef.current = setInterval(() => {
          processFrame();
        }, processingInterval);
      };

      if (video.readyState >= video.HAVE_METADATA) {
        handleVideoReady();
      } else {
        video.addEventListener("loadedmetadata", handleVideoReady, { once: true });
      }
    }
  }, [processFrame]);

  // Handle camera error
  const handleUserMediaError = useCallback((error) => {
    console.error("Camera error:", error);
    Swal.fire({
      icon: "error",
      title: "Camera Error",
      text: "Failed to access camera. Please check permissions and try again.",
      confirmButtonColor: "#2563eb",
    });
    if (onClose) onClose();
  }, [onClose]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Cleanup
      if (processingIntervalRef.current) {
        clearInterval(processingIntervalRef.current);
        processingIntervalRef.current = null;
      }
      if (validationTimeoutRef.current) {
        clearTimeout(validationTimeoutRef.current);
      }
      stopWebcamStream();
      // Clear canvas
      if (canvasRef.current) {
        const ctx = canvasRef.current.getContext("2d");
        ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      }
    };
  }, [stopWebcamStream]);

  const handleClose = () => {
    // Stop processing
    if (processingIntervalRef.current) {
      clearInterval(processingIntervalRef.current);
      processingIntervalRef.current = null;
    }
    if (validationTimeoutRef.current) {
      clearTimeout(validationTimeoutRef.current);
    }
    // Stop webcam stream
    stopWebcamStream();
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
      <div ref={scannerRef} className="flex-1 flex items-center justify-center w-full h-full relative overflow-hidden">
        {/* Webcam video feed */}
        <Webcam
          audio={false}
          ref={webcamRef}
          videoConstraints={videoConstraints}
          onUserMedia={handleUserMedia}
          onUserMediaError={handleUserMediaError}
          className="absolute inset-0 w-full h-full object-cover"
          playsInline
          mirrored={false}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
            zIndex: 1,
          }}
        />
        {/* Canvas overlay for drawing barcode boxes */}
        <canvas
          ref={canvasRef}
          className="absolute inset-0 pointer-events-none z-10"
          style={{ 
            width: "100%", 
            height: "100%",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 10,
          }}
        />
      </div>

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
