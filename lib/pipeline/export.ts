import { canvasToBlob } from "@/lib/pipeline/image";
import { CodeFinding } from "@/lib/pipeline/types";
import { XMPFilterParams } from "@/lib/presets/xmpParser";
import { applyFilterToCanvas } from "@/lib/presets/filterEngine";

export interface ExportOptions {
  format: "image/jpeg" | "image/png" | "image/webp";
  quality?: number;
  maxEdge?: number;
  blurRegions?: CodeFinding[];
  addGrain?: boolean;
  cropTop?: number;
  filter?: XMPFilterParams | null;
}

const MAX_BYTES = 50 * 1024 * 1024; // 50 MB

export async function exportSanitized(
  bitmap: ImageBitmap,
  options: ExportOptions
): Promise<{ blob: Blob; width: number; height: number; type: string }> {
  // Enforce 50 MB input guard (bitmap pixel bytes ≈ w × h × 4)
  const approxBytes = bitmap.width * bitmap.height * 4;
  if (approxBytes > MAX_BYTES) {
    throw new Error(
      `Image is too large (${(approxBytes / 1024 / 1024).toFixed(1)} MB uncompressed). ` +
      `Please use an image under 50 MB.`
    );
  }

  const scale = options.maxEdge
    ? Math.min(1, options.maxEdge / Math.max(bitmap.width, bitmap.height))
    : 1;
  const targetWidth = Math.round(bitmap.width * scale);
  const targetHeight = Math.round(bitmap.height * scale);
  const cropTop = Math.max(0, options.cropTop ?? 0);
  const cropTopScaled = Math.round(cropTop * scale);

  // ─── Step 1: draw bitmap → canvas (also strips all EXIF/GPS/metadata) ───
  const canvas = document.createElement("canvas");
  canvas.width = targetWidth;
  canvas.height = Math.max(1, targetHeight - cropTopScaled);
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("Canvas context unavailable");

  ctx.drawImage(
    bitmap,
    0,
    cropTop,
    bitmap.width,
    bitmap.height - cropTop,
    0,
    0,
    targetWidth,
    targetHeight - cropTopScaled
  );

  // ─── Step 2: apply color grading filter if selected ──────────────────────
  let workCanvas: HTMLCanvasElement = canvas;
  if (options.filter) {
    workCanvas = applyFilterToCanvas(canvas, options.filter);
  }

  const workCtx = workCanvas.getContext("2d", { willReadFrequently: true });
  if (!workCtx) throw new Error("Canvas context unavailable after filter");

  // ─── Step 3: blur QR / sensitive regions ─────────────────────────────────
  if (options.blurRegions?.length) {
    options.blurRegions.forEach((region) => {
      const { x, y, width: w, height: h } = region.boundingBox;
      const temp = document.createElement("canvas");
      temp.width = w;
      temp.height = h;
      const tctx = temp.getContext("2d");
      if (!tctx) return;
      tctx.drawImage(workCanvas, x, y, w, h, 0, 0, w, h);
      workCtx.save();
      workCtx.filter = "blur(18px)";
      workCtx.drawImage(temp, x, y);
      workCtx.restore();
    });
  }

  // ─── Step 4: optional extra grain pass (if preset uses addGrain flag) ────
  if (options.addGrain) {
    const imageData = workCtx.getImageData(0, 0, workCanvas.width, workCanvas.height);
    for (let i = 0; i < imageData.data.length; i += 4) {
      const grain = (Math.random() - 0.5) * 10;
      imageData.data[i]     = Math.min(255, Math.max(0, imageData.data[i]     + grain));
      imageData.data[i + 1] = Math.min(255, Math.max(0, imageData.data[i + 1] + grain));
      imageData.data[i + 2] = Math.min(255, Math.max(0, imageData.data[i + 2] + grain));
    }
    workCtx.putImageData(imageData, 0, 0);
  }

  // ─── Step 5: encode to blob (metadata-free by definition) ────────────────
  const blob = await canvasToBlob(workCanvas, options.format, options.quality);
  return {
    blob,
    width: workCanvas.width,
    height: workCanvas.height,
    type: options.format,
  };
}
