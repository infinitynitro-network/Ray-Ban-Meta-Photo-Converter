import React, { useRef, useEffect, useState, useCallback } from 'react';
import { ZoomIn, ZoomOut, RotateCw, RefreshCw, Crosshair, Maximize2, Grid, Move } from 'lucide-react';
import { CropTransform, LoadedImageSource } from '../types';

interface CropEditorProps {
  imageSource: LoadedImageSource;
  transform: CropTransform;
  onTransformChange: (transform: CropTransform) => void;
  onCropBoxMeasured: (dimensions: { width: number; height: number }) => void;
}

export const CropEditor: React.FC<CropEditorProps> = ({
  imageSource,
  transform,
  onTransformChange,
  onCropBoxMeasured,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [containerSize, setContainerSize] = useState({ width: 400, height: 533 });
  const [showGrid, setShowGrid] = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<{ x: number; y: number; startXOffset: number; startYOffset: number } | null>(null);
  const pinchStartDistanceRef = useRef<number | null>(null);
  const pinchStartZoomRef = useRef<number>(1);

  // Measure container and compute maximum fitting 3:4 rectangle
  useEffect(() => {
    if (!containerRef.current) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width: contW, height: contH } = entry.contentRect;
        if (contW <= 0 || contH <= 0) return;

        // Target ratio is 3:4 (w/h = 0.75)
        const targetRatio = 3 / 4;
        let cropW: number;
        let cropH: number;

        // Maximize inside container with 16px safety margins
        const maxW = Math.max(100, contW - 24);
        const maxH = Math.max(133, contH - 24);

        if (maxW / maxH > targetRatio) {
          // Limited by height
          cropH = maxH;
          cropW = cropH * targetRatio;
        } else {
          // Limited by width
          cropW = maxW;
          cropH = cropW / targetRatio;
        }

        cropW = Math.round(cropW);
        cropH = Math.round(cropH);

        setContainerSize({ width: cropW, height: cropH });
        onCropBoxMeasured({ width: cropW, height: cropH });
      }
    });

    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [onCropBoxMeasured]);

  // Draw interactive canvas
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { width: cropW, height: cropH } = containerSize;
    const dpr = window.devicePixelRatio || 1;

    canvas.width = cropW * dpr;
    canvas.height = cropH * dpr;
    ctx.scale(dpr, dpr);

    // Clear background with dark matte
    ctx.fillStyle = '#111215';
    ctx.fillRect(0, 0, cropW, cropH);

    // Calculate base scale to cover 3:4 crop box
    const baseScale = Math.max(cropW / imageSource.width, cropH / imageSource.height);
    const scale = baseScale * transform.zoom;

    ctx.save();
    // Center of 3:4 viewport + user offset
    ctx.translate(cropW / 2 + transform.xOffset, cropH / 2 + transform.yOffset);

    if (transform.rotation) {
      ctx.rotate((transform.rotation * Math.PI) / 180);
    }

    const drawW = imageSource.width * scale;
    const drawH = imageSource.height * scale;

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    ctx.drawImage(
      imageSource.imageElement,
      -drawW / 2,
      -drawH / 2,
      drawW,
      drawH
    );
    ctx.restore();

    // Draw 3x3 Rule of Thirds subtle guidelines if enabled
    if (showGrid) {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.28)';
      ctx.lineWidth = 1;

      // Vertical lines
      const colStep = cropW / 3;
      for (let i = 1; i < 3; i++) {
        ctx.beginPath();
        ctx.moveTo(colStep * i, 0);
        ctx.lineTo(colStep * i, cropH);
        ctx.stroke();
      }

      // Horizontal lines
      const rowStep = cropH / 3;
      for (let i = 1; i < 3; i++) {
        ctx.beginPath();
        ctx.moveTo(0, rowStep * i);
        ctx.lineTo(cropW, rowStep * i);
        ctx.stroke();
      }
    }

    // Border stroke for crisp framing
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.lineWidth = 2;
    ctx.strokeRect(1, 1, cropW - 2, cropH - 2);
  }, [containerSize, imageSource, transform, showGrid]);

  useEffect(() => {
    draw();
  }, [draw]);

  // Mouse drag handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      startXOffset: transform.xOffset,
      startYOffset: transform.yOffset,
    };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !dragStartRef.current) return;
    const deltaX = e.clientX - dragStartRef.current.x;
    const deltaY = e.clientY - dragStartRef.current.y;

    onTransformChange({
      ...transform,
      xOffset: dragStartRef.current.startXOffset + deltaX,
      yOffset: dragStartRef.current.startYOffset + deltaY,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    dragStartRef.current = null;
  };

  // Touch drag & pinch-to-zoom handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      setIsDragging(true);
      dragStartRef.current = {
        x: touch.clientX,
        y: touch.clientY,
        startXOffset: transform.xOffset,
        startYOffset: transform.yOffset,
      };
    } else if (e.touches.length === 2) {
      // Pinch to zoom start
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const dist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
      pinchStartDistanceRef.current = dist;
      pinchStartZoomRef.current = transform.zoom;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 1 && isDragging && dragStartRef.current) {
      const touch = e.touches[0];
      const deltaX = touch.clientX - dragStartRef.current.x;
      const deltaY = touch.clientY - dragStartRef.current.y;

      onTransformChange({
        ...transform,
        xOffset: dragStartRef.current.startXOffset + deltaX,
        yOffset: dragStartRef.current.startYOffset + deltaY,
      });
    } else if (e.touches.length === 2 && pinchStartDistanceRef.current !== null) {
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const currentDist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
      const factor = currentDist / pinchStartDistanceRef.current;
      const newZoom = Math.min(4.0, Math.max(1.0, pinchStartZoomRef.current * factor));

      onTransformChange({
        ...transform,
        zoom: parseFloat(newZoom.toFixed(2)),
      });
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    dragStartRef.current = null;
    pinchStartDistanceRef.current = null;
  };

  // Wheel zoom
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomDelta = e.deltaY > 0 ? -0.05 : 0.05;
    const nextZoom = Math.min(4.0, Math.max(1.0, transform.zoom + zoomDelta));
    onTransformChange({
      ...transform,
      zoom: parseFloat(nextZoom.toFixed(2)),
    });
  };

  // Action buttons
  const handleZoomIn = () => {
    const next = Math.min(4.0, transform.zoom + 0.15);
    onTransformChange({ ...transform, zoom: parseFloat(next.toFixed(2)) });
  };

  const handleZoomOut = () => {
    const next = Math.max(1.0, transform.zoom - 0.15);
    onTransformChange({ ...transform, zoom: parseFloat(next.toFixed(2)) });
  };

  const handleCenter = () => {
    onTransformChange({ ...transform, xOffset: 0, yOffset: 0 });
  };

  const handleFit = () => {
    onTransformChange({ ...transform, zoom: 1.0, xOffset: 0, yOffset: 0 });
  };

  const handleReset = () => {
    onTransformChange({ zoom: 1.0, xOffset: 0, yOffset: 0, rotation: 0 });
  };

  const handleRotate = () => {
    const nextRotation = (transform.rotation + 90) % 360;
    onTransformChange({ ...transform, rotation: nextRotation });
  };

  const isPortrait = imageSource.aspectRatio <= 1.0;

  return (
    <div className="flex flex-col items-center w-full">
      {/* Aspect Ratio Header / Status */}
      <div className="w-full flex items-center justify-between text-xs text-neutral-500 dark:text-neutral-400 mb-2 px-1">
        <span className="flex items-center gap-1.5 font-medium">
          <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
          <span>Target Ratio: <strong className="text-neutral-900 dark:text-white">3:4 Portrait</strong></span>
          <span className="hidden sm:inline text-neutral-400 dark:text-neutral-600">|</span>
          <span className="hidden sm:inline">
            Original: {imageSource.width} × {imageSource.height} ({isPortrait ? 'Portrait' : 'Landscape'})
          </span>
        </span>
        <button
          onClick={() => setShowGrid(!showGrid)}
          className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors cursor-pointer ${
            showGrid
              ? 'text-neutral-900 dark:text-white bg-neutral-200/80 dark:bg-neutral-800'
              : 'text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200'
          }`}
          title="Toggle Rule of Thirds Grid"
        >
          <Grid className="w-3.5 h-3.5" />
          <span className="hidden xs:inline">Grid</span>
        </button>
      </div>

      {/* Interactive Crop Viewport Frame */}
      <div
        ref={containerRef}
        className="w-full h-[380px] sm:h-[480px] md:h-[520px] rounded-2xl bg-neutral-950 flex items-center justify-center p-3 relative overflow-hidden shadow-inner select-none"
      >
        {/* Subtle background blur of image for ambient backdrop */}
        <div
          className="absolute inset-0 opacity-15 pointer-events-none filter blur-xl scale-125 bg-cover bg-center"
          style={{ backgroundImage: `url(${imageSource.objectUrl})` }}
        />

        {/* 3:4 Portrait Canvas */}
        <canvas
          ref={canvasRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onWheel={handleWheel}
          style={{
            width: `${containerSize.width}px`,
            height: `${containerSize.height}px`,
          }}
          className={`relative z-10 rounded-lg shadow-2xl cursor-grab ${
            isDragging ? 'cursor-grabbing' : ''
          }`}
          title="Drag to reposition • Scroll or pinch to zoom"
        />

        {/* Drag Helper Overlay Pill */}
        <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-20 pointer-events-none px-3 py-1 rounded-full bg-black/75 backdrop-blur-md text-white/90 text-[11px] font-medium flex items-center gap-1.5 shadow-md border border-white/10">
          <Move className="w-3 h-3 text-neutral-300" />
          <span>Drag to frame portrait composition</span>
        </div>
      </div>

      {/* Control Bar: Zoom & Quick Align Actions */}
      <div className="w-full mt-4 p-3.5 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200/90 dark:border-neutral-800 shadow-2xs flex flex-col gap-3">
        {/* Zoom Slider + Plus / Minus */}
        <div className="flex items-center gap-3">
          <button
            id="zoom-out-btn"
            onClick={handleZoomOut}
            disabled={transform.zoom <= 1.0}
            aria-label="Zoom out"
            className="w-8 h-8 rounded-lg border border-neutral-200 dark:border-neutral-700 flex items-center justify-center text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 disabled:opacity-40 cursor-pointer"
          >
            <ZoomOut className="w-4 h-4" />
          </button>

          <div className="flex-1 flex items-center gap-2">
            <input
              id="zoom-slider"
              type="range"
              min="1.0"
              max="4.0"
              step="0.01"
              value={transform.zoom}
              onChange={(e) =>
                onTransformChange({
                  ...transform,
                  zoom: parseFloat(e.target.value),
                })
              }
              aria-label="Adjust zoom"
              className="w-full h-1.5 bg-neutral-200 dark:bg-neutral-700 rounded-lg appearance-none cursor-pointer accent-neutral-900 dark:accent-white"
            />
            <span className="text-xs font-mono font-medium text-neutral-600 dark:text-neutral-400 w-12 text-right">
              {transform.zoom.toFixed(2)}×
            </span>
          </div>

          <button
            id="zoom-in-btn"
            onClick={handleZoomIn}
            disabled={transform.zoom >= 4.0}
            aria-label="Zoom in"
            className="w-8 h-8 rounded-lg border border-neutral-200 dark:border-neutral-700 flex items-center justify-center text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 disabled:opacity-40 cursor-pointer"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
        </div>

        {/* Quick Framing Buttons: FIT, CENTER, RESET, ROTATE */}
        <div className="flex items-center justify-between border-t border-neutral-100 dark:border-neutral-800/80 pt-3 gap-2">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <button
              id="fit-btn"
              onClick={handleFit}
              className="px-3 py-1.5 rounded-lg border border-neutral-200 dark:border-neutral-700 text-xs font-semibold text-neutral-800 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Maximize2 className="w-3.5 h-3.5 text-neutral-500" />
              <span>FIT</span>
            </button>
            <button
              id="center-btn"
              onClick={handleCenter}
              className="px-3 py-1.5 rounded-lg border border-neutral-200 dark:border-neutral-700 text-xs font-semibold text-neutral-800 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Crosshair className="w-3.5 h-3.5 text-neutral-500" />
              <span>CENTER</span>
            </button>
            <button
              id="rotate-btn"
              onClick={handleRotate}
              className="px-3 py-1.5 rounded-lg border border-neutral-200 dark:border-neutral-700 text-xs font-semibold text-neutral-800 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors flex items-center gap-1.5 cursor-pointer"
              title="Rotate 90 degrees"
            >
              <RotateCw className="w-3.5 h-3.5 text-neutral-500" />
              <span className="hidden xs:inline">ROTATE</span>
            </button>
          </div>

          <button
            id="reset-btn"
            onClick={handleReset}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>RESET</span>
          </button>
        </div>
      </div>
    </div>
  );
};
