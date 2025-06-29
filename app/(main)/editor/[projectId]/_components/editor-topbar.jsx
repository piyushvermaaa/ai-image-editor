// components/editor/editor-topbar.jsx
"use client";

import React, { useState } from "react";
import {
  ArrowLeft,
  RotateCcw,
  RotateCw,
  Crop,
  Expand,
  Sliders,
  Palette,
  Maximize2,
  ChevronDown,
  Text,
  RefreshCcw,
  Loader2,
  Eye,
  Save,
  Download,
  FileImage,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { useRouter } from "next/navigation";
import { useCanvas } from "@/context/context";
import { FabricImage } from "fabric";
import { api } from "@/convex/_generated/api";
import { useConvexMutation, useConvexQuery } from "@/hooks/use-convex-query";
import { toast } from "sonner";

const TOOLS = [
  {
    id: "resize",
    label: "Resize",
    icon: Expand,
    isActive: true, // Default active
  },
  {
    id: "crop",
    label: "Crop",
    icon: Crop,
  },
  {
    id: "adjust",
    label: "Adjust",
    icon: Sliders,
  },
  {
    id: "text",
    label: "Text",
    icon: Text,
  },
  {
    id: "background",
    label: "AI Background",
    icon: Palette,
  },
  {
    id: "ai_extender",
    label: "AI Image Extender",
    icon: Maximize2,
  },
  {
    id: "ai_edit",
    label: "AI Editing",
    icon: Eye,
  },
];

const EXPORT_FORMATS = [
  {
    format: "PNG",
    quality: 1.0,
    label: "PNG (High Quality)",
    extension: "png",
  },
  {
    format: "JPEG",
    quality: 0.9,
    label: "JPEG (90% Quality)",
    extension: "jpg",
  },
  {
    format: "JPEG",
    quality: 0.8,
    label: "JPEG (80% Quality)",
    extension: "jpg",
  },
  {
    format: "WEBP",
    quality: 0.9,
    label: "WebP (90% Quality)",
    extension: "webp",
  },
];

export function EditorTopBar({ project }) {
  const router = useRouter();
  const [isResetting, setIsResetting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportFormat, setExportFormat] = useState(null);

  const { activeTool, onToolChange, canvasEditor } = useCanvas();
  const { mutate: updateProject } = useConvexMutation(
    api.projects.updateProject
  );

  // Get current user for export limits
  const { data: user } = useConvexQuery(api.users.getCurrentUser);

  const handleBackToDashboard = () => {
    router.push("/dashboard");
  };

  // Manual save functionality
  const handleManualSave = async () => {
    if (!canvasEditor || !project) {
      toast.error("Canvas not ready for saving");
      return;
    }

    setIsSaving(true);

    try {
      // Get current canvas state
      const canvasJSON = canvasEditor.toJSON();

      // Update project in database
      await updateProject({
        projectId: project._id,
        canvasState: canvasJSON,
      });

      toast.success("Project saved successfully!");
    } catch (error) {
      console.error("Error saving project:", error);
      toast.error("Failed to save project. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  // Export canvas as image
  const handleExport = async (exportConfig) => {
    if (!canvasEditor || !project) {
      toast.error("Canvas not ready for export");
      return;
    }

    // Check export limits for free users
    if (user?.plan === "free" && user?.exportsThisMonth >= 5) {
      toast.error(
        "Free plan limited to 5 exports per month. Upgrade to Pro for unlimited exports."
      );
      return;
    }

    setIsExporting(true);
    setExportFormat(exportConfig.format);

    try {
      // Temporarily set canvas to actual project dimensions for export
      const currentZoom = canvasEditor.getZoom();
      const currentViewportTransform = [...canvasEditor.viewportTransform];

      // Reset zoom and viewport for accurate export
      canvasEditor.setZoom(1);
      canvasEditor.setViewportTransform([1, 0, 0, 1, 0, 0]);

      // Set canvas to actual project dimensions
      canvasEditor.setDimensions({
        width: project.width,
        height: project.height,
      });

      // Render the canvas at full resolution
      canvasEditor.requestRenderAll();

      // Export the canvas
      const dataURL = canvasEditor.toDataURL({
        format: exportConfig.format.toLowerCase(),
        quality: exportConfig.quality,
        multiplier: 1, // Export at original resolution
      });

      // Restore original canvas state
      canvasEditor.setZoom(currentZoom);
      canvasEditor.setViewportTransform(currentViewportTransform);
      canvasEditor.setDimensions({
        width: project.width * currentZoom,
        height: project.height * currentZoom,
      });
      canvasEditor.requestRenderAll();

      // Download the image
      const link = document.createElement("a");
      link.download = `${project.title}.${exportConfig.extension}`;
      link.href = dataURL;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Update export count in database (only for successful exports)
      if (user?.plan === "free") {
        await updateProject({
          projectId: project._id,
          // Note: We would need to add this to the users mutation
          // For now, we'll track it in a separate call or extend the schema
        });
      }

      toast.success(`Image exported as ${exportConfig.format}!`);
    } catch (error) {
      console.error("Error exporting image:", error);
      toast.error("Failed to export image. Please try again.");
    } finally {
      setIsExporting(false);
      setExportFormat(null);
    }
  };

  // Reset canvas to original state
  const handleResetToOriginal = async () => {
    if (!canvasEditor || !project || !project.originalImageUrl) {
      toast.error("No original image found to reset to");
      return;
    }

    setIsResetting(true);

    try {
      // Clear the canvas completely
      canvasEditor.clear();

      // Reset canvas background
      canvasEditor.backgroundColor = "#ffffff";
      canvasEditor.backgroundImage = null;

      // Load the original image
      const fabricImage = await FabricImage.fromURL(project.originalImageUrl, {
        crossOrigin: "anonymous",
      });

      // Calculate scaling to fit the image properly
      const imgAspectRatio = fabricImage.width / fabricImage.height;
      const canvasAspectRatio = project.width / project.height;
      let scaleX, scaleY;

      if (imgAspectRatio > canvasAspectRatio) {
        scaleX = project.width / fabricImage.width;
        scaleY = scaleX;
      } else {
        scaleY = project.height / fabricImage.height;
        scaleX = scaleY;
      }

      // Position and scale the image
      fabricImage.set({
        left: project.width / 2,
        top: project.height / 2,
        originX: "center",
        originY: "center",
        scaleX,
        scaleY,
        selectable: true,
        evented: true,
      });

      // Remove any filters that might be applied
      fabricImage.filters = [];

      // Add the image to canvas
      canvasEditor.add(fabricImage);
      canvasEditor.centerObject(fabricImage);
      canvasEditor.setActiveObject(fabricImage);
      canvasEditor.requestRenderAll();

      // Save the reset state to database
      const canvasJSON = canvasEditor.toJSON();
      await updateProject({
        projectId: project._id,
        canvasState: canvasJSON,
        currentImageUrl: project.originalImageUrl, // Reset to original URL
        activeTransformations: undefined, // Clear any ImageKit transformations
        backgroundRemoved: false,
      });

      toast.success("Canvas reset to original image");
    } catch (error) {
      console.error("Error resetting canvas:", error);
      toast.error("Failed to reset canvas. Please try again.");
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="border-b px-6 py-3">
      {/* Header Row */}
      <div className="flex items-center justify-between mb-4">
        {/* Left: Back button and project name */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleBackToDashboard}
            className="text-white hover:text-gray-300"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            All Projects
          </Button>
        </div>

        <h1 className="font-extrabold capitalize">{project.title}</h1>

        {/* Right: Actions */}
        <div className="flex items-center gap-3">
          {/* Reset Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleResetToOriginal}
            disabled={isResetting || !project.originalImageUrl}
            className="gap-2"
          >
            {isResetting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Resetting...
              </>
            ) : (
              <>
                <RefreshCcw className="h-4 w-4" />
                Reset to Original
              </>
            )}
          </Button>

          {/* Manual Save Button */}
          <Button
            variant="primary"
            size="sm"
            onClick={handleManualSave}
            disabled={isSaving || !canvasEditor}
            className="gap-2"
          >
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                Save
              </>
            )}
          </Button>

          {/* Export Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="glass"
                size="sm"
                disabled={isExporting || !canvasEditor}
                className="gap-2"
              >
                {isExporting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Exporting {exportFormat}...
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4" />
                    Export
                    <ChevronDown className="h-4 w-4" />
                  </>
                )}
              </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent
              align="end"
              className="w-56 bg-slate-800 border-slate-700"
            >
              <div className="px-3 py-2 text-sm text-white/70">
                Export Resolution: {project.width} × {project.height}px
              </div>

              <DropdownMenuSeparator className="bg-slate-700" />

              {EXPORT_FORMATS.map((config, index) => (
                <DropdownMenuItem
                  key={index}
                  onClick={() => handleExport(config)}
                  className="text-white hover:bg-slate-700 cursor-pointer flex items-center gap-2"
                >
                  <FileImage className="h-4 w-4" />
                  <div className="flex-1">
                    <div className="font-medium">{config.label}</div>
                    <div className="text-xs text-white/50">
                      {config.format} • {Math.round(config.quality * 100)}%
                      quality
                    </div>
                  </div>
                </DropdownMenuItem>
              ))}

              <DropdownMenuSeparator className="bg-slate-700" />

              {/* Export Limit Info for Free Users */}
              {user?.plan === "free" && (
                <div className="px-3 py-2 text-xs text-white/50">
                  Free Plan: {user?.exportsThisMonth || 0}/5 exports this month
                  {user?.exportsThisMonth >= 5 && (
                    <div className="text-amber-400 mt-1">
                      Upgrade to Pro for unlimited exports
                    </div>
                  )}
                </div>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Tools Row */}
      <div className="flex items-center justify-between">
        {/* Tools */}
        <div className="flex items-center gap-2">
          {TOOLS.map((tool) => {
            const Icon = tool.icon;
            const isActive = activeTool === tool.id;

            return (
              <Button
                key={tool.id}
                variant={isActive ? "default" : "ghost"}
                size="sm"
                onClick={() => onToolChange(tool.id)}
                className={`gap-2 ${
                  isActive
                    ? "bg-blue-600 text-white hover:bg-blue-700"
                    : "text-white hover:text-gray-300 hover:bg-gray-100"
                }`}
              >
                <Icon className="h-4 w-4" />
                {tool.label}
              </Button>
            );
          })}
        </div>

        {/* Right side controls */}
        <div className="flex items-center gap-4">
          {/* Undo/Redo */}
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" className="text-white">
              <RotateCcw className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" className="text-white">
              <RotateCw className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
