"use client";

import { useEffect, useRef, useState } from "react";
import AppShell from "@/components/AppShell";
import GradientBackdrop from "@/components/GradientBackdrop";
import Link from "next/link";

// ─── Types ────────────────────────────────────────────────────────────────────

interface FileInfo {
  name: string;
  type: string;
  size: number;
  width: number;
  height: number;
}

interface ReceiptAction {
  label: string;
  detail?: string;
}

interface ParsedReceipt {
  timestamp: string;
  original:  FileInfo;
  exported:  FileInfo;
  found:     ReceiptAction[];
  changed:   ReceiptAction[];
  remaining: ReceiptAction[];
  tips:      string[];
  raw:       string;
}

const receiptKey = "nuul-receipts";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  const d     = new Date(iso);
  const now   = new Date();
  const today = now.toDateString() === d.toDateString();
  const yesterday = new Date(now.getTime() - 86400000).toDateString() === d.toDateString();
  const time  = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  if (today)     return `Today · ${time}`;
  if (yesterday) return `Yesterday · ${time}`;
  return d.toLocaleDateString([], { month: "short", day: "numeric" }) + ` · ${time}`;
}

function sizeDelta(original: number, exported: number): { label: string; positive: boolean } {
  if (!original) return { label: "—", positive: true };
  const pct = ((exported - original) / original) * 100;
  const sign = pct <= 0 ? "–" : "+";
  return { label: `${sign}${Math.abs(pct).toFixed(0)}%`, positive: pct <= 0 };
}

function formatBytes(b: number): string {
  if (b < 1024)       return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1024 / 1024).toFixed(2)} MB`;
}

// Compute a privacy score from the receipt (mirrors PrivacyScore logic)
function receiptScore(r: ParsedReceipt): number {
  let score = 40; // base: metadata always stripped via canvas
  const foundLabels = r.found.map((f) => f.label.toLowerCase());
  if (!foundLabels.some((l) => l.includes("gps")))       score += 15;
  if (!foundLabels.some((l) => l.includes("exif") || l.includes("metadata"))) score += 15;
  if (!foundLabels.some((l) => l.includes("face")))      score += 10;
  if (!foundLabels.some((l) => l.includes("qr")))        score += 10;
  if (!foundLabels.some((l) => l.includes("text") || l.includes("leak"))) score += 10;
  return Math.min(100, score);
}

function scoreColor(s: number): string {
  if (s >= 85) return "rgba(52,211,153,1)";
  if (s >= 60) return "rgba(201,162,107,1)";
  return "rgba(248,113,113,1)";
}

// ─── Mini score ring ──────────────────────────────────────────────────────────

function MiniRing({ score }: { score: number }) {
  const R = 14, C = 2 * Math.PI * R, gap = 0.12;
  const filled = (score / 100) * (1 - gap);
  const offset = C * (1 - filled) + C * gap * 0.5;
  const col = scoreColor(score);
  return (
    <svg width="36" height="36" viewBox="0 0 36 36" className="flex-shrink-0">
      <circle cx="18" cy="18" r={R} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="3"
        strokeDasharray={`${C * (1 - gap)} ${C * gap}`} strokeDashoffset={C * gap * 0.5}
        strokeLinecap="round" transform="rotate(90 18 18)" style={{ transformOrigin: "18px 18px" }} />
      <circle cx="18" cy="18" r={R} fill="none" stroke={col} strokeWidth="3"
        strokeDasharray={`${C * (1 - gap)} ${C * gap}`} strokeDashoffset={offset}
        strokeLinecap="round" transform="rotate(90 18 18)" style={{ transformOrigin: "18px 18px", filter: `drop-shadow(0 0 3px ${col.replace("1)", "0.4)")})` }} />
      <text x="18" y="22" textAnchor="middle" fontSize="8" fill={col} fontWeight="600">{score}</text>
    </svg>
  );
}

// ─── Receipt card (expanded detail) ──────────────────────────────────────────

function ReceiptDetail({ receipt, onDownload }: {
  receipt: ParsedReceipt;
  onDownload: () => void;
}) {
  const score = receiptScore(receipt);
  const delta = sizeDelta(receipt.original.size, receipt.exported.size);

  const sections: { label: string; items: ReceiptAction[]; dot: string }[] = [
    { label: "Found",   items: receipt.found,     dot: "bg-amber-400/70" },
    { label: "Changed", items: receipt.changed,   dot: "bg-emerald-400/70" },
    { label: "Remains", items: receipt.remaining, dot: "bg-white/30" },
  ];

  return (
    <div className="space-y-5">
      {/* Score + file summary */}
      <div className="flex items-start gap-4">
        <div className="flex flex-col items-center gap-1">
          <MiniRing score={score} />
          <span className="text-[8px] uppercase tracking-[0.15em]" style={{ color: scoreColor(score) }}>
            {score >= 85 ? "secure" : score >= 60 ? "review" : "risk"}
          </span>
        </div>
        <div className="min-w-0 flex-1 space-y-1">
          <div className="truncate text-xs font-medium text-white/80" title={receipt.original.name}>
            {receipt.original.name}
          </div>
          <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] text-[color:var(--muted)]">
            <span>{receipt.original.width} × {receipt.original.height}</span>
            <span>{formatBytes(receipt.original.size)} → {formatBytes(receipt.exported.size)}</span>
            <span className={delta.positive ? "text-emerald-400/80" : "text-amber-400/80"}>
              {delta.label}
            </span>
          </div>
          <div className="text-[9px] uppercase tracking-[0.2em] text-[color:var(--muted)]">
            {receipt.exported.type.replace("image/", "")} export
          </div>
        </div>
      </div>

      {/* Sections */}
      <div className="space-y-4">
        {sections.map(({ label, items, dot }) => (
          items.length > 0 && (
            <div key={label}>
              <div className="mb-1.5 text-[9px] uppercase tracking-[0.25em] text-[color:var(--muted)]">
                {label}
              </div>
              <div className="space-y-1">
                {items.map((item, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <span className={`mt-[5px] h-1.5 w-1.5 flex-shrink-0 rounded-full ${dot}`} />
                    <span className="text-[11px] leading-5 text-white/60">
                      {item.label}
                      {item.detail && (
                        <span className="ml-1 text-[color:var(--muted)]">· {item.detail}</span>
                      )}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )
        ))}
      </div>

      {/* Tip */}
      {receipt.tips[0] && (
        <div className="rounded-xl border border-white/8 bg-white/5 px-3 py-2 text-[10px] leading-4 text-[color:var(--muted)]">
          {receipt.tips[0]}
        </div>
      )}

      {/* Download */}
      <button
        onClick={onDownload}
        className="flex w-full items-center justify-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-[10px] uppercase tracking-[0.2em] text-[color:var(--muted)] transition hover:bg-white/10 hover:text-white/70"
      >
        <svg viewBox="0 0 12 12" fill="none" className="h-3 w-3" stroke="currentColor" strokeWidth="1.5">
          <path d="M6 1v6M3 5l3 3 3-3M1 10h10" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Download receipt JSON
      </button>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ReceiptsPage() {
  const [receipts,  setReceipts]  = useState<ParsedReceipt[]>([]);
  const [activeIdx, setActiveIdx] = useState<number>(0);
  const [loaded,    setLoaded]    = useState(false);
  const detailRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const stored = JSON.parse(window.localStorage.getItem(receiptKey) ?? "[]") as string[];
    const parsed = stored.flatMap((entry) => {
      try {
        const json = JSON.parse(entry) as {
          timestamp: string;
          original:  FileInfo;
          exported:  FileInfo;
          found?:    ReceiptAction[];
          changed:   ReceiptAction[];
          remaining?: ReceiptAction[];
          tips?:     string[];
        };
        return [{
          timestamp: json.timestamp,
          original:  json.original,
          exported:  json.exported,
          found:     json.found    ?? [],
          changed:   json.changed  ?? [],
          remaining: json.remaining ?? [],
          tips:      json.tips     ?? [],
          raw:       entry,
        } satisfies ParsedReceipt];
      } catch { return []; }
    });
    setReceipts(parsed);
    setLoaded(true);
  }, []);

  const downloadOne = (raw: string, name: string) => {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([raw], { type: "application/json" }));
    a.download = `nuul-receipt-${name}.json`;
    a.click();
  };

  const downloadAll = () => {
    const bundle = receipts.map((r) => JSON.parse(r.raw));
    const a = document.createElement("a");
    a.href = URL.createObjectURL(
      new Blob([JSON.stringify(bundle, null, 2)], { type: "application/json" })
    );
    a.download = `nuul-receipts-all-${Date.now()}.json`;
    a.click();
  };

  const clearAll = () => {
    if (window.confirm("Clear all local receipts? This cannot be undone.")) {
      window.localStorage.removeItem(receiptKey);
      setReceipts([]);
    }
  };

  const active = receipts[activeIdx] ?? null;

  return (
    <div className="relative min-h-screen bg-black text-white">
      <GradientBackdrop />
      <AppShell>
        {/* Header */}
        <div className="mb-6 flex items-end justify-between">
          <div>
            <div className="text-[9px] uppercase tracking-[0.35em] text-[color:var(--muted)]">
              Audit ledger
            </div>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight">Receipts</h1>
            <p className="mt-1 text-xs text-[color:var(--muted)]">
              Every export generates a signed local receipt. No data ever leaves your device.
            </p>
          </div>

          {receipts.length > 0 && (
            <div className="flex items-center gap-2 pb-1">
              <button
                onClick={downloadAll}
                className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[10px] uppercase tracking-[0.18em] text-[color:var(--muted)] transition hover:bg-white/10 hover:text-white/70"
              >
                <svg viewBox="0 0 12 12" fill="none" className="h-2.5 w-2.5" stroke="currentColor" strokeWidth="1.5">
                  <path d="M6 1v6M3 5l3 3 3-3M1 10h10" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Export all
              </button>
              <button
                onClick={clearAll}
                className="rounded-full border border-white/8 bg-transparent px-3 py-1.5 text-[10px] uppercase tracking-[0.18em] text-[color:var(--muted)] transition hover:border-red-400/30 hover:text-red-400/70"
              >
                Clear
              </button>
            </div>
          )}
        </div>

        {!loaded ? (
          <div className="flex h-40 items-center justify-center text-[color:var(--muted)] text-xs animate-pulse">
            Loading receipts…
          </div>
        ) : receipts.length === 0 ? (
          /* ── Empty state ── */
          <div className="flex flex-col items-center gap-6 py-24 text-center">
            <div className="relative">
              <div className="h-20 w-20 rounded-3xl border border-white/10 bg-white/5 flex items-center justify-center">
                <svg viewBox="0 0 32 32" fill="none" className="h-8 w-8 opacity-20" stroke="currentColor" strokeWidth="1.2">
                  <path d="M8 4h12l6 6v18a2 2 0 01-2 2H8a2 2 0 01-2-2V6a2 2 0 012-2z" />
                  <path d="M20 4v6h6" strokeLinecap="round" />
                  <path d="M11 16h10M11 20h7" strokeLinecap="round" />
                </svg>
              </div>
              <div className="absolute -right-1 -top-1 h-5 w-5 rounded-full border border-white/10 bg-black flex items-center justify-center">
                <span className="text-[8px] text-[color:var(--muted)]">0</span>
              </div>
            </div>
            <div className="space-y-1">
              <div className="text-sm font-medium text-white/60">No receipts yet</div>
              <div className="text-xs text-[color:var(--muted)]">
                Export a photo from the studio to generate your first audit receipt.
              </div>
            </div>
            <Link
              href="/studio"
              className="rounded-full border border-white/15 bg-white/5 px-5 py-2.5 text-xs uppercase tracking-[0.2em] text-white/60 transition hover:bg-white/10 hover:text-white/80"
            >
              Open Studio
            </Link>
          </div>
        ) : (
          /* ── Timeline + detail ── */
          <div className="grid gap-6 lg:grid-cols-[1fr_320px]">

            {/* Left — timeline list */}
            <div className="relative space-y-0">
              {/* Vertical line */}
              <div className="pointer-events-none absolute bottom-4 left-[17px] top-4 w-px bg-white/8" />

              {receipts.map((r, i) => {
                const score = receiptScore(r);
                const delta = sizeDelta(r.original.size, r.exported.size);
                const isActive = i === activeIdx;

                return (
                  <button
                    key={r.timestamp + i}
                    onClick={() => {
                      setActiveIdx(i);
                      detailRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
                    }}
                    className={`relative flex w-full items-start gap-4 rounded-2xl px-4 py-4 text-left transition ${
                      isActive
                        ? "bg-white/8 ring-1 ring-white/12"
                        : "hover:bg-white/5"
                    }`}
                  >
                    {/* Timeline node */}
                    <div className="relative z-10 mt-1 flex-shrink-0">
                      <div className={`h-[9px] w-[9px] rounded-full ring-2 transition ${
                        isActive
                          ? "bg-white/80 ring-white/20"
                          : "bg-white/20 ring-black hover:bg-white/40"
                      }`} />
                    </div>

                    {/* Content */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] text-[color:var(--muted)]">
                          {formatDate(r.timestamp)}
                        </span>
                        <span className={`text-[10px] tabular-nums ${
                          delta.positive ? "text-emerald-400/70" : "text-amber-400/70"
                        }`}>
                          {delta.label}
                        </span>
                      </div>

                      <div className="mt-0.5 flex items-center justify-between gap-2">
                        <span className="truncate text-xs font-medium text-white/75" title={r.original.name}>
                          {r.original.name}
                        </span>
                        <MiniRing score={score} />
                      </div>

                      <div className="mt-1 flex flex-wrap gap-1.5">
                        {r.remaining.length > 0 && (
                          <span className="rounded-full border border-amber-400/20 bg-amber-400/8 px-2 py-0.5 text-[9px] text-amber-400/70">
                            {r.remaining.length} flagged
                          </span>
                        )}
                        {r.changed.slice(0, 2).map((c, ci) => (
                          <span key={ci} className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[9px] text-[color:var(--muted)]">
                            {c.label.length > 28 ? c.label.slice(0, 28) + "…" : c.label}
                          </span>
                        ))}
                        {r.changed.length > 2 && (
                          <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[9px] text-[color:var(--muted)]">
                            +{r.changed.length - 2} more
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Right — detail panel */}
            <div
              ref={detailRef}
              className="lg:sticky lg:top-6 lg:self-start"
            >
              <div className="rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur">
                <div className="mb-4 flex items-center justify-between">
                  <div className="text-[9px] uppercase tracking-[0.3em] text-[color:var(--muted)]">
                    Receipt {activeIdx + 1} of {receipts.length}
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      disabled={activeIdx === 0}
                      onClick={() => setActiveIdx((p) => p - 1)}
                      className="rounded-full border border-white/10 p-1 text-[color:var(--muted)] transition hover:bg-white/10 disabled:opacity-20"
                    >
                      <svg viewBox="0 0 12 12" fill="none" className="h-3 w-3" stroke="currentColor" strokeWidth="1.5">
                        <path d="M8 2L4 6l4 4" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </button>
                    <button
                      disabled={activeIdx === receipts.length - 1}
                      onClick={() => setActiveIdx((p) => p + 1)}
                      className="rounded-full border border-white/10 p-1 text-[color:var(--muted)] transition hover:bg-white/10 disabled:opacity-20"
                    >
                      <svg viewBox="0 0 12 12" fill="none" className="h-3 w-3" stroke="currentColor" strokeWidth="1.5">
                        <path d="M4 2l4 4-4 4" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </button>
                  </div>
                </div>

                {active && (
                  <ReceiptDetail
                    receipt={active}
                    onDownload={() => downloadOne(
                      active.raw,
                      active.original.name.replace(/\.[^.]+$/, "") + `-${Date.now()}`
                    )}
                  />
                )}
              </div>

              {/* Session summary */}
              <div className="mt-4 rounded-2xl border border-white/8 bg-white/4 px-4 py-3">
                <div className="text-[9px] uppercase tracking-[0.25em] text-[color:var(--muted)]">
                  Session total
                </div>
                <div className="mt-2 grid grid-cols-3 gap-2 text-center">
                  <div>
                    <div className="text-base font-semibold tabular-nums">{receipts.length}</div>
                    <div className="text-[9px] text-[color:var(--muted)]">exports</div>
                  </div>
                  <div>
                    <div className="text-base font-semibold tabular-nums">
                      {formatBytes(receipts.reduce((s, r) => s + r.original.size, 0))}
                    </div>
                    <div className="text-[9px] text-[color:var(--muted)]">processed</div>
                  </div>
                  <div>
                    <div className="text-base font-semibold tabular-nums" style={{
                      color: scoreColor(Math.round(receipts.reduce((s, r) => s + receiptScore(r), 0) / receipts.length))
                    }}>
                      {Math.round(receipts.reduce((s, r) => s + receiptScore(r), 0) / receipts.length)}
                    </div>
                    <div className="text-[9px] text-[color:var(--muted)]">avg score</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </AppShell>
    </div>
  );
}
