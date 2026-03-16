"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import GradientBackdrop from "@/components/GradientBackdrop";
import DragCarousel, { CarouselItem } from "@/components/DragCarousel";
import { playHover, startDrone } from "@/lib/sfx";

const filters: CarouselItem[] = [
  { id: "graphite", label: "Graphite", description: "Strip metadata", gradient: "from-[#0d0f12] via-[#1c1f27] to-[#30323b]" },
  { id: "warm", label: "Warm Film", description: "Gentle resize", gradient: "from-[#1a1311] via-[#3c2d23] to-[#6a503b]" },
  { id: "soft", label: "Soft Grain", description: "Blur faces", gradient: "from-[#18161a] via-[#2a2c33] to-[#3d3f48]" },
  { id: "noir", label: "Noir", description: "High contrast", gradient: "from-[#0b0c0f] via-[#1a1c22] to-[#2a2d36]" },
  { id: "studio", label: "Studio", description: "OCR redact", gradient: "from-[#141115] via-[#2d2424] to-[#3a3130]" },
  { id: "chrome", label: "Chrome", description: "QR blur", gradient: "from-[#0f1419] via-[#24303a] to-[#3a4853]" },
  { id: "dusk", label: "Dusk", description: "Full scrub", gradient: "from-[#111018] via-[#2a2434] to-[#443b4f]" },
  { id: "ritual", label: "Ritual", description: "Safe share", gradient: "from-[#1a1510] via-[#3c2d23] to-[#5a4530]" },
];

export default function HomeCinematic() {
  const [phase, setPhase] = useState<"intro" | "carousel" | "cta">("intro");
  const [selectedFilter, setSelectedFilter] = useState("graphite");
  const [reducedMotion, setReducedMotion] = useState(false);
  const [mounted, setMounted] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(media.matches);
    const handler = () => setReducedMotion(media.matches);
    media.addEventListener("change", handler);
    return () => media.removeEventListener("change", handler);
  }, []);

  useEffect(() => {
    const handler = () => {
      try {
        startDrone();
      } catch (e) {
        console.error("[v0] Failed to start drone:", e);
      }
      window.removeEventListener("pointerdown", handler);
    };
    window.addEventListener("pointerdown", handler, { once: true });
    return () => window.removeEventListener("pointerdown", handler);
  }, []);

  useEffect(() => {
    const timers = [
      window.setTimeout(() => setPhase("carousel"), 400),
      window.setTimeout(() => setPhase("cta"), 1200),
    ];
    return () => timers.forEach((t) => window.clearTimeout(t));
  }, []);

  useEffect(() => {
    if (!mounted || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    const points = Array.from({ length: 120 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 0.2,
      vy: -Math.random() * 0.3 - 0.05,
      r: Math.random() * 1.4 + 0.3,
      a: Math.random() * 0.25 + 0.05
    }));

    let raf = 0;
    const tick = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      points.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        if (p.y < -30) {
          p.y = canvas.height + 30;
          p.x = Math.random() * canvas.width;
        }
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(201,162,107,${p.a})`;
        ctx.fill();
      });
      raf = requestAnimationFrame(tick);
    };
    tick();
    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(raf);
    };
  }, [mounted]);

  // SSR placeholder to prevent hydration issues
  if (!mounted) {
    return (
      <div className="relative min-h-screen bg-black text-white">
        <div className="flex min-h-screen items-center justify-center">
          <div className="text-center">
            <div className="text-[0.65rem] uppercase tracking-[0.6em] text-white/60">
              NUUL STUDIO
            </div>
            <div className="mt-4 text-3xl font-semibold text-white/20">
              Loading...
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-black text-white">
      <GradientBackdrop />
      <section className="relative flex min-h-[100svh] flex-col items-center justify-center overflow-hidden px-4 pb-24 pt-8 text-center sm:px-6">
        {/* Background layers */}
        <div className="pointer-events-none absolute inset-0">
          <canvas ref={canvasRef} className="absolute inset-0 opacity-60" />
          <div className="scanline-layer absolute inset-0 opacity-20" />
          <div className="liquid-orb absolute left-1/2 top-1/2 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full sm:h-[720px] sm:w-[720px]" />
          <div className="absolute inset-0 bg-gradient-to-b from-black/90 via-black/60 to-black/95" />
        </div>

        {/* Header */}
        <div className="relative z-10 mb-8 max-w-2xl">
          <div
            className={`text-[0.65rem] uppercase tracking-[0.6em] transition-all duration-700 sm:text-[0.7rem] ${
              phase === "cta" ? "opacity-100" : "opacity-60"
            } bg-gradient-to-r from-[#e0c9a0] via-[#bda47a] to-[#7c6a54] bg-clip-text text-transparent`}
          >
            NUUL STUDIO
          </div>
          <h1
            className={`mt-4 text-3xl font-semibold tracking-[-0.03em] transition-all duration-700 sm:text-4xl md:text-5xl ${
              phase === "cta" ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
            }`}
          >
            Protect your photos
          </h1>
          <p
            className={`mt-3 text-sm text-white/70 transition-all duration-700 delay-100 sm:text-base ${
              phase === "cta" ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
            }`}
          >
            Strip metadata. Blur sensitive data. Export safely.
          </p>
        </div>

        {/* Carousel section */}
        <div
          className={`relative z-10 w-full max-w-3xl transition-all duration-700 ${
            phase === "carousel" || phase === "cta"
              ? "opacity-100 translate-y-0"
              : "opacity-0 translate-y-8"
          }`}
        >
          <div className="mb-4 text-[0.6rem] uppercase tracking-[0.4em] text-white/50 sm:text-[0.65rem]">
            Choose your protection level
          </div>
          <DragCarousel
            items={filters}
            selectedId={selectedFilter}
            onSelect={(id) => {
              setSelectedFilter(id);
              playHover();
            }}
          />
        </div>

        {/* CTA section */}
        <div
          className={`relative z-10 mt-10 flex flex-col items-center transition-all duration-700 delay-200 ${
            phase === "cta" ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
          }`}
        >
          <Link
            href={`/studio?preset=${selectedFilter}&import=1`}
            onMouseEnter={() => playHover()}
            className="group relative overflow-hidden rounded-2xl border border-white/30 bg-white/10 px-8 py-4 text-xs uppercase tracking-[0.25em] backdrop-blur transition-all hover:border-white/60 hover:bg-white/15 active:scale-[0.98] sm:px-10 sm:tracking-[0.3em]"
          >
            <span className="relative z-10">Upload your images</span>
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
          </Link>

          <div className="mt-6 flex items-center gap-6 text-[0.6rem] uppercase tracking-[0.3em] text-white/40 sm:text-[0.65rem]">
            <span className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500/80" />
              100% Local
            </span>
            <span className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500/80" />
              No uploads
            </span>
            <span className="hidden items-center gap-2 sm:flex">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500/80" />
              No accounts
            </span>
          </div>
        </div>

        {/* Bottom hint */}
        <div
          className={`absolute bottom-8 left-0 right-0 text-center transition-all duration-700 ${
            phase === "cta" ? "opacity-100" : "opacity-0"
          }`}
        >
          <div className="inline-flex items-center gap-2 text-[0.55rem] uppercase tracking-[0.3em] text-white/30 sm:text-[0.6rem]">
            <span>Swipe to explore</span>
            <svg
              className="h-3 w-3 animate-pulse"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M14 5l7 7m0 0l-7 7m7-7H3"
              />
            </svg>
          </div>
        </div>
      </section>
    </div>
  );
}
