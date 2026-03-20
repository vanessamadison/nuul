/**
 * XMP Lightroom Preset Parser
 * Parses .xmp files exported from Lightroom Classic / Lightroom CC
 * and extracts color grading parameters compatible with the nuul filter engine.
 *
 * XMP presets are XML documents using the Camera Raw Settings (crs:) namespace.
 * Params are stored as attributes on the rdf:Description element or as text
 * content of child elements.
 */

import { ToneCurve, identityCurve, parseXMPCurve } from "./toneCurve";

export interface HSLRange {
  hue:        number; // -100 to +100
  saturation: number; // -100 to +100
  luminance:  number; // -100 to +100
}

export interface HSLAdjustments {
  red:     HSLRange;
  orange:  HSLRange;
  yellow:  HSLRange;
  green:   HSLRange;
  aqua:    HSLRange;
  blue:    HSLRange;
  purple:  HSLRange;
  magenta: HSLRange;
}

export const defaultHSLRange: HSLRange = { hue: 0, saturation: 0, luminance: 0 };

export const defaultHSL: HSLAdjustments = {
  red:     { ...defaultHSLRange },
  orange:  { ...defaultHSLRange },
  yellow:  { ...defaultHSLRange },
  green:   { ...defaultHSLRange },
  aqua:    { ...defaultHSLRange },
  blue:    { ...defaultHSLRange },
  purple:  { ...defaultHSLRange },
  magenta: { ...defaultHSLRange },
};

export interface XMPFilterParams {
  name: string;
  // Exposure & Tone
  exposure:   number; // -5.0 to +5.0
  contrast:   number; // -100 to +100
  highlights: number; // -100 to +100
  shadows:    number; // -100 to +100
  whites:     number; // -100 to +100
  blacks:     number; // -100 to +100
  // Color
  temperature: number; // raw Kelvin-like value, 2000–50000
  tint:        number; // -150 to +150
  vibrance:    number; // -100 to +100
  saturation:  number; // -100 to +100
  // Presence
  clarity: number; // -100 to +100
  dehaze:  number; // -100 to +100
  // Effects
  vignette:   number; // -100 to +100
  grain:      number; // 0 to 100
  sharpening: number; // 0 to 150
  // Advanced
  toneCurve:      ToneCurve;
  toneCurveRed:   ToneCurve;
  toneCurveGreen: ToneCurve;
  toneCurveBlue:  ToneCurve;
  hsl: HSLAdjustments;
}

export const defaultFilterParams: XMPFilterParams = {
  name:        "None",
  exposure:    0,
  contrast:    0,
  highlights:  0,
  shadows:     0,
  whites:      0,
  blacks:      0,
  temperature: 6500,
  tint:        0,
  vibrance:    0,
  saturation:  0,
  clarity:     0,
  dehaze:      0,
  vignette:    0,
  grain:       0,
  sharpening:  25,
  toneCurve:      identityCurve,
  toneCurveRed:   identityCurve,
  toneCurveGreen: identityCurve,
  toneCurveBlue:  identityCurve,
  hsl: defaultHSL,
};

// ─── XMP Parsing ─────────────────────────────────────────────────────────────

/**
 * Parse an XMP file text and return filter parameters.
 * Falls back to defaults for any missing fields.
 */
export function parseXMP(xmlText: string): XMPFilterParams {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlText, "text/xml");

  // Collect all attributes from rdf:Description into a flat map
  const attrMap: Record<string, string> = {};
  const descriptions = doc.querySelectorAll("Description");
  descriptions.forEach((desc) => {
    for (let i = 0; i < desc.attributes.length; i++) {
      const attr = desc.attributes[i];
      attrMap[attr.localName] = attr.value;
      attrMap[attr.name] = attr.value;
    }
  });

  // Collect element text content (some XMP encode values as child elements)
  const elemMap: Record<string, string> = {};
  const allElements = doc.getElementsByTagName("*");
  for (let i = 0; i < allElements.length; i++) {
    const el = allElements[i];
    const text = el.textContent?.trim();
    if (text && el.children.length === 0) {
      elemMap[el.localName] = text;
    }
  }

  const num = (...keys: string[]): number | null => {
    for (const key of keys) {
      const v = attrMap[key] ?? attrMap[`crs:${key}`] ?? elemMap[key] ?? elemMap[`crs:${key}`];
      if (v !== undefined) {
        const n = parseFloat(v);
        if (!isNaN(n)) return n;
      }
    }
    return null;
  };

  const str = (...keys: string[]): string | null => {
    for (const key of keys) {
      const v = attrMap[key] ?? attrMap[`crs:${key}`] ?? elemMap[key];
      if (v !== undefined) return v;
    }
    return null;
  };

  // Parse tone curve from a rdf:Seq / rdf:li structure or raw text
  const parseCurveEl = (...keys: string[]): ToneCurve | null => {
    for (const key of keys) {
      // Try finding element by local name
      const els = doc.getElementsByTagName(key);
      const crsEls = doc.getElementsByTagNameNS("*", key.replace("crs:", ""));
      const el = els[0] ?? crsEls[0];
      if (el) {
        const text = el.textContent?.trim();
        if (text) return parseXMPCurve(text);
      }
      // Try element with crs: prefix
      const prefixed = doc.getElementsByTagName(`crs:${key}`)[0];
      if (prefixed) {
        const text = prefixed.textContent?.trim();
        if (text) return parseXMPCurve(text);
      }
    }
    return null;
  };

  const name = str("PresetName", "crs:PresetName") ?? "Imported";

  // HSL helper
  const hslRange = (colorName: string): HSLRange => ({
    hue:        num(`HueAdjustment${colorName}`, `crs:HueAdjustment${colorName}`) ?? 0,
    saturation: num(`SaturationAdjustment${colorName}`, `crs:SaturationAdjustment${colorName}`) ?? 0,
    luminance:  num(`LuminanceAdjustment${colorName}`, `crs:LuminanceAdjustment${colorName}`) ?? 0,
  });

  return {
    name,
    exposure:    num("Exposure2012", "Exposure") ?? defaultFilterParams.exposure,
    contrast:    num("Contrast2012", "Contrast") ?? defaultFilterParams.contrast,
    highlights:  num("Highlights2012", "Highlights") ?? defaultFilterParams.highlights,
    shadows:     num("Shadows2012", "Shadows") ?? defaultFilterParams.shadows,
    whites:      num("Whites2012", "Whites") ?? defaultFilterParams.whites,
    blacks:      num("Blacks2012", "Blacks") ?? defaultFilterParams.blacks,
    temperature: num("Temperature") ?? defaultFilterParams.temperature,
    tint:        num("Tint") ?? defaultFilterParams.tint,
    vibrance:    num("Vibrance") ?? defaultFilterParams.vibrance,
    saturation:  num("Saturation") ?? defaultFilterParams.saturation,
    clarity:     num("Clarity2012", "Clarity") ?? defaultFilterParams.clarity,
    dehaze:      num("Dehaze") ?? defaultFilterParams.dehaze,
    vignette:    num("VignetteAmount") ?? defaultFilterParams.vignette,
    grain:       num("GrainAmount") ?? defaultFilterParams.grain,
    sharpening:  num("SharpenAmount") ?? defaultFilterParams.sharpening,
    toneCurve:
      parseCurveEl("ToneCurvePV2012", "ToneCurve") ?? defaultFilterParams.toneCurve,
    toneCurveRed:
      parseCurveEl("ToneCurvePV2012Red", "ToneCurveRed") ?? defaultFilterParams.toneCurveRed,
    toneCurveGreen:
      parseCurveEl("ToneCurvePV2012Green", "ToneCurveGreen") ?? defaultFilterParams.toneCurveGreen,
    toneCurveBlue:
      parseCurveEl("ToneCurvePV2012Blue", "ToneCurveBlue") ?? defaultFilterParams.toneCurveBlue,
    hsl: {
      red:     hslRange("Red"),
      orange:  hslRange("Orange"),
      yellow:  hslRange("Yellow"),
      green:   hslRange("Green"),
      aqua:    hslRange("Aqua"),
      blue:    hslRange("Blue"),
      purple:  hslRange("Purple"),
      magenta: hslRange("Magenta"),
    },
  };
}

/**
 * Read a File object containing an .xmp preset and parse it.
 */
export async function readXMPFile(file: File): Promise<XMPFilterParams> {
  const text = await file.text();
  return parseXMP(text);
}
