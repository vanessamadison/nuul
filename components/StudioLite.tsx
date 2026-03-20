"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import GlassPanel from "@/components/GlassPanel";
import DragCarousel, { CarouselItem } from "@/components/DragCarousel";
import { decodeImage, imageToCanvas } from "@/lib/pipeline/image";
import { scanImage } from "@/lib/pipeline/scan";
import { OCRClient } from "@/lib/pipeline/ocr";
import { exportSanitized } from "@/lib/pipeline/export";
import { createReceipt } from "@/lib/receipts/createReceipt";
import { FileInfo, ScanFindings } from "@/lib/pipeline/types";
import { applyFilterPreview, filterThumbnail } from "@/lib/presets/filterEngine";
import { BUILTIN_FILTERS } from "@/lib/presets/builtinFilters";

const ocrClient = new OCRClient();
const receiptKey = "nuul-receipts";

/**
 * All available aesthetic presets — each maps to a BUILTIN_FILTERS entry by name.
 * Every preset applies identical privacy protections on export.
 */
const PRESET_DEFS = [
  { id: "silverline",   label: "Silverline",    description: "late graphite",  gradient: "from-[#0d0f12] via-[#1c1f27] to-[#30323b]",  filterName: "Graphite"     },
  { id: "cornerclub",   label: "Cornerclub",    description: "35mm warm",      gradient: "from-[#1a1311] via-[#3c2d23] to-[#6a503b]",  filterName: "Warm Film"    },
  { id: "midnightrun",  label: "Midnightrun",   description: "city noir",      gradient: "from-[#0b0c0f] via-[#1a1c22] to-[#2a2d36]",  filterName: "Noir"         },
  { id: "loftsunday",   label: "Loftsunday",    description: "clean flash",    gradient: "from-[#141115] via-[#2d2424] to-[#3a3130]",  filterName: "Studio"       },
  { id: "basement",     label: "Basement",      description: "chrome edit",    gradient: "from-[#0f1419] via-[#24303a] to-[#3a4853]",  filterName: "Chrome"       },
  { id: "bluehour",     label: "Bluehour",      description: "soft dusk",      gradient: "from-[#111018] via-[#2a2434] to-[#443b4f]",  filterName: "Dusk"         },
  { id: "faded",        label: "Faded",         description: "90s magazine",   gradient: "from-[#141414] via-[#232323] to-[#353535]",  filterName: "Faded"        },
  { id: "mocha",        label: "Mocha",         description: "cafe window",    gradient: "from-[#1a1410] via-[#3d2e22] to-[#5c4432]",  filterName: "Mocha"        },
  { id: "vapor",        label: "Vapor",         description: "lo-fi pastel",   gradient: "from-[#0e0e1a] via-[#1e1a2e] to-[#2c2440]",  filterName: "Vapor"        },
  { id: "goldenhour",   label: "Golden Hour",   description: "amber sunset",   gradient: "from-[#1a1200] via-[#3d2d00] to-[#6b4a00]",  filterName: "Golden Hour"  },
  { id: "ice",          label: "Ice",           description: "cold clarity",   gradient: "from-[#0c1218] via-[#1a2630] to-[#263545]",  filterName: "Ice"          },
  { id: "kelp",         label: "Kelp",          description: "organic doc",    gradient: "from-[#0c1008] via-[#1e2414] to-[#303820]",  filterName: "Kelp"         },
  { id: "ritualnight",  label: "Ritual Night",  description: "sacred dark",    gradient: "from-[#100508] via-[#200a10] to-[#350f1a]",  filterName: "Ritual Night" },
  { id: "candlelight",  label: "Candlelight",   description: "intimate glow",  gradient: "from-[#1a0d00] via-[#3d1e00] to-[#6b3200]",  filterName: "Candlelight"  },
  { id: "softgrain",    label: "Soft Grain",    description: "lifted matte",   gradient: "from-[#0e0e0e] via-[#1e1e1e] to-[#303030]",  filterName: "Soft Grain"   },
  { id: "ritual",       label: "Ritual",        description: "warm rite",      gradient: "from-[#120d06] via-[#2a1e0e] to-[#40301a]",  filterName: "Ritual"       },
] as const;

type PresetId = (typeof PRESET_DEFS)[number]["id"];

/** Wrap a promise with a ms timeout */
function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    p,
    new Promise<T>((_, rej) =>
      setTimeout(() => rej(new Error("timeout")), ms)
    ),
  ]);
}

function downloadBlob(blob: Blob, name: string) {
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = name;
  link.click();
}

/** Small dot indicator for multi-file queues */
function FilmstripNav({
  total,
  current,
  onChange,
}: {
  total: number;
  current: number;
  onChange: (i: number) => void;
}) {
  const MAX_DOTS = 9;
  if (total <= 1) return null;

  const dots = total <= MAX_DOTS ? total : MAX_DOTS;
  const step = total <= MAX_DOTS ? 1 : Math.ceil((total - 1) / (MAX_DOTS - 1));

  return (
    <div className="flex items-center justify-center gap-3">
      {/* Prev */}
      <button
        onClick={() => onChange(Math.max(0, current - 1))}
        disabled={current === 0}
        className="rounded-full border border-white/15 bg-white/5 p-1.5 text-white/50 transition hover:bg-white/12 hover:text-white disabled:opacity-20"
        aria-label="Previous"
      >
        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
      </button>

      {/* Dots */}
      <div className="flex items-center gap-1.5">
        {Array.from({ length: dots }).map((_, di) => {
          const fileIdx = di * step;
          const isCurrent = fileIdx === current;
          const isNear = Math.abs(fileIdx - current) <= step;
          return (
            <button
              key={di}
              onClick={() => onChange(fileIdx)}
              className="rounded-full transition-all duration-200"
              style={{
                width:  isCurrent ? 20 : isNear ? 6 : 4,
                height: 4,
                background: isCurrent
                  ? "rgba(255,255,255,0.85)"
                  : isNear
                  ? "rgba(255,255,255,0.35)"
                  : "rgba(255,255,255,0.18)",
              }}
              aria-label={`File ${fileIdx + 1}`}
            />
          );
        })}
      </div>

      {/* Next */}
      <button
        onClick={() => onChange(Math.min(total - 1, current + 1))}
        disabled={current === total - 1}
        className="rounded-full border border-white/15 bg-white/5 p-1.5 text-white/50 transition hover:bg-white/12 hover:text-white disabled:opacity-20"
        aria-label="Next"
      >
        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </button>

      {/* Counter */}
      <span className="ml-1 tabular-nums text-[0.55rem] uppercase tracking-[0.2em] text-white/30">
        {current + 1}/{total}
      </span>
    </div>
  );
}

export default function StudioLite() {
  const searchParams  = useSearchParams();
  const initialPreset = (searchParams.get("preset") as PresetId) || "silverline";

  const [preset,        setPreset]       = useState<PresetId>(initialPreset);
  const [queue,         setQueue]        = useState<File[]>([]);
  const [currentIndex,  setCurrentIndex] = useState(0);
  const [previewUrl,    setPreviewUrl]   = useState<string | null>(null);
  const [fileInfo,      setFileInfo]     = useState<FileInfo | null>(null);
  const [processing,    setProcessing]   = useState(false);
  const [findings,      setFindings]     = useState<ScanFindings | null>(null);
  const [isDragOver,    setIsDragOver]   = useState(false);

  // Small 120px thumbnails for carousel cards
  const [thumbs, setThumbs] = useState<Record<string, string>>({});
  // High-res 600px filtered preview for the main panel
  const [filterPreview, setFilterPreview] = useState<string | null>(null);
  const filterPreviewRef = useRef<string | null>(null);

  const fileInputRef  = useRef<HTMLInputElement | null>(null);
  const bitmapRef     = useRef<ImageBitmap | null>(null);
  const previewUrlRef = useRef<string | null>(null);

  const currentFile = queue[currentIndex] ?? null;

  // ─── Generate high-res preview when preset or bitmap changes ─────────────

  useEffect(() => {
    const bitmap = bitmapRef.current;
    if (!bitmap) return;

    const pDef = PRESET_DEFS.find((p) => p.id === preset);
    if (!pDef) return;

    const filterParams =
      BUILTIN_FILTERS.find((f) => f.name === pDef.filterName) ??
      BUILTIN_FILTERS[0];

    let cancelled = false;
    applyFilterPreview(bitmap, filterParams, 900).then((url) => {
      if (cancelled) return;
      // Revoke old preview blob if any
      if (filterPreviewRef.current?.startsWith("blob:"))
        URL.revokeObjectURL(filterPreviewRef.current);
      filterPreviewRef.current = url;
      setFilterPreview(url);
    }).catch(() => {});

    return () => { cancelled = true; };
  }, [preset]);

  // ─── Load + scan a file ──────────────────────────────────────────────────

  const loadFile = useCallback(async (file: File) => {
    setProcessing(true);
    setFindings(null);
    setThumbs({});
    setFilterPreview(null);
    filterPreviewRef.current = null;

    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = null;
    }

    try {
      const bitmap = await decodeImage(file);
      bitmapRef.current = bitmap;

      const url = URL.createObjectURL(file);
      previewUrlRef.current = url;
      setPreviewUrl(url);

      setFileInfo({
        name:   file.name,
        type:   file.type,
        size:   file.size,
        width:  bitmap.width,
        height: bitmap.height,
      });

      // Small carousel thumbnails — fire in background, non-blocking
      for (const pDef of PRESET_DEFS) {
        const filterParams =
          BUILTIN_FILTERS.find((f) => f.name === pDef.filterName) ??
          BUILTIN_FILTERS[0];
        filterThumbnail(bitmap, filterParams)
          .then((thumbUrl) =>
            setThumbs((prev) => ({ ...prev, [pDef.id]: thumbUrl }))
          )
          .catch(() => {});
      }

      // High-res preview for the selected filter
      const activePDef = PRESET_DEFS.find((p) => p.id === preset);
      const activeFilter = activePDef
        ? BUILTIN_FILTERS.find((f) => f.name === activePDef.filterName) ?? BUILTIN_FILTERS[0]
        : BUILTIN_FILTERS[0];
      applyFilterPreview(bitmap, activeFilter, 900)
        .then((url) => {
          filterPreviewRef.current = url;
          setFilterPreview(url);
        })
        .catch(() => {});

      // Scan (OCR capped at 3 s to prevent hang)
      try {
        const { ctx, width, height } = imageToCanvas(bitmap, 1400);
        const imageData = ctx.getImageData(0, 0, width, height);
        let ocrText = "";
        try {
          ocrText = await withTimeout(ocrClient.recognize(imageData), 3000);
        } catch {
          /* Tesseract unavailable or timed out */
        }
        const scan = await scanImage(file, imageData, ocrText);
        setFindings(scan);
      } catch {
        /* scan failed silently */
      }
    } finally {
      setProcessing(false);
    }
  // stable refs/setters only — no state in deps to avoid loop
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preset]);

  useEffect(() => {
    if (currentFile) void loadFile(currentFile);
  }, [currentFile, loadFile]);

  // ─── File pick / drag ────────────────────────────────────────────────────

  const onPick = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    if (!files.length) return;
    setQueue(files);
    setCurrentIndex(0);
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const files = Array.from(e.dataTransfer.files).filter((f) =>
      f.type.startsWith("image/")
    );
    if (files.length) { setQueue(files); setCurrentIndex(0); }
  }, []);

  const handleDragOver  = useCallback((e: React.DragEvent) => { e.preventDefault(); setIsDragOver(true);  }, []);
  const handleDragLeave = useCallback(() => setIsDragOver(false), []);

  // ─── Export ──────────────────────────────────────────────────────────────

  const exportOne = async (file: File, index: number) => {
    const bitmap = bitmapRef.current ?? (await decodeImage(file));
    const pDef = PRESET_DEFS.find((p) => p.id === preset);
    const filterParams = pDef
      ? BUILTIN_FILTERS.find((f) => f.name === pDef.filterName) ?? null
      : null;

    const output = await exportSanitized(bitmap, {
      format:      file.type === "image/png" ? "image/png" : "image/jpeg",
      quality:     0.92,
      maxEdge:     2048,
      blurRegions: findings?.codes.filter((c) => c.autoApply) ?? [],
      cropTop:     findings?.chromeConfidence === "high" ? findings?.topBarHeight ?? 0 : 0,
      filter:      filterParams,
    });

    const ext = output.type.split("/")[1];
    const exportName = `nuul_${Date.now()}_${index + 1}.${ext}`;
    downloadBlob(output.blob, exportName);

    if (fileInfo) {
      const receipt = createReceipt({
        original: fileInfo,
        exported: { name: exportName, type: output.type, size: output.blob.size, width: output.width, height: output.height },
        found: [
          ...(findings?.codes.length     ? [{ label: "QR codes detected"   }] : []),
          ...(findings?.textLeaks.length ? [{ label: "Text leaks detected" }] : []),
        ],
        changed: [
          { label: "Metadata removed" },
          { label: "Re-encoded"       },
          ...(pDef ? [{ label: `${pDef.label} filter applied` }] : []),
          ...(findings?.codes.length             ? [{ label: "QR blur applied"    }] : []),
          ...(findings?.chromeConfidence === "high" ? [{ label: "Top bar cropped" }] : []),
        ],
        remaining: [
          ...(findings?.faces.length     ? [{ label: "Faces remain visible"       }] : []),
          ...(findings?.textLeaks.length ? [{ label: "Text leaks not auto-blurred"}] : []),
        ],
        tips: ["Review before sharing."],
      });
      const stored = JSON.parse(window.localStorage.getItem(receiptKey) ?? "[]") as string[];
      stored.unshift(JSON.stringify(receipt));
      window.localStorage.setItem(receiptKey, JSON.stringify(stored.slice(0, 24)));
    }
  };

  const handleExport = async () => {
    if (!currentFile) return;
    setProcessing(true);
    try { await exportOne(currentFile, currentIndex); }
    finally { setProcessing(false); }
  };

  const handleExportAll = async () => {
    if (!queue.length) return;
    setProcessing(true);
    try {
      for (let i = 0; i < queue.length; i++) await exportOne(queue[i], i);
    } finally { setProcessing(false); }
  };

  // ─── Computed ────────────────────────────────────────────────────────────

  const leakSummary = useMemo(() => {
    if (!findings) return null;
    const qr     = findings.codes.length     ? `${findings.codes.length} QR`             : "";
    const text   = findings.textLeaks.length ? `${findings.textLeaks.length} text leaks` : "";
    const chrome = findings.chromeConfidence === "high" ? "Browser chrome" : "";
    return [qr, text, chrome].filter(Boolean).join(" · ") || null;
  }, [findings]);

  // Build carousel items: small thumbs as card backgrounds, gradient as placeholder
  const carouselItems: CarouselItem[] = PRESET_DEFS.map((p) => ({
    id:          p.id,
    label:       p.label,
    description: p.description,
    gradient:    p.gradient,
    image:       thumbs[p.id] ?? undefined,
  }));

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 pb-12 sm:px-6">

      {/* Header */}
      <div className="text-center">
        <div className="text-[0.6rem] uppercase tracking-[0.35em] text-[color:var(--muted)] sm:text-xs">
          Safe Export Studio
        </div>
      </div>

      {/* Filter Style Carousel */}
      <div className="py-4">
        <div className="mb-2 text-center text-[0.55rem] uppercase tracking-[0.3em] text-[color:var(--muted)] sm:text-[0.6rem]">
          Filter Style
        </div>
        <DragCarousel
          items={carouselItems}
          selectedId={preset}
          onSelect={(id) => setPreset(id as PresetId)}
        />
        <p className="mt-2 text-center text-[0.5rem] uppercase tracking-[0.25em] text-white/20">
          All filters apply identical privacy protections
        </p>
      </div>

      {/* Main grid */}
      <div className="grid gap-4 lg:grid-cols-[1fr_340px]">

        {/* Preview Panel */}
        <GlassPanel className="order-2 p-4 lg:order-1 sm:p-6">
          <div className="mb-4 text-[0.55rem] uppercase tracking-[0.3em] text-[color:var(--muted)] sm:text-xs">
            Preview
          </div>

          {/* Drop zone */}
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            className={`
              flex min-h-[280px] items-center justify-center rounded-2xl border-2 border-dashed
              transition-all duration-300 sm:min-h-[380px]
              ${isDragOver
                ? "border-white/50 bg-white/10"
                : previewUrl
                ? "border-transparent bg-black/20"
                : "border-white/10 bg-white/5 hover:border-white/20"
              }
            `}
          >
            {previewUrl ? (
              <div className="flex w-full flex-col items-center gap-4 p-2">
                {/* Image preview — overlay filtered version once ready */}
                <div className="relative flex w-full justify-center overflow-hidden rounded-xl shadow-2xl">
                  {/* Raw fallback always present */}
                  <img
                    src={previewUrl}
                    alt="Preview"
                    className={`max-h-[320px] w-full object-contain sm:max-h-[400px] transition-opacity duration-400 ${filterPreview ? "opacity-0" : "opacity-100"}`}
                    style={{ display: "block" }}
                  />
                  {/* High-res filtered preview */}
                  {filterPreview && (
                    <img
                      key={filterPreview}
                      src={filterPreview}
                      alt="Filtered preview"
                      className="absolute inset-0 max-h-[320px] w-full object-contain sm:max-h-[400px] transition-opacity duration-500 opacity-100"
                      style={{ display: "block" }}
                    />
                  )}
                  {/* Scanning overlay */}
                  {processing && (
                    <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-black/40 backdrop-blur-sm">
                      <div className="flex items-center gap-2 text-[0.65rem] text-white/70 uppercase tracking-widest">
                        <span className="h-3 w-3 animate-spin rounded-full border border-white/30 border-t-white/80" />
                        Scanning
                      </div>
                    </div>
                  )}
                </div>

                {/* Filmstrip pagination */}
                {queue.length > 1 && (
                  <FilmstripNav
                    total={queue.length}
                    current={currentIndex}
                    onChange={setCurrentIndex}
                  />
                )}

                {/* Scan badge */}
                {findings && !processing && (
                  <div className="w-full max-w-xs">
                    {leakSummary ? (
                      <div className="flex items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-[0.65rem] text-amber-200">
                        <svg className="h-3.5 w-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        <span>{leakSummary}</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-[0.65rem] text-emerald-200">
                        <svg className="h-3.5 w-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span>No obvious leaks detected</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              /* Empty state */
              <label className="flex cursor-pointer flex-col items-center gap-4 p-10 text-center">
                <div className="rounded-full border border-white/15 bg-white/8 p-5">
                  <svg className="h-7 w-7 text-white/50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <div className="text-sm text-white/75">Drop photos here</div>
                  <div className="mt-1 text-[0.65rem] text-white/35">or browse from your device</div>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  onChange={onPick}
                  accept="image/*"
                  multiple
                />
              </label>
            )}
          </div>
        </GlassPanel>

        {/* Controls Panel */}
        <GlassPanel className="order-1 flex flex-col gap-6 p-4 lg:order-2 sm:p-6">

          {/* Upload */}
          <div>
            <div className="mb-3 text-[0.55rem] uppercase tracking-[0.3em] text-[color:var(--muted)] sm:text-xs">
              Upload
            </div>
            <label className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/8 px-4 py-3 text-sm transition hover:bg-white/14 active:scale-[0.98]">
              <svg className="h-4 w-4 text-white/60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span className="text-white/80">Add images</span>
              <input type="file" className="hidden" onChange={onPick} accept="image/*" multiple />
            </label>
            {queue.length > 0 && (
              <div className="mt-2 rounded-lg bg-white/5 px-3 py-1.5 text-center text-[0.6rem] text-[color:var(--muted)]">
                {queue.length} file{queue.length > 1 ? "s" : ""} queued
              </div>
            )}
          </div>

          {/* Active filter label */}
          {preset && (
            <div className="rounded-xl border border-white/8 bg-white/4 px-4 py-3">
              <div className="text-[0.5rem] uppercase tracking-[0.3em] text-white/30">Active filter</div>
              <div className="mt-0.5 text-sm font-medium text-white/80">
                {PRESET_DEFS.find((p) => p.id === preset)?.label ?? preset}
              </div>
              <div className="text-[0.6rem] text-white/40">
                {PRESET_DEFS.find((p) => p.id === preset)?.description}
              </div>
            </div>
          )}

          {/* File info */}
          {fileInfo && (
            <div className="border-t border-white/8 pt-4">
              <div className="mb-2 text-[0.55rem] uppercase tracking-[0.3em] text-[color:var(--muted)] sm:text-xs">
                File Info
              </div>
              <div className="space-y-1.5 text-[0.7rem] text-white/55">
                <div className="flex justify-between">
                  <span>Name</span>
                  <span className="max-w-[160px] truncate text-white/80">{fileInfo.name}</span>
                </div>
                <div className="flex justify-between">
                  <span>Size</span>
                  <span className="text-white/80">{(fileInfo.size / 1024).toFixed(1)} KB</span>
                </div>
                <div className="flex justify-between">
                  <span>Dimensions</span>
                  <span className="text-white/80">{fileInfo.width} × {fileInfo.height}</span>
                </div>
              </div>
            </div>
          )}

          {/* Export */}
          <div className="mt-auto space-y-2 border-t border-white/8 pt-4">
            <button
              className="w-full rounded-xl border border-white/25 bg-white/12 px-4 py-3 text-xs uppercase tracking-[0.18em] transition hover:bg-white/20 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-35 sm:tracking-[0.22em]"
              onClick={handleExport}
              disabled={processing || !currentFile}
            >
              {processing ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="h-3 w-3 animate-spin rounded-full border border-white/30 border-t-white" />
                  Processing
                </span>
              ) : (
                "Safe Export"
              )}
            </button>

            {queue.length > 1 && (
              <button
                className="w-full rounded-xl border border-white/10 bg-white/4 px-4 py-2.5 text-xs uppercase tracking-[0.18em] transition hover:bg-white/8 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-35"
                onClick={handleExportAll}
                disabled={processing}
              >
                Export All ({queue.length})
              </button>
            )}
          </div>

          {/* Privacy note */}
          <p className="text-center text-[0.55rem] leading-relaxed text-white/25">
            Zero servers. Zero uploads. Everything runs in your browser.
          </p>
        </GlassPanel>
      </div>
    </div>
  );
}
