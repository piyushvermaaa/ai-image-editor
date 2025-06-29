// // hooks/use-fabric-canvas.js
// import { useEffect, useRef, useState } from "react";
// import { Canvas, FabricImage } from "fabric";

// export function useFabricCanvas() {
//   const canvasRef = useRef(null);
//   const canvasInstanceRef = useRef(null);
//   const [isCanvasReady, setIsCanvasReady] = useState(false);
//   const initializingRef = useRef(false);

//   // Initialize canvas
//   useEffect(() => {
//     if (
//       !canvasRef.current ||
//       canvasInstanceRef.current ||
//       initializingRef.current
//     ) {
//       return;
//     }

//     initializingRef.current = true;

//     // Small delay to ensure DOM is fully ready
//     const timeoutId = setTimeout(() => {
//       if (!canvasRef.current) {
//         initializingRef.current = false;
//         return;
//       }

//       try {
//         // Create Fabric.js canvas instance
//         const canvas = new Canvas(canvasRef.current, {
//           width: 800,
//           height: 600,
//           backgroundColor: "#ffffff",
//           preserveObjectStacking: true,
//           selection: true,
//           uniformScaling: false,
//         });

//         // Store canvas instance
//         canvasInstanceRef.current = canvas;
//         setIsCanvasReady(true);
//         initializingRef.current = false;
//       } catch (error) {
//         console.error("Error initializing canvas:", error);
//         initializingRef.current = false;
//       }
//     }, 0);

//     // Cleanup function
//     return () => {
//       clearTimeout(timeoutId);
//       if (canvasInstanceRef.current) {
//         try {
//           canvasInstanceRef.current.dispose();
//         } catch (error) {
//           console.warn("Error disposing canvas:", error);
//         }
//         canvasInstanceRef.current = null;
//       }
//       setIsCanvasReady(false);
//       initializingRef.current = false;
//     };
//   }, []);

//   // Load image onto canvas
//   const loadImage = async (imageUrl) => {
//     if (!canvasInstanceRef.current) return;

//     try {
//       const fabricImage = await FabricImage.fromURL(imageUrl, {
//         crossOrigin: "anonymous",
//       });

//       // Center the image on canvas
//       fabricImage.set({
//         left: canvasInstanceRef.current.width / 2,
//         top: canvasInstanceRef.current.height / 2,
//         originX: "center",
//         originY: "center",
//       });

//       // Scale image to fit canvas while maintaining aspect ratio
//       const canvasWidth = canvasInstanceRef.current.width;
//       const canvasHeight = canvasInstanceRef.current.height;
//       const imageAspect = fabricImage.width / fabricImage.height;
//       const canvasAspect = canvasWidth / canvasHeight;

//       let scale;
//       if (imageAspect > canvasAspect) {
//         // Image is wider than canvas
//         scale = (canvasWidth * 0.8) / fabricImage.width;
//       } else {
//         // Image is taller than canvas
//         scale = (canvasHeight * 0.8) / fabricImage.height;
//       }

//       fabricImage.scale(scale);

//       // Clear canvas and add the image
//       canvasInstanceRef.current.clear();
//       canvasInstanceRef.current.add(fabricImage);
//       canvasInstanceRef.current.setActiveObject(fabricImage);
//       canvasInstanceRef.current.renderAll();

//       return fabricImage;
//     } catch (error) {
//       console.error("Error loading image:", error);
//       throw error;
//     }
//   };

//   // Get canvas as JSON (for saving state)
//   const getCanvasState = () => {
//     if (!canvasInstanceRef.current) return null;
//     return canvasInstanceRef.current.toJSON();
//   };

//   // Load canvas from JSON state
//   const loadCanvasState = async (canvasState) => {
//     if (!canvasInstanceRef.current || !canvasState) return;

//     try {
//       await canvasInstanceRef.current.loadFromJSON(canvasState);
//       canvasInstanceRef.current.renderAll();
//     } catch (error) {
//       console.error("Error loading canvas state:", error);
//       throw error;
//     }
//   };

//   // Set canvas dimensions
//   const setCanvasDimensions = (width, height) => {
//     if (!canvasInstanceRef.current) return;

//     canvasInstanceRef.current.setDimensions({
//       width,
//       height,
//     });
//     canvasInstanceRef.current.renderAll();
//   };

//   // Set zoom level
//   const setZoom = (zoomLevel) => {
//     if (!canvasInstanceRef.current) return;

//     const zoom = zoomLevel / 100; // Convert percentage to decimal
//     canvasInstanceRef.current.setZoom(zoom);
//     canvasInstanceRef.current.renderAll();
//   };

//   // Get active object
//   const getActiveObject = () => {
//     if (!canvasInstanceRef.current) return null;
//     return canvasInstanceRef.current.getActiveObject();
//   };

//   // Clear canvas
//   const clearCanvas = () => {
//     if (!canvasInstanceRef.current) return;
//     canvasInstanceRef.current.clear();
//     canvasInstanceRef.current.renderAll();
//   };

//   return {
//     canvasRef,
//     canvas: canvasInstanceRef.current,
//     isCanvasReady,
//     loadImage,
//     getCanvasState,
//     loadCanvasState,
//     setCanvasDimensions,
//     setZoom,
//     getActiveObject,
//     clearCanvas,
//   };
// }
