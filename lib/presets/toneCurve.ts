/**
 * nuul Tone Curve Engine
 *
 * Implements monotone cubic Hermite spline interpolation (Fritsch–Carlson, 1980)
 * for photographer-grade tone curves that never produce inversions or overshoot.
 *
 * Also provides SVG path generation from the same curve data so the editor and
 * the pixel pipeline are always in sync.
 */

export type CurvePoint = [number, number]; // [input 0–1, output 0–1]

export interface ToneCurve {
  points: CurvePoint[];
}

export const identityCurve: ToneCurve = {
  points: [
    [0, 0],
    [0.25, 0.25],
    [0.75, 0.75],
    [1, 1],
  ],
};

// ─── Monotone cubic Hermite spline ────────────────────────────────────────────

/**
 * Compute Hermite tangents satisfying the Fritsch-Carlson monotonicity condition.
 */
function hermiteTangents(
  xs: number[],
  ys: number[]
): number[] {
  const n = xs.length;
  if (n === 1) return [0];

  // Secant slopes
  const m: number[] = [];
  for (let i = 0; i < n - 1; i++) {
    const dx = xs[i + 1] - xs[i];
    m.push(dx === 0 ? 0 : (ys[i + 1] - ys[i]) / dx);
  }

  // Initial tangent estimates (average of adjacent secants)
  const t: number[] = [m[0]];
  for (let i = 1; i < n - 1; i++) {
    t.push((m[i - 1] + m[i]) / 2);
  }
  t.push(m[n - 2]);

  // Fritsch-Carlson monotonicity constraints
  for (let i = 0; i < n - 1; i++) {
    if (Math.abs(m[i]) < 1e-10) {
      t[i] = 0;
      t[i + 1] = 0;
      continue;
    }
    const a = t[i] / m[i];
    const b = t[i + 1] / m[i];
    const h = Math.hypot(a, b);
    if (h > 3) {
      const k = 3 / h;
      t[i] *= k;
      t[i + 1] *= k;
    }
  }

  return t;
}

/**
 * Build a 256-entry byte lookup table from a set of control points.
 * Input values outside the defined range are clamped.
 */
export function buildCurveLUT(curve: ToneCurve): Uint8ClampedArray {
  const sorted = [...curve.points].sort((a, b) => a[0] - b[0]);
  const xs = sorted.map((p) => p[0]);
  const ys = sorted.map((p) => p[1]);
  const t = hermiteTangents(xs, ys);
  const n = xs.length;

  const lut = new Uint8ClampedArray(256);

  for (let i = 0; i < 256; i++) {
    const x = i / 255;

    // Clamp to curve extent
    if (x <= xs[0]) {
      lut[i] = Math.round(ys[0] * 255);
      continue;
    }
    if (x >= xs[n - 1]) {
      lut[i] = Math.round(ys[n - 1] * 255);
      continue;
    }

    // Find the enclosing segment
    let lo = 0;
    for (let j = 0; j < n - 1; j++) {
      if (x <= xs[j + 1]) { lo = j; break; }
    }

    const h = xs[lo + 1] - xs[lo];
    const tx = (x - xs[lo]) / h;
    const tx2 = tx * tx;
    const tx3 = tx2 * tx;

    // Cubic Hermite basis functions
    const h00 =  2 * tx3 - 3 * tx2 + 1;
    const h10 =      tx3 - 2 * tx2 + tx;
    const h01 = -2 * tx3 + 3 * tx2;
    const h11 =      tx3 -     tx2;

    const y = h00 * ys[lo] + h10 * h * t[lo] + h01 * ys[lo + 1] + h11 * h * t[lo + 1];
    lut[i] = Math.round(Math.max(0, Math.min(1, y)) * 255);
  }

  return lut;
}

/**
 * Generate an SVG <path> `d` attribute for the tone curve inside a box of
 * (svgW × svgH) pixels. The curve goes from bottom-left (dark) to top-right
 * (light) using the standard photographic convention.
 */
export function curveSVGPath(
  curve: ToneCurve,
  svgW: number,
  svgH: number
): string {
  const sorted = [...curve.points].sort((a, b) => a[0] - b[0]);
  const xs = sorted.map((p) => p[0]);
  const ys = sorted.map((p) => p[1]);
  const t = hermiteTangents(xs, ys);
  const n = xs.length;

  if (n === 0) return "";

  // Convert normalized coords → SVG pixel coords
  const px = (x: number) => x * svgW;
  const py = (y: number) => (1 - y) * svgH; // invert y

  // Build path using cubic Bezier segments derived from Hermite tangents:
  // CP1 = P[i]   + (h/3) * T[i]
  // CP2 = P[i+1] - (h/3) * T[i+1]
  const parts: string[] = [`M ${px(xs[0]).toFixed(2)} ${py(ys[0]).toFixed(2)}`];

  for (let i = 0; i < n - 1; i++) {
    const hx = xs[i + 1] - xs[i];
    const hy = ys[i + 1] - ys[i];

    // Bezier control points in normalized space
    const cp1x = xs[i] + hx / 3;
    const cp1y = ys[i] + (t[i] * hx) / 3;
    const cp2x = xs[i + 1] - hx / 3;
    const cp2y = ys[i + 1] - (t[i + 1] * hx) / 3;

    parts.push(
      `C ${px(cp1x).toFixed(2)} ${py(cp1y).toFixed(2)},` +
      ` ${px(cp2x).toFixed(2)} ${py(cp2y).toFixed(2)},` +
      ` ${px(xs[i + 1]).toFixed(2)} ${py(ys[i + 1]).toFixed(2)}`
    );
  }

  return parts.join(" ");
}

/**
 * Parse Lightroom XMP tone curve text (newline/space-separated "in, out" pairs).
 * Example: "0, 0\n64, 58\n255, 255"
 */
export function parseXMPCurve(text: string): ToneCurve {
  const lines = text.trim().split(/[\n\r]+/);
  const points: CurvePoint[] = lines
    .map((line) => {
      const parts = line.trim().split(/[\s,]+/);
      if (parts.length >= 2) {
        const x = parseFloat(parts[0]) / 255;
        const y = parseFloat(parts[1]) / 255;
        if (!isNaN(x) && !isNaN(y)) return [x, y] as CurvePoint;
      }
      return null;
    })
    .filter(Boolean) as CurvePoint[];

  if (points.length < 2) return identityCurve;
  return { points };
}

/**
 * Snap a point's x to a valid position, keeping the first and last point fixed.
 */
export function clampPoint(
  points: CurvePoint[],
  index: number,
  x: number,
  y: number
): CurvePoint {
  const sorted = [...points].sort((a, b) => a[0] - b[0]);
  const sortedIdx = sorted.findIndex((p) => p === points[index]);

  // Endpoints stay at x=0 and x=1
  if (sortedIdx === 0) x = 0;
  if (sortedIdx === sorted.length - 1) x = 1;

  // Can't cross neighbours
  if (sortedIdx > 0) x = Math.max(x, sorted[sortedIdx - 1][0] + 0.01);
  if (sortedIdx < sorted.length - 1)
    x = Math.min(x, sorted[sortedIdx + 1][0] - 0.01);

  return [Math.max(0, Math.min(1, x)), Math.max(0, Math.min(1, y))];
}
