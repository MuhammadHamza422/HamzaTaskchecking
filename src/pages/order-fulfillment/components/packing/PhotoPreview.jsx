import { X } from "lucide-react";

export default function PhotoPreview({ photo, onRemove, onImageClick }) {
  return (
    <div className="relative group">
      <div
        className="aspect-square rounded-lg border-2 border-gray-200 overflow-hidden bg-gray-100 cursor-pointer hover:border-blue-500 transition-colors"
        onClick={onImageClick}
      >
        <img
          src={photo.preview}
          alt="Packing photo"
          className="w-full h-full"
        />
      </div>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onRemove(photo.id);
        }}
        className="absolute top-1 right-1 p-1.5 bg-red-500 text-white rounded-full opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity shadow-lg z-10"
        aria-label="Remove photo"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

