"use client";

import { useCallback, useEffect, useRef } from "react";

export type ManualTool = "none" | "brush" | "rect";

// Stored as normalized (0–1) in image coordinate space
export interface ManualRegion {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface Props {
  activeTool:   ManualTool;
  bitmap:       ImageBitmap | null;
  regions:      ManualRegion[];
  onAddRegion:  (r: ManualRegion) => void;
  brushSize?:   number; // display-px diameter, default 52
}

// ─── Object-contain letterbox math ───────────────────────────────────────────

function imgRect(cW: number, cH: number, iW: number, iH: number) {
  const ca = cW / cH;
  const ia = iW / iH;
  if (ia > ca) {
    const dh = cW / ia;
    return { x: 0, y: (cH - dh) / 2, w: cW, h: dh };
  }
  const dw = cH * ia;
  return { x: (cW - dw) / 2, y: 0, w: dw, h: cH };
}

// Convert canvas-px → normalized image coord (0–1), clamped
function toNorm(cx: number, cy: number, ir: ReturnType<typeof imgRect>) {
  return {
    nx: Math.max(0, Math.min(1, (cx - ir.x) / ir.w)),
    ny: Math.max(0, Math.min(1, (cy - ir.y) / ir.h)),
  };
}

// Convert norm → canvas-px
function fromNorm(nx: number, ny: number, ir: ReturnType<typeof imgRect>) {
  return { cx: ir.x + nx * ir.w, cy: ir.y + ny * ir.h };
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ManualRedactCanvas({
  activeTool,
  bitmap,
  regions,
  onAddRegion,
  brushSize = 52,
}: Props) {
  const canvasRef   = useRef<HTMLCanvasElement>(null);
  const dragging    = useRef(false);
  const dragStart   = useRef<{ x: number; y: number } | null>(null);
  const strokePts   = useRef<{ x: number; y: number }[]>([]);
  const cursorPos   = useRef<{ x: number; y: number } | null>(null);

  // ─── Draw ──────────────────────────────────────────────────────────────────

  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const W = canvas.width;
    const H = canvas.height;
    ctx.clearRect(0, 0, W, H);
    if (!bitmap) return;

    const ir = imgRect(W, H, bitmap.width, bitmap.height);

    // ── Draw committed regions with real blur preview ──────────────────────
    for (const r of regions) {
      const { cx: rx, cy: ry } = fromNorm(r.x, r.y, ir);
      const rw = r.w * ir.w;
      const rh = r.h * ir.h;

      // Clip → blur-draw source bitmap → tint → dashed border
      ctx.save();
      ctx.beginPath();
      ctx.rect(rx, ry, rw, rh);
      ctx.clip();
      ctx.filter = "blur(16px) saturate(0.5)";
      ctx.drawImage(bitmap, ir.x, ir.y, ir.w, ir.h);
      ctx.filter = "none";
      // Warm tint overlay
      ctx.fillStyle = "rgba(201,162,107,0.12)";
      ctx.fillRect(rx, ry, rw, rh);
      ctx.restore();

      // Dashed amber border
      ctx.save();
      ctx.strokeStyle = "rgba(201,162,107,0.6)";
      ctx.lineWidth = 1.5;
      ctx.setLineDash([5, 4]);
      ctx.strokeRect(rx + 1, ry + 1, rw - 2, rh - 2);
      ctx.restore();

      // "blurred" label inside large enough regions
      if (rw > 60 && rh > 22) {
        ctx.save();
        ctx.fillStyle = "rgba(201,162,107,0.55)";
        ctx.font = "9px system-ui";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("blurred", rx + rw / 2, ry + rh / 2);
        ctx.restore();
      }
    }

    // ── Live rect drag preview ─────────────────────────────────────────────
    if (activeTool === "rect" && dragging.current && dragStart.current && cursorPos.current) {
      const { x: sx, y: sy } = dragStart.current;
      const { x: ex, y: ey } = cursorPos.current;
      const x = Math.min(sx, ex), y = Math.min(sy, ey);
      const w = Math.abs(ex - sx), h = Math.abs(ey - sy);
      ctx.save();
      ctx.fillStyle = "rgba(255,255,255,0.05)";
      ctx.fillRect(x, y, w, h);
      ctx.strokeStyle = "rgba(255,255,255,0.75)";
      ctx.lineWidth = 1.5;
      ctx.setLineDash([5, 4]);
      ctx.strokeRect(x, y, w, h);
      ctx.restore();
    }

    // ── Brush cursor ring ──────────────────────────────────────────────────
    if (activeTool === "brush" && cursorPos.current) {
      const { x, y } = cursorPos.current;
      const r = brushSize / 2;
      ctx.save();
      // If dragging: show filled preview of brush stamp
      if (dragging.current) {
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.clip();
        ctx.filter = "blur(16px) saturate(0.5)";
        ctx.drawImage(bitmap, ir.x, ir.y, ir.w, ir.h);
        ctx.filter = "none";
        ctx.fillStyle = "rgba(201,162,107,0.12)";
        ctx.fillRect(x - r, y - r, r * 2, r * 2);
      }
      ctx.restore();
      // Outer ring
      ctx.save();
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.strokeStyle = dragging.current
        ? "rgba(201,162,107,0.8)"
        : "rgba(255,255,255,0.65)";
      ctx.lineWidth = 1.5;
      ctx.stroke();
      // Center dot
      ctx.beginPath();
      ctx.arc(x, y, 2, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(255,255,255,0.7)";
      ctx.fill();
      ctx.restore();
    }
  }, [bitmap, regions, activeTool, brushSize]);

  // ─── Sync canvas size to DOM ───────────────────────────────────────────────

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ro = new ResizeObserver(() => {
      canvas.width  = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
      redraw();
    });
    ro.observe(canvas);
    canvas.width  = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    redraw();
    return () => ro.disconnect();
  }, [redraw]);

  // Redraw on any dep change
  useEffect(() => { redraw(); }, [redraw]);

  // ─── Pointer events ───────────────────────────────────────────────────────

  const getLocal = (e: React.PointerEvent) => {
    const r = canvasRef.current?.getBoundingClientRect();
    if (!r) return { x: 0, y: 0 };
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (activeTool === "none") return;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    dragging.current = true;
    const pos = getLocal(e);
    dragStart.current = pos;
    strokePts.current = [pos];
    cursorPos.current = pos;
    redraw();
  };

  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const pos = getLocal(e);
    cursorPos.current = pos;
    if (dragging.current) {
      strokePts.current.push(pos);
    }
    redraw();
  };

  const onPointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!dragging.current) return;
    dragging.current = false;
    const canvas = canvasRef.current;

    if (activeTool === "rect" && dragStart.current && canvas && bitmap) {
      const end = getLocal(e);
      const ir = imgRect(canvas.width, canvas.height, bitmap.width, bitmap.height);
      const { nx: x1, ny: y1 } = toNorm(dragStart.current.x, dragStart.current.y, ir);
      const { nx: x2, ny: y2 } = toNorm(end.x, end.y, ir);
      const x = Math.min(x1, x2), y = Math.min(y1, y2);
      const w = Math.abs(x2 - x1), h = Math.abs(y2 - y1);
      if (w > 0.01 && h > 0.01) onAddRegion({ x, y, w, h });
    }

    if (activeTool === "brush" && strokePts.current.length && canvas && bitmap) {
      const ir = imgRect(canvas.width, canvas.height, bitmap.width, bitmap.height);
      const halfR = (brushSize / 2) / ir.w;
      const halfRh = (brushSize / 2) / ir.h;
      // Bounding box of all stroke points + brush radius
      let minNx = 1, minNy = 1, maxNx = 0, maxNy = 0;
      for (const pt of strokePts.current) {
        const { nx, ny } = toNorm(pt.x, pt.y, ir);
        minNx = Math.min(minNx, nx - halfR);
        minNy = Math.min(minNy, ny - halfRh);
        maxNx = Math.max(maxNx, nx + halfR);
        maxNy = Math.max(maxNy, ny + halfRh);
      }
      const x = Math.max(0, minNx), y = Math.max(0, minNy);
      const w = Math.min(1 - x, maxNx - minNx), h = Math.min(1 - y, maxNy - minNy);
      if (w > 0.005 && h > 0.005) onAddRegion({ x, y, w, h });
    }

    dragStart.current = null;
    strokePts.current = [];
    redraw();
  };

  const onPointerLeave = () => {
    cursorPos.current = null;
    redraw();
  };

  // Canvas invisible when no tool active — no pointer event interception
  if (activeTool === "none") {
    // Still render so committed regions are visible
    return (
      <canvas
        ref={canvasRef}
        className="pointer-events-none absolute inset-0 h-full w-full"
      />
    );
  }

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 h-full w-full"
      style={{
        cursor: activeTool === "brush" ? "none" : "crosshair",
        touchAction: "none",
      }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onPointerLeave={onPointerLeave}
    />
  );
}
