"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import GradientBackdrop from "@/components/GradientBackdrop";
import DragCarousel, { CarouselItem } from "@/components/DragCarousel";
import { playHover, startDrone } from "@/lib/sfx";

const filters: CarouselItem[] = [
  { id: "graphite", label: "Graphite", image: "/images/filters/graphite.jpg", gradient: "from-[#1a1d22] via-[#2c3038] to-[#40444c]" },
  { id: "warm", label: "Warm Film", image: "/images/filters/warm.jpg", gradient: "from-[#2a1f18] via-[#4c3a2a] to-[#7a604a]" },
  { id: "soft", label: "Soft Grain", image: "/images/filters/soft.jpg", gradient: "from-[#22202a] via-[#3a3c48] to-[#4d4f58]" },
  { id: "noir", label: "Noir", image: "/images/filters/noir.jpg", gradient: "from-[#141518] via-[#242830] to-[#363c46]" },
  { id: "studio", label: "Studio", image: "/images/filters/studio.jpg", gradient: "from-[#1e1a1f] via-[#3a3234] to-[#4a4140]" },
  { id: "chrome", label: "Chrome", image: "/images/filters/chrome.jpg", gradient: "from-[#182024] via-[#304048] to-[#4a5860]" },
  { id: "dusk", label: "Dusk", image: "/images/filters/dusk.jpg", gradient: "from-[#1a1824] via-[#36304a] to-[#544a66]" },
  { id: "ritual", label: "Ritual", image: "/images/filters/ritual.jpg", gradient: "from-[#241e18] via-[#4c3a2a] to-[#6a5040]" },
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
      } catch {
        // Silent fail
      }
      window.removeEventListener("pointerdown", handler);
    };
    window.addEventListener("pointerdown", handler, { once: true });
    return () => window.removeEventListener("pointerdown", handler);
  }, []);

  useEffect(() => {
    const timers = [
      window.setTimeout(() => setPhase("carousel"), 300),
      window.setTimeout(() => setPhase("cta"), 900),
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

    const points = Array.from({ length: 80 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 0.15,
      vy: -Math.random() * 0.2 - 0.03,
      r: Math.random() * 1.2 + 0.3,
      a: Math.random() * 0.3 + 0.08,
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
        ctx.fillStyle = `rgba(255,200,130,${p.a})`;
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

  // SSR placeholder
  if (!mounted) {
    return (
      <div className="relative min-h-screen bg-black text-white">
        <div className="flex min-h-screen items-center justify-center">
          <div className="text-center">
            <div className="text-5xl font-bold tracking-[0.3em] text-white/20">
              NUUL
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-black text-white overflow-hidden">
      <GradientBackdrop />
      <section className="relative flex min-h-[100svh] flex-col items-center justify-center px-4 pb-20 pt-8 text-center sm:px-6">
        {/* Background layers */}
        <div className="pointer-events-none absolute inset-0">
          <canvas ref={canvasRef} className="absolute inset-0 opacity-50" />
          <div className="scanline-layer absolute inset-0 opacity-10" />
          <div className="warm-orb absolute left-1/2 top-1/2 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full sm:h-[650px] sm:w-[650px]" />
          <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/40 to-black/90" />
        </div>

        {/* Beautiful NUUL Hero */}
        <div className="relative z-10 mb-10 max-w-2xl">
          <h1
            className={`hero-text text-5xl font-bold tracking-[0.25em] transition-all duration-1000 sm:text-6xl md:text-7xl ${
              phase === "cta" ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
            }`}
          >
            <span className="bg-gradient-to-br from-white via-amber-100 to-amber-200/80 bg-clip-text text-transparent drop-shadow-2xl">
              NUUL
            </span>
          </h1>
          <p
            className={`mt-5 text-base text-white/80 transition-all duration-700 delay-200 sm:text-lg ${
              phase === "cta" ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
            }`}
          >
            Protect your photos. Strip metadata. Export safely.
          </p>
        </div>

        {/* Carousel section */}
        <div
          className={`relative z-10 w-full max-w-2xl transition-all duration-700 ${
            phase === "carousel" || phase === "cta"
              ? "opacity-100 translate-y-0"
              : "opacity-0 translate-y-8"
          }`}
        >
          <DragCarousel
            items={filters}
            selectedId={selectedFilter}
            onSelect={(id) => {
              setSelectedFilter(id);
              playHover();
            }}
            autoRotate={true}
            autoRotateInterval={3500}
          />
        </div>

        {/* CTA section */}
        <div
          className={`relative z-10 mt-10 flex flex-col items-center transition-all duration-700 delay-300 ${
            phase === "cta" ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
          }`}
        >
          <Link
            href={`/studio?preset=${selectedFilter}&import=1`}
            onMouseEnter={() => playHover()}
            className="group relative overflow-hidden rounded-2xl border border-white/40 bg-white/10 px-8 py-4 text-sm font-medium uppercase tracking-[0.2em] text-white backdrop-blur-sm transition-all hover:border-white/70 hover:bg-white/20 active:scale-[0.98] sm:px-12 sm:text-xs sm:tracking-[0.3em]"
          >
            <span className="relative z-10">Upload Your Images</span>
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
          </Link>

          <div className="mt-6 flex items-center gap-5 text-[0.65rem] uppercase tracking-[0.25em] text-white/60 sm:gap-6 sm:text-[0.7rem]">
            <span className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              100% Local
            </span>
            <span className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              No Uploads
            </span>
          </div>
        </div>

        {/* Bottom hint */}
        <div
          className={`absolute bottom-6 left-0 right-0 text-center transition-all duration-700 ${
            phase === "cta" ? "opacity-100" : "opacity-0"
          }`}
        >
          <div className="inline-flex items-center gap-2 text-[0.6rem] uppercase tracking-[0.25em] text-white/40 sm:text-[0.65rem]">
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
