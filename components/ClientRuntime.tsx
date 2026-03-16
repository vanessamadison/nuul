"use client";

import { useEffect } from "react";
import { installNetworkMonitor } from "@/lib/monitor/network";
import { applyTheme, loadTheme } from "@/lib/theme";
import NetworkOverlay from "@/components/NetworkOverlay";
import { playChime } from "@/lib/sfx";

export default function ClientRuntime() {
  useEffect(() => {
    try {
      installNetworkMonitor();
      applyTheme(loadTheme());
    } catch {
      // Silent fail for non-critical initialization
    }

    // Lazy load OCR client to avoid blocking render
    const initOcr = async () => {
      try {
        const { OCRClient } = await import("@/lib/pipeline/ocr");
        const ocrClient = new OCRClient();
        await ocrClient.warmUp();
        (window as typeof window & { __nuulOcrReady?: boolean }).__nuulOcrReady = true;
      } catch {
        (window as typeof window & { __nuulOcrReady?: boolean }).__nuulOcrReady = false;
      } finally {
        (window as typeof window & { __nuulOcrWarm?: boolean }).__nuulOcrWarm = true;
      }
    };
    initOcr();
  }, []);

  useEffect(() => {
    const enabled = typeof window !== "undefined" && window.localStorage.getItem("nuul-sfx") === "true";
    if (!enabled) return;

    const handler = () => {
      playChime();
      window.removeEventListener("pointerdown", handler);
    };

    window.addEventListener("pointerdown", handler, { once: true });
    return () => window.removeEventListener("pointerdown", handler);
  }, []);

  return <NetworkOverlay />;
}
