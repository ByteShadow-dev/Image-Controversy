import { useRef, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ZoomIn, ZoomOut, Maximize, SplitSquareHorizontal } from 'lucide-react';
import { useViewportStore, useTreeStore, useSelectionStore } from '../../../store';
import { getZoomPercentage } from '../../../utils';
import { getNode } from '../../../services';
import { useQuery } from '@tanstack/react-query';

function ImageCanvas() {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const { 
    zoom, 
    pan, 
    setPan, 
    startPanning, 
    stopPanning, 
    setCanvasSize,
    setCursorPosition,
    showCompare,
    toggleCompare,
    comparePosition,
    setComparePosition,
  } = useViewportStore();
  const { activeNodeId } = useTreeStore();
  const { setSelectedNode } = useSelectionStore();

  const { data: nodeData } = useQuery({
    queryKey: ['node', activeNodeId],
    queryFn: () => getNode(activeNodeId),
    enabled: !!activeNodeId,
  });

  useEffect(() => {
    if (containerRef.current) {
      const { width, height } = containerRef.current.getBoundingClientRect();
      setCanvasSize(width, height);
    }
  }, [setCanvasSize]);

  const handleMouseDown = useCallback((e) => {
    if (e.button === 0) {
      startPanning(e.clientX, e.clientY);
    }
  }, [startPanning]);

  const handleMouseMove = useCallback((e) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (rect) {
      setCursorPosition(
        Math.round((e.clientX - rect.left - pan.x) / zoom),
        Math.round((e.clientY - rect.top - pan.y) / zoom)
      );
    }

    if (e.buttons === 1) {
      const deltaX = e.clientX - pan.x;
      const deltaY = e.clientY - pan.y;
      // This is simplified - actual implementation would track panStart
    }
  }, [pan, zoom, setCursorPosition]);

  const handleMouseUp = useCallback(() => {
    stopPanning();
  }, [stopPanning]);

  const handleWheel = useCallback((e) => {
    e.preventDefault();
    // Zoom handling would be implemented here
  }, []);

  const imageUrl = nodeData?.image_url || nodeData?.thumbnail_url;

  return (
    <div 
      ref={containerRef}
      className="h-full w-full relative overflow-hidden bg-adobe-darker"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onWheel={handleWheel}
    >
      {/* Canvas Content */}
      <div
        ref={canvasRef}
        className="absolute origin-top-left transition-transform duration-100"
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
        }}
      >
        {imageUrl ? (
          <motion.img
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            src={imageUrl}
            alt="Canvas"
            className="max-w-none select-none"
            draggable={false}
          />
        ) : (
          <div className="w-[800px] h-[600px] flex items-center justify-center bg-adobe-dark border border-adobe-border">
            <div className="text-center text-adobe-textMuted">
              <p>No image loaded</p>
              <p className="text-sm mt-2">Upload an image to begin editing</p>
            </div>
          </div>
        )}
      </div>

      {/* Compare Slider Overlay */}
      {showCompare && imageUrl && (
        <div className="absolute inset-0 pointer-events-none">
          <div 
            className="absolute top-0 bottom-0 w-0.5 bg-white pointer-events-auto cursor-ew-resize"
            style={{ left: `${comparePosition}%` }}
          >
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 bg-white rounded-full shadow-lg flex items-center justify-center">
              <SplitSquareHorizontal size={16} className="text-adobe-dark" />
            </div>
          </div>
          <div 
            className="absolute inset-y-0 right-0 overflow-hidden pointer-events-none"
            style={{ width: `${100 - comparePosition}%` }}
          >
            <img
              src={imageUrl}
              alt="Original"
              className="max-w-none h-full object-contain"
              style={{ filter: 'grayscale(100%)' }}
            />
          </div>
        </div>
      )}

      {/* Loading Overlay */}
      {!imageUrl && (
        <div className="absolute inset-0 flex items-center justify-center bg-adobe-darker/80">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-adobe-accent border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-adobe-textMuted">Loading image...</p>
          </div>
        </div>
      )}

      {/* Zoom Controls */}
      <div className="absolute bottom-4 right-4 flex items-center gap-2 bg-adobe-panel border border-adobe-border rounded-md p-2">
        <button className="btn-icon" title="Zoom Out">
          <ZoomOut size={16} />
        </button>
        <span className="text-xs text-adobe-textMuted min-w-[48px] text-center">
          {getZoomPercentage(zoom)}
        </span>
        <button className="btn-icon" title="Zoom In">
          <ZoomIn size={16} />
        </button>
        <div className="w-px h-4 bg-adobe-border mx-1"></div>
        <button className="btn-icon" title="Fit to Screen">
          <Maximize size={16} />
        </button>
        <button 
          onClick={toggleCompare}
          className={`btn-icon ${showCompare ? 'bg-adobe-accent/20 text-adobe-accent' : ''}`}
          title="Compare Before/After"
        >
          <SplitSquareHorizontal size={16} />
        </button>
      </div>

      {/* Node Info Badge */}
      {activeNodeId && (
        <div className="absolute top-4 left-4 bg-adobe-panel/90 backdrop-blur border border-adobe-border rounded-md px-3 py-2">
          <p className="text-xs text-adobe-textMuted">Active Version</p>
          <p className="text-sm font-medium text-adobe-text">{activeNodeId.slice(0, 12)}</p>
        </div>
      )}
    </div>
  );
}

export default ImageCanvas;
