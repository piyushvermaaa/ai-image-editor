import { Control } from "fabric";

// Custom crop action handler
function cropActionHandler(eventData, transform, x, y) {
  const target = transform.target;
  const localPoint = target.toLocalPoint({ x, y }, "center", "center");

  // Calculate crop values based on handle position
  const cropX = Math.max(0, -localPoint.x + target.width / 2);
  const cropY = Math.max(0, -localPoint.y + target.height / 2);
  const cropWidth = Math.max(1, target.width - cropX * 2);
  const cropHeight = Math.max(1, target.height - cropY * 2);

  // Apply crop to the image
  target.set({
    cropX: cropX,
    cropY: cropY,
    width: cropWidth,
    height: cropHeight,
  });

  return true;
}

// Function to add crop controls to an image
export function addCropControls(imageObject) {
  // Override corner controls with crop functionality
  imageObject.controls.tl = new Control({
    x: -0.5,
    y: -0.5,
    actionHandler: cropActionHandler,
    cursorStyleHandler: () => "nw-resize",
    actionName: "crop",
  });

  imageObject.controls.tr = new Control({
    x: 0.5,
    y: -0.5,
    actionHandler: cropActionHandler,
    cursorStyleHandler: () => "ne-resize",
    actionName: "crop",
  });

  imageObject.controls.bl = new Control({
    x: -0.5,
    y: 0.5,
    actionHandler: cropActionHandler,
    cursorStyleHandler: () => "sw-resize",
    actionName: "crop",
  });

  imageObject.controls.br = new Control({
    x: 0.5,
    y: 0.5,
    actionHandler: cropActionHandler,
    cursorStyleHandler: () => "se-resize",
    actionName: "crop",
  });

  // Remove rotation control (optional)
  imageObject.controls.mtr = new Control({ visible: false });
}

// Function to apply crop to ImageKit URL
export function applyCropToImageKit(imageObject, originalUrl) {
  const cropX = imageObject.cropX || 0;
  const cropY = imageObject.cropY || 0;
  const cropWidth = imageObject.width;
  const cropHeight = imageObject.height;

  if (cropX === 0 && cropY === 0) {
    return originalUrl; // No crop needed
  }

  // Build ImageKit transformation
  const cropParams = `x-${Math.round(cropX)},y-${Math.round(cropY)},w-${Math.round(cropWidth)},h-${Math.round(cropHeight)}`;

  // Add to existing URL or create new transformation
  if (originalUrl.includes("?tr=")) {
    return originalUrl + `,${cropParams}`;
  } else {
    return originalUrl + `?tr=${cropParams}`;
  }
}
