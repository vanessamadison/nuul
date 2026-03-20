"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import GradientBackdrop from "@/components/GradientBackdrop";
import DragCarousel, { CarouselItem } from "@/components/DragCarousel";
// sfx removed — AudioContext creation was causing browser errors and slowdowns

const filters: CarouselItem[] = [
  { id: "graphite", label: "Silverline", description: "late coffee", image: "/images/filters/filter-cafe-01.jpg", gradient: "from-[#1a1d22] via-[#2c3038] to-[#40444c]" },
  { id: "warm", label: "Cornerclub", description: "35mm warm", image: "/images/filters/filter-cafe-02.jpg", gradient: "from-[#2a1f18] via-[#4c3a2a] to-[#7a604a]" },
  { id: "soft", label: "Afterlight", description: "soft grain", image: "/images/filters/filter-cafe-03.jpg", gradient: "from-[#22202a] via-[#3a3c48] to-[#4d4f58]" },
  { id: "noir", label: "Midnightrun", description: "city blur", image: "/images/filters/filter-cafe-04.jpg", gradient: "from-[#141518] via-[#242830] to-[#363c46]" },
  { id: "studio", label: "Loftsunday", description: "clean flash", image: "/images/filters/filter-cafe-05.jpg", gradient: "from-[#1e1a1f] via-[#3a3234] to-[#4a4140]" },
  { id: "chrome", label: "Basement", description: "chrome edit", image: "/images/filters/filter-cafe-06.jpg", gradient: "from-[#182024] via-[#304048] to-[#4a5860]" },
  { id: "dusk", label: "Bluehour", description: "soft dusk", image: "/images/filters/filter-cafe-07.jpg", gradient: "from-[#1a1824] via-[#36304a] to-[#544a66]" },
  { id: "ritual", label: "Vinylnight", description: "muted amber", image: "/images/filters/filter-cafe-08.jpg", gradient: "from-[#241e18] via-[#4c3a2a] to-[#6a5040]" },
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
          <div className="scanline-layer absolute inset-0 opacity-[0.08]" />
          <div className="pixel-grid-overlay absolute inset-0 opacity-70" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(114,181,137,0.14),transparent_32%),radial-gradient(circle_at_78%_22%,rgba(143,164,149,0.12),transparent_24%),radial-gradient(circle_at_20%_80%,rgba(82,114,95,0.12),transparent_22%)]" />
          <div className="absolute inset-0 bg-gradient-to-b from-[#020202]/74 via-[#090909]/48 to-[#020202]/94" />
        </div>

        {/* Beautiful NUUL Hero */}
        <div className="relative z-10 mb-10 flex max-w-2xl flex-col items-center">
          <div
            className={`pixel-kicker mb-5 transition-all duration-700 ${
              phase === "cta" ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
            }`}
          >
            LOCAL-FIRST CLEANUP FOR ALL PHOTOS
          </div>
          <h1
            className={`hero-text text-6xl font-semibold uppercase transition-all duration-1000 sm:text-7xl md:text-8xl ${
              phase === "cta" ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
            }`}
          >
            <span className="pixel-title-frame px-3 py-1 text-white sm:px-5">
              NUUL
            </span>
          </h1>
          <p
            className={`hero-subtitle mt-5 max-w-xl text-sm text-white/72 transition-all duration-700 delay-200 sm:text-base ${
              phase === "cta" ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
            }`}
          >
            Stay harder to trace
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
            className="group pixel-cta relative overflow-hidden border border-emerald-300/45 bg-black/35 px-8 py-4 text-sm font-medium uppercase tracking-[0.22em] text-white transition-all hover:border-emerald-200/65 hover:bg-white/10 active:scale-[0.98] sm:px-12 sm:text-xs sm:tracking-[0.3em]"
          >
            <span className="relative z-10">Upload Photos</span>
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-emerald-200/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
          </Link>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-3 text-[0.62rem] uppercase tracking-[0.22em] text-white/60 sm:gap-4 sm:text-[0.7rem]">
            <span className="pixel-meta-chip flex items-center gap-2">
              <span className="h-1.5 w-1.5 bg-emerald-400" />
              strips metadata
            </span>
            <span className="pixel-meta-chip flex items-center gap-2">
              <span className="h-1.5 w-1.5 bg-emerald-200" />
              flags text and qr
            </span>
          </div>
        </div>

        {/* Bottom hint */}
        <div
          className={`absolute bottom-10 left-0 right-0 text-center transition-all duration-700 sm:bottom-6 ${
            phase === "cta" ? "opacity-100" : "opacity-0"
          }`}
        >
          <div className="inline-flex items-center gap-2 border border-white/10 bg-black/20 px-3 py-1 text-[0.6rem] uppercase tracking-[0.25em] text-white/40 sm:text-[0.65rem]">
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
