/**
 * nuul Built-in Filter Presets
 * Each entry maps to the same XMPFilterParams interface so they can be combined
 * with user-imported Lightroom .xmp presets in a unified pipeline.
 */

import { XMPFilterParams } from "./xmpParser";

export const BUILTIN_FILTERS: XMPFilterParams[] = [
  {
    name: "None",
    exposure: 0, contrast: 0,
    highlights: 0, shadows: 0,
    whites: 0, blacks: 0,
    temperature: 6500, tint: 0,
    vibrance: 0, saturation: 0,
    clarity: 0, dehaze: 0,
    vignette: 0, grain: 0, sharpening: 25,
  },
  {
    name: "Graphite",
    // Desaturated, high-contrast silver mono
    exposure: -0.1, contrast: 25,
    highlights: -25, shadows: 12,
    whites: 5, blacks: -12,
    temperature: 5600, tint: 0,
    vibrance: -40, saturation: -75,
    clarity: 18, dehaze: 0,
    vignette: -22, grain: 18, sharpening: 35,
  },
  {
    name: "Warm Film",
    // Kodak-ish warm analog push
    exposure: 0.15, contrast: 12,
    highlights: -12, shadows: 22,
    whites: 12, blacks: 8,
    temperature: 7600, tint: 6,
    vibrance: 22, saturation: 12,
    clarity: 5, dehaze: 0,
    vignette: -18, grain: 22, sharpening: 20,
  },
  {
    name: "Soft Grain",
    // Dreamy matte with lifted blacks
    exposure: 0.25, contrast: -15,
    highlights: -22, shadows: 35,
    whites: 8, blacks: 12,
    temperature: 6800, tint: 0,
    vibrance: 12, saturation: 5,
    clarity: -12, dehaze: 0,
    vignette: -10, grain: 40, sharpening: 15,
  },
  {
    name: "Noir",
    // Hard-boiled black & white with heavy contrast
    exposure: -0.2, contrast: 45,
    highlights: -45, shadows: -12,
    whites: 0, blacks: -22,
    temperature: 5400, tint: 0,
    vibrance: -80, saturation: -100,
    clarity: 22, dehaze: 0,
    vignette: -45, grain: 28, sharpening: 42,
  },
  {
    name: "Chrome",
    // Clean editorial — punchy midtones, cooler cast
    exposure: 0, contrast: 28,
    highlights: -18, shadows: 12,
    whites: 18, blacks: -8,
    temperature: 6100, tint: -5,
    vibrance: 18, saturation: 8,
    clarity: 12, dehaze: 6,
    vignette: -12, grain: 5, sharpening: 32,
  },
  {
    name: "Ritual",
    // Deep amber shadows, lifted greens, golden hour feel
    exposure: -0.05, contrast: 18,
    highlights: -28, shadows: 28,
    whites: -5, blacks: 12,
    temperature: 7200, tint: 10,
    vibrance: 28, saturation: 18,
    clarity: 0, dehaze: 0,
    vignette: -28, grain: 12, sharpening: 22,
  },
  {
    name: "Dusk",
    // Deep blue-hour moodiness — cool shadows, magenta highlights
    exposure: -0.3, contrast: 22,
    highlights: -30, shadows: 18,
    whites: -8, blacks: 5,
    temperature: 8200, tint: 12,
    vibrance: 32, saturation: 22,
    clarity: 5, dehaze: 0,
    vignette: -32, grain: 8, sharpening: 25,
  },
  {
    name: "Studio",
    // Flat, clean, color-accurate — content/product photography
    exposure: 0.1, contrast: 5,
    highlights: -5, shadows: 8,
    whites: 5, blacks: -5,
    temperature: 6400, tint: 0,
    vibrance: 8, saturation: 2,
    clarity: 8, dehaze: 0,
    vignette: 0, grain: 0, sharpening: 30,
  },
];
