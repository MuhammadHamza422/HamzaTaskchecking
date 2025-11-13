import { useEffect, useRef, useState } from "react";
import { BrowserMultiFormatReader } from "@zxing/library";
import { X, Camera, AlertCircle } from "lucide-react";

export default function CameraBarcodeScanner({ onScan, onClose }) {
  const videoRef = useRef(null);
  const codeReaderRef = useRef(null);
  const [error, setError] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const lastScannedCodeRef = useRef("");
  const scanningTimeoutRef = useRef(null);

  useEffect(() => {
    if (!videoRef.current) return;

    const startScanning = async () => {
      try {
        setError(null);
        setIsScanning(true);

        codeReaderRef.current = new BrowserMultiFormatReader();

        const videoInputDevices = await codeReaderRef.current.listVideoInputDevices();

        let selectedDeviceId = null;
        if (videoInputDevices.length > 0) {
          const backCamera = videoInputDevices.find(
            (device) =>
              device.label.toLowerCase().includes("back") ||
              device.label.toLowerCase().includes("rear") ||
              device.label.toLowerCase().includes("environment")
          );
          selectedDeviceId = backCamera?.deviceId || videoInputDevices[0].deviceId;
        }

        await codeReaderRef.current.decodeFromVideoDevice(
          selectedDeviceId,
          videoRef.current,
          (result, err) => {
            if (result) {
              const scannedText = result.getText();

              if (scannedText && scannedText !== lastScannedCodeRef.current) {
                lastScannedCodeRef.current = scannedText;

                clearTimeout(scanningTimeoutRef.current);
                scanningTimeoutRef.current = setTimeout(() => {
                  if (onScan) {
                    onScan(scannedText);
                    stopScanning();
                  }
                }, 500);
              }
            }

            if (err && !(err.name === "NotFoundException")) {
              console.error("Scan error:", err);
            }
          }
        );
      } catch (err) {
        console.error("Error starting camera:", err);
        setError(
          err.message || "Failed to access camera. Please check permissions and try again."
        );
        setIsScanning(false);
      }
    };

    startScanning();

    return () => {
      stopScanning();
    };
  }, []);

  const stopScanning = () => {
    if (codeReaderRef.current) {
      try {
        codeReaderRef.current.reset();
      } catch (err) {
        console.error("Error stopping scanner:", err);
      }
      codeReaderRef.current = null;
    }
    setIsScanning(false);
    clearTimeout(scanningTimeoutRef.current);
  };

  const handleClose = () => {
    stopScanning();
    if (onClose) {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-90 flex items-center justify-center p-4">
      <div className="relative w-full max-w-2xl">
        <button
          onClick={handleClose}
          className="absolute -top-12 right-0 z-10 p-2 bg-white rounded-full shadow-lg hover:bg-gray-100 transition-colors"
          aria-label="Close scanner"
        >
          <X className="w-6 h-6 text-gray-700" />
        </button>

        <div className="relative bg-black rounded-lg overflow-hidden">
          <video
            ref={videoRef}
            className="w-full h-auto max-h-[70vh] object-cover"
            playsInline
            muted
          />

          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute inset-0 border-4 border-blue-500 rounded-lg" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 border-2 border-blue-400 rounded-lg" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64">
              <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-blue-400" />
              <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-blue-400" />
              <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-blue-400" />
              <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-blue-400" />
            </div>
          </div>

          {error && (
            <div className="absolute bottom-4 left-4 right-4 bg-red-500 text-white p-4 rounded-lg flex items-center gap-2">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <p className="text-sm">{error}</p>
            </div>
          )}

          {!error && isScanning && (
            <div className="absolute bottom-4 left-4 right-4 bg-blue-600 text-white p-4 rounded-lg text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Camera className="w-5 h-5 animate-pulse" />
                <p className="text-sm font-medium">Point camera at barcode</p>
              </div>
              <p className="text-xs opacity-90">Position barcode within the frame</p>
            </div>
          )}
        </div>

        <div className="mt-4 text-center">
          <button
            onClick={handleClose}
            className="px-6 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

