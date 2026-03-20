"use client";

import { useState } from "react";
import { HSLAdjustments, HSLRange } from "@/lib/presets/xmpParser";

// ─── Range definitions ────────────────────────────────────────────────────────

interface RangeMeta {
  label: string;
  dot: string;      // swatch color
  dotDark: string;  // darkened swatch for dark mode
}

const RANGE_META: Record<keyof HSLAdjustments, RangeMeta> = {
  red:     { label: "Red",     dot: "#e05040", dotDark: "#c44434" },
  orange:  { label: "Orange",  dot: "#e07830", dotDark: "#c8642a" },
  yellow:  { label: "Yellow",  dot: "#d4b830", dotDark: "#b8a028" },
  green:   { label: "Green",   dot: "#50b860", dotDark: "#3ea050" },
  aqua:    { label: "Aqua",    dot: "#30b4b0", dotDark: "#289898" },
  blue:    { label: "Blue",    dot: "#4080e0", dotDark: "#3468c8" },
  purple:  { label: "Purple",  dot: "#9050c8", dotDark: "#7838a8" },
  magenta: { label: "Magenta", dot: "#c840a0", dotDark: "#a83488" },
};

const RANGE_ORDER: (keyof HSLAdjustments)[] = [
  "red", "orange", "yellow", "green", "aqua", "blue", "purple", "magenta",
];

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  hsl: HSLAdjustments;
  onChange: (hsl: HSLAdjustments) => void;
}

// ─── Single slider row ────────────────────────────────────────────────────────

function SliderRow({
  label,
  value,
  onChange,
  color,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  color: string;
}) {
  const pct = ((value + 100) / 200) * 100;

  return (
    <div className="flex items-center gap-2">
      <span className="w-3 shrink-0 text-[9px] font-mono uppercase tracking-widest text-[color:var(--muted)]">
        {label}
      </span>
      <div className="relative flex-1">
        <input
          type="range"
          min={-100}
          max={100}
          step={1}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-full range-theme"
          style={{
            background: `linear-gradient(90deg,
              rgba(255,255,255,0.08) 0%,
              ${color}55 ${pct}%,
              rgba(255,255,255,0.05) ${pct}%)`,
          }}
        />
        {/* Zero tick */}
        <div
          className="pointer-events-none absolute top-1/2 -translate-y-1/2 w-px h-2.5 bg-white/20"
          style={{ left: "50%" }}
        />
      </div>
      <span
        className="w-7 shrink-0 text-right text-[10px] font-mono tabular-nums"
        style={{ color: value !== 0 ? color : "var(--muted)" }}
      >
        {value > 0 ? `+${value}` : value}
      </span>
    </div>
  );
}

// ─── Single range accordion ───────────────────────────────────────────────────

function RangeSection({
  rangeKey,
  range,
  onChange,
}: {
  rangeKey: keyof HSLAdjustments;
  range: HSLRange;
  onChange: (r: HSLRange) => void;
}) {
  const meta = RANGE_META[rangeKey];
  const hasAdjustment = range.hue !== 0 || range.saturation !== 0 || range.luminance !== 0;
  const [open, setOpen] = useState(hasAdjustment);

  const update = (key: keyof HSLRange, v: number) => onChange({ ...range, [key]: v });

  return (
    <div className={`rounded-xl border transition-colors ${
      open
        ? "border-white/15 bg-white/5"
        : "border-white/8 bg-transparent hover:border-white/12"
    }`}>
      {/* Header */}
      <button
        className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left"
        onClick={() => setOpen((p) => !p)}
      >
        {/* Color swatch */}
        <span
          className="h-2.5 w-2.5 rounded-full shrink-0 ring-1 ring-white/10"
          style={{ background: meta.dot }}
        />
        <span className="flex-1 text-xs text-[color:var(--text)]">{meta.label}</span>

        {/* Badge when non-zero */}
        {hasAdjustment && !open && (
          <span
            className="rounded-full px-1.5 py-0.5 text-[9px] font-mono"
            style={{ background: `${meta.dot}22`, color: meta.dot }}
          >
            adjusted
          </span>
        )}

        {/* Chevron */}
        <svg
          className={`h-3 w-3 text-[color:var(--muted)] transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5"
        >
          <path d="M2 4.5l4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {/* Sliders */}
      {open && (
        <div className="px-3 pb-3 space-y-2">
          <SliderRow label="H" value={range.hue}        onChange={(v) => update("hue", v)}        color={meta.dot} />
          <SliderRow label="S" value={range.saturation} onChange={(v) => update("saturation", v)} color={meta.dot} />
          <SliderRow label="L" value={range.luminance}  onChange={(v) => update("luminance", v)}  color={meta.dot} />
        </div>
      )}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function HSLPanel({ hsl, onChange }: Props) {
  const updateRange = (key: keyof HSLAdjustments, range: HSLRange) => {
    onChange({ ...hsl, [key]: range });
  };

  const resetAll = () => {
    onChange({
      red:     { hue: 0, saturation: 0, luminance: 0 },
      orange:  { hue: 0, saturation: 0, luminance: 0 },
      yellow:  { hue: 0, saturation: 0, luminance: 0 },
      green:   { hue: 0, saturation: 0, luminance: 0 },
      aqua:    { hue: 0, saturation: 0, luminance: 0 },
      blue:    { hue: 0, saturation: 0, luminance: 0 },
      purple:  { hue: 0, saturation: 0, luminance: 0 },
      magenta: { hue: 0, saturation: 0, luminance: 0 },
    });
  };

  const hasAny = RANGE_ORDER.some((k) => {
    const r = hsl[k];
    return r.hue !== 0 || r.saturation !== 0 || r.luminance !== 0;
  });

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          {/* Mini spectrum strip */}
          <div className="flex rounded overflow-hidden" style={{ height: 8, width: 72 }}>
            {RANGE_ORDER.map((k) => (
              <div
                key={k}
                className="flex-1"
                style={{ background: RANGE_META[k].dot }}
              />
            ))}
          </div>
          <span className="text-[10px] font-mono text-[color:var(--muted)] tracking-widest uppercase">
            HSL
          </span>
        </div>
        {hasAny && (
          <button
            onClick={resetAll}
            className="text-[10px] text-[color:var(--muted)] hover:text-[color:var(--text)] transition-colors"
          >
            reset all
          </button>
        )}
      </div>

      <div className="space-y-1.5">
        {RANGE_ORDER.map((key) => (
          <RangeSection
            key={key}
            rangeKey={key}
            range={hsl[key]}
            onChange={(r) => updateRange(key, r)}
          />
        ))}
      </div>
    </div>
  );
}
