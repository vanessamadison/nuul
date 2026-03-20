/**
 * XMP Lightroom Preset Parser
 * Parses .xmp files exported from Lightroom Classic / Lightroom CC
 * and extracts color grading parameters compatible with the nuul filter engine.
 *
 * XMP presets are XML documents using the Camera Raw Settings (crs:) namespace.
 * Params are stored as attributes on the rdf:Description element.
 */

export interface XMPFilterParams {
  name: string;
  // Exposure & Tone
  exposure: number;      // -5.0 to +5.0
  contrast: number;      // -100 to +100
  highlights: number;    // -100 to +100
  shadows: number;       // -100 to +100
  whites: number;        // -100 to +100
  blacks: number;        // -100 to +100
  // Color
  temperature: number;   // raw Kelvin-like value from LR, 2000–50000
  tint: number;          // -150 to +150 (green <-> magenta)
  vibrance: number;      // -100 to +100
  saturation: number;    // -100 to +100
  // Presence
  clarity: number;       // -100 to +100
  dehaze: number;        // -100 to +100
  // Effects
  vignette: number;      // -100 to +100 (negative = darken edges)
  grain: number;         // 0 to 100
  sharpening: number;    // 0 to 150
}

export const defaultFilterParams: XMPFilterParams = {
  name: "None",
  exposure: 0,
  contrast: 0,
  highlights: 0,
  shadows: 0,
  whites: 0,
  blacks: 0,
  temperature: 6500,
  tint: 0,
  vibrance: 0,
  saturation: 0,
  clarity: 0,
  dehaze: 0,
  vignette: 0,
  grain: 0,
  sharpening: 25,
};

/**
 * Parse an XMP file text and return filter parameters.
 * Falls back to defaults for any missing fields.
 */
export function parseXMP(xmlText: string): XMPFilterParams {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlText, "text/xml");

  // Collect all attributes from rdf:Description into a flat map
  // XMP presets store their values as attributes like crs:Exposure2012="+0.50"
  const attrMap: Record<string, string> = {};
  const descriptions = doc.querySelectorAll("Description");
  descriptions.forEach((desc) => {
    for (let i = 0; i < desc.attributes.length; i++) {
      const attr = desc.attributes[i];
      // Store by both local name and full name
      attrMap[attr.localName] = attr.value;
      attrMap[attr.name] = attr.value;
    }
  });

  const num = (...keys: string[]): number | null => {
    for (const key of keys) {
      const v = attrMap[key] ?? attrMap[`crs:${key}`];
      if (v !== undefined) {
        const n = parseFloat(v);
        if (!isNaN(n)) return n;
      }
    }
    return null;
  };

  const str = (...keys: string[]): string | null => {
    for (const key of keys) {
      const v = attrMap[key] ?? attrMap[`crs:${key}`];
      if (v !== undefined) return v;
    }
    return null;
  };

  const name = str("PresetName", "crs:PresetName", "xmp:Label") ?? "Imported";

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
  };
}

/**
 * Read a File object containing an .xmp preset and parse it.
 */
export async function readXMPFile(file: File): Promise<XMPFilterParams> {
  const text = await file.text();
  return parseXMP(text);
}
