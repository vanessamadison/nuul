/**
 * nuul Built-in Filter Presets
 * Each entry implements the full XMPFilterParams interface so they compose
 * with user-imported Lightroom .xmp presets and manual curve/HSL edits.
 */

import { XMPFilterParams, defaultHSL } from "./xmpParser";
import { identityCurve, ToneCurve } from "./toneCurve";

// Preset tone curves
const sCurve: ToneCurve = {
  points: [[0, 0], [0.25, 0.22], [0.5, 0.5], [0.75, 0.78], [1, 1]],
};
const softSCurve: ToneCurve = {
  points: [[0, 0], [0.3, 0.28], [0.7, 0.72], [1, 1]],
};
const filmCurve: ToneCurve = {
  points: [[0, 0.04], [0.25, 0.24], [0.5, 0.5], [0.75, 0.76], [1, 0.96]],
};
const hardContrastCurve: ToneCurve = {
  points: [[0, 0], [0.2, 0.14], [0.5, 0.5], [0.8, 0.88], [1, 1]],
};
const matteCurve: ToneCurve = {
  points: [[0, 0.06], [0.3, 0.32], [0.7, 0.7], [1, 0.94]],
};
// Additional curves for new presets
const fadedCurve: ToneCurve = {
  points: [[0, 0.08], [0.25, 0.28], [0.5, 0.5], [0.75, 0.72], [1, 0.88]],
};
const liftCurve: ToneCurve = {
  points: [[0, 0.12], [0.3, 0.36], [0.6, 0.62], [1, 0.92]],
};
const deepShadowCurve: ToneCurve = {
  points: [[0, 0], [0.15, 0.06], [0.5, 0.5], [0.85, 0.88], [1, 1]],
};

export const BUILTIN_FILTERS: XMPFilterParams[] = [
  {
    name: "None",
    exposure: 0, contrast: 0,
    highlights: 0, shadows: 0, whites: 0, blacks: 0,
    temperature: 6500, tint: 0,
    vibrance: 0, saturation: 0,
    clarity: 0, dehaze: 0,
    vignette: 0, grain: 0, sharpening: 25,
    toneCurve: identityCurve,
    toneCurveRed: identityCurve,
    toneCurveGreen: identityCurve,
    toneCurveBlue: identityCurve,
    hsl: defaultHSL,
  },
  {
    name: "Graphite",
    exposure: -0.1, contrast: 25,
    highlights: -25, shadows: 12, whites: 5, blacks: -12,
    temperature: 5600, tint: 0,
    vibrance: -40, saturation: -75,
    clarity: 18, dehaze: 0,
    vignette: -22, grain: 18, sharpening: 35,
    toneCurve: hardContrastCurve,
    toneCurveRed: identityCurve,
    toneCurveGreen: identityCurve,
    toneCurveBlue: identityCurve,
    hsl: defaultHSL,
  },
  {
    name: "Warm Film",
    exposure: 0.15, contrast: 12,
    highlights: -12, shadows: 22, whites: 12, blacks: 8,
    temperature: 7600, tint: 6,
    vibrance: 22, saturation: 12,
    clarity: 5, dehaze: 0,
    vignette: -18, grain: 22, sharpening: 20,
    toneCurve: filmCurve,
    toneCurveRed: { points: [[0, 0.02], [0.5, 0.52], [1, 1]] },
    toneCurveGreen: identityCurve,
    toneCurveBlue: { points: [[0, 0], [0.5, 0.47], [1, 0.93]] },
    hsl: {
      ...defaultHSL,
      orange: { hue: 4, saturation: 18, luminance: 5 },
      yellow: { hue: 0, saturation: 12, luminance: 0 },
    },
  },
  {
    name: "Soft Grain",
    exposure: 0.25, contrast: -15,
    highlights: -22, shadows: 35, whites: 8, blacks: 12,
    temperature: 6800, tint: 0,
    vibrance: 12, saturation: 5,
    clarity: -12, dehaze: 0,
    vignette: -10, grain: 40, sharpening: 15,
    toneCurve: matteCurve,
    toneCurveRed: identityCurve,
    toneCurveGreen: identityCurve,
    toneCurveBlue: identityCurve,
    hsl: defaultHSL,
  },
  {
    name: "Noir",
    exposure: -0.2, contrast: 45,
    highlights: -45, shadows: -12, whites: 0, blacks: -22,
    temperature: 5400, tint: 0,
    vibrance: -80, saturation: -100,
    clarity: 22, dehaze: 0,
    vignette: -45, grain: 28, sharpening: 42,
    toneCurve: hardContrastCurve,
    toneCurveRed: identityCurve,
    toneCurveGreen: identityCurve,
    toneCurveBlue: identityCurve,
    hsl: defaultHSL,
  },
  {
    name: "Chrome",
    exposure: 0, contrast: 28,
    highlights: -18, shadows: 12, whites: 18, blacks: -8,
    temperature: 6100, tint: -5,
    vibrance: 18, saturation: 8,
    clarity: 12, dehaze: 6,
    vignette: -12, grain: 5, sharpening: 32,
    toneCurve: sCurve,
    toneCurveRed: identityCurve,
    toneCurveGreen: identityCurve,
    toneCurveBlue: { points: [[0, 0], [0.5, 0.48], [1, 0.96]] },
    hsl: {
      ...defaultHSL,
      blue: { hue: -8, saturation: 25, luminance: -5 },
      aqua: { hue: -5, saturation: 15, luminance: 0 },
    },
  },
  {
    name: "Ritual",
    exposure: -0.05, contrast: 18,
    highlights: -28, shadows: 28, whites: -5, blacks: 12,
    temperature: 7200, tint: 10,
    vibrance: 28, saturation: 18,
    clarity: 0, dehaze: 0,
    vignette: -28, grain: 12, sharpening: 22,
    toneCurve: softSCurve,
    toneCurveRed: { points: [[0, 0.01], [0.5, 0.52], [1, 1]] },
    toneCurveGreen: identityCurve,
    toneCurveBlue: { points: [[0, 0], [0.5, 0.46], [1, 0.9]] },
    hsl: {
      ...defaultHSL,
      red:    { hue: 5, saturation: 20, luminance: 0 },
      orange: { hue: 8, saturation: 25, luminance: 5 },
      yellow: { hue: 3, saturation: 15, luminance: 0 },
    },
  },
  {
    name: "Dusk",
    exposure: -0.3, contrast: 22,
    highlights: -30, shadows: 18, whites: -8, blacks: 5,
    temperature: 8200, tint: 12,
    vibrance: 32, saturation: 22,
    clarity: 5, dehaze: 0,
    vignette: -32, grain: 8, sharpening: 25,
    toneCurve: filmCurve,
    toneCurveRed: { points: [[0, 0.02], [0.6, 0.58], [1, 0.98]] },
    toneCurveGreen: { points: [[0, 0], [0.5, 0.49], [1, 0.97]] },
    toneCurveBlue: { points: [[0, 0.05], [0.5, 0.55], [1, 1]] },
    hsl: {
      ...defaultHSL,
      blue:   { hue: -15, saturation: 30, luminance: -8 },
      purple: { hue: -10, saturation: 20, luminance: -5 },
      orange: { hue:  5,  saturation: 15, luminance:  5 },
    },
  },
  {
    name: "Studio",
    exposure: 0.1, contrast: 5,
    highlights: -5, shadows: 8, whites: 5, blacks: -5,
    temperature: 6400, tint: 0,
    vibrance: 8, saturation: 2,
    clarity: 8, dehaze: 0,
    vignette: 0, grain: 0, sharpening: 30,
    toneCurve: identityCurve,
    toneCurveRed: identityCurve,
    toneCurveGreen: identityCurve,
    toneCurveBlue: identityCurve,
    hsl: defaultHSL,
  },

  // ── New aesthetic presets ─────────────────────────────────────────────────

  {
    // Faded: lifted matte blacks, desaturated + cool — 90s magazine feel
    name: "Faded",
    exposure: 0.05, contrast: -18,
    highlights: -8, shadows: 35, whites: -5, blacks: 20,
    temperature: 6000, tint: -4,
    vibrance: -22, saturation: -15,
    clarity: -8, dehaze: 0,
    vignette: -12, grain: 32, sharpening: 12,
    toneCurve: fadedCurve,
    toneCurveRed: identityCurve,
    toneCurveGreen: { points: [[0, 0.02], [0.5, 0.5], [1, 0.97]] },
    toneCurveBlue: { points: [[0, 0.06], [0.5, 0.52], [1, 0.98]] },
    hsl: {
      ...defaultHSL,
      red:    { hue: 0,  saturation: -12, luminance:  0 },
      orange: { hue: 0,  saturation: -18, luminance:  5 },
      green:  { hue: 0,  saturation: -25, luminance: -5 },
    },
  },

  {
    // Mocha: warm brown tones, lifted midtones, cafe window light
    name: "Mocha",
    exposure: 0.05, contrast: 14,
    highlights: -15, shadows: 25, whites: 8, blacks: 6,
    temperature: 7800, tint: 8,
    vibrance: 12, saturation: 10,
    clarity: 6, dehaze: 0,
    vignette: -20, grain: 16, sharpening: 22,
    toneCurve: filmCurve,
    toneCurveRed: { points: [[0, 0.04], [0.5, 0.54], [1, 1]] },
    toneCurveGreen: { points: [[0, 0.01], [0.5, 0.50], [1, 0.96]] },
    toneCurveBlue: { points: [[0, 0], [0.5, 0.44], [1, 0.88]] },
    hsl: {
      ...defaultHSL,
      orange: { hue:  6, saturation: 22, luminance: 8  },
      yellow: { hue:  4, saturation: 18, luminance: 4  },
      red:    { hue:  8, saturation: 15, luminance: 0  },
    },
  },

  {
    // Vapor: lo-fi pastel — cool blue/lavender, low contrast, dreamy
    name: "Vapor",
    exposure: 0.2, contrast: -20,
    highlights: -18, shadows: 40, whites: 5, blacks: 18,
    temperature: 5400, tint: 10,
    vibrance: 25, saturation: 12,
    clarity: -15, dehaze: 0,
    vignette: -15, grain: 20, sharpening: 8,
    toneCurve: liftCurve,
    toneCurveRed: { points: [[0, 0.04], [0.5, 0.50], [1, 0.95]] },
    toneCurveGreen: { points: [[0, 0.03], [0.5, 0.51], [1, 0.97]] },
    toneCurveBlue: { points: [[0, 0.10], [0.5, 0.58], [1, 1]] },
    hsl: {
      ...defaultHSL,
      blue:   { hue: -8,  saturation: 28, luminance:  8 },
      purple: { hue: 10,  saturation: 32, luminance:  6 },
      aqua:   { hue: -5,  saturation: 20, luminance:  4 },
    },
  },

  {
    // Golden Hour: rich amber/gold shadows, punchy highlights, sunset feel
    name: "Golden Hour",
    exposure: 0.1, contrast: 20,
    highlights: -22, shadows: 28, whites: 12, blacks: 4,
    temperature: 9200, tint: 14,
    vibrance: 38, saturation: 28,
    clarity: 10, dehaze: 5,
    vignette: -28, grain: 6, sharpening: 28,
    toneCurve: softSCurve,
    toneCurveRed: { points: [[0, 0.03], [0.5, 0.55], [1, 1]] },
    toneCurveGreen: { points: [[0, 0.01], [0.5, 0.50], [1, 0.97]] },
    toneCurveBlue: { points: [[0, 0], [0.5, 0.42], [1, 0.85]] },
    hsl: {
      ...defaultHSL,
      red:    { hue:  8,  saturation: 25, luminance:  5 },
      orange: { hue: 10,  saturation: 35, luminance: 10 },
      yellow: { hue:  5,  saturation: 28, luminance:  8 },
    },
  },

  {
    // Ice: crisp blue-white, airy + clean, cold clarity
    name: "Ice",
    exposure: 0.3, contrast: -8,
    highlights: -10, shadows: 22, whites: 18, blacks: 8,
    temperature: 4800, tint: -8,
    vibrance: 15, saturation: -8,
    clarity: 5, dehaze: 8,
    vignette: -6, grain: 0, sharpening: 38,
    toneCurve: softSCurve,
    toneCurveRed: { points: [[0, 0], [0.5, 0.48], [1, 0.96]] },
    toneCurveGreen: { points: [[0, 0.01], [0.5, 0.50], [1, 0.98]] },
    toneCurveBlue: { points: [[0, 0.06], [0.5, 0.55], [1, 1]] },
    hsl: {
      ...defaultHSL,
      blue:   { hue: -5, saturation: 18, luminance: 10 },
      aqua:   { hue: -3, saturation: 12, luminance:  8 },
    },
  },

  {
    // Kelp: desaturated olive-green, earthy + organic, documentary feel
    name: "Kelp",
    exposure: -0.05, contrast: 18,
    highlights: -20, shadows: 10, whites: -5, blacks: -8,
    temperature: 6600, tint: 8,
    vibrance: -28, saturation: -35,
    clarity: 14, dehaze: 0,
    vignette: -18, grain: 24, sharpening: 28,
    toneCurve: sCurve,
    toneCurveRed: { points: [[0, 0.01], [0.5, 0.50], [1, 0.97]] },
    toneCurveGreen: { points: [[0, 0.02], [0.5, 0.52], [1, 0.98]] },
    toneCurveBlue: { points: [[0, 0], [0.5, 0.46], [1, 0.90]] },
    hsl: {
      ...defaultHSL,
      green:  { hue:  8, saturation: -30, luminance: -10 },
      yellow: { hue:  5, saturation: -22, luminance:  -5 },
      aqua:   { hue: -5, saturation: -25, luminance:   0 },
    },
  },

  {
    // Ritual Night: deep shadow, crimson shift, high vignette — sacred/dark
    name: "Ritual Night",
    exposure: -0.4, contrast: 35,
    highlights: -40, shadows: -18, whites: -10, blacks: -28,
    temperature: 6800, tint: 8,
    vibrance: 20, saturation: 15,
    clarity: 20, dehaze: 0,
    vignette: -60, grain: 28, sharpening: 30,
    toneCurve: deepShadowCurve,
    toneCurveRed: { points: [[0, 0.02], [0.5, 0.54], [1, 1]] },
    toneCurveGreen: { points: [[0, 0], [0.5, 0.47], [1, 0.93]] },
    toneCurveBlue: { points: [[0, 0], [0.5, 0.44], [1, 0.88]] },
    hsl: {
      ...defaultHSL,
      red:    { hue:  5, saturation: 28, luminance: -8  },
      orange: { hue:  8, saturation: 20, luminance: -5  },
      purple: { hue: -8, saturation: 18, luminance: -10 },
    },
  },

  {
    // Soft Grain (enhanced) — keep original but also add Candlelight
    // Candlelight: extreme warmth, heavy orange/amber glow, intimate
    name: "Candlelight",
    exposure: 0.0, contrast: 8,
    highlights: -30, shadows: 30, whites: -5, blacks: 15,
    temperature: 10000, tint: 18,
    vibrance: 28, saturation: 35,
    clarity: 0, dehaze: 0,
    vignette: -35, grain: 14, sharpening: 18,
    toneCurve: filmCurve,
    toneCurveRed: { points: [[0, 0.05], [0.5, 0.58], [1, 1]]     },
    toneCurveGreen: { points: [[0, 0.01], [0.5, 0.49], [1, 0.92]] },
    toneCurveBlue: { points: [[0, 0], [0.5, 0.38], [1, 0.78]]    },
    hsl: {
      ...defaultHSL,
      red:    { hue: 10, saturation: 35, luminance: 10 },
      orange: { hue: 12, saturation: 40, luminance: 15 },
      yellow: { hue:  8, saturation: 30, luminance: 10 },
    },
  },
];
