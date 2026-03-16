"use client";

import { useEffect, useState } from "react";

export default function GradientBackdrop() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      {/* Main warm orb - brighter and more prominent */}
      <div className="warm-orb-main absolute left-1/2 top-1/3 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full sm:h-[800px] sm:w-[800px]" />
      
      {/* Secondary warm accents */}
      <div className="warm-orb-accent absolute -bottom-20 left-1/4 h-[400px] w-[400px] rounded-full sm:h-[500px] sm:w-[500px]" />
      <div className="warm-orb-accent-2 absolute -right-20 top-1/4 h-[350px] w-[350px] rounded-full sm:h-[450px] sm:w-[450px]" />
      
      {/* Subtle noise texture overlay */}
      <div className="absolute inset-0 opacity-[0.015]" style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
      }} />
    </div>
  );
}
