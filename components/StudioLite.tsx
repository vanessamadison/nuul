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

const ocrClient = new OCRClient();
const receiptKey = "nuul-receipts";

const presets: CarouselItem[] = [
  { id: "graphite", label: "Graphite", description: "Strip metadata", gradient: "from-[#0d0f12] via-[#1c1f27] to-[#30323b]" },
  { id: "warm", label: "Warm Film", description: "Gentle resize", gradient: "from-[#1a1311] via-[#3c2d23] to-[#6a503b]" },
  { id: "noir", label: "Noir", description: "High contrast", gradient: "from-[#0b0c0f] via-[#1a1c22] to-[#2a2d36]" },
  { id: "studio", label: "Studio", description: "OCR redact", gradient: "from-[#141115] via-[#2d2424] to-[#3a3130]" },
  { id: "chrome", label: "Chrome", description: "QR blur", gradient: "from-[#0f1419] via-[#24303a] to-[#3a4853]" },
  { id: "dusk", label: "Dusk", description: "Full scrub", gradient: "from-[#111018] via-[#2a2434] to-[#443b4f]" },
];

function downloadBlob(blob: Blob, name: string) {
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = name;
  link.click();
}

export default function StudioLite() {
  const searchParams = useSearchParams();
  const initialPreset = searchParams.get("preset") || "graphite";
  
  const [preset, setPreset] = useState(initialPreset);
  const [queue, setQueue] = useState<File[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [fileInfo, setFileInfo] = useState<FileInfo | null>(null);
  const [processing, setProcessing] = useState(false);
  const [findings, setFindings] = useState<ScanFindings | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const bitmapRef = useRef<ImageBitmap | null>(null);

  const currentFile = queue[currentIndex] ?? null;

  const loadFile = useCallback(
    async (file: File) => {
      setProcessing(true);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      const bitmap = await decodeImage(file);
      bitmapRef.current = bitmap;
      setPreviewUrl(URL.createObjectURL(file));
      const { canvas, ctx, width, height, scale } = imageToCanvas(bitmap, 1400);
      const imageData = ctx.getImageData(0, 0, width, height);
      const ocrText = await ocrClient.recognize(imageData);
      const scan = await scanImage(file, imageData, ocrText);
      setFindings(scan);
      setFileInfo({
        name: file.name,
        type: file.type,
        size: file.size,
        width: bitmap.width,
        height: bitmap.height
      });
      setProcessing(false);
    },
    [previewUrl]
  );

  useEffect(() => {
    if (currentFile) void loadFile(currentFile);
  }, [currentFile, loadFile]);

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
    if (files.length) {
      setQueue(files);
      setCurrentIndex(0);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragOver(false);
  }, []);

  const exportOne = async (file: File, index: number) => {
    const bitmap = bitmapRef.current ?? (await decodeImage(file));
    const output = await exportSanitized(bitmap, {
      format: file.type === "image/png" ? "image/png" : "image/jpeg",
      quality: 0.92,
      maxEdge: 2048,
      blurRegions: findings?.codes.filter((code) => code.autoApply) ?? [],
      cropTop: findings?.chromeConfidence === "high" ? findings?.topBarHeight ?? 0 : 0
    });

    const exportName = `nuul_${Date.now()}_${index + 1}.${output.type.split("/")[1]}`;
    downloadBlob(output.blob, exportName);

    if (fileInfo) {
      const receipt = createReceipt({
        original: fileInfo,
        exported: {
          name: exportName,
          type: output.type,
          size: output.blob.size,
          width: output.width,
          height: output.height
        },
        found: [
          ...(findings?.codes.length ? [{ label: "QR codes detected" }] : []),
          ...(findings?.textLeaks.length ? [{ label: "Text leaks detected" }] : [])
        ],
        changed: [
          { label: "Metadata removed" },
          { label: "Re-encoded" },
          ...(findings?.codes.length ? [{ label: "QR blur applied" }] : []),
          ...(findings?.chromeConfidence === "high" ? [{ label: "Top bar cropped" }] : [])
        ],
        remaining: [
          ...(findings?.faces.length ? [{ label: "Faces remain visible" }] : []),
          ...(findings?.textLeaks.length ? [{ label: "Text leaks not auto-blurred" }] : [])
        ],
        tips: ["Review before sharing."]
      });
      const stored = JSON.parse(window.localStorage.getItem(receiptKey) ?? "[]") as string[];
      stored.unshift(JSON.stringify(receipt));
      window.localStorage.setItem(receiptKey, JSON.stringify(stored.slice(0, 24)));
    }
  };

  const handleExport = async () => {
    if (!currentFile) return;
    setProcessing(true);
    await exportOne(currentFile, currentIndex);
    setProcessing(false);
  };

  const handleExportAll = async () => {
    if (!queue.length) return;
    setProcessing(true);
    for (let i = 0; i < queue.length; i += 1) {
      await exportOne(queue[i], i);
    }
    setProcessing(false);
  };

  const leakSummary = useMemo(() => {
    if (!findings) return null;
    const qr = findings.codes.length ? `${findings.codes.length} QR` : "";
    const text = findings.textLeaks.length ? `${findings.textLeaks.length} text leaks` : "";
    const chrome = findings.chromeConfidence === "high" ? "Browser chrome" : "";
    return [qr, text, chrome].filter(Boolean).join(" · ") || null;
  }, [findings]);

  const navToFile = (direction: "prev" | "next") => {
    if (direction === "prev" && currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    } else if (direction === "next" && currentIndex < queue.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 pb-12 sm:px-6">
      {/* Header */}
      <div className="text-center">
        <div className="text-[0.6rem] uppercase tracking-[0.35em] text-[color:var(--muted)] sm:text-xs">
          Safe Export Studio
        </div>
      </div>

      {/* Protection Level Carousel */}
      <div className="py-4">
        <div className="mb-2 text-center text-[0.55rem] uppercase tracking-[0.3em] text-[color:var(--muted)] sm:text-[0.6rem]">
          Protection Level
        </div>
        <DragCarousel
          items={presets}
          selectedId={preset}
          onSelect={setPreset}
        />
      </div>

      {/* Main content grid */}
      <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
        {/* Preview Panel */}
        <GlassPanel className="order-2 p-4 lg:order-1 sm:p-6">
          <div className="text-[0.55rem] uppercase tracking-[0.3em] text-[color:var(--muted)] sm:text-xs">
            Preview
          </div>

          {/* Drop zone / Preview area */}
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            className={`
              mt-4 flex min-h-[280px] items-center justify-center rounded-2xl border-2 border-dashed
              transition-all duration-300 sm:min-h-[360px]
              ${isDragOver
                ? "border-white/50 bg-white/10"
                : previewUrl
                ? "border-transparent bg-black/20"
                : "border-white/10 bg-white/5 hover:border-white/20"
              }
            `}
          >
            {previewUrl ? (
              <div className="relative flex w-full flex-col items-center">
                <img
                  src={previewUrl}
                  alt="Preview"
                  className="max-h-[300px] rounded-xl object-contain shadow-2xl sm:max-h-[360px]"
                />

                {/* File navigation */}
                {queue.length > 1 && (
                  <div className="mt-4 flex items-center gap-4">
                    <button
                      onClick={() => navToFile("prev")}
                      disabled={currentIndex === 0}
                      className="rounded-full border border-white/20 bg-white/10 p-2 transition hover:bg-white/20 disabled:opacity-30"
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                    </button>
                    <span className="text-xs text-white/60">
                      {currentIndex + 1} / {queue.length}
                    </span>
                    <button
                      onClick={() => navToFile("next")}
                      disabled={currentIndex === queue.length - 1}
                      className="rounded-full border border-white/20 bg-white/10 p-2 transition hover:bg-white/20 disabled:opacity-30"
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  </div>
                )}

                {/* Scan results */}
                {findings && (
                  <div className="mt-4 w-full max-w-sm">
                    {leakSummary ? (
                      <div className="flex items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-2 text-xs text-amber-200">
                        <svg className="h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        <span>{leakSummary}</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-xs text-emerald-200">
                        <svg className="h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span>No obvious leaks detected</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <label className="flex cursor-pointer flex-col items-center gap-3 p-8 text-center">
                <div className="rounded-full border border-white/20 bg-white/10 p-4">
                  <svg className="h-6 w-6 text-white/60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <div className="text-sm text-white/80">Drop photos to start</div>
                <div className="text-[0.65rem] text-white/40">Browse from your device when you are ready</div>
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
        <GlassPanel className="order-1 space-y-6 p-4 lg:order-2 sm:p-6">
          {/* Upload section */}
          <div>
            <div className="text-[0.55rem] uppercase tracking-[0.3em] text-[color:var(--muted)] sm:text-xs">
              Upload
            </div>
            <label className="mt-3 flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-sm transition hover:bg-white/15 active:scale-[0.98]">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span>Add images</span>
              <input
                type="file"
                className="hidden"
                onChange={onPick}
                accept="image/*"
                multiple
              />
            </label>
            {queue.length > 0 && (
              <div className="mt-2 rounded-xl bg-white/5 px-3 py-2 text-center text-[0.65rem] text-[color:var(--muted)]">
                {queue.length} file{queue.length > 1 ? "s" : ""} ready
              </div>
            )}
          </div>

          {/* File info */}
          {fileInfo && (
            <div className="space-y-2 border-t border-white/10 pt-4">
              <div className="text-[0.55rem] uppercase tracking-[0.3em] text-[color:var(--muted)] sm:text-xs">
                File Info
              </div>
              <div className="space-y-1 text-xs text-white/60">
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
                  <span className="text-white/80">{fileInfo.width} x {fileInfo.height}</span>
                </div>
              </div>
            </div>
          )}

          {/* Export buttons */}
          <div className="space-y-3 border-t border-white/10 pt-4">
            <button
              className="w-full rounded-xl border border-white/30 bg-white/15 px-4 py-3 text-xs uppercase tracking-[0.15em] transition hover:bg-white/20 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 sm:tracking-[0.2em]"
              onClick={handleExport}
              disabled={processing || !currentFile}
            >
              {processing ? "Processing..." : "Safe Export"}
            </button>
            {queue.length > 1 && (
              <button
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-xs uppercase tracking-[0.15em] transition hover:bg-white/10 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 sm:tracking-[0.2em]"
                onClick={handleExportAll}
                disabled={processing}
              >
                Export All ({queue.length})
              </button>
            )}
          </div>

          {/* Info */}
          <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-[0.6rem] leading-relaxed text-[color:var(--muted)]">
            Your images never leave your device. All processing happens locally in your browser.
          </div>
        </GlassPanel>
      </div>
    </div>
  );
}
