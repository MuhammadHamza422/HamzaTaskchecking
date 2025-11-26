import { RotateCcw, Plus, Check } from "lucide-react";

export default function EditControls({
  canAddPhoto,
  canSaveAll,
  totalPhotosToSave,
  onRetake,
  onAddPhoto,
  onSaveAll,
}) {
  return (
    <div
      className="camera-edit-bottom-bar fixed bottom-0 left-0 right-0 bg-black/95 backdrop-blur-md border-t border-white/10 p-3"
      style={{
        zIndex: 9999,
        pointerEvents: "auto",
        touchAction: "manipulation",
        WebkitTouchCallout: "none",
        WebkitUserSelect: "none",
        userSelect: "none",
      }}
    >
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-center gap-4">
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onRetake();
            }}
            onTouchStart={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            onTouchEnd={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onRetake();
            }}
            className="flex flex-col items-center justify-center gap-1 p-3 bg-gray-700/90 active:bg-gray-600 rounded-full text-white transition-all duration-200 shadow-lg active:scale-95 min-w-[70px] touch-manipulation"
            style={{
              pointerEvents: "auto",
              touchAction: "manipulation",
              WebkitTapHighlightColor: "transparent",
              cursor: "pointer",
            }}
            title="Retake"
          >
            <RotateCcw className="w-6 h-6" />
            <span className="text-xs font-medium">Retake</span>
          </button>
          {canAddPhoto && (
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onAddPhoto();
              }}
              onTouchStart={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
              onTouchEnd={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onAddPhoto();
              }}
              className="flex flex-col items-center justify-center gap-1 p-3 bg-blue-600/90 active:bg-blue-700 rounded-full text-white transition-all duration-200 shadow-lg active:scale-95 min-w-[70px] touch-manipulation"
              style={{
                pointerEvents: "auto",
                touchAction: "manipulation",
                WebkitTapHighlightColor: "transparent",
                cursor: "pointer",
              }}
              title="Add Photo"
            >
              <Plus className="w-6 h-6" />
              <span className="text-xs font-medium">Add</span>
            </button>
          )}
          {canSaveAll && (
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onSaveAll();
              }}
              onTouchStart={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
              onTouchEnd={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onSaveAll();
              }}
              className="flex flex-col items-center justify-center gap-1 p-3 bg-green-600/90 active:bg-green-700 rounded-full text-white transition-all duration-200 shadow-lg active:scale-95 min-w-[70px] touch-manipulation"
              style={{
                pointerEvents: "auto",
                touchAction: "manipulation",
                WebkitTapHighlightColor: "transparent",
                cursor: "pointer",
              }}
              title={`Save All (${totalPhotosToSave})`}
            >
              <Check className="w-6 h-6" />
              <span className="text-xs font-medium">Save ({totalPhotosToSave})</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

