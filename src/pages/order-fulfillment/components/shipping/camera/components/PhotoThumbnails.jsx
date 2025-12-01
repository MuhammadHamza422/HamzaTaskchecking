import { X } from "lucide-react";

export default function PhotoThumbnails({ photos, onRemove }) {
  if (!photos || photos.length === 0) return null;

  return (
    <div className="absolute top-20 left-4 right-4 z-10">
      <div className="bg-black/60 backdrop-blur-sm rounded-lg p-3">
        <p className="text-white text-sm font-medium mb-2">
          {photos.length} photo{photos.length > 1 ? "s" : ""} captured
        </p>
        <div className="flex gap-2 overflow-x-auto">
          {photos.map((photo, index) => (
            <div key={index} className="relative shrink-0">
              <img
                src={photo.preview}
                alt={`Photo ${index + 1}`}
                className="w-16 h-16 object-cover rounded"
              />
              <button
                onClick={() => onRemove(index)}
                className="absolute -top-1 -right-1 p-1 bg-red-500 rounded-full text-white"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

