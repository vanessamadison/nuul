"use client";

import { useCallback, useRef, useState } from "react";
import { ToneCurve, CurvePoint, curveSVGPath, identityCurve } from "@/lib/presets/toneCurve";

// ─── Types ────────────────────────────────────────────────────────────────────

type Channel = "rgb" | "r" | "g" | "b";

const CHANNEL_META: Record<Channel, { label: string; color: string; activeColor: string }> = {
  rgb: { label: "·",  color: "rgba(201,162,107,0.55)", activeColor: "rgba(201,162,107,1)" },
  r:   { label: "R",  color: "rgba(230,80,60,0.55)",   activeColor: "rgba(255,90,70,1)"   },
  g:   { label: "G",  color: "rgba(80,185,100,0.55)",  activeColor: "rgba(90,210,110,1)"  },
  b:   { label: "B",  color: "rgba(80,130,230,0.55)",  activeColor: "rgba(90,150,255,1)"  },
};

export interface ToneCurves {
  rgb: ToneCurve;
  r:   ToneCurve;
  g:   ToneCurve;
  b:   ToneCurve;
}

interface Props {
  curves: ToneCurves;
  onChange: (curves: ToneCurves) => void;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const SVG_SIZE = 180;
const POINT_R  = 5;      // control point radius
const HIT_R    = 12;     // hit test radius (larger for easier touch)

// ─── Component ────────────────────────────────────────────────────────────────

export default function ToneCurveEditor({ curves, onChange }: Props) {
  const [activeChannel, setActiveChannel] = useState<Channel>("rgb");
  const [dragging, setDragging]           = useState<number | null>(null);
  const [hovered, setHovered]             = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const currentCurve  = curves[activeChannel];
  const channelColor  = CHANNEL_META[activeChannel].activeColor;

  // ─── SVG coordinate helpers ───────────────────────────────────────────────

  const toSVG = (nx: number, ny: number) => ({
    x: nx * SVG_SIZE,
    y: (1 - ny) * SVG_SIZE,
  });

  const fromSVG = (svgX: number, svgY: number): [number, number] => [
    Math.max(0, Math.min(1, svgX / SVG_SIZE)),
    Math.max(0, Math.min(1, 1 - svgY / SVG_SIZE)),
  ];

  const getSVGCoords = (e: MouseEvent | TouchEvent | React.MouseEvent | React.TouchEvent) => {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const rect = svg.getBoundingClientRect();
    const clientX = "touches" in e ? e.touches[0].clientX : (e as MouseEvent).clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : (e as MouseEvent).clientY;
    return {
      x: ((clientX - rect.left) / rect.width)  * SVG_SIZE,
      y: ((clientY - rect.top)  / rect.height) * SVG_SIZE,
    };
  };

  // ─── Curve mutation helpers ───────────────────────────────────────────────

  const setCurve = useCallback(
    (ch: Channel, curve: ToneCurve) => {
      onChange({ ...curves, [ch]: curve });
    },
    [curves, onChange]
  );

  const sortedPoints = [...currentCurve.points].sort((a, b) => a[0] - b[0]);

  // ─── Drag ─────────────────────────────────────────────────────────────────

  const onPointMouseDown = (e: React.MouseEvent, idx: number) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(idx);

    const onMove = (ev: MouseEvent) => {
      const { x, y } = getSVGCoords(ev);
      const [nx, ny] = fromSVG(x, y);
      const sorted = [...currentCurve.points].sort((a, b) => a[0] - b[0]);
      const sortedIdx = sorted.findIndex((p) => p === currentCurve.points[idx]);

      // Compute clamped position
      let clampedX = nx;
      if (sortedIdx === 0)                    clampedX = 0;
      if (sortedIdx === sorted.length - 1)    clampedX = 1;
      if (sortedIdx > 0)                      clampedX = Math.max(clampedX, sorted[sortedIdx - 1][0] + 0.02);
      if (sortedIdx < sorted.length - 1)      clampedX = Math.min(clampedX, sorted[sortedIdx + 1][0] - 0.02);

      const newPoints = [...currentCurve.points] as CurvePoint[];
      newPoints[idx] = [Math.max(0, Math.min(1, clampedX)), Math.max(0, Math.min(1, ny))];
      setCurve(activeChannel, { points: newPoints });
    };

    const onUp = () => {
      setDragging(null);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };

  // Touch support
  const onPointTouchStart = (e: React.TouchEvent, idx: number) => {
    e.preventDefault();
    setDragging(idx);

    const onMove = (ev: TouchEvent) => {
      const { x, y } = getSVGCoords(ev);
      const [nx, ny] = fromSVG(x, y);
      const sorted = [...currentCurve.points].sort((a, b) => a[0] - b[0]);
      const sortedIdx = sorted.findIndex((p) => p === currentCurve.points[idx]);
      let clampedX = nx;
      if (sortedIdx === 0)                  clampedX = 0;
      if (sortedIdx === sorted.length - 1)  clampedX = 1;
      if (sortedIdx > 0)                    clampedX = Math.max(clampedX, sorted[sortedIdx - 1][0] + 0.02);
      if (sortedIdx < sorted.length - 1)    clampedX = Math.min(clampedX, sorted[sortedIdx + 1][0] - 0.02);
      const newPoints = [...currentCurve.points] as CurvePoint[];
      newPoints[idx] = [Math.max(0, Math.min(1, clampedX)), Math.max(0, Math.min(1, ny))];
      setCurve(activeChannel, { points: newPoints });
    };

    const onEnd = () => {
      setDragging(null);
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend", onEnd);
    };

    window.addEventListener("touchmove", onMove, { passive: false });
    window.addEventListener("touchend", onEnd);
  };

  // ─── Add point on SVG click (not on an existing point) ───────────────────

  const onSVGClick = (e: React.MouseEvent) => {
    if (dragging !== null) return;
    const { x, y } = getSVGCoords(e);
    const [nx, ny] = fromSVG(x, y);

    // Check if clicking near existing point
    for (const pt of currentCurve.points) {
      const svgPt = toSVG(pt[0], pt[1]);
      if (Math.hypot(svgPt.x - x, svgPt.y - y) < HIT_R) return;
    }

    // Add new point
    const newPoints: CurvePoint[] = [...currentCurve.points, [nx, ny]];
    setCurve(activeChannel, { points: newPoints });
  };

  // ─── Remove point on double-click (not endpoints) ────────────────────────

  const onPointDoubleClick = (e: React.MouseEvent, idx: number) => {
    e.preventDefault();
    e.stopPropagation();
    const sorted = [...currentCurve.points].sort((a, b) => a[0] - b[0]);
    const sortedIdx = sorted.findIndex((p) => p === currentCurve.points[idx]);
    // Can't remove first or last point
    if (sortedIdx === 0 || sortedIdx === sorted.length - 1) return;
    const newPoints = currentCurve.points.filter((_, i) => i !== idx);
    setCurve(activeChannel, { points: newPoints as CurvePoint[] });
  };

  // ─── Reset channel ────────────────────────────────────────────────────────

  const resetChannel = () => {
    setCurve(activeChannel, identityCurve);
  };

  // ─── Build SVG path ───────────────────────────────────────────────────────

  const curvePath = curveSVGPath(currentCurve, SVG_SIZE, SVG_SIZE);

  // Grid lines
  const gridLines = [0.25, 0.5, 0.75].map((v) => v * SVG_SIZE);

  return (
    <div className="space-y-3">

      {/* Channel tabs */}
      <div className="flex items-center justify-between">
        <div className="flex gap-1">
          {(["rgb", "r", "g", "b"] as Channel[]).map((ch) => {
            const meta = CHANNEL_META[ch];
            const isActive = activeChannel === ch;
            return (
              <button
                key={ch}
                onClick={() => setActiveChannel(ch)}
                className={`h-6 w-8 rounded-md text-[10px] font-mono uppercase tracking-widest transition-all ${
                  isActive
                    ? "bg-white/20 border border-white/30 text-[color:var(--text)]"
                    : "border border-white/10 bg-white/5 text-[color:var(--muted)] hover:bg-white/10"
                }`}
                style={isActive ? { color: meta.activeColor } : {}}
              >
                {meta.label}
              </button>
            );
          })}
        </div>
        <button
          onClick={resetChannel}
          className="text-[10px] text-[color:var(--muted)] hover:text-[color:var(--text)] transition-colors"
        >
          reset
        </button>
      </div>

      {/* Curve canvas */}
      <div
        className="relative rounded-2xl overflow-hidden border border-white/10 bg-black/20 select-none"
        style={{ width: "100%", aspectRatio: "1 / 1" }}
      >
        <svg
          ref={svgRef}
          viewBox={`0 0 ${SVG_SIZE} ${SVG_SIZE}`}
          width="100%"
          height="100%"
          className="block cursor-crosshair"
          onClick={onSVGClick}
          style={{ touchAction: "none" }}
        >
          {/* Background */}
          <rect width={SVG_SIZE} height={SVG_SIZE} fill="transparent" />

          {/* Grid lines */}
          {gridLines.map((v) => (
            <g key={v}>
              <line
                x1={v} y1={0} x2={v} y2={SVG_SIZE}
                stroke="rgba(255,255,255,0.07)" strokeWidth="0.5"
              />
              <line
                x1={0} y1={v} x2={SVG_SIZE} y2={v}
                stroke="rgba(255,255,255,0.07)" strokeWidth="0.5"
              />
            </g>
          ))}

          {/* Diagonal identity guide */}
          <line
            x1={0} y1={SVG_SIZE} x2={SVG_SIZE} y2={0}
            stroke="rgba(255,255,255,0.12)"
            strokeWidth="0.75"
            strokeDasharray="4 4"
          />

          {/* Curve glow (soft shadow beneath the line) */}
          <path
            d={curvePath}
            fill="none"
            stroke={channelColor.replace("1)", "0.18)")}
            strokeWidth="6"
            strokeLinecap="round"
            style={{ filter: "blur(4px)" }}
          />

          {/* Main curve line */}
          <path
            d={curvePath}
            fill="none"
            stroke={channelColor}
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Control points */}
          {currentCurve.points.map((pt, idx) => {
            const { x, y } = toSVG(pt[0], pt[1]);
            const isDragging = dragging === idx;
            const isHovered  = hovered  === idx;
            const sorted = [...currentCurve.points].sort((a, b) => a[0] - b[0]);
            const isEndpoint = sorted[0] === pt || sorted[sorted.length - 1] === pt;

            return (
              <g key={idx}>
                {/* Hit area (invisible, larger) */}
                <circle
                  cx={x} cy={y}
                  r={HIT_R}
                  fill="transparent"
                  className="cursor-grab"
                  onMouseDown={(e) => onPointMouseDown(e, idx)}
                  onTouchStart={(e) => onPointTouchStart(e, idx)}
                  onDoubleClick={(e) => onPointDoubleClick(e, idx)}
                  onMouseEnter={() => setHovered(idx)}
                  onMouseLeave={() => setHovered(null)}
                  style={{ cursor: isDragging ? "grabbing" : isEndpoint ? "ns-resize" : "grab" }}
                />

                {/* Point ring (visible) */}
                <circle
                  cx={x} cy={y}
                  r={isDragging || isHovered ? POINT_R + 1.5 : POINT_R}
                  fill={isDragging ? channelColor : "rgba(12,10,14,0.9)"}
                  stroke={channelColor}
                  strokeWidth={isDragging ? 1.5 : 1}
                  style={{
                    transition: "r 0.1s ease, fill 0.1s ease",
                    filter: isDragging ? `drop-shadow(0 0 4px ${channelColor})` : "none",
                    pointerEvents: "none",
                  }}
                />

                {/* Center dot */}
                <circle
                  cx={x} cy={y} r={1.5}
                  fill={channelColor}
                  style={{ pointerEvents: "none" }}
                />
              </g>
            );
          })}
        </svg>

        {/* Corner labels */}
        <div className="pointer-events-none absolute bottom-2 left-2 text-[9px] font-mono text-white/20 leading-none">
          0
        </div>
        <div className="pointer-events-none absolute top-2 right-2 text-[9px] font-mono text-white/20 leading-none">
          255
        </div>
      </div>

      {/* Instruction hint */}
      <p className="text-[10px] text-[color:var(--muted)] leading-relaxed">
        Click curve to add points · Drag to adjust · Double-click to remove
      </p>
    </div>
  );
}
