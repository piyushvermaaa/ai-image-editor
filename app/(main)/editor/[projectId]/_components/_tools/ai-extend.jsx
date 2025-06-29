"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import {
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Loader2,
  Wand2,
} from "lucide-react";
import { useCanvas } from "@/context/context";
import { FabricImage } from "fabric";
import { useConvexMutation } from "@/hooks/use-convex-query";
import { api } from "@/convex/_generated/api";

const DIRECTIONS = [
  { key: "top", label: "Top", icon: ArrowUp },
  { key: "bottom", label: "Bottom", icon: ArrowDown },
  { key: "left", label: "Left", icon: ArrowLeft },
  { key: "right", label: "Right", icon: ArrowRight },
];

export function AIExtenderControls({ project }) {
  const { canvasEditor, processingMessage, setProcessingMessage } = useCanvas();
  const [selectedDirections, setSelectedDirections] = useState([]);
  const [extensionAmount, setExtensionAmount] = useState(200);
  const { mutate: updateProject } = useConvexMutation(
    api.projects.updateProject
  );

  const getMainImage = () => {
    if (!canvasEditor) return null;
    return (
      canvasEditor.getObjects().find((obj) => obj.type === "image") || null
    );
  };

  const hasBackgroundRemoval = () => {
    const mainImage = getMainImage();
    if (!mainImage) return false;

    // Check the actual image src in the canvas (this is the current processed URL)
    const imageSrc =
      mainImage.getSrc?.() || mainImage._element?.src || mainImage.src;
    if (!imageSrc) return false;

    // Check for background removal parameters in the current image URL
    return (
      imageSrc.includes("e-bgremove") ||
      imageSrc.includes("e-removedotbg") ||
      imageSrc.includes("e-changebg")
    );
  };

  const calculateNewDimensions = () => {
    const mainImage = getMainImage();
    if (!mainImage || !project) return { width: 0, height: 0 };

    // Calculate based on the current image size, not canvas size
    const currentWidth = mainImage.width * (mainImage.scaleX || 1);
    const currentHeight = mainImage.height * (mainImage.scaleY || 1);

    let newWidth = currentWidth;
    let newHeight = currentHeight;

    if (
      selectedDirections.includes("left") ||
      selectedDirections.includes("right")
    ) {
      newWidth += extensionAmount;
    }
    if (
      selectedDirections.includes("top") ||
      selectedDirections.includes("bottom")
    ) {
      newHeight += extensionAmount;
    }

    return { width: Math.round(newWidth), height: Math.round(newHeight) };
  };

  const buildExtensionUrl = (imageUrl) => {
    if (!imageUrl || selectedDirections.length === 0) return imageUrl;

    const [baseUrl, existingQuery] = imageUrl.split("?");
    const { width: newWidth, height: newHeight } = calculateNewDimensions();

    const transformations = [
      "bg-genfill",
      `w-${newWidth}`,
      `h-${newHeight}`,
      "cm-pad_resize",
    ];

    // Add focus positioning based on selected directions
    let focus = "";
    const hasLeft = selectedDirections.includes("left");
    const hasTop = selectedDirections.includes("top");
    const hasRight = selectedDirections.includes("right");
    const hasBottom = selectedDirections.includes("bottom");

    // When extending left+top, original goes to bottom-right
    if (hasLeft && hasTop) focus = "fo-bottom_right";
    // When extending right+top, original goes to bottom-left
    else if (hasRight && hasTop) focus = "fo-bottom_left";
    // When extending left+bottom, original goes to top-right
    else if (hasLeft && hasBottom) focus = "fo-top_right";
    // When extending right+bottom, original goes to top-left
    else if (hasRight && hasBottom) focus = "fo-top_left";
    // When extending left, original goes to right
    else if (hasLeft) focus = "fo-right";
    // When extending right, original goes to left
    else if (hasRight) focus = "fo-left";
    // When extending top, original goes to bottom
    else if (hasTop) focus = "fo-bottom";
    // When extending bottom, original goes to top
    else if (hasBottom) focus = "fo-top";

    if (focus) transformations.push(focus);

    if (existingQuery) {
      const params = new URLSearchParams(existingQuery);
      const existingTr = params.get("tr");
      const finalTr = existingTr
        ? `${existingTr}:${transformations.join(",")}`
        : transformations.join(",");
      return `${baseUrl}?tr=${finalTr}`;
    }

    return `${baseUrl}?tr=${transformations.join(",")}`;
  };

  const handleApplyExtension = async () => {
    const mainImage = getMainImage();
    if (!mainImage || !project || selectedDirections.length === 0) return;

    setProcessingMessage("Extending image with AI...");

    try {
      // Get the current image URL from the canvas (preserves previous extensions)
      const currentImageUrl =
        mainImage.getSrc?.() || mainImage._element?.src || mainImage.src;
      const extendedUrl = buildExtensionUrl(currentImageUrl);

      // Load the extended image
      const extendedImage = await FabricImage.fromURL(extendedUrl, {
        crossOrigin: "anonymous",
      });

      // Calculate scale to fit within the existing canvas
      const scaleX = Math.min(project.width / extendedImage.width, 1);
      const scaleY = Math.min(project.height / extendedImage.height, 1);
      const scale = Math.min(scaleX, scaleY);

      // Position and scale the extended image to fit the canvas
      extendedImage.set({
        left: project.width / 2,
        top: project.height / 2,
        originX: "center",
        originY: "center",
        scaleX: scale,
        scaleY: scale,
        selectable: true,
        evented: true,
      });

      // Replace the old image with the extended one
      canvasEditor.remove(mainImage);
      canvasEditor.add(extendedImage);
      canvasEditor.setActiveObject(extendedImage);
      canvasEditor.requestRenderAll();

      // Update project with new image URL (but keep original canvas dimensions)
      await updateProject({
        projectId: project._id,
        currentImageUrl: extendedUrl,
        canvasState: canvasEditor.toJSON(),
      });

      setSelectedDirections([]);
    } catch (error) {
      console.error("Error applying extension:", error);
      alert("Failed to extend image. Please try again.");
    } finally {
      setProcessingMessage(null);
    }
  };

  if (!canvasEditor) {
    return (
      <div className="p-4">
        <p className="text-white/70 text-sm">Canvas not ready</p>
      </div>
    );
  }

  const mainImage = getMainImage();
  if (!mainImage) {
    return (
      <div className="p-4">
        <p className="text-white/70 text-sm">Please add an image first</p>
      </div>
    );
  }

  if (hasBackgroundRemoval()) {
    return (
      <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4">
        <h3 className="text-amber-400 font-medium mb-2">
          Extension Not Available
        </h3>
        <p className="text-amber-300/80 text-sm">
          AI Extension cannot be used on images with removed backgrounds. Use
          extension first, then remove background.
        </p>
      </div>
    );
  }

  const { width: newWidth, height: newHeight } = calculateNewDimensions();

  return (
    <div className="space-y-6">
      {/* Direction Selection */}
      <div>
        <h3 className="text-sm font-medium text-white mb-3">
          Extend Directions
        </h3>
        <div className="grid grid-cols-2 gap-3">
          {DIRECTIONS.map((config) => {
            const Icon = config.icon;
            const isSelected = selectedDirections.includes(config.key);

            return (
              <Button
                key={config.key}
                onClick={() =>
                  setSelectedDirections((prev) =>
                    prev.includes(config.key)
                      ? prev.filter((d) => d !== config.key)
                      : [...prev, config.key]
                  )
                }
                variant={isSelected ? "default" : "outline"}
                className={`flex items-center gap-2 ${isSelected ? "bg-cyan-500 hover:bg-cyan-600" : ""}`}
              >
                <Icon className="h-4 w-4" />
                {config.label}
              </Button>
            );
          })}
        </div>
      </div>

      {/* Extension Amount */}
      <div>
        <div className="flex justify-between items-center mb-2">
          <label className="text-sm text-white">Extension Amount</label>
          <span className="text-xs text-white/70">{extensionAmount}px</span>
        </div>
        <Slider
          value={[extensionAmount]}
          onValueChange={(value) => setExtensionAmount(value[0])}
          min={50}
          max={500}
          step={25}
          className="w-full"
        />
      </div>

      {/* Dimensions Preview */}
      {selectedDirections.length > 0 && (
        <div className="bg-slate-700/30 rounded-lg p-3">
          <h4 className="text-sm font-medium text-white mb-2">
            Image Extension Preview
          </h4>
          <div className="text-xs text-white/70">
            <div>
              Current Image:{" "}
              {Math.round(
                getMainImage()?.width * (getMainImage()?.scaleX || 1)
              )}{" "}
              ×{" "}
              {Math.round(
                getMainImage()?.height * (getMainImage()?.scaleY || 1)
              )}
              px
            </div>
            <div className="text-cyan-400">
              Extended Image: {newWidth} × {newHeight}px
            </div>
            <div className="mt-1 text-white/50">
              Canvas size unchanged: {project.width} × {project.height}px
            </div>
          </div>
        </div>
      )}

      {/* Apply Button */}
      <Button
        onClick={handleApplyExtension}
        disabled={selectedDirections.length === 0 || processingMessage}
        className="w-full"
        variant="primary"
      >
        <Wand2 className="h-4 w-4 mr-2" />
        Apply AI Extension
      </Button>

      {/* Instructions */}
      <div className="bg-slate-700/30 rounded-lg p-3">
        <p className="text-xs text-white/70">
          <strong>How it works:</strong>
          <br />
          Select directions → Set amount → Apply extension.
          <br />
          AI will intelligently fill the new areas.
        </p>
      </div>
    </div>
  );
}
