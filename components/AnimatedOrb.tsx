"use client";

import { useEffect, useRef, useState } from "react";

export default function AnimatedOrb() {
  const orbRef = useRef<HTMLDivElement | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || !orbRef.current) return;

    // CSS-based animation instead of animejs to avoid SSR issues
    const orb = orbRef.current;
    orb.style.animation = "orbFloat 16s ease-in-out infinite alternate";

    const handler = (event: MouseEvent) => {
      const x = (event.clientX / window.innerWidth - 0.5) * 30;
      const y = (event.clientY / window.innerHeight - 0.5) * 30;
      orb.style.setProperty("--orb-tilt-x", `${x}px`);
      orb.style.setProperty("--orb-tilt-y", `${y}px`);
    };

    window.addEventListener("mousemove", handler);
    return () => window.removeEventListener("mousemove", handler);
  }, [mounted]);

  if (!mounted) return null;

  return (
    <div className="pointer-events-none absolute inset-0">
      <div
        ref={orbRef}
        className="orb animated-orb absolute left-1/2 top-1/2 h-[520px] w-[520px] -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{
          transform: "translate(-50%, -50%) translate(var(--orb-tilt-x, 0px), var(--orb-tilt-y, 0px))",
        }}
      />
    </div>
  );
}
