// Image utility functions for cropping, rotation, and conversion

const createImage = (url) =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener("load", () => resolve(image));
    image.addEventListener("error", (error) => reject(error));
    image.src = url;
  });

export const getCroppedImg = async (imageSrc, crop, rotation = 0, displayedWidth = 0, displayedHeight = 0) => {
  const image = await createImage(imageSrc);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  if (!crop || !image) {
    return imageSrc;
  }

  // Use provided displayed dimensions, or fall back to natural dimensions
  const displayWidth = displayedWidth > 0 ? displayedWidth : image.width;
  const displayHeight = displayedHeight > 0 ? displayedHeight : image.height;

  // Calculate scale factors between displayed size and natural size
  const scaleX = image.naturalWidth / displayWidth;
  const scaleY = image.naturalHeight / displayHeight;

  // Convert crop coordinates from percentage/pixels to natural image pixels
  let cropX, cropY, cropWidth, cropHeight;

  if (crop.unit === "%") {
    // Crop is in percentage - convert to pixels based on displayed size, then scale to natural
    cropX = (crop.x / 100) * displayWidth * scaleX;
    cropY = (crop.y / 100) * displayHeight * scaleY;
    cropWidth = (crop.width / 100) * displayWidth * scaleX;
    cropHeight = (crop.height / 100) * displayHeight * scaleY;
  } else {
    // Crop is in pixels - scale directly to natural size
    cropX = crop.x * scaleX;
    cropY = crop.y * scaleY;
    cropWidth = crop.width * scaleX;
    cropHeight = crop.height * scaleY;
  }

  // Ensure crop coordinates are within image bounds
  cropX = Math.max(0, Math.min(cropX, image.naturalWidth));
  cropY = Math.max(0, Math.min(cropY, image.naturalHeight));
  cropWidth = Math.min(cropWidth, image.naturalWidth - cropX);
  cropHeight = Math.min(cropHeight, image.naturalHeight - cropY);

  // Set canvas size to the cropped dimensions
  canvas.width = cropWidth;
  canvas.height = cropHeight;

  ctx.imageSmoothingQuality = "high";

  // Draw only the cropped portion of the image
  ctx.drawImage(
    image,
    cropX,
    cropY,
    cropWidth,
    cropHeight,
    0,
    0,
    cropWidth,
    cropHeight
  );

  // Handle rotation AFTER cropping (rotate the cropped result)
  if (rotation !== 0) {
    const rotateRads = (rotation * Math.PI) / 180;
    
    // Calculate the bounding box needed for rotation
    const rotatedWidth = Math.abs(cropWidth * Math.cos(rotateRads)) + Math.abs(cropHeight * Math.sin(rotateRads));
    const rotatedHeight = Math.abs(cropWidth * Math.sin(rotateRads)) + Math.abs(cropHeight * Math.cos(rotateRads));

    // Create a new canvas for the rotated result
    const rotatedCanvas = document.createElement("canvas");
    rotatedCanvas.width = rotatedWidth;
    rotatedCanvas.height = rotatedHeight;
    const rotatedCtx = rotatedCanvas.getContext("2d");
    rotatedCtx.imageSmoothingQuality = "high";

    // Draw the cropped image onto the rotated canvas with rotation
    rotatedCtx.save();
    rotatedCtx.translate(rotatedWidth / 2, rotatedHeight / 2);
    rotatedCtx.rotate(rotateRads);
    rotatedCtx.drawImage(canvas, -cropWidth / 2, -cropHeight / 2);
    rotatedCtx.restore();

    // Return the rotated canvas blob
    return new Promise((resolve) => {
      rotatedCanvas.toBlob((blob) => {
        if (!blob) {
          resolve(imageSrc);
          return;
        }
        const fileUrl = URL.createObjectURL(blob);
        resolve(fileUrl);
      }, "image/jpeg", 0.9);
    });
  }

  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        resolve(imageSrc);
        return;
      }
      const fileUrl = URL.createObjectURL(blob);
      resolve(fileUrl);
    }, "image/jpeg", 0.9);
  });
};

export const convertToFile = async (imageUrl) => {
  try {
    const response = await fetch(imageUrl);
    const blob = await response.blob();
    // Use a unique timestamp to ensure each file is different
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 9);
    return new File([blob], `camera-${timestamp}-${random}.jpg`, {
      type: "image/jpeg",
    });
  } catch (error) {
    console.error("Error converting image:", error);
    throw error;
  }
};

