"use client";

import { useCallback, useRef, useState } from "react";

interface Props {
  before: string | null;
  after:  string | null;
}

export default function BeforeAfterScrubber({ before, after }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState(0.5);
  const dragging = useRef(false);

  const updatePos = useCallback((clientX: number) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    setPos(Math.max(0.01, Math.min(0.99, (clientX - rect.left) / rect.width)));
  }, []);

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    dragging.current = true;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    updatePos(e.clientX);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragging.current) return;
    updatePos(e.clientX);
  };

  const onPointerUp = () => { dragging.current = false; };

  // Nothing loaded yet — show empty state
  if (!before && !after) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-4">
        <div className="h-20 w-20 rounded-3xl border border-white/10 bg-white/5 flex items-center justify-center">
          <svg viewBox="0 0 32 32" fill="none" className="h-8 w-8 opacity-25" stroke="currentColor" strokeWidth="1.2">
            <rect x="4" y="6" width="24" height="20" rx="3" />
            <circle cx="11" cy="13" r="2.5" />
            <path d="M4 22l7-6 5 5 4-4 8 7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <span className="text-[10px] uppercase tracking-[0.25em] text-[color:var(--muted)] opacity-60">
          Drop a photo to preview
        </span>
      </div>
    );
  }

  // Only original loaded (filter still rendering)
  if (!after) {
    return (
      <div className="relative h-full w-full overflow-hidden rounded-2xl">
        <img
          src={before!}
          alt="Preview"
          className="h-full w-full object-contain"
          draggable={false}
        />
        <div className="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full border border-white/10 bg-black/40 px-3 py-1 text-[9px] uppercase tracking-[0.25em] text-white/40 backdrop-blur">
          Rendering…
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="relative h-full w-full overflow-hidden rounded-2xl cursor-ew-resize select-none"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      {/* Before — full base layer */}
      <img
        src={before || after}
        alt="Original"
        className="absolute inset-0 h-full w-full object-contain"
        draggable={false}
      />

      {/* After — clip to left of divider */}
      <img
        src={after}
        alt="Filtered"
        className="absolute inset-0 h-full w-full object-contain"
        style={{ clipPath: `inset(0 ${(1 - pos) * 100}% 0 0)` }}
        draggable={false}
      />

      {/* Divider line with soft fade at top/bottom */}
      <div
        className="pointer-events-none absolute inset-y-0 w-px"
        style={{
          left: `${pos * 100}%`,
          transform: "translateX(-50%)",
          background:
            "linear-gradient(to bottom, transparent 0%, rgba(255,255,255,0.65) 18%, rgba(255,255,255,0.65) 82%, transparent 100%)",
        }}
      />

      {/* Drag handle */}
      <div
        className="pointer-events-none absolute top-1/2 -translate-y-1/2 -translate-x-1/2 h-9 w-9 rounded-full border border-white/25 bg-black/50 backdrop-blur-sm flex items-center justify-center shadow-lg"
        style={{ left: `${pos * 100}%` }}
      >
        <svg viewBox="0 0 20 20" fill="none" className="h-[14px] w-[14px]" stroke="rgba(255,255,255,0.75)" strokeWidth="1.6">
          <path d="M7 5l-4 5 4 5M13 5l4 5-4 5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>

      {/* Labels */}
      <div className="pointer-events-none absolute bottom-3 left-3 rounded-full bg-black/35 px-2.5 py-0.5 text-[9px] uppercase tracking-[0.2em] text-white/50 backdrop-blur">
        Original
      </div>
      <div className="pointer-events-none absolute bottom-3 right-3 rounded-full bg-black/35 px-2.5 py-0.5 text-[9px] uppercase tracking-[0.2em] text-white/50 backdrop-blur">
        Filtered
      </div>
    </div>
  );
}
