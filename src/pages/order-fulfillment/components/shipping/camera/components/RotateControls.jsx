import { RotateCw, RotateCcw } from "lucide-react";

export default function RotateControls({ onRotateLeft, onRotateRight }) {
  return (
    <div className="sticky top-0 z-40 bg-black/95 backdrop-blur-md border-b border-white/10 p-3">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-white">
            <RotateCw className="w-5 h-5" />
            <span className="text-sm font-medium">Rotate</span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={onRotateLeft}
              className="p-3 bg-white/20 hover:bg-white/30 rounded-lg text-white transition-colors active:scale-95 shadow-lg"
              aria-label="Rotate left"
            >
              <RotateCcw className="w-6 h-6" />
            </button>
            <button
              onClick={onRotateRight}
              className="p-3 bg-white/20 hover:bg-white/30 rounded-lg text-white transition-colors active:scale-95 shadow-lg"
              aria-label="Rotate right"
            >
              <RotateCw className="w-6 h-6" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

