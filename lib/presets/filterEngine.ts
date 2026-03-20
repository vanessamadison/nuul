/**
 * nuul Filter Engine
 * Applies Lightroom-style color grading to an HTML Canvas using pixel manipulation.
 *
 * Pipeline per pixel:
 *   1. Tone curve LUT  (exposure → contrast → highlights/shadows → whites/blacks)
 *   2. Temperature / Tint color shift
 *   3. Saturation (global HSL)
 *   4. Vibrance (selective saturation of less-saturated colors)
 *   5. Vignette overlay (radial gradient)
 *   6. Grain (per-pixel noise)
 *
 * Preview mode renders at 600px wide for performance.
 * Export mode renders at full resolution.
 */

import { XMPFilterParams, defaultFilterParams } from "./xmpParser";

// ─── HSL helpers ─────────────────────────────────────────────────────────────

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = 0;
  switch (max) {
    case r: h = (g - b) / d + (g < b ? 6 : 0); break;
    case g: h = (b - r) / d + 2; break;
    case b: h = (r - g) / d + 4; break;
  }
  return [h / 6, s, l];
}

function hue2rgb(p: number, q: number, t: number): number {
  if (t < 0) t += 1;
  if (t > 1) t -= 1;
  if (t < 1 / 6) return p + (q - p) * 6 * t;
  if (t < 1 / 2) return q;
  if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
  return p;
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  if (s === 0) {
    const v = Math.round(l * 255);
    return [v, v, v];
  }
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  return [
    Math.round(hue2rgb(p, q, h + 1 / 3) * 255),
    Math.round(hue2rgb(p, q, h) * 255),
    Math.round(hue2rgb(p, q, h - 1 / 3) * 255),
  ];
}

const clamp = (v: number) => v < 0 ? 0 : v > 255 ? 255 : v;

// ─── Tone Curve LUT ───────────────────────────────────────────────────────────

/**
 * Build a 256-entry lookup table that maps an input level (0–255)
 * to an output level after applying exposure, contrast, tone range, and
 * whites/blacks adjustments.  Applied per channel for luminance operations.
 */
function buildToneLUT(params: XMPFilterParams): Uint8ClampedArray {
  const lut = new Uint8ClampedArray(256);
  const expMul = Math.pow(2, params.exposure);          // e.g. +1 EV → ×2
  const cFactor = params.contrast / 100;                // -1 → +1

  for (let i = 0; i < 256; i++) {
    let v = i / 255;

    // 1. Exposure (linear power)
    v = Math.min(1, v * expMul);

    // 2. Highlights & Shadows (tone-range adjustments around pivot 0.5)
    const hFactor = params.highlights / 100;
    const sFactor = params.shadows / 100;
    if (v > 0.5) {
      v = v + hFactor * (1 - v) * (v - 0.5) * 2;
    } else {
      v = v + sFactor * v * (0.5 - v) * 2;
    }

    // 3. Whites & Blacks (endpoints)
    const wFactor = params.whites / 100;
    const bFactor = params.blacks / 100;
    v = v + wFactor * v * v;
    v = v - bFactor * (1 - v) * (1 - v);

    // 4. Contrast S-curve (pivot at 0.5)
    if (cFactor > 0) {
      const pivot = 0.5;
      if (v < pivot) {
        v = pivot * Math.pow(v / pivot, 1 + cFactor);
      } else {
        v = 1 - (1 - pivot) * Math.pow((1 - v) / (1 - pivot), 1 + cFactor);
      }
    } else if (cFactor < 0) {
      v = 0.5 + (v - 0.5) * (1 + cFactor);
    }

    lut[i] = Math.min(255, Math.max(0, Math.round(v * 255)));
  }
  return lut;
}

// ─── Core filter application ──────────────────────────────────────────────────

export function applyFilterToCanvas(
  src: HTMLCanvasElement,
  params: XMPFilterParams
): HTMLCanvasElement {
  const { width, height } = src;
  const out = document.createElement("canvas");
  out.width = width;
  out.height = height;
  const ctx = out.getContext("2d", { willReadFrequently: true })!;
  ctx.drawImage(src, 0, 0);

  // Skip if no-op
  const isNoOp =
    params.exposure === 0 && params.contrast === 0 &&
    params.highlights === 0 && params.shadows === 0 &&
    params.whites === 0 && params.blacks === 0 &&
    params.temperature === 6500 && params.tint === 0 &&
    params.vibrance === 0 && params.saturation === 0 &&
    params.vignette === 0 && params.grain === 0;

  if (!isNoOp) {
    const lut = buildToneLUT(params);

    // Temperature shift: warm (high K) = more red/less blue, cool = more blue
    // LR Temperature param is raw Kelvin; we compare to neutral 6500K
    const tempDelta = (params.temperature - 6500) / 6500;
    const rShift = tempDelta * 22;
    const bShift = -tempDelta * 22;
    // Tint: positive = magenta (less green), negative = green
    const gShift = -(params.tint / 150) * 12;

    const satMul = 1 + params.saturation / 100;
    const vibStrength = params.vibrance / 100;

    const imageData = ctx.getImageData(0, 0, width, height);
    const d = imageData.data;

    for (let i = 0; i < d.length; i += 4) {
      let r = lut[d[i]];
      let g = lut[d[i + 1]];
      let b = lut[d[i + 2]];

      // Temperature / Tint
      r = clamp(r + rShift);
      g = clamp(g + gShift);
      b = clamp(b + bShift);

      // Saturation (global)
      if (params.saturation !== 0) {
        const [h, s, l] = rgbToHsl(r, g, b);
        const ns = Math.max(0, Math.min(1, s * satMul));
        [r, g, b] = hslToRgb(h, ns, l);
      }

      // Vibrance (selective — boosts desaturated colors more)
      if (params.vibrance !== 0) {
        const [h, s, l] = rgbToHsl(r, g, b);
        // Less-saturated pixels get a bigger boost
        const boost = vibStrength * (1 - Math.min(1, s * 2));
        const ns = Math.max(0, Math.min(1, s * (1 + boost)));
        [r, g, b] = hslToRgb(h, ns, l);
      }

      d[i]     = r;
      d[i + 1] = g;
      d[i + 2] = b;
      // alpha unchanged
    }

    ctx.putImageData(imageData, 0, 0);

    // Vignette
    if (params.vignette !== 0) {
      const strength = params.vignette / 100; // negative = darken
      const cx = width / 2;
      const cy = height / 2;
      const innerR = Math.min(width, height) * 0.15;
      const outerR = Math.max(width, height) * 0.8;
      const grad = ctx.createRadialGradient(cx, cy, innerR, cx, cy, outerR);
      grad.addColorStop(0, "rgba(0,0,0,0)");
      if (strength < 0) {
        // Darken edges
        grad.addColorStop(1, `rgba(0,0,0,${Math.abs(strength).toFixed(2)})`);
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, width, height);
      } else {
        // Lighten edges (negative vignette)
        grad.addColorStop(1, `rgba(255,255,255,${strength.toFixed(2)})`);
        ctx.save();
        ctx.globalCompositeOperation = "screen";
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, width, height);
        ctx.restore();
      }
    }

    // Grain
    if (params.grain > 0) {
      const grain = ctx.getImageData(0, 0, width, height);
      const gd = grain.data;
      const intensity = params.grain * 0.9;
      for (let i = 0; i < gd.length; i += 4) {
        const n = (Math.random() - 0.5) * intensity;
        gd[i]     = clamp(gd[i]     + n);
        gd[i + 1] = clamp(gd[i + 1] + n);
        gd[i + 2] = clamp(gd[i + 2] + n);
      }
      ctx.putImageData(grain, 0, 0);
    }
  }

  return out;
}

/**
 * Apply a filter to an ImageBitmap and return a filtered canvas (full resolution).
 */
export function applyFilterToBitmap(
  bitmap: ImageBitmap,
  params: XMPFilterParams
): HTMLCanvasElement {
  const src = document.createElement("canvas");
  src.width = bitmap.width;
  src.height = bitmap.height;
  src.getContext("2d")!.drawImage(bitmap, 0, 0);
  return applyFilterToCanvas(src, params);
}

/**
 * Apply a filter to an ImageBitmap at preview resolution (max 600px wide).
 * Returns a data URL for use in <img> tags.
 */
export async function applyFilterPreview(
  bitmap: ImageBitmap,
  params: XMPFilterParams,
  maxEdge = 600
): Promise<string> {
  const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);

  const src = document.createElement("canvas");
  src.width = w;
  src.height = h;
  src.getContext("2d")!.drawImage(bitmap, 0, 0, w, h);

  const filtered = applyFilterToCanvas(src, params);
  return filtered.toDataURL("image/jpeg", 0.85);
}

/**
 * Generate a tiny thumbnail (80×80 crop) showing what a filter looks like
 * applied to a reference image.  Used in the filter strip.
 */
export async function filterThumbnail(
  bitmap: ImageBitmap,
  params: XMPFilterParams
): Promise<string> {
  return applyFilterPreview(bitmap, params, 120);
}

export { defaultFilterParams };
