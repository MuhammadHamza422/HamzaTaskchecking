import { useEffect, useRef, useState, useCallback } from "react";
import { X, Search, Keyboard, Camera, Loader2 } from "lucide-react";
import { scanTracking } from "../../../../api/shipping";
import Swal from "sweetalert2";
import { BrowserMultiFormatReader } from "@zxing/library";

export default function ShippingBarcodeScanner({
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
  const isScannerActiveRef = useRef(true);
  
  const [isValidating, setIsValidating] = useState(false);
  const [scannedCode, setScannedCode] = useState("");
  const [isScanning, setIsScanning] = useState(false);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const [scannerMethod, setScannerMethod] = useState(null);
  
  const lastScannedCodeRef = useRef("");
  const lastScanTimeRef = useRef(0);
  
  const detectionBufferRef = useRef([]);
  const stableCodeRef = useRef(null);
  const stableCodeStartTimeRef = useRef(null);
  const cooldownUntilRef = useRef(0);
  
  const REQUIRED_CONSECUTIVE_DETECTIONS = 2;
  const BUFFER_SIZE = 3;
  const MIN_DETECTION_DURATION_MS = 200;
  const COOLDOWN_AFTER_ERROR_MS = 1000;
  const MIN_CODE_LENGTH = 3;
  const SCAN_INTERVAL_MS = 100;

  const isValidCode = (code) => {
    if (!code || typeof code !== 'string') return false;
    const trimmedCode = code.trim();
    if (trimmedCode.length < MIN_CODE_LENGTH) return false;
    return true;
  };

  const checkStableCode = () => {
    const buffer = detectionBufferRef.current;
    if (buffer.length < REQUIRED_CONSECUTIVE_DETECTIONS) {
      return null;
    }

    const recent = buffer.slice(-REQUIRED_CONSECUTIVE_DETECTIONS);
    const firstCode = recent[0].code;
    const allSame = recent.every(detection => detection.code === firstCode);
    
    if (allSame) {
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

  const releaseCamera = async () => {
    try {
      scanningActiveRef.current = false;
      
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => {
          track.stop();
        });
        streamRef.current = null;
      }
      
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
      
      setIsCameraReady(false);
      setIsScanning(false);
    } catch (error) {
      console.error("Error releasing camera:", error);
    }
  };

  const handleBarcodeDetected = useCallback(async (code) => {
    if (isValidating) return;
    if (code === lastScannedCodeRef.current) return;

    detectionBufferRef.current = [];
    stableCodeRef.current = null;
    stableCodeStartTimeRef.current = null;
    setIsScanning(false);

    setIsValidating(true);
    lastScannedCodeRef.current = code;
    setScannedCode(code);

    await releaseCamera();

    const trackingNumber = String(code).trim();
    try {
      console.log("🔍 Barcode scanner calling scan-tracking API with:", trackingNumber);
      const scanResult = await scanTracking(trackingNumber);
      console.log("✅ Barcode scan result:", scanResult);

      if (scanResult.success && scanResult.data) {
        const scanData = scanResult.data;

        // Check if already processed
        if (scanData.alreadyProcessed) {
          setIsValidating(false);
          lastScannedCodeRef.current = "";

          await Swal.fire({
            icon: "warning",
            title: "Already Processed",
            html: `
              <div class="text-left">
                <p class="mb-4 text-gray-700">This tracking number has already been processed.</p>
                <div class="bg-gray-50 rounded-lg p-4 mb-4">
                  <p class="text-sm"><span class="font-medium">Tracking:</span> ${trackingNumber}</p>
                  <p class="text-sm"><span class="font-medium">Status:</span> ${scanData.status || "Completed"}</p>
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

        setIsValidating(false);
        
        if (onScanSuccess) {
          onScanSuccess(trackingNumber, scanData);
        }
      } else {
        throw new Error("Tracking number not found");
      }
    } catch (error) {
      console.error("Error validating tracking:", error);

      setIsValidating(false);
      lastScannedCodeRef.current = "";
      
      detectionBufferRef.current = [];
      stableCodeRef.current = null;
      stableCodeStartTimeRef.current = null;
      setIsScanning(false);
      setScannedCode("");

      cooldownUntilRef.current = Date.now() + COOLDOWN_AFTER_ERROR_MS;

      await Swal.fire({
        icon: "error",
        title: "Tracking Not Found",
        text: error.message || "No fulfillment found with this tracking number. Please try again.",
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

  const processBarcodeDetection = useCallback(
    (code) => {
      if (Date.now() < cooldownUntilRef.current) {
        return;
      }

      if (isValidating) return;
      if (!code) {
        setIsScanning(false);
        return;
      }

      if (code === lastScannedCodeRef.current) {
        return;
      }

      if (!isValidCode(code)) {
        setIsScanning(false);
        return;
      }

      const now = Date.now();
      detectionBufferRef.current.push({
        code: code.trim(),
        timestamp: now
      });

      if (detectionBufferRef.current.length > BUFFER_SIZE) {
        detectionBufferRef.current.shift();
      }

      setIsScanning(true);
      setScannedCode(code);

      const stable = checkStableCode();
      
      if (stable) {
        if (stableCodeRef.current?.code === stable.code) {
          const stableDuration = now - stableCodeStartTimeRef.current;
          if (stableDuration >= MIN_DETECTION_DURATION_MS) {
            stableCodeRef.current = null;
            stableCodeStartTimeRef.current = null;
            detectionBufferRef.current = [];
            setIsScanning(false);
            handleBarcodeDetected(stable.code);
          }
        } else {
          stableCodeRef.current = stable;
          stableCodeStartTimeRef.current = now;
        }
      } else {
        stableCodeRef.current = null;
        stableCodeStartTimeRef.current = null;
      }
    },
    [isValidating, handleBarcodeDetected]
  );

  const startCamera = async () => {
    try {
      setCameraError("");
      setIsCameraReady(false);

      if (!videoRef.current) return;

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 1920, min: 1280 },
          height: { ideal: 1080, min: 720 },
        },
      });

      if (!isScannerActiveRef.current) {
        stream.getTracks().forEach(track => track.stop());
        return;
      }

      streamRef.current = stream;
      videoRef.current.srcObject = stream;

      videoRef.current.onloadedmetadata = () => {
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

      if (isScannerActiveRef.current && onClose) {
        onClose();
      }
    }
  };

  const startBarcodeScanning = async () => {
    try {
      if ('BarcodeDetector' in window) {
        setScannerMethod('native');
        
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

            const barcodes = await barcodeDetectorRef.current.detect(canvas);

            if (barcodes && barcodes.length > 0 && scanningActiveRef.current) {
              const barcode = barcodes[0];
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
        setScannerMethod('zxing');
        
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

            try {
              const result = await zxingReaderRef.current.decodeFromCanvas(canvas);
              
              if (result && result.getText() && scanningActiveRef.current) {
                processBarcodeDetection(result.getText());
              }
            } catch (decodeError) {
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

  useEffect(() => {
    isScannerActiveRef.current = true;
    startCamera();

    return () => {
      isScannerActiveRef.current = false;
      scanningActiveRef.current = false;
      
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

      ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
      ctx.fillRect(0, 0, containerWidth, containerHeight);

      ctx.globalCompositeOperation = "destination-out";
      ctx.fillStyle = "rgba(0, 0, 0, 1)";
      ctx.fillRect(frameX, frameY, frameWidth, frameHeight);
      ctx.globalCompositeOperation = "source-over";

      blinkPhase += 0.05;
      if (blinkPhase > Math.PI * 2) blinkPhase = 0;
      const opacity = 0.5 + (Math.sin(blinkPhase) + 1) * 0.25;

      ctx.strokeStyle = `rgba(59, 130, 246, ${opacity})`;
      ctx.lineWidth = lineWidth;
      ctx.lineCap = "round";
      ctx.shadowColor = `rgba(59, 130, 246, ${opacity * 0.5})`;
      ctx.shadowBlur = 8;

      ctx.beginPath();
      ctx.moveTo(frameX, frameY + cornerLength);
      ctx.lineTo(frameX, frameY);
      ctx.lineTo(frameX + cornerLength, frameY);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(frameX + frameWidth - cornerLength, frameY);
      ctx.lineTo(frameX + frameWidth, frameY);
      ctx.lineTo(frameX + frameWidth, frameY + cornerLength);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(frameX, frameY + frameHeight - cornerLength);
      ctx.lineTo(frameX, frameY + frameHeight);
      ctx.lineTo(frameX + cornerLength, frameY + frameHeight);
      ctx.stroke();

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
    isScannerActiveRef.current = false;
    
    detectionBufferRef.current = [];
    stableCodeRef.current = null;
    stableCodeStartTimeRef.current = null;
    setIsScanning(false);
    setScannedCode("");
    
    await releaseCamera();
    if (onClose) {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      <div className="absolute top-0 left-0 right-0 z-[9999] bg-black/70 backdrop-blur-sm p-4 flex items-center justify-between">
        <button
          onClick={onManualSearch}
          className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-lg font-medium transition-colors"
        >
          <Search className="w-4 h-4" />
          <span className="hidden sm:inline">Manual Search</span>
        </button>
        <h2 className="text-white text-lg font-semibold">Scan Tracking Number</h2>
        <button
          onClick={handleClose}
          className="p-2 bg-white/20 hover:bg-white/30 text-white rounded-full transition-colors"
          aria-label="Close scanner"
        >
          <X className="w-6 h-6" />
        </button>
      </div>

      <div
        ref={scannerRef}
        className="flex-1 flex items-center justify-center w-full h-full relative overflow-hidden bg-black"
      >
        <video
          ref={videoRef}
          className="absolute inset-0 w-full h-full object-cover"
          playsInline
          muted
          style={{ zIndex: 1 }}
        />

        <canvas ref={canvasRef} className="hidden" />

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

      {isValidating && (
        <div className="absolute inset-0 z-[10000] bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center">
          <div className="bg-white/10 p-4 rounded-full mb-4">
            <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
          <h3 className="text-white text-xl font-semibold mb-2">Validating...</h3>
          <p className="text-gray-300 text-center max-w-xs">
            Checking tracking: <span className="font-mono text-white">{lastScannedCodeRef.current}</span>
          </p>
        </div>
      )}

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

