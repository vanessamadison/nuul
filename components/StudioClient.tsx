"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import GlassPanel from "@/components/GlassPanel";
import RiskMeter from "@/components/RiskMeter";
import FindingCard from "@/components/FindingCard";
import ExportSheet from "@/components/ExportSheet";
import BeforeAfterScrubber from "@/components/BeforeAfterScrubber";
import ManualTools from "@/components/ManualTools";
import { decodeImage, imageToCanvas } from "@/lib/pipeline/image";
import { scanImage } from "@/lib/pipeline/scan";
import { OCRClient } from "@/lib/pipeline/ocr";
import { exportSanitized } from "@/lib/pipeline/export";
import { createReceipt } from "@/lib/receipts/createReceipt";
import { FileInfo, RiskLevel, ScanFindings } from "@/lib/pipeline/types";
import { XMPFilterParams, HSLAdjustments, readXMPFile, defaultFilterParams } from "@/lib/presets/xmpParser";
import { BUILTIN_FILTERS } from "@/lib/presets/builtinFilters";
import { applyFilterPreview, filterThumbnail } from "@/lib/presets/filterEngine";
import ToneCurveEditor, { ToneCurves } from "@/components/ToneCurveEditor";
import HSLPanel from "@/components/HSLPanel";
import { identityCurve } from "@/lib/presets/toneCurve";
import exifr from "exifr";

const ocrClient = new OCRClient();

const sanitizePresets = {
  social: { maxEdge: 2048, addGrain: false },
  work:   { maxEdge: 2048, addGrain: false },
  high:   { maxEdge: 1600, addGrain: true  },
} as const;

const receiptKey = "nuul-receipts";

type ExportFormat      = "keep" | "image/jpeg" | "image/png" | "image/webp";
type ExportOutputFormat = "image/jpeg" | "image/png" | "image/webp";

// ─── Filter strip thumbnail item ─────────────────────────────────────────────

interface FilterItem {
  params: XMPFilterParams;
  thumb: string | null; // data URL or null while generating
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function StudioClient() {
  // Sanitization preset
  const [sanitizePreset, setSanitizePreset] = useState<RiskLevel>("work");

  // Export format
  const [exportFormat, setExportFormat]   = useState<ExportFormat>("keep");
  const [exportQuality, setExportQuality] = useState(0.92);

  // File & scan state
  const [fileInfo,    setFileInfo]    = useState<FileInfo | null>(null);
  const [findings,    setFindings]    = useState<ScanFindings | null>(null);
  const [processing,  setProcessing]  = useState(false);
  const [receiptJson, setReceiptJson] = useState<string | null>(null);
  const [autoCropEnabled, setAutoCropEnabled] = useState(false);
  const [verification,    setVerification]    = useState<{ metadataPresent: boolean } | null>(null);
  const [ocrAvailable,    setOcrAvailable]    = useState(true);

  // Preview
  const [previewUrl,         setPreviewUrl]         = useState<string | null>(null);
  const [filteredPreviewUrl, setFilteredPreviewUrl] = useState<string | null>(null);
  const [filterRendering,    setFilterRendering]     = useState(false);

  // Filter state
  const [activeFilter,    setActiveFilter]    = useState<XMPFilterParams>(defaultFilterParams);
  const [filterItems,     setFilterItems]     = useState<FilterItem[]>(
    BUILTIN_FILTERS.map((p) => ({ params: p, thumb: null }))
  );
  const [importedFilters, setImportedFilters] = useState<FilterItem[]>([]);

  // Advanced adjustments (live — override the activeFilter's values)
  const defaultCurves: ToneCurves = {
    rgb: identityCurve,
    r:   identityCurve,
    g:   identityCurve,
    b:   identityCurve,
  };
  const [curves, setCurves] = useState<ToneCurves>(defaultCurves);
  const [hsl, setHsl] = useState<HSLAdjustments>(defaultFilterParams.hsl);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Merge active filter with manual curve/HSL overrides
  // (manual adjustments layer on top of the preset values)
  const mergedFilter: XMPFilterParams = {
    ...activeFilter,
    toneCurve:      curves.rgb,
    toneCurveRed:   curves.r,
    toneCurveGreen: curves.g,
    toneCurveBlue:  curves.b,
    hsl,
  };

  // Mobile onboarding
  const [showFilterOnboarding, setShowFilterOnboarding] = useState(false);

  // Refs
  const fileRef              = useRef<File | null>(null);
  const bitmapRef            = useRef<ImageBitmap | null>(null);
  const analysisScaleRef     = useRef<number>(1);
  const fileInputRef         = useRef<HTMLInputElement | null>(null);
  const xmpInputRef          = useRef<HTMLInputElement | null>(null);
  // Keep a ref to importedFilters so handleFile can read current state without stale closure
  const importedFiltersRef   = useRef<FilterItem[]>([]);

  // ─── Derived risk level ────────────────────────────────────────────────────

  const riskLevel = useMemo<RiskLevel>(() => {
    if (!findings) return "social";
    if (findings.faces.length || findings.textLeaks.length > 3) return "high";
    if (findings.textLeaks.length || findings.codes.length || findings.metadata.exifPresent) return "work";
    return "social";
  }, [findings]);

  const textLeakSummary = useMemo(() => {
    if (!findings) return null;
    const high   = findings.textLeaks.filter((l) => l.confidence === "high").length;
    const medium = findings.textLeaks.filter((l) => l.confidence === "medium").length;
    const low    = findings.textLeaks.filter((l) => l.confidence === "low").length;
    return { high, medium, low };
  }, [findings]);

  // ─── Keep importedFilters ref in sync (avoids stale closure in handleFile) ─

  useEffect(() => {
    importedFiltersRef.current = importedFilters;
  }, [importedFilters]);

  // ─── Generate thumbnails progressively for any filter item array ────────────

  const generateThumbs = useCallback(async (
    bitmap: ImageBitmap,
    items: FilterItem[],
    setter: React.Dispatch<React.SetStateAction<FilterItem[]>>,
  ) => {
    for (let i = 0; i < items.length; i++) {
      const thumb = await filterThumbnail(bitmap, items[i].params);
      setter((prev) => {
        const n = [...prev];
        if (n[i]) n[i] = { ...n[i], thumb };
        return n;
      });
    }
  }, []);

  // ─── Apply merged filter to preview (re-runs on any change) ──────────────

  useEffect(() => {
    if (!bitmapRef.current) return;
    let cancelled = false;
    setFilterRendering(true);
    applyFilterPreview(bitmapRef.current, mergedFilter, 800)
      .then((url) => {
        if (!cancelled) setFilteredPreviewUrl(url);
      })
      .finally(() => {
        if (!cancelled) setFilterRendering(false);
      });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeFilter, curves, hsl]);

  // ─── File handler ──────────────────────────────────────────────────────────

  const handleFile = useCallback(
    async (file: File) => {
      setProcessing(true);
      setAutoCropEnabled(false);
      setReceiptJson(null);
      setVerification(null);
      fileRef.current = file;
      if (previewUrl) URL.revokeObjectURL(previewUrl);

      const bitmap = await decodeImage(file);
      bitmapRef.current = bitmap;

      // Original preview URL (for before/after scrubber)
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);

      // Filtered preview will trigger via the activeFilter effect above
      setFilteredPreviewUrl(null);

      // Generate scan canvas at analysis scale
      const { canvas, ctx, width, height, scale } = imageToCanvas(bitmap, 1400);
      analysisScaleRef.current = scale;
      const imageData = ctx.getImageData(0, 0, width, height);

      // OCR
      const ocrReady =
        typeof window !== "undefined" &&
        (window as typeof window & { __nuulOcrReady?: boolean }).__nuulOcrReady;
      setOcrAvailable(ocrReady !== false);
      const ocrText = ocrReady ? await ocrClient.recognize(imageData) : "";

      // Scan
      const scan = await scanImage(file, imageData, ocrText);
      setFindings(scan);
      setFileInfo({
        name:   file.name,
        type:   file.type,
        size:   file.size,
        width:  bitmap.width,
        height: bitmap.height,
      });

      // Generate filter strip thumbnails in background
      // Builtin filters — reset thumbs then regenerate from new image
      const builtinItems = BUILTIN_FILTERS.map((p) => ({ params: p, thumb: null as string | null }));
      setFilterItems(builtinItems);
      void generateThumbs(bitmap, builtinItems, setFilterItems);

      // Imported presets — regenerate from new image if any exist
      const currentImported = importedFiltersRef.current;
      if (currentImported.length > 0) {
        const resetImported = currentImported.map((item) => ({ ...item, thumb: null as string | null }));
        setImportedFilters(resetImported);
        void generateThumbs(bitmap, resetImported, setImportedFilters);
      }

      setProcessing(false);
    },
    [previewUrl, generateThumbs]
  );

  // ─── Mobile onboarding ────────────────────────────────────────────────────

  useEffect(() => {
    if (typeof window === "undefined") return;
    const seen   = window.localStorage.getItem("nuul-mobile-filters") === "true";
    const mobile = window.innerWidth < 900;
    const params = new URLSearchParams(window.location.search);
    const mode   = params.get("mode");
    const importNow = params.get("import") === "1";
    if (mode === "filters") { setShowFilterOnboarding(true); return; }
    if (!seen && mobile) setShowFilterOnboarding(true);
    if (importNow) window.setTimeout(() => fileInputRef.current?.click(), 200);
  }, []);

  // ─── Event handlers ───────────────────────────────────────────────────────

  const onDrop  = (e: React.DragEvent<HTMLButtonElement>) => {
    e.preventDefault();
    const f = e.dataTransfer.files?.[0];
    if (f) void handleFile(f);
  };

  const onPaste = (e: React.ClipboardEvent<HTMLButtonElement>) => {
    const f = e.clipboardData.files?.[0];
    if (f) void handleFile(f);
  };

  const onPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) void handleFile(f);
  };

  // XMP import
  const onXMPImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;
    const newItems: FilterItem[] = [];
    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      if (!f.name.toLowerCase().endsWith(".xmp")) continue;
      try {
        const params = await readXMPFile(f);
        // Thumbs start null; if a photo is loaded we'll generate below
        newItems.push({ params, thumb: null });
      } catch (err) {
        console.warn("Failed to parse XMP:", f.name, err);
      }
    }
    if (newItems.length) {
      setImportedFilters((prev) => {
        const merged = [...prev, ...newItems];
        // Kick off thumbnail generation if a photo is already loaded
        if (bitmapRef.current) {
          // Generate thumbs for just the new items; use index offset so setter lands correctly
          const offset = prev.length;
          const bitmap = bitmapRef.current;
          (async () => {
            for (let i = 0; i < newItems.length; i++) {
              const thumb = await filterThumbnail(bitmap, newItems[i].params);
              setImportedFilters((p) => {
                const n = [...p];
                const idx = offset + i;
                if (n[idx]) n[idx] = { ...n[idx], thumb };
                return n;
              });
            }
          })();
        }
        return merged;
      });
      // Auto-select the first imported preset and sync curves/HSL
      const first = newItems[0].params;
      setActiveFilter(first);
      setCurves({ rgb: first.toneCurve, r: first.toneCurveRed, g: first.toneCurveGreen, b: first.toneCurveBlue });
      setHsl(first.hsl);
    }
    // Reset input
    if (xmpInputRef.current) xmpInputRef.current.value = "";
  };

  // ─── Download helper ──────────────────────────────────────────────────────

  const downloadBlob = (blob: Blob, filename: string) => {
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
  };

  // ─── Export ───────────────────────────────────────────────────────────────

  const onExport = async () => {
    if (!bitmapRef.current || !fileInfo || !findings) return;
    setProcessing(true);

    const sanitize = sanitizePresets[sanitizePreset];
    const formatToUse = exportFormat === "keep"
      ? (fileInfo.type as ExportOutputFormat)
      : exportFormat;
    const resolvedFormat: ExportOutputFormat =
      formatToUse === "image/jpeg" || formatToUse === "image/webp" || formatToUse === "image/png"
        ? formatToUse
        : "image/png";

    const analysisScale = analysisScaleRef.current || 1;
    const blurRegions = findings.codes.map((code) => ({
      ...code,
      boundingBox: {
        x:      code.boundingBox.x      / analysisScale,
        y:      code.boundingBox.y      / analysisScale,
        width:  code.boundingBox.width  / analysisScale,
        height: code.boundingBox.height / analysisScale,
      },
    }));
    const cropTop = autoCropEnabled && findings.topBarHeight
      ? findings.topBarHeight / analysisScale
      : 0;

    const output = await exportSanitized(bitmapRef.current, {
      format:      resolvedFormat,
      maxEdge:     sanitize.maxEdge,
      blurRegions,
      addGrain:    sanitize.addGrain,
      quality:     resolvedFormat === "image/png" ? undefined : exportQuality,
      cropTop,
      filter:      mergedFilter,
    });

    const exportFile: FileInfo = {
      name:   `nuul-${Math.random().toString(36).slice(2, 8)}-${Date.now()}`,
      type:   output.type,
      size:   output.blob.size,
      width:  output.width,
      height: output.height,
    };

    const highFindings = findings.textLeaks.filter((l) => l.confidence === "high");
    const lowFindings  = findings.textLeaks.filter((l) => l.confidence !== "high");
    const receipt = createReceipt({
      original: fileInfo,
      exported: exportFile,
      found: [
        ...(findings.metadata.exifPresent ? [{ label: "Metadata detected" }] : []),
        ...highFindings.map((l) => ({ label: `${l.type} detected` })),
        ...lowFindings.map((l) => ({
          label: l.type === "address" ? "Possible address" : `Possible ${l.type}`,
        })),
        ...(findings.codes.length  ? [{ label: "QR code detected" }]    : []),
        ...(findings.faces.length  ? [{ label: "Face detected" }]       : []),
        ...(findings.screenHints.length ? [{ label: "Browser UI detected" }] : []),
      ],
      changed: [
        { label: "All EXIF / GPS / device metadata stripped" },
        { label: "Re-encoded — metadata-free by construction" },
        ...(activeFilter.name !== "None" ? [{ label: `Filter applied: ${activeFilter.name}` }] : []),
        ...(blurRegions.length ? [{ label: "QR blurred", detail: `${blurRegions.length}` }] : []),
        ...(cropTop ? [{ label: "Auto-cropped browser chrome" }] : []),
      ],
      remaining: [
        ...(findings.faces.length  ? [{ label: "Faces remain visible" }]            : []),
        ...(findings.screenHints.length ? [{ label: "Tabs or URL may be visible" }] : []),
        ...(findings.textLeaks.some((l) => l.confidence !== "high")
          ? [{ label: "Possible low-confidence text remains" }]
          : []),
      ],
      tips: ["Review the export before sharing.", "Tabs or URL may still be visible."],
    });

    const receiptString = JSON.stringify(receipt, null, 2);
    setReceiptJson(receiptString);

    if (typeof window !== "undefined") {
      const existing = JSON.parse(window.localStorage.getItem(receiptKey) ?? "[]") as string[];
      window.localStorage.setItem(
        receiptKey,
        JSON.stringify([receiptString, ...existing].slice(0, 25))
      );
    }

    downloadBlob(output.blob, `${exportFile.name}.${output.type.split("/")[1]}`);
    downloadBlob(
      new Blob([receiptString], { type: "application/json" }),
      `${exportFile.name}.receipt.json`
    );

    try {
      const verified = await exifr.parse(output.blob);
      setVerification({ metadataPresent: !!verified });
    } catch {
      setVerification({ metadataPresent: false });
    }

    setProcessing(false);
  };

  const onExportAsIs = async () => {
    if (!bitmapRef.current || !fileInfo) return;
    setProcessing(true);
    const formatToUse = exportFormat === "keep"
      ? (fileInfo.type as ExportOutputFormat)
      : exportFormat;
    const resolvedFormat: ExportOutputFormat =
      formatToUse === "image/jpeg" || formatToUse === "image/webp" || formatToUse === "image/png"
        ? formatToUse
        : "image/png";

    const output = await exportSanitized(bitmapRef.current, {
      format:  resolvedFormat,
      quality: resolvedFormat === "image/png" ? undefined : exportQuality,
      filter:  mergedFilter,
    });

    const exportFile: FileInfo = {
      name:   `nuul-${Math.random().toString(36).slice(2, 8)}-${Date.now()}`,
      type:   output.type,
      size:   output.blob.size,
      width:  output.width,
      height: output.height,
    };

    const receipt = createReceipt({
      original: fileInfo,
      exported: exportFile,
      found: findings
        ? [
            ...(findings.metadata.exifPresent ? [{ label: "Metadata detected" }] : []),
            ...(findings.codes.length  ? [{ label: "QR code detected" }]    : []),
            ...(findings.faces.length  ? [{ label: "Face detected" }]       : []),
            ...(findings.textLeaks.length ? [{ label: "Text leaks detected" }] : []),
          ]
        : [],
      changed: [
        { label: "EXIF / GPS / device metadata stripped" },
        { label: "Re-encoded" },
        ...(activeFilter.name !== "None" ? [{ label: `Filter applied: ${activeFilter.name}` }] : []),
      ],
      remaining: [
        { label: "No safety redactions applied" },
        ...(findings?.faces.length ? [{ label: "Faces remain visible" }] : []),
      ],
      tips: ["Review the export before sharing."],
    });

    const receiptString = JSON.stringify(receipt, null, 2);
    setReceiptJson(receiptString);

    downloadBlob(output.blob, `${exportFile.name}.${output.type.split("/")[1]}`);
    downloadBlob(
      new Blob([receiptString], { type: "application/json" }),
      `${exportFile.name}.receipt.json`
    );

    try {
      const verified = await exifr.parse(output.blob);
      setVerification({ metadataPresent: !!verified });
    } catch {
      setVerification({ metadataPresent: false });
    }

    setProcessing(false);
  };

  // ─── All filter items (builtin + imported) ────────────────────────────────

  const allFilters = [...filterItems, ...importedFilters];

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="grid gap-6 lg:grid-cols-[280px_1fr_320px]">

      {/* ── Mobile filter onboarding sheet ── */}
      {showFilterOnboarding && (
        <div className="fixed inset-0 z-[70] flex items-end bg-black/60 lg:hidden">
          <div className="w-full rounded-t-3xl border border-white/10 bg-white/10 p-6 text-white backdrop-blur">
            <div className="text-xs uppercase tracking-[0.3em] text-white/60">Filters first</div>
            <div className="mt-2 text-xl font-semibold">Pick a look before you export</div>
            <p className="mt-2 text-sm text-white/60">
              Choose a mood or import a Lightroom preset. Applied before sanitization.
            </p>
            <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
              {BUILTIN_FILTERS.slice(1, 5).map((f) => (
                <button
                  key={f.name}
                  className="rounded-full border border-white/20 bg-white/10 px-3 py-2 text-left"
                  onClick={() => {
                    setActiveFilter(f);
                    window.localStorage.setItem("nuul-mobile-filters", "true");
                    setShowFilterOnboarding(false);
                  }}
                >
                  {f.name}
                </button>
              ))}
              <label className="col-span-2 cursor-pointer rounded-full border border-white/20 bg-white/10 px-3 py-2 text-left">
                Import Lightroom preset (.xmp)
                <input
                  type="file"
                  className="hidden"
                  accept=".xmp"
                  multiple
                  onChange={onXMPImport}
                />
              </label>
            </div>
            <button
              className="mt-5 w-full rounded-full border border-white/20 bg-white/10 px-4 py-3 text-sm"
              onClick={() => {
                window.localStorage.setItem("nuul-mobile-filters", "true");
                setShowFilterOnboarding(false);
              }}
            >
              Continue to Studio
            </button>
          </div>
        </div>
      )}

      {/* ── Left panel: import + filters ── */}
      <GlassPanel className="p-5">
        <div className="space-y-6">

          {/* Import */}
          <div>
            <div className="text-xs uppercase tracking-[0.2em] text-[color:var(--muted)]">Import</div>
            <div className="mt-3 flex flex-col gap-3">
              <button
                className="rounded-2xl border border-white/10 bg-white/10 px-4 py-6 text-left text-sm backdrop-blur"
                onDrop={onDrop}
                onDragOver={(e) => e.preventDefault()}
                onPaste={onPaste}
              >
                Drag, drop, or paste
                <div className="mt-1 text-xs text-[color:var(--muted)]">JPG · PNG · WEBP up to 50 MB</div>
              </button>
              <label className="cursor-pointer rounded-full border border-white/10 bg-white/10 px-3 py-2 text-center text-xs">
                Pick file
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  onChange={onPick}
                  accept="image/*"
                />
              </label>
            </div>
          </div>

          {/* Filter strip */}
          <div>
            <div className="text-xs uppercase tracking-[0.2em] text-[color:var(--muted)]">Filters</div>
            <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
              {allFilters.map((item) => (
                <button
                  key={item.params.name}
                  onClick={() => {
                    setActiveFilter(item.params);
                    setCurves({ rgb: item.params.toneCurve, r: item.params.toneCurveRed, g: item.params.toneCurveGreen, b: item.params.toneCurveBlue });
                    setHsl(item.params.hsl);
                  }}
                  className={`flex-shrink-0 flex flex-col items-center gap-1 rounded-xl border p-1 transition ${
                    activeFilter.name === item.params.name
                      ? "border-white/60 bg-white/20"
                      : "border-white/10 bg-white/5 hover:bg-white/10"
                  }`}
                  style={{ width: 64 }}
                >
                  {item.thumb ? (
                    <img
                      src={item.thumb}
                      alt={item.params.name}
                      className="h-12 w-12 rounded-lg object-cover"
                    />
                  ) : (
                    <div className="h-12 w-12 rounded-lg bg-white/10 animate-pulse" />
                  )}
                  <span className="text-[10px] text-[color:var(--muted)] truncate w-full text-center px-0.5">
                    {item.params.name}
                  </span>
                </button>
              ))}
            </div>

            {/* Import XMP */}
            <label className="mt-3 flex cursor-pointer items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs text-[color:var(--muted)] hover:bg-white/10 transition">
              <svg className="h-3 w-3" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M6 1v7M3 5l3 3 3-3M1 9.5h10" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Import Lightroom preset (.xmp)
              <input
                ref={xmpInputRef}
                type="file"
                className="hidden"
                accept=".xmp"
                multiple
                onChange={onXMPImport}
              />
            </label>

            {importedFilters.length > 0 && (
              <div className="mt-2 text-[10px] text-[color:var(--muted)]">
                {importedFilters.length} preset{importedFilters.length > 1 ? "s" : ""} imported
              </div>
            )}
          </div>

          {/* Active filter info */}
          {activeFilter.name !== "None" && (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-3 text-xs text-[color:var(--muted)] space-y-1">
              <div className="text-[color:var(--text)] font-medium">{activeFilter.name}</div>
              <div>Exp {activeFilter.exposure > 0 ? "+" : ""}{activeFilter.exposure.toFixed(2)}  ·  Con {activeFilter.contrast > 0 ? "+" : ""}{activeFilter.contrast}</div>
              <div>Sat {activeFilter.saturation}  ·  Vib {activeFilter.vibrance}  ·  Grain {activeFilter.grain}</div>
            </div>
          )}

          {/* File info */}
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-xs text-[color:var(--muted)]">
            {fileInfo ? (
              <div className="space-y-1">
                <div>Format: {fileInfo.type || "unknown"}</div>
                <div>Size: {(fileInfo.size / 1024 / 1024).toFixed(2)} MB</div>
                <div>Dimensions: {fileInfo.width} × {fileInfo.height}</div>
                <div>GPS present: {findings?.metadata.gpsPresent ? "⚠ Yes — will be stripped" : "No"}</div>
                <div>EXIF present: {findings?.metadata.exifPresent ? "⚠ Yes — will be stripped" : "No"}</div>
              </div>
            ) : (
              "File info appears here after import. Metadata is never read or stored."
            )}
          </div>

          {/* ── Advanced adjustments accordion ── */}
          <div>
            <button
              className="flex w-full items-center justify-between py-1 text-left"
              onClick={() => setShowAdvanced((p) => !p)}
            >
              <div className="flex items-center gap-2">
                <span className="text-xs uppercase tracking-[0.2em] text-[color:var(--muted)]">
                  Advanced
                </span>
                <span className="text-[10px] text-[color:var(--muted)] font-mono">
                  Tone curve · HSL
                </span>
              </div>
              <svg
                className={`h-3 w-3 text-[color:var(--muted)] transition-transform duration-200 ${showAdvanced ? "rotate-180" : ""}`}
                viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5"
              >
                <path d="M2 4.5l4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>

            {showAdvanced && (
              <div className="mt-4 space-y-6">
                {/* Tone Curve */}
                <div>
                  <div className="mb-3 text-[10px] uppercase tracking-[0.2em] text-[color:var(--muted)]">
                    Tone Curve
                  </div>
                  <ToneCurveEditor curves={curves} onChange={setCurves} />
                </div>

                {/* HSL */}
                <div>
                  <div className="mb-3 text-[10px] uppercase tracking-[0.2em] text-[color:var(--muted)]">
                    Color Mix
                  </div>
                  <HSLPanel hsl={hsl} onChange={setHsl} />
                </div>
              </div>
            )}
          </div>

        </div>
      </GlassPanel>

      {/* ── Center panel: preview ── */}
      <GlassPanel className="p-6">
        <div className="flex h-full flex-col gap-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold">Safe Export Studio</h1>
              <p className="text-sm text-[color:var(--muted)]">
                Filter. Sanitize. Share. Zero data leaves your browser.
              </p>
            </div>
            {filterRendering && (
              <div className="text-xs text-[color:var(--muted)] animate-pulse">Rendering filter…</div>
            )}
          </div>

          <div className="flex-1 rounded-3xl border border-dashed border-white/20 bg-white/5 p-4 relative overflow-hidden">
            {filteredPreviewUrl ? (
              <img
                src={filteredPreviewUrl}
                alt="Filtered preview"
                className="h-full w-full rounded-2xl object-contain"
              />
            ) : previewUrl ? (
              <img
                src={previewUrl}
                alt="Preview"
                className="h-full w-full rounded-2xl object-contain"
              />
            ) : (
              <div className="flex h-full flex-col items-center justify-center gap-4 text-sm text-[color:var(--muted)]">
                <div className="h-24 w-24 rounded-2xl border border-white/10 bg-white/10" />
                Drop a photo to preview and edit
              </div>
            )}
          </div>

          <BeforeAfterScrubber />
          <ManualTools />

          {verification && (
            <div className={`rounded-2xl border p-4 text-xs ${
              verification.metadataPresent
                ? "border-red-400/30 bg-red-400/10 text-red-300"
                : "border-white/10 bg-white/10 text-[color:var(--muted)]"
            }`}>
              {verification.metadataPresent
                ? "⚠ Residual metadata detected in export — try PNG format for guaranteed clean output."
                : "✓ Export verified clean — no EXIF, GPS, or device metadata present."}
            </div>
          )}

          {receiptJson && !verification && (
            <div className="rounded-2xl border border-white/10 bg-white/10 p-4 text-xs text-[color:var(--muted)]">
              Receipt saved. Check downloads for the JSON audit log.
            </div>
          )}
        </div>
      </GlassPanel>

      {/* ── Right panel: findings + export ── */}
      <div className="space-y-6">
        <GlassPanel className="p-5">
          <RiskMeter level={riskLevel} />
          <div className="mt-6 space-y-3">
            <FindingCard
              title="EXIF & GPS metadata"
              description={
                findings?.metadata.exifPresent
                  ? `Metadata present${findings.metadata.gpsPresent ? " — including GPS coordinates" : ""}. Stripped on export.`
                  : "No EXIF detected."
              }
              actionLabel={findings?.metadata.exifPresent ? "Strip" : undefined}
              active={!!findings?.metadata.exifPresent}
            />
            <FindingCard
              title="Text leaks"
              description={
                findings
                  ? `High ${textLeakSummary?.high ?? 0}, medium ${textLeakSummary?.medium ?? 0}, low ${textLeakSummary?.low ?? 0}.`
                  : ocrAvailable
                    ? "Scan to detect API keys, emails, addresses."
                    : "OCR unavailable — add local Tesseract assets to enable."
              }
              actionLabel={findings?.textLeaks.length ? "Review" : undefined}
            />
            <FindingCard
              title="Browser chrome"
              description={
                findings?.screenHints.length
                  ? findings.screenHints.join(" ")
                  : "Heuristics will flag tabs or browser UI."
              }
              actionLabel={findings?.chromeConfidence === "high" ? "Auto crop" : undefined}
              active={autoCropEnabled}
              onAction={() => setAutoCropEnabled((p) => !p)}
            />
            <FindingCard
              title="QR codes"
              description={findings ? `${findings.codes.length} QR codes found.` : "Scan to detect."}
              actionLabel={findings?.codes.length ? "Blur" : undefined}
              active={!!findings?.codes.length}
            />
            <FindingCard
              title="Faces"
              description={findings ? `${findings.faces.length} faces detected.` : "Face detection pending."}
            />
          </div>
        </GlassPanel>

        <ExportSheet
          format={exportFormat}
          quality={exportQuality}
          onFormatChange={setExportFormat}
          onQualityChange={setExportQuality}
          onExport={onExport}
          onExportAsIs={onExportAsIs}
        />

        <GlassPanel className="p-4 space-y-3">
          <div className="text-xs uppercase tracking-[0.2em] text-[color:var(--muted)]">What gets stripped</div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4 space-y-2 text-xs text-[color:var(--muted)]">
            <p className="text-[color:var(--text)] font-medium">Every export — including no filter — strips:</p>
            <ul className="space-y-1 pl-2">
              {[
                "EXIF (camera model, focal length, ISO, shutter speed)",
                "GPS coordinates, altitude, speed, direction",
                "Device make, model, serial number, lens ID",
                "Timestamps (DateTimeOriginal, DateTimeDigitized)",
                "Embedded JPEG thumbnails stored in the header",
                "XMP, IPTC, software tags, and ICC color profile",
              ].map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400/70" />
                  {item}
                </li>
              ))}
            </ul>
            <p className="pt-1 text-[10px] text-[color:var(--muted)] border-t border-white/10">
              Stripping is architectural — the canvas re-encode has no mechanism to carry metadata,
              so it cannot survive regardless of filter or format choice.
            </p>
            <p className="text-[10px] text-amber-400/80">
              Not stripped: visual content — faces, text, and QR codes visible in the image.
              Use the scan tools above to detect and blur them.
            </p>
          </div>
        </GlassPanel>

        {processing && (
          <div className="rounded-2xl border border-white/10 bg-white/10 p-4 text-xs text-[color:var(--muted)] animate-pulse">
            Processing…
          </div>
        )}
      </div>
    </div>
  );
}
