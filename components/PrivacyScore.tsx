"use client";

import { useEffect, useRef, useState } from "react";
import type { ScanFindings } from "@/lib/pipeline/types";

interface Props {
  findings:     ScanFindings | null;
  verified:     { metadataPresent: boolean } | null; // post-export verification
  exported:     boolean;                              // true after any export
}

// ─── Score computation ────────────────────────────────────────────────────────
// Base 40 pts: unconditional — canvas pipeline always strips all metadata.
// Scan findings add up to 60 pts on top.

function computeScore(
  findings: ScanFindings | null,
  verified: { metadataPresent: boolean } | null,
): number {
  if (!findings) return 40; // base only before scan

  let score = 40;
  if (!findings.metadata.gpsPresent)  score += 15;
  if (!findings.metadata.exifPresent) score += 15;
  if (!findings.faces.length)         score += 10;
  if (!findings.codes.length)         score += 10;
  const highTextLeaks = findings.textLeaks.filter((l) => l.confidence === "high").length;
  if (!highTextLeaks)                 score += 10;

  // Post-export: if verified clean, clamp to 100
  if (verified && !verified.metadataPresent) score = Math.max(score, 100);
  // If export verified metadata present, dock 20
  if (verified &&  verified.metadataPresent) score = Math.min(score, 60);

  return Math.min(100, score);
}

// ─── Arc helpers ──────────────────────────────────────────────────────────────

const R   = 44;  // SVG circle radius
const C   = 2 * Math.PI * R;
const GAP = 0.12; // fraction to leave open at bottom

function scoreToOffset(score: number): number {
  const filled = (score / 100) * (1 - GAP);
  return C * (1 - filled);
}

// ─── Color by score ───────────────────────────────────────────────────────────

function scoreColor(score: number, alpha = 1): string {
  if (score >= 85) return `rgba(52, 211, 153, ${alpha})`;  // emerald
  if (score >= 60) return `rgba(201, 162, 107, ${alpha})`; // amber (accent)
  return `rgba(248, 113, 113, ${alpha})`;                  // red
}

// ─── Status line items ────────────────────────────────────────────────────────

interface StatusItem {
  label: string;
  state: "ok" | "warn" | "info";
}

function buildStatus(
  findings: ScanFindings | null,
  verified: { metadataPresent: boolean } | null,
  exported: boolean,
): StatusItem[] {
  const items: StatusItem[] = [
    { label: "Metadata stripped on export",  state: "ok"   },
    { label: "Canvas re-encode (zero carry)", state: "ok"   },
  ];

  if (!findings) {
    items.push({ label: "Scan pending…", state: "info" });
    return items;
  }

  items.push({
    label: findings.metadata.gpsPresent  ? "GPS coordinates detected" : "No GPS found",
    state: findings.metadata.gpsPresent  ? "warn" : "ok",
  });
  items.push({
    label: findings.metadata.exifPresent ? "EXIF metadata detected" : "No EXIF found",
    state: findings.metadata.exifPresent ? "warn" : "ok",
  });

  const highText = findings.textLeaks.filter((l) => l.confidence === "high").length;
  if (highText) {
    items.push({ label: `${highText} high-conf. text leak${highText > 1 ? "s" : ""} visible`, state: "warn" });
  } else {
    items.push({ label: "No high-confidence text leaks", state: "ok" });
  }

  if (findings.faces.length) {
    items.push({ label: `${findings.faces.length} face${findings.faces.length > 1 ? "s" : ""} visible — use blur`, state: "warn" });
  }
  if (findings.codes.length) {
    items.push({ label: `${findings.codes.length} QR code${findings.codes.length > 1 ? "s" : ""} visible — auto-blurred`, state: "ok" });
  }

  if (exported && verified) {
    items.push({
      label: verified.metadataPresent
        ? "⚠ Export: residual metadata — try PNG"
        : "✓ Export verified metadata-free",
      state: verified.metadataPresent ? "warn" : "ok",
    });
  }

  return items;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function PrivacyScore({ findings, verified, exported }: Props) {
  const targetScore = computeScore(findings, verified);
  const [displayScore, setDisplayScore] = useState(0);
  const animRef = useRef<number | null>(null);
  const prevTarget = useRef(0);

  // Animate score ring
  useEffect(() => {
    const start  = prevTarget.current;
    const end    = targetScore;
    const dur    = 700;
    const t0     = performance.now();

    if (animRef.current) cancelAnimationFrame(animRef.current);

    const tick = (now: number) => {
      const p = Math.min(1, (now - t0) / dur);
      // ease out cubic
      const e = 1 - Math.pow(1 - p, 3);
      setDisplayScore(Math.round(start + (end - start) * e));
      if (p < 1) animRef.current = requestAnimationFrame(tick);
      else prevTarget.current = end;
    };
    animRef.current = requestAnimationFrame(tick);
    return () => { if (animRef.current) cancelAnimationFrame(animRef.current); };
  }, [targetScore]);

  const offset = scoreToOffset(displayScore);
  const color  = scoreColor(displayScore);
  const status = buildStatus(findings, verified, exported);

  const confirmedClean = exported && verified && !verified.metadataPresent;

  return (
    <div className="space-y-4">
      {/* Ring */}
      <div className="flex items-center gap-5">
        <div className="relative flex-shrink-0">
          <svg width="100" height="100" viewBox="0 0 100 100">
            {/* Glow filter */}
            <defs>
              <filter id="ring-glow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
              </filter>
            </defs>
            {/* Track */}
            <circle
              cx="50" cy="50" r={R}
              fill="none"
              stroke="rgba(255,255,255,0.08)"
              strokeWidth="7"
              strokeDasharray={`${C * (1 - GAP)} ${C * GAP}`}
              strokeDashoffset={C * GAP * 0.5}
              strokeLinecap="round"
              transform="rotate(90 50 50)"
              style={{ transformOrigin: "50px 50px" }}
            />
            {/* Fill arc */}
            <circle
              cx="50" cy="50" r={R}
              fill="none"
              stroke={color}
              strokeWidth="7"
              strokeDasharray={`${C * (1 - GAP)} ${C * GAP}`}
              strokeDashoffset={offset + C * GAP * 0.5}
              strokeLinecap="round"
              transform="rotate(90 50 50)"
              style={{
                transformOrigin: "50px 50px",
                filter: `drop-shadow(0 0 5px ${scoreColor(displayScore, 0.5)})`,
                transition: "stroke 0.4s ease",
              }}
            />
          </svg>

          {/* Score number overlay */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span
              className="text-2xl font-semibold leading-none tabular-nums"
              style={{ color }}
            >
              {displayScore}
            </span>
            <span className="mt-0.5 text-[8px] uppercase tracking-[0.2em] text-[color:var(--muted)]">
              nuul
            </span>
          </div>
        </div>

        {/* Right — label + confirmed badge */}
        <div className="min-w-0">
          <div className="text-xs uppercase tracking-[0.2em] text-[color:var(--muted)]">
            Privacy Score
          </div>
          <div className="mt-1 text-sm font-medium" style={{ color }}>
            {displayScore >= 90
              ? "Highly Secure"
              : displayScore >= 70
              ? "Secure"
              : displayScore >= 50
              ? "Review Needed"
              : "Risks Present"}
          </div>
          {confirmedClean && (
            <div className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2.5 py-1 text-[10px] text-emerald-400">
              <svg viewBox="0 0 12 12" fill="none" className="h-2.5 w-2.5" stroke="currentColor" strokeWidth="2">
                <path d="M2 6l3 3 5-5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Export confirmed clean
            </div>
          )}
          {!findings && (
            <div className="mt-1 text-[10px] text-[color:var(--muted)] opacity-60">
              Load a photo to scan
            </div>
          )}
        </div>
      </div>

      {/* Status list */}
      <div className="space-y-1.5">
        {status.map((item) => (
          <div key={item.label} className="flex items-start gap-2">
            <span className="mt-[3px] flex-shrink-0">
              {item.state === "ok"   && <span className="block h-1.5 w-1.5 rounded-full bg-emerald-400/70" />}
              {item.state === "warn" && <span className="block h-1.5 w-1.5 rounded-full bg-amber-400/70" />}
              {item.state === "info" && <span className="block h-1.5 w-1.5 rounded-full bg-white/20" />}
            </span>
            <span className={`text-[10px] leading-4 ${
              item.state === "ok"   ? "text-[color:var(--muted)]"
              : item.state === "warn" ? "text-amber-300/80"
              : "text-[color:var(--muted)] opacity-50"
            }`}>
              {item.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
