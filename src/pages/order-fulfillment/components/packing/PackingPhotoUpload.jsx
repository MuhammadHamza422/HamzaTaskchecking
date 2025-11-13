import { useState } from "react";
import { Upload, X, Image as ImageIcon } from "lucide-react";
import { Upload as AntUpload } from "antd";

export default function PackingPhotoUpload({ maxPhotos = 5, onPhotosChange }) {
  const [photos, setPhotos] = useState([]);

  const handleFileChange = (file) => {
    if (photos.length >= maxPhotos) {
      return false;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const newPhoto = {
        id: Date.now(),
        file: file,
        preview: e.target.result,
      };
      const updatedPhotos = [...photos, newPhoto];
      setPhotos(updatedPhotos);
      if (onPhotosChange) {
        onPhotosChange(updatedPhotos);
      }
    };
    reader.readAsDataURL(file);
    return false;
  };

  const handleRemovePhoto = (photoId) => {
    const updatedPhotos = photos.filter((p) => p.id !== photoId);
    setPhotos(updatedPhotos);
    if (onPhotosChange) {
      onPhotosChange(updatedPhotos);
    }
  };

  const uploadProps = {
    beforeUpload: handleFileChange,
    showUploadList: false,
    accept: "image/*",
    multiple: false,
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Packing Photos</h3>
        <p className="text-sm text-gray-600">
          Upload up to {maxPhotos} photos. At least 1 photo is required.
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-4">
        {photos.map((photo) => (
          <div key={photo.id} className="relative group">
            <div className="aspect-square rounded-lg border-2 border-gray-200 overflow-hidden bg-gray-100">
              <img
                src={photo.preview}
                alt="Packing photo"
                className="w-full h-full object-cover"
              />
            </div>
            <button
              onClick={() => handleRemovePhoto(photo.id)}
              className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}

        {photos.length < maxPhotos && (
          <AntUpload {...uploadProps}>
            <div className="aspect-square rounded-lg border-2 border-dashed border-gray-300 flex flex-col items-center justify-center cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition-colors">
              <Upload className="w-8 h-8 text-gray-400 mb-2" />
              <span className="text-xs text-gray-600 text-center px-2">Add Photo</span>
            </div>
          </AntUpload>
        )}
      </div>

      {photos.length === 0 && (
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
          <ImageIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 mb-2">No photos uploaded yet</p>
          <p className="text-sm text-gray-500">Upload at least 1 photo to continue</p>
        </div>
      )}

      {photos.length > 0 && (
        <div className="flex items-center gap-2 text-sm">
          <span className={`font-medium ${photos.length >= 1 ? "text-green-600" : "text-amber-600"}`}>
            {photos.length} of {maxPhotos} photos uploaded
          </span>
          {photos.length < 1 && (
            <span className="text-amber-600">(At least 1 required)</span>
          )}
        </div>
      )}
    </div>
  );
}

