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
      <div className="absolute inset-0 bg-[#04010b]" />
      <div className="web3-gradient-core absolute left-1/2 top-[42%] h-[640px] w-[640px] -translate-x-1/2 -translate-y-1/2 rounded-[28px] sm:h-[860px] sm:w-[860px]" />
      <div className="web3-gradient-shard web3-gradient-shard-a absolute left-[8%] top-[14%] h-[240px] w-[240px] rounded-[24px] sm:h-[340px] sm:w-[340px]" />
      <div className="web3-gradient-shard web3-gradient-shard-b absolute right-[6%] top-[18%] h-[260px] w-[260px] rounded-[28px] sm:h-[360px] sm:w-[360px]" />
      <div className="web3-gradient-shard web3-gradient-shard-c absolute bottom-[10%] left-[22%] h-[220px] w-[220px] rounded-[20px] sm:h-[320px] sm:w-[320px]" />
      <div className="pixel-grid-overlay absolute inset-0" />
      <div className="absolute inset-0 opacity-[0.03]" style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
      }} />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(4,1,11,0.18)_0%,rgba(4,1,11,0.52)_48%,rgba(4,1,11,0.9)_100%)]" />
    </div>
  );
}
