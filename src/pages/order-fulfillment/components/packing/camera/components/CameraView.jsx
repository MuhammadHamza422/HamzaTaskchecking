import { useRef } from "react";
import Webcam from "react-webcam";
import { Check } from "lucide-react";
import { getVideoConstraints, stopWebcamStream, getCameraErrorMessage } from "../utils/cameraUtils";
import PhotoThumbnails from "./PhotoThumbnails";
import CameraControls from "./CameraControls";

export default function CameraView({
  webcamRef,
  webcamKey,
  facingMode,
  isCameraReady,
  cameraError,
  capturedPhotos,
  canCaptureMore,
  totalPhotosToSave,
  maxPhotos,
  onCapture,
  onClose,
  onSwitchCamera,
  onRemovePhoto,
  onSaveAll,
  setIsCameraReady,
  setCameraError,
  stopWebcamStream: stopStream,
  onRetry,
}) {
  const handleUserMedia = (stream) => {
    console.log("Camera stream received");
    
    // Verify stream has active video tracks
    const videoTracks = stream.getVideoTracks();
    if (videoTracks.length === 0) {
      console.error("Camera stream has no video tracks");
      setCameraError("Camera stream has no video tracks. The camera may still be in use. Please wait a moment and try again.");
      setIsCameraReady(false);
      return;
    }
    
    console.log(`Got ${videoTracks.length} video track(s):`, videoTracks.map(t => ({
      label: t.label,
      readyState: t.readyState,
      enabled: t.enabled
    })));
    
    // Check if tracks are actually active
    const activeTracks = videoTracks.filter(track => track.readyState === 'live');
    if (activeTracks.length === 0) {
      console.error("No active camera tracks found");
      setCameraError("Camera tracks are not active. The camera may still be in use. Please wait a moment and try again.");
      setIsCameraReady(false);
      return;
    }
    
    // Small delay for video element to initialize
    setTimeout(() => {
      if (webcamRef.current?.video) {
        const video = webcamRef.current.video;
        console.log("Video element check:", {
          videoWidth: video.videoWidth,
          videoHeight: video.videoHeight,
          readyState: video.readyState
        });
        
        if (video.videoWidth > 0 && video.videoHeight > 0) {
          console.log("Camera ready with dimensions:", video.videoWidth, "x", video.videoHeight);
          setIsCameraReady(true);
          setCameraError(null);
        } else {
          console.warn("Video element has no dimensions yet after initial stream assignment, waiting...");
        }
      }
    }, 200);
  };

  const handleUserMediaError = (error) => {
    console.error("Webcam error:", error, {
      name: error.name,
      message: error.message,
      constraint: error.constraint
    });
    setIsCameraReady(false);
    setCameraError(getCameraErrorMessage(error));
  };

  const handleRetry = async () => {
    setCameraError(null);
    setIsCameraReady(false);
    
    console.log("Retrying camera initialization...");
    
    // Stop any existing stream thoroughly
    stopStream();
    
    console.log("Forcing webcam component remount");
    
    // Trigger remount via parent handler
    if (onRetry) {
      onRetry();
    }
  };

  return (
    <div 
      className="relative flex items-center justify-center overflow-hidden"
      style={{
        width: '100%',
        height: '100%',
        margin: 0,
        padding: 0,
      }}
    >
      {/* Webcam for photo capture */}
      <Webcam
        key={`webcam-${webcamKey}-${facingMode}`}
        audio={false}
        ref={webcamRef}
        screenshotFormat="image/jpeg"
        videoConstraints={getVideoConstraints(facingMode)}
        onUserMedia={handleUserMedia}
        onUserMediaError={handleUserMediaError}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          zIndex: 1,
        }}
      />
      
      {/* Camera Error Display */}
      {cameraError && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-30">
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6 max-w-sm mx-4 text-center">
            <p className="text-white text-lg font-semibold mb-2">Camera Error</p>
            <p className="text-gray-300 text-sm mb-4">{cameraError}</p>
            <div className="flex gap-2 justify-center">
              <button
                onClick={handleRetry}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Retry
              </button>
              <button
                onClick={() => {
                  stopStream();
                  onClose();
                }}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Camera Loading Indicator */}
      {!isCameraReady && !cameraError && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/60 z-20">
          <div className="text-center max-w-md mx-4">
            <div className="w-12 h-12 border-4 border-white border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-white text-base font-medium mb-2">Initializing camera...</p>
            <p className="text-gray-300 text-sm mb-2">
              Please wait while we prepare the camera.
            </p>
            <p className="text-gray-400 text-xs mb-4">
              After barcode scanning, the camera needs a moment to become available again. This is normal on mobile devices.
            </p>
            <button
              onClick={() => {
                console.log("User requested manual close");
                stopStream();
                onClose();
              }}
              className="px-4 py-2 bg-gray-600/80 text-white text-sm rounded-lg hover:bg-gray-700 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
      
      <CameraControls onClose={onClose} onSwitchCamera={onSwitchCamera} />

      <PhotoThumbnails photos={capturedPhotos} onRemove={onRemovePhoto} />

      <div className="absolute bottom-0 left-0 right-0 pb-8 flex flex-col items-center gap-4 z-10">
        {!canCaptureMore && (
          <div className="mb-2">
            <p className="text-white bg-red-500/90 px-4 py-2 rounded-lg text-sm font-medium shadow-lg">
              Maximum {maxPhotos} photos reached
            </p>
          </div>
        )}
        <button
          onClick={onCapture}
          disabled={!canCaptureMore}
          className={`relative w-20 h-20 rounded-full border-4 shadow-2xl transition-all ${
            canCaptureMore
              ? "border-white bg-white/30 hover:bg-white/40 active:scale-95"
              : "border-gray-500 bg-gray-500/30 cursor-not-allowed"
          } flex items-center justify-center`}
          aria-label="Capture photo"
        >
          <div
            className={`w-16 h-16 rounded-full ${
              canCaptureMore ? "bg-white" : "bg-gray-400"
            } shadow-inner`}
          ></div>
          {canCaptureMore && (
            <div className="absolute inset-0 rounded-full border-2 border-white/50 animate-pulse"></div>
          )}
        </button>
        <div className="flex gap-2 items-center">
          <p className="text-white text-sm font-medium bg-black/50 px-4 py-1 rounded-full backdrop-blur-sm">
            Tap to capture
          </p>
          {totalPhotosToSave > 0 && (
            <button
              onClick={onSaveAll}
              className="px-4 py-2 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-colors flex items-center gap-2 shadow-lg"
            >
              <Check className="w-4 h-4" />
              <span>Save All ({totalPhotosToSave})</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

