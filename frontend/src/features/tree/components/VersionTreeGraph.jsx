/**
 * VersionTreeGraph.jsx
 * ────────────────────
 * A fully custom visual tree diagram drawn on an SVG + HTML canvas.
 *
 * Layout algorithm:
 *   - Recursive depth-first layout assigns each node an (x, y) position.
 *   - Nodes are arranged in a top-down tree (root at top, children below).
 *   - Siblings are spread horizontally with configurable gap.
 *   - Curved SVG bezier paths connect parent → child.
 *
 * Each node card shows:
 *   - A thumbnail of the processed image (or a placeholder)
 *   - The operation label (truncated)
 *   - A coloured status badge
 *   - Active highlight ring (animated)
 */

import { useMemo, useRef, useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Folder, FileImage, GitBranch, CheckCircle2, Clock, XCircle } from 'lucide-react';
import { useTreeStore, useSelectionStore } from '../../../store';

// ─── Layout constants ────────────────────────────────────────────────────────
const NODE_W = 120;   // card width  (px)
const NODE_H = 90;    // card height (px)
const H_GAP  = 40;    // horizontal gap between sibling subtrees
const V_GAP  = 70;    // vertical gap between depth levels

// ─── Image URL helper ────────────────────────────────────────────────────────
function resolveImageUrl(imagePath) {
  if (!imagePath) return null;
  if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) return imagePath;
  const filename = imagePath.split(/[\\/]/).pop();
  const uploadsBase = import.meta.env.VITE_UPLOADS_URL || 'http://localhost:8000/uploads';
  return `${uploadsBase.replace(/\/$/, '')}/${encodeURIComponent(filename)}`;
}

// ─── Status badge ────────────────────────────────────────────────────────────
function StatusBadge({ status }) {
  const cfg = {
    Completed: { icon: CheckCircle2, color: 'text-emerald-400', bg: 'bg-emerald-400/10' },
    Pending:   { icon: Clock,         color: 'text-amber-400',   bg: 'bg-amber-400/10'   },
    Failed:    { icon: XCircle,       color: 'text-red-400',     bg: 'bg-red-400/10'     },
    Original:  { icon: Folder,        color: 'text-blue-400',    bg: 'bg-blue-400/10'    },
  }[status] || { icon: FileImage, color: 'text-adobe-textMuted', bg: 'bg-adobe-border/30' };

  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-0.5 text-[9px] px-1 py-0.5 rounded ${cfg.bg} ${cfg.color} font-medium`}>
      <Icon size={8} />
      {status}
    </span>
  );
}

// ─── Individual node card ────────────────────────────────────────────────────
function TreeNodeCard({ node, x, y, isActive, onClick }) {
  const imageUrl = resolveImageUrl(node.image_path);
  const isRoot = node.type === 'root';
  const label = node.name || (isRoot ? 'Original' : 'Edit');

  return (
    <foreignObject x={x - NODE_W / 2} y={y} width={NODE_W} height={NODE_H}>
      <motion.div
        xmlns="http://www.w3.org/1999/xhtml"
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 24 }}
        onClick={onClick}
        className={`
          relative w-full h-full rounded-lg border cursor-pointer overflow-hidden
          flex flex-col transition-all duration-150
          ${isActive
            ? 'border-adobe-accent shadow-[0_0_0_2px_rgba(99,102,241,0.5)] bg-adobe-panel'
            : 'border-adobe-border bg-adobe-panel hover:border-adobe-accent/50 hover:shadow-md'
          }
        `}
        style={{ boxSizing: 'border-box' }}
      >
        {/* Thumbnail */}
        <div className="flex-1 bg-adobe-darker flex items-center justify-center overflow-hidden">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={label}
              className="w-full h-full object-cover"
              draggable={false}
            />
          ) : (
            <div className="flex flex-col items-center gap-1 text-adobe-textMuted opacity-40">
              {isRoot ? <Folder size={20} /> : <FileImage size={20} />}
            </div>
          )}
        </div>

        {/* Label + status */}
        <div className="px-1.5 py-1 bg-adobe-panel border-t border-adobe-border/50 flex flex-col gap-0.5">
          <p className="text-[10px] font-medium text-adobe-text leading-tight truncate" title={label}>
            {label}
          </p>
          <StatusBadge status={node.status || (isRoot ? 'Original' : 'Completed')} />
        </div>

        {/* Active ring pulse */}
        {isActive && (
          <motion.div
            className="absolute inset-0 rounded-lg border-2 border-adobe-accent pointer-events-none"
            animate={{ opacity: [1, 0.4, 1] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
          />
        )}
      </motion.div>
    </foreignObject>
  );
}

// ─── Layout computation ──────────────────────────────────────────────────────
/**
 * Recursively compute the width of a subtree (used to space siblings).
 */
function subtreeWidth(node) {
  if (!node.children || node.children.length === 0) return NODE_W;
  const childrenWidth = node.children.reduce((sum, c) => sum + subtreeWidth(c), 0);
  const gaps = (node.children.length - 1) * H_GAP;
  return Math.max(NODE_W, childrenWidth + gaps);
}

/**
 * Assign absolute (x, y) positions to every node.
 * `cx` = horizontal centre of the current subtree's bounding box.
 */
function layoutTree(node, cx, y, positions = []) {
  positions.push({ id: node.id, x: cx, y, node });

  if (!node.children || node.children.length === 0) return positions;

  // Lay out children side-by-side, centred under the parent
  const totalWidth = node.children.reduce((sum, c) => sum + subtreeWidth(c), 0)
    + (node.children.length - 1) * H_GAP;

  let childX = cx - totalWidth / 2;
  for (const child of node.children) {
    const sw = subtreeWidth(child);
    layoutTree(child, childX + sw / 2, y + NODE_H + V_GAP, positions);
    childX += sw + H_GAP;
  }

  return positions;
}

/**
 * Generate the SVG <path d="..."> for a curved connector from parent to child.
 */
function makePath(px, py, cx, cy) {
  const midY = (py + NODE_H + cy) / 2;
  return `M ${px} ${py + NODE_H} C ${px} ${midY}, ${cx} ${midY}, ${cx} ${cy}`;
}

// ─── Main component ──────────────────────────────────────────────────────────
function VersionTreeGraph() {
  const { tree, activeNodeId, setActiveNode } = useTreeStore();
  const { setSelectedNode } = useSelectionStore();

  // Pan state for the graph itself
  const svgRef = useRef(null);
  const [graphPan, setGraphPan] = useState({ x: 20, y: 20 });
  const isDragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const panAtStart = useRef({ x: 0, y: 0 });

  // ── Compute layout ──
  const { positions, edges, svgWidth, svgHeight } = useMemo(() => {
    if (!tree) return { positions: [], edges: [], svgWidth: 200, svgHeight: 200 };

    const positions = layoutTree(tree, 0, 0);

    // Build edge list from parent → children
    const edges = [];
    function collectEdges(node) {
      if (!node.children) return;
      for (const child of node.children) {
        const parent = positions.find(p => p.id === node.id);
        const childPos = positions.find(p => p.id === child.id);
        if (parent && childPos) {
          edges.push({ px: parent.x, py: parent.y, cx: childPos.x, cy: childPos.y });
        }
        collectEdges(child);
      }
    }
    collectEdges(tree);

    const xs = positions.map(p => p.x);
    const ys = positions.map(p => p.y);
    const minX = Math.min(...xs) - NODE_W / 2 - 20;
    const maxX = Math.max(...xs) + NODE_W / 2 + 20;
    const maxY = Math.max(...ys) + NODE_H + 20;

    // Shift all positions so minX = 0
    const shiftX = -minX;
    const shifted = positions.map(p => ({ ...p, x: p.x + shiftX }));
    const shiftedEdges = edges.map(e => ({ px: e.px + shiftX, py: e.py, cx: e.cx + shiftX, cy: e.cy }));

    return {
      positions: shifted,
      edges: shiftedEdges,
      svgWidth: maxX - minX,
      svgHeight: maxY + 20,
    };
  }, [tree]);

  // ── Centre graph on mount / tree change ──
  useEffect(() => {
    if (!svgRef.current || svgWidth === 200) return;
    const { width } = svgRef.current.getBoundingClientRect();
    setGraphPan({ x: Math.max(20, (width - svgWidth) / 2), y: 20 });
  }, [svgWidth, tree]);

  // ── Drag-to-pan the graph ──
  const handleMouseDown = useCallback((e) => {
    if (e.target.closest('foreignObject')) return; // let card clicks through
    isDragging.current = true;
    dragStart.current = { x: e.clientX, y: e.clientY };
    panAtStart.current = { ...graphPan };
  }, [graphPan]);

  const handleMouseMove = useCallback((e) => {
    if (!isDragging.current) return;
    setGraphPan({
      x: panAtStart.current.x + (e.clientX - dragStart.current.x),
      y: panAtStart.current.y + (e.clientY - dragStart.current.y),
    });
  }, []);

  const handleMouseUp = useCallback(() => { isDragging.current = false; }, []);

  const handleNodeClick = useCallback((pos) => {
    setActiveNode(pos.id);
    setSelectedNode(pos.id, pos.node);
  }, [setActiveNode, setSelectedNode]);

  // ── No tree yet ──
  if (!tree) {
    return (
      <div className="h-full flex items-center justify-center text-adobe-textMuted">
        <div className="text-center p-6 space-y-3">
          <GitBranch size={36} className="mx-auto opacity-30" />
          <p className="text-sm">No versions yet</p>
          <p className="text-xs opacity-60">Upload an image to start exploring edits</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-adobe-border flex-shrink-0">
        <h3 className="text-sm font-semibold text-adobe-text flex items-center gap-1.5">
          <GitBranch size={14} className="text-adobe-accent" />
          Version Tree
        </h3>
        <span className="text-xs text-adobe-textMuted">
          {positions.length} node{positions.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* SVG graph */}
      <div
        ref={svgRef}
        className="flex-1 overflow-hidden relative"
        style={{ cursor: isDragging.current ? 'grabbing' : 'grab' }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <svg
          width="100%"
          height="100%"
          style={{ position: 'absolute', inset: 0 }}
        >
          <g transform={`translate(${graphPan.x}, ${graphPan.y})`}>
            {/* ── Connector lines ── */}
            {edges.map((e, i) => (
              <path
                key={i}
                d={makePath(e.px, e.py, e.cx, e.cy)}
                fill="none"
                stroke="rgba(99,102,241,0.35)"
                strokeWidth={1.5}
                strokeDasharray="none"
              />
            ))}

            {/* ── Node cards ── */}
            {positions.map((pos) => (
              <TreeNodeCard
                key={pos.id}
                node={pos.node}
                x={pos.x}
                y={pos.y}
                isActive={activeNodeId === pos.id}
                onClick={() => handleNodeClick(pos)}
              />
            ))}
          </g>
        </svg>

        {/* Drag hint */}
        <p className="absolute bottom-2 left-1/2 -translate-x-1/2 text-[10px] text-adobe-textMuted opacity-40 pointer-events-none select-none">
          Drag to pan
        </p>
      </div>
    </div>
  );
}

export default VersionTreeGraph;
