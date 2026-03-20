import type { ManualTool } from "@/components/ManualRedactCanvas";

interface Props {
  activeTool:   ManualTool;
  onToolChange: (t: ManualTool) => void;
  brushSize:    number;
  onBrushSize:  (s: number) => void;
  regionCount:  number;
  onClearAll:   () => void;
  onAutoApply:  () => void;
  hasImage:     boolean;
}

export default function ManualTools({
  activeTool,
  onToolChange,
  brushSize,
  onBrushSize,
  regionCount,
  onClearAll,
  onAutoApply,
  hasImage,
}: Props) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-3 space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-[10px] uppercase tracking-[0.2em] text-[color:var(--muted)]">
          Redact
        </div>
        {regionCount > 0 && (
          <button
            className="text-[10px] text-[color:var(--muted)] hover:text-white/70 transition"
            onClick={onClearAll}
          >
            Clear {regionCount} region{regionCount > 1 ? "s" : ""}
          </button>
        )}
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        {/* Rect tool */}
        <button
          disabled={!hasImage}
          onClick={() => onToolChange(activeTool === "rect" ? "none" : "rect")}
          className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[10px] transition disabled:opacity-30 ${
            activeTool === "rect"
              ? "border-[color:var(--accent)] bg-[color:var(--accent)]/15 text-[color:var(--accent)]"
              : "border-white/10 bg-white/5 text-[color:var(--muted)] hover:bg-white/10"
          }`}
        >
          <svg viewBox="0 0 14 14" fill="none" className="h-3 w-3" stroke="currentColor" strokeWidth="1.4">
            <rect x="1.5" y="3" width="11" height="8" rx="1.2" strokeDasharray="2.5 2" />
          </svg>
          Rect
        </button>

        {/* Brush tool */}
        <button
          disabled={!hasImage}
          onClick={() => onToolChange(activeTool === "brush" ? "none" : "brush")}
          className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[10px] transition disabled:opacity-30 ${
            activeTool === "brush"
              ? "border-[color:var(--accent)] bg-[color:var(--accent)]/15 text-[color:var(--accent)]"
              : "border-white/10 bg-white/5 text-[color:var(--muted)] hover:bg-white/10"
          }`}
        >
          <svg viewBox="0 0 14 14" fill="none" className="h-3 w-3" stroke="currentColor" strokeWidth="1.4">
            <circle cx="7" cy="7" r="4" />
            <circle cx="7" cy="7" r="1.5" fill="currentColor" stroke="none" />
          </svg>
          Brush
        </button>

        {/* Auto-apply detected faces + QR */}
        <button
          disabled={!hasImage}
          onClick={onAutoApply}
          className="ml-auto flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[10px] text-[color:var(--muted)] hover:bg-white/10 transition disabled:opacity-30"
        >
          <svg viewBox="0 0 14 14" fill="none" className="h-3 w-3" stroke="currentColor" strokeWidth="1.4">
            <path d="M7 1.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11z" />
            <path d="M4.5 5.5s.5-1.5 2.5-1.5 2.5 1.5 2.5 1.5" strokeLinecap="round" />
            <circle cx="5" cy="7.5" r="0.8" fill="currentColor" stroke="none" />
            <circle cx="9" cy="7.5" r="0.8" fill="currentColor" stroke="none" />
          </svg>
          Auto
        </button>
      </div>

      {/* Brush size slider */}
      {activeTool === "brush" && (
        <div className="flex items-center gap-3">
          <span className="text-[10px] text-[color:var(--muted)] w-12 shrink-0">
            Size {brushSize}px
          </span>
          <input
            type="range"
            min={20}
            max={120}
            step={4}
            value={brushSize}
            onChange={(e) => onBrushSize(Number(e.target.value))}
            className="flex-1 h-px appearance-none rounded-full bg-white/20 accent-[color:var(--accent)] cursor-pointer"
          />
        </div>
      )}

      {/* Active hint */}
      {activeTool !== "none" && (
        <p className="text-[9px] leading-4 text-[color:var(--muted)] opacity-50">
          {activeTool === "rect"
            ? "Drag to draw a redaction box — click the tool again to stop."
            : "Paint over sensitive areas — release to commit. Adjust size above."}
        </p>
      )}
    </div>
  );
}
