/**
 * nuul Filter Engine
 * Applies Lightroom-compatible color grading to an HTML Canvas using pixel manipulation.
 *
 * Pipeline per pixel:
 *   1. Tone curve LUT  (exposure → contrast → highlights/shadows → whites/blacks)
 *   2. Per-channel tone curves  (R, G, B individual curves)
 *   3. Composite luminance tone curve
 *   4. Temperature / Tint color shift
 *   5. Saturation (global HSL)
 *   6. Vibrance (selective saturation of less-saturated colors)
 *   7. HSL per-hue-range adjustments (8 Lightroom color zones)
 *   8. Vignette overlay (radial gradient)
 *   9. Grain (per-pixel noise)
 *
 * Preview mode renders at 600px wide for performance.
 * Export mode renders at full resolution.
 */

import { XMPFilterParams, defaultFilterParams, HSLAdjustments } from "./xmpParser";
import { ToneCurve, identityCurve, buildCurveLUT } from "./toneCurve";

// ─── HSL helpers ─────────────────────────────────────────────────────────────

export function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
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

export function hslToRgb(h: number, s: number, l: number): [number, number, number] {
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

const clamp = (v: number) => (v < 0 ? 0 : v > 255 ? 255 : v);
const isIdentity = (lut: Uint8ClampedArray) => lut[0] === 0 && lut[128] === 128 && lut[255] === 255;

// ─── HSL range definitions (Lightroom color zones) ───────────────────────────
// Each zone: [centerHue degrees, halfWidth degrees]
// Overlap between zones provides smooth transitions.

const HSL_ZONES: Record<keyof HSLAdjustments, [number, number]> = {
  red:     [0,   25],
  orange:  [30,  20],
  yellow:  [60,  20],
  green:   [120, 35],
  aqua:    [180, 25],
  blue:    [210, 25],
  purple:  [270, 28],
  magenta: [330, 22],
};

/**
 * Compute a smooth 0–1 weight for a hue (0–360) in a given zone.
 * Uses a cosine bell for natural falloff.
 */
function hueWeight(hueDeg: number, centerDeg: number, halfWidthDeg: number): number {
  // Wrap difference to [-180, 180]
  let diff = ((hueDeg - centerDeg) % 360 + 360) % 360;
  if (diff > 180) diff -= 360;
  if (Math.abs(diff) >= halfWidthDeg) return 0;
  return 0.5 * (1 + Math.cos((Math.PI * diff) / halfWidthDeg));
}

// ─── Core filter application ──────────────────────────────────────────────────

function isIdentityCurve(curve: ToneCurve): boolean {
  return curve === identityCurve ||
    (curve.points.length === 2 &&
      curve.points[0][0] === 0 && curve.points[0][1] === 0 &&
      curve.points[1][0] === 1 && curve.points[1][1] === 1);
}

function hasAnyHSL(hsl: HSLAdjustments): boolean {
  for (const range of Object.values(hsl)) {
    if (range.hue !== 0 || range.saturation !== 0 || range.luminance !== 0) return true;
  }
  return false;
}

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

  const isNoOp =
    params.exposure === 0 && params.contrast === 0 &&
    params.highlights === 0 && params.shadows === 0 &&
    params.whites === 0 && params.blacks === 0 &&
    params.temperature === 6500 && params.tint === 0 &&
    params.vibrance === 0 && params.saturation === 0 &&
    params.vignette === 0 && params.grain === 0 &&
    isIdentityCurve(params.toneCurve) &&
    isIdentityCurve(params.toneCurveRed) &&
    isIdentityCurve(params.toneCurveGreen) &&
    isIdentityCurve(params.toneCurveBlue) &&
    !hasAnyHSL(params.hsl);

  if (!isNoOp) {
    // ── Build LUTs ──────────────────────────────────────────────────────────

    // Composite tone LUT (exposure + contrast + tone range) — applied to all channels
    const toneLUT = buildCompositeToneLUT(params);

    // Per-channel curve LUTs
    const rCurveLUT = isIdentityCurve(params.toneCurveRed)
      ? null : buildCurveLUT(params.toneCurveRed);
    const gCurveLUT = isIdentityCurve(params.toneCurveGreen)
      ? null : buildCurveLUT(params.toneCurveGreen);
    const bCurveLUT = isIdentityCurve(params.toneCurveBlue)
      ? null : buildCurveLUT(params.toneCurveBlue);
    const lCurveLUT = isIdentityCurve(params.toneCurve)
      ? null : buildCurveLUT(params.toneCurve);

    // Temperature / Tint
    const tempDelta = (params.temperature - 6500) / 6500;
    const rShift = tempDelta * 22;
    const bShift = -tempDelta * 22;
    const gShift = -(params.tint / 150) * 12;

    // Saturation
    const satMul = 1 + params.saturation / 100;
    const vibStrength = params.vibrance / 100;

    // HSL
    const doHSL = hasAnyHSL(params.hsl);

    // ── Pixel loop ──────────────────────────────────────────────────────────
    const imageData = ctx.getImageData(0, 0, width, height);
    const d = imageData.data;

    for (let i = 0; i < d.length; i += 4) {
      let r = toneLUT[d[i]];
      let g = toneLUT[d[i + 1]];
      let b = toneLUT[d[i + 2]];

      // Per-channel tone curves
      if (rCurveLUT) r = rCurveLUT[r];
      if (gCurveLUT) g = gCurveLUT[g];
      if (bCurveLUT) b = bCurveLUT[b];

      // Composite luminance curve (applied to all channels via luma weighting)
      if (lCurveLUT) {
        const luma = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
        const mapped = lCurveLUT[luma];
        const scale = luma > 0 ? mapped / luma : 1;
        r = clamp(Math.round(r * scale));
        g = clamp(Math.round(g * scale));
        b = clamp(Math.round(b * scale));
      }

      // Temperature / Tint
      r = clamp(r + rShift);
      g = clamp(g + gShift);
      b = clamp(b + bShift);

      // Saturation
      if (params.saturation !== 0) {
        const [h, s, l] = rgbToHsl(r, g, b);
        const ns = Math.max(0, Math.min(1, s * satMul));
        [r, g, b] = hslToRgb(h, ns, l);
      }

      // Vibrance (selective)
      if (params.vibrance !== 0) {
        const [h, s, l] = rgbToHsl(r, g, b);
        const boost = vibStrength * (1 - Math.min(1, s * 2));
        const ns = Math.max(0, Math.min(1, s * (1 + boost)));
        [r, g, b] = hslToRgb(h, ns, l);
      }

      // HSL per-hue-range adjustments
      if (doHSL) {
        let [h, s, l] = rgbToHsl(r, g, b);
        const hueDeg = h * 360;

        let totalWeight = 0;
        let dH = 0, dS = 0, dL = 0;

        for (const [zoneName, [center, half]] of Object.entries(HSL_ZONES)) {
          const w = hueWeight(hueDeg, center, half);
          if (w === 0) continue;
          const zone = params.hsl[zoneName as keyof HSLAdjustments];
          dH += w * (zone.hue / 100);
          dS += w * (zone.saturation / 100);
          dL += w * (zone.luminance / 100);
          totalWeight += w;
        }

        if (totalWeight > 0) {
          h = (h + dH + 1) % 1;
          s = Math.max(0, Math.min(1, s + dS));
          l = Math.max(0, Math.min(1, l + dL * 0.5));
          [r, g, b] = hslToRgb(h, s, l);
        }
      }

      d[i]     = r;
      d[i + 1] = g;
      d[i + 2] = b;
    }

    ctx.putImageData(imageData, 0, 0);

    // ── Vignette ────────────────────────────────────────────────────────────
    if (params.vignette !== 0) {
      const strength = params.vignette / 100;
      const cx = width / 2;
      const cy = height / 2;
      const innerR = Math.min(width, height) * 0.15;
      const outerR = Math.max(width, height) * 0.8;
      const grad = ctx.createRadialGradient(cx, cy, innerR, cx, cy, outerR);
      grad.addColorStop(0, "rgba(0,0,0,0)");
      if (strength < 0) {
        grad.addColorStop(1, `rgba(0,0,0,${Math.abs(strength).toFixed(3)})`);
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, width, height);
      } else {
        grad.addColorStop(1, `rgba(255,255,255,${strength.toFixed(3)})`);
        ctx.save();
        ctx.globalCompositeOperation = "screen";
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, width, height);
        ctx.restore();
      }
    }

    // ── Grain ────────────────────────────────────────────────────────────────
    if (params.grain > 0) {
      const gd = ctx.getImageData(0, 0, width, height);
      const data = gd.data;
      const intensity = params.grain * 0.9;
      for (let i = 0; i < data.length; i += 4) {
        const n = (Math.random() - 0.5) * intensity;
        data[i]     = clamp(data[i]     + n);
        data[i + 1] = clamp(data[i + 1] + n);
        data[i + 2] = clamp(data[i + 2] + n);
      }
      ctx.putImageData(gd, 0, 0);
    }
  }

  return out;
}

/**
 * Build a 256-entry composite tone LUT (exposure + contrast + highlights/shadows
 * + whites/blacks). This is applied to all channels before the per-channel curves.
 */
function buildCompositeToneLUT(params: XMPFilterParams): Uint8ClampedArray {
  const lut = new Uint8ClampedArray(256);
  const expMul = Math.pow(2, params.exposure);
  const cFactor = params.contrast / 100;

  for (let i = 0; i < 256; i++) {
    let v = i / 255;

    v = Math.min(1, v * expMul);

    // Highlights & Shadows
    if (v > 0.5) {
      v = v + (params.highlights / 100) * (1 - v) * (v - 0.5) * 2;
    } else {
      v = v + (params.shadows / 100) * v * (0.5 - v) * 2;
    }

    // Whites & Blacks
    v = v + (params.whites  / 100) * v * v;
    v = v - (params.blacks  / 100) * (1 - v) * (1 - v);

    // Contrast S-curve
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
 * Apply filter at preview resolution (max 600px wide). Returns data URL.
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
 * Generate a small thumbnail (120px) of a filter applied to a reference image.
 */
export async function filterThumbnail(
  bitmap: ImageBitmap,
  params: XMPFilterParams
): Promise<string> {
  return applyFilterPreview(bitmap, params, 120);
}

export { defaultFilterParams };
