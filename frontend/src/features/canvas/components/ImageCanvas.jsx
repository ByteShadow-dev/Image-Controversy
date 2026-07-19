import { useRef, useCallback, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ZoomIn, ZoomOut, Maximize, SplitSquareHorizontal, Move } from 'lucide-react';
import { useViewportStore, useTreeStore, useSelectionStore } from '../../../store';
import { getZoomPercentage, clamp } from '../../../utils';
import { getNode } from '../../../services';
import { useQuery } from '@tanstack/react-query';
import { ZOOM_LEVELS } from '../../../constants';

// Resolve backend image path to a browser-loadable URL
function resolveImageUrl(imagePath) {
  if (!imagePath) return null;
  if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) return imagePath;
  const filename = imagePath.split(/[\\/]/).pop();
  return `http://localhost:8000/uploads/${filename}`;
}

function ImageCanvas() {
  const containerRef = useRef(null);
  const imgRef = useRef(null);

  // ---------- Viewport store ----------
  const { zoom, pan, setPan, setCanvasSize, setCursorPosition, showCompare, toggleCompare } =
    useViewportStore();

  // Local zoom setter that clamps to known levels
  const setZoom = useViewportStore((s) => s.setZoom);
  const zoomIn = useViewportStore((s) => s.zoomIn);
  const zoomOut = useViewportStore((s) => s.zoomOut);
  const fitToScreen = useViewportStore((s) => s.fitToScreen);

  const { activeNodeId } = useTreeStore();

  // ---------- Drag-to-pan state ----------
  const isDragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const panAtDragStart = useRef({ x: 0, y: 0 });

  // ---------- Load the active node image ----------
  const { data: nodeData, isLoading: nodeLoading } = useQuery({
    queryKey: ['node', activeNodeId],
    queryFn: () => getNode(activeNodeId),
    enabled: !!activeNodeId,
  });

  const imageUrl = resolveImageUrl(nodeData?.image_path);

  // ---------- Measure container on mount ----------
  useEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver(([entry]) => {
      setCanvasSize(entry.contentRect.width, entry.contentRect.height);
    });
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, [setCanvasSize]);

  // ---------- Fit image to screen once it loads ----------
  const handleImageLoad = useCallback(() => {
    if (!containerRef.current || !imgRef.current) return;
    const { width: cw, height: ch } = containerRef.current.getBoundingClientRect();
    const { naturalWidth: iw, naturalHeight: ih } = imgRef.current;
    if (!iw || !ih) return;

    const scaleX = (cw * 0.85) / iw;
    const scaleY = (ch * 0.85) / ih;
    const fitZoom = clamp(Math.min(scaleX, scaleY), ZOOM_LEVELS[0], ZOOM_LEVELS[ZOOM_LEVELS.length - 1]);

    setZoom(fitZoom);
    // Centre the image
    setPan({
      x: (cw - iw * fitZoom) / 2,
      y: (ch - ih * fitZoom) / 2,
    });
  }, [setZoom, setPan]);

  // Re-fit whenever the active node changes
  useEffect(() => {
    if (imageUrl && imgRef.current?.complete) {
      handleImageLoad();
    }
  }, [imageUrl, handleImageLoad]);

  // ---------- Mouse drag (pan) ----------
  const handleMouseDown = useCallback((e) => {
    if (e.button !== 0) return;
    e.preventDefault();
    isDragging.current = true;
    dragStart.current = { x: e.clientX, y: e.clientY };
    panAtDragStart.current = { ...pan };
  }, [pan]);

  const handleMouseMove = useCallback((e) => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setCursorPosition(
        Math.round((e.clientX - rect.left - pan.x) / zoom),
        Math.round((e.clientY - rect.top - pan.y) / zoom),
      );
    }
    if (!isDragging.current) return;
    setPan({
      x: panAtDragStart.current.x + (e.clientX - dragStart.current.x),
      y: panAtDragStart.current.y + (e.clientY - dragStart.current.y),
    });
  }, [pan, zoom, setCursorPosition, setPan]);

  const handleMouseUp = useCallback(() => {
    isDragging.current = false;
  }, []);

  // ---------- Scroll wheel zoom ----------
  const handleWheel = useCallback((e) => {
    e.preventDefault();
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const delta = e.deltaY < 0 ? 1.1 : 1 / 1.1;
    const newZoom = clamp(
      zoom * delta,
      ZOOM_LEVELS[0],
      ZOOM_LEVELS[ZOOM_LEVELS.length - 1],
    );

    // Zoom toward the cursor position
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    setPan({
      x: mouseX - (mouseX - pan.x) * (newZoom / zoom),
      y: mouseY - (mouseY - pan.y) * (newZoom / zoom),
    });
    setZoom(newZoom);
  }, [zoom, pan, setZoom, setPan]);

  // Attach wheel listener with { passive: false } so preventDefault works
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, [handleWheel]);

  // ---------- Zoom button handlers ----------
  const handleZoomIn = useCallback(() => zoomIn(), [zoomIn]);
  const handleZoomOut = useCallback(() => zoomOut(), [zoomOut]);
  const handleFit = useCallback(() => {
    if (imgRef.current?.complete && imgRef.current?.naturalWidth) {
      handleImageLoad();
    } else {
      fitToScreen();
    }
  }, [handleImageLoad, fitToScreen]);

  // ---------- Render ----------
  return (
    <div
      ref={containerRef}
      className="h-full w-full relative overflow-hidden bg-adobe-darker select-none"
      style={{ cursor: isDragging.current ? 'grabbing' : 'grab' }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* ── Transformed canvas ── */}
      <div
        className="absolute origin-top-left"
        style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})` }}
      >
        {imageUrl ? (
          <motion.img
            ref={imgRef}
            key={imageUrl}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.2 }}
            src={imageUrl}
            alt="Canvas"
            className="max-w-none block"
            draggable={false}
            onLoad={handleImageLoad}
          />
        ) : (
          <div className="w-[800px] h-[600px] flex items-center justify-center bg-adobe-dark border border-adobe-border rounded-lg">
            <div className="text-center text-adobe-textMuted space-y-2">
              <Move size={32} className="mx-auto opacity-30" />
              <p className="text-sm">No image loaded</p>
              <p className="text-xs opacity-60">Upload an image to begin editing</p>
            </div>
          </div>
        )}
      </div>

      {/* ── Compare slider overlay ── */}
      {showCompare && imageUrl && (
        <div className="absolute inset-0 pointer-events-none">
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-white pointer-events-auto cursor-ew-resize shadow-[0_0_8px_rgba(255,255,255,0.6)]"
            style={{ left: '50%' }}
          >
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 bg-white rounded-full shadow-lg flex items-center justify-center">
              <SplitSquareHorizontal size={16} className="text-adobe-dark" />
            </div>
          </div>
        </div>
      )}

      {/* ── Loading spinner ── */}
      <AnimatePresence>
        {nodeLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 flex items-center justify-center bg-adobe-darker/70 backdrop-blur-sm"
          >
            <div className="text-center space-y-3">
              <div className="w-10 h-10 border-4 border-adobe-accent border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-adobe-textMuted text-sm">Loading image…</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Active node badge ── */}
      {activeNodeId && nodeData && (
        <div className="absolute top-4 left-4 bg-adobe-panel/90 backdrop-blur border border-adobe-border rounded-md px-3 py-2 pointer-events-none">
          <p className="text-xs text-adobe-textMuted">Active Version</p>
          <p className="text-sm font-medium text-adobe-text truncate max-w-[160px]">
            {nodeData.edit?.operation || nodeData.edit?.category || activeNodeId.slice(0, 12)}
          </p>
        </div>
      )}

      {/* ── Zoom controls (bottom-right) ── */}
      <div className="absolute bottom-4 right-4 flex items-center gap-1 bg-adobe-panel/95 backdrop-blur border border-adobe-border rounded-lg px-2 py-1.5 shadow-lg">
        <button
          onClick={handleZoomOut}
          className="btn-icon h-7 w-7 p-1"
          title="Zoom Out (scroll down)"
          disabled={zoom <= ZOOM_LEVELS[0]}
        >
          <ZoomOut size={15} />
        </button>

        {/* Clickable percentage — click resets to 100% */}
        <button
          onClick={() => setZoom(1)}
          className="text-xs text-adobe-textMuted hover:text-adobe-text min-w-[44px] text-center font-mono transition-colors"
          title="Click to reset to 100%"
        >
          {getZoomPercentage(zoom)}
        </button>

        <button
          onClick={handleZoomIn}
          className="btn-icon h-7 w-7 p-1"
          title="Zoom In (scroll up)"
          disabled={zoom >= ZOOM_LEVELS[ZOOM_LEVELS.length - 1]}
        >
          <ZoomIn size={15} />
        </button>

        <div className="w-px h-4 bg-adobe-border mx-1" />

        <button
          onClick={handleFit}
          className="btn-icon h-7 w-7 p-1"
          title="Fit to screen"
        >
          <Maximize size={15} />
        </button>
      </div>
    </div>
  );
}

export default ImageCanvas;
