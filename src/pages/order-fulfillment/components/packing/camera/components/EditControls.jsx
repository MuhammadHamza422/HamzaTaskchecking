import { RotateCcw, Plus, Check } from "lucide-react";

export default function EditControls({
  currentImage,
  totalPhotosToSave,
  onRetake,
  onAddPhoto,
  onSaveAll,
}) {
  const handleButtonClick = (e, handler) => {
    e.preventDefault();
    e.stopPropagation();
    e.nativeEvent.stopImmediatePropagation();
    handler();
  };

  const handleTouchStart = (e) => {
    e.preventDefault();
    e.stopPropagation();
    e.nativeEvent.stopImmediatePropagation();
  };

  const handleTouchEnd = (e, handler) => {
    e.preventDefault();
    e.stopPropagation();
    e.nativeEvent.stopImmediatePropagation();
    handler();
  };

  return (
    <div
      className="camera-edit-bottom-bar fixed bottom-0 left-0 right-0 bg-black/95 backdrop-blur-md border-t border-white/10 p-3"
      style={{
        zIndex: 100000,
        pointerEvents: "auto",
        touchAction: "manipulation",
        WebkitTouchCallout: "none",
        WebkitUserSelect: "none",
        userSelect: "none",
        isolation: "isolate",
      }}
      onTouchStart={(e) => {
        e.stopPropagation();
      }}
      onTouchEnd={(e) => {
        e.stopPropagation();
      }}
      onClick={(e) => {
        e.stopPropagation();
      }}
    >
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-center gap-4">
          <button
            onClick={(e) => handleButtonClick(e, onRetake)}
            onTouchStart={handleTouchStart}
            onTouchEnd={(e) => handleTouchEnd(e, onRetake)}
            onMouseDown={(e) => {
              e.stopPropagation();
            }}
            className="flex flex-col items-center justify-center gap-1 p-3 bg-gray-700/90 active:bg-gray-600 rounded-full text-white transition-all duration-200 shadow-lg active:scale-95 min-w-[70px] touch-manipulation"
            style={{
              pointerEvents: "auto",
              touchAction: "manipulation",
              WebkitTapHighlightColor: "transparent",
              cursor: "pointer",
              position: "relative",
              zIndex: 100001,
            }}
            title="Retake"
          >
            <RotateCcw className="w-6 h-6" />
            <span className="text-xs font-medium">Retake</span>
          </button>
          {currentImage && (
            <button
              onClick={(e) => handleButtonClick(e, onAddPhoto)}
              onTouchStart={handleTouchStart}
              onTouchEnd={(e) => handleTouchEnd(e, onAddPhoto)}
              onMouseDown={(e) => {
                e.stopPropagation();
              }}
              className="flex flex-col items-center justify-center gap-1 p-3 bg-blue-600/90 active:bg-blue-700 rounded-full text-white transition-all duration-200 shadow-lg active:scale-95 min-w-[70px] touch-manipulation"
              style={{
                pointerEvents: "auto",
                touchAction: "manipulation",
                WebkitTapHighlightColor: "transparent",
                cursor: "pointer",
                position: "relative",
                zIndex: 100001,
              }}
              title="Add Photo"
            >
              <Plus className="w-6 h-6" />
              <span className="text-xs font-medium">Add</span>
            </button>
          )}
          <button
            onClick={(e) => handleButtonClick(e, onSaveAll)}
            onTouchStart={handleTouchStart}
            onTouchEnd={(e) => handleTouchEnd(e, onSaveAll)}
            onMouseDown={(e) => {
              e.stopPropagation();
            }}
            className="flex flex-col items-center justify-center gap-1 p-3 bg-green-600/90 active:bg-green-700 rounded-full text-white transition-all duration-200 shadow-lg active:scale-95 min-w-[70px] touch-manipulation"
            style={{
              pointerEvents: "auto",
              touchAction: "manipulation",
              WebkitTapHighlightColor: "transparent",
              cursor: "pointer",
              position: "relative",
              zIndex: 100001,
            }}
            title={`Save All (${totalPhotosToSave})`}
          >
            <Check className="w-6 h-6" />
            <span className="text-xs font-medium">Save ({totalPhotosToSave})</span>
          </button>
        </div>
      </div>
    </div>
  );
}

