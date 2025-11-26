import { X, RotateCcw } from "lucide-react";

export default function CameraControls({ onClose, onSwitchCamera }) {
  return (
    <div className="absolute top-4 left-4 right-4 flex justify-between items-center z-20">
      <button
        onClick={onClose}
        className="p-3 bg-black/60 backdrop-blur-sm rounded-full text-white hover:bg-black/80 transition-colors shadow-lg"
        aria-label="Close camera"
      >
        <X className="w-6 h-6" />
      </button>
      <button
        onClick={onSwitchCamera}
        className="p-3 bg-black/60 backdrop-blur-sm rounded-full text-white hover:bg-black/80 transition-colors shadow-lg"
        aria-label="Switch camera"
      >
        <RotateCcw className="w-6 h-6" />
      </button>
    </div>
  );
}

