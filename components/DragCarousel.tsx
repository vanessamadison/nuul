"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";

export interface CarouselItem {
  id: string;
  label: string;
  image?: string;
  gradient: string;
  description?: string;
}

interface DragCarouselProps {
  items: CarouselItem[];
  selectedId?: string;
  onSelect?: (id: string) => void;
  className?: string;
  autoRotate?: boolean;
  autoRotateInterval?: number;
}

const cardWidth  = 130;
const cardHeight = 175;
const gap        = 14;
const totalCardWidth = cardWidth + gap;

// Smooth easing — ease-in-out-quad
const easeInOutQuad = (t: number) =>
  t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

export default function DragCarousel({
  items,
  selectedId,
  onSelect,
  className = "",
  autoRotate = true,
  autoRotateInterval = 4000,
}: DragCarouselProps) {
  const containerRef   = useRef<HTMLDivElement>(null);
  const trackRef       = useRef<HTMLDivElement>(null);
  const rafRef         = useRef<number>(0);
  const momentumRafRef = useRef<number>(0);
  const autoTimerRef   = useRef<ReturnType<typeof setInterval> | null>(null);
  const interactTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Drag state (refs to avoid stale closures in pointer handlers)
  const isDraggingRef  = useRef(false);
  const startXRef      = useRef(0);
  const startScrollRef = useRef(0);
  const lastXRef       = useRef(0);
  const lastTimeRef    = useRef(0);
  const velocityRef    = useRef(0);

  // React state
  const [mounted,       setMounted]       = useState(false);
  const [currentIndex,  setCurrentIndex]  = useState(0);
  const [isInteracting, setIsInteracting] = useState(false);
  // Fractional scroll position (in card units) — drives smooth scale/opacity
  const [scrollFrac, setScrollFrac] = useState(0);
  const scrollFracRef = useRef(0);

  const loopMultiplier = 3;
  const baseOffset     = items.length;
  const loopedItems    = [...items, ...items, ...items];

  // ─── Index helpers ───────────────────────────────────────────────────────

  const normalize = useCallback(
    (i: number) =>
      items.length === 0 ? 0 : ((i % items.length) + items.length) % items.length,
    [items.length]
  );

  const physicalOf = useCallback(
    (logical: number) => normalize(logical) + baseOffset,
    [normalize, baseOffset]
  );

  // ─── Sync scrollFrac from track scroll position (RAF-throttled) ──────────

  const pendingSyncRef = useRef(false);

  const syncScrollFrac = useCallback(() => {
    if (!trackRef.current) return;
    const frac = trackRef.current.scrollLeft / totalCardWidth;
    scrollFracRef.current = frac;
    if (!pendingSyncRef.current) {
      pendingSyncRef.current = true;
      requestAnimationFrame(() => {
        setScrollFrac(scrollFracRef.current);
        pendingSyncRef.current = false;
      });
    }
  }, []);

  // ─── Smooth scroll to a physical index ───────────────────────────────────

  const scrollToPhysical = useCallback(
    (physIdx: number, duration = 500) => {
      if (!trackRef.current) return;
      cancelAnimationFrame(rafRef.current);

      const target    = physIdx * totalCardWidth;
      const startVal  = trackRef.current.scrollLeft;
      const delta     = target - startVal;
      const startTime = performance.now();

      const tick = (now: number) => {
        if (!trackRef.current) return;
        const elapsed  = now - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const eased    = easeInOutQuad(progress);
        trackRef.current.scrollLeft = startVal + delta * eased;
        syncScrollFrac();
        if (progress < 1) {
          rafRef.current = requestAnimationFrame(tick);
        }
      };

      rafRef.current = requestAnimationFrame(tick);
    },
    [syncScrollFrac]
  );

  const scrollToLogical = useCallback(
    (logical: number, duration = 500) => {
      const phys = physicalOf(logical);
      setCurrentIndex(normalize(logical));
      scrollToPhysical(phys, duration);
    },
    [physicalOf, normalize, scrollToPhysical]
  );

  // ─── Snap to nearest card ─────────────────────────────────────────────────

  const snapToNearest = useCallback(() => {
    if (!trackRef.current) return;
    const frac    = trackRef.current.scrollLeft / totalCardWidth;
    const nearest = Math.round(frac);
    const logical = normalize(nearest);
    setCurrentIndex(logical);
    scrollToPhysical(nearest, 380);
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate(6);
    }
  }, [normalize, scrollToPhysical]);

  // ─── Momentum ────────────────────────────────────────────────────────────

  const applyMomentum = useCallback(() => {
    cancelAnimationFrame(momentumRafRef.current);
    if (Math.abs(velocityRef.current) < 0.5) {
      snapToNearest();
      return;
    }

    let v = velocityRef.current;
    const friction = 0.93;

    const tick = () => {
      if (!trackRef.current) return;
      v *= friction;
      trackRef.current.scrollLeft -= v;
      syncScrollFrac();
      if (Math.abs(v) > 0.5) {
        momentumRafRef.current = requestAnimationFrame(tick);
      } else {
        snapToNearest();
      }
    };

    momentumRafRef.current = requestAnimationFrame(tick);
  }, [snapToNearest, syncScrollFrac]);

  // ─── Auto-rotate ─────────────────────────────────────────────────────────

  const pauseAutoRotate = useCallback(() => {
    setIsInteracting(true);
    if (autoTimerRef.current)   clearInterval(autoTimerRef.current);
    if (interactTimerRef.current) clearTimeout(interactTimerRef.current);
    interactTimerRef.current = setTimeout(() => setIsInteracting(false), 8000);
  }, []);

  useEffect(() => {
    if (!autoRotate || !mounted || isInteracting) return;

    autoTimerRef.current = setInterval(() => {
      setCurrentIndex((prev) => {
        const next = normalize(prev + 1);
        scrollToLogical(next, 600);
        return next;
      });
    }, autoRotateInterval);

    return () => {
      if (autoTimerRef.current) clearInterval(autoTimerRef.current);
    };
  }, [autoRotate, autoRotateInterval, mounted, isInteracting, normalize, scrollToLogical]);

  // ─── Pointer handlers ─────────────────────────────────────────────────────

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (!trackRef.current) return;
      pauseAutoRotate();
      cancelAnimationFrame(rafRef.current);
      cancelAnimationFrame(momentumRafRef.current);

      isDraggingRef.current  = true;
      startXRef.current      = e.clientX;
      startScrollRef.current = trackRef.current.scrollLeft;
      lastXRef.current       = e.clientX;
      lastTimeRef.current    = performance.now();
      velocityRef.current    = 0;

      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    },
    [pauseAutoRotate]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!isDraggingRef.current || !trackRef.current) return;
      const walk = e.clientX - startXRef.current;
      trackRef.current.scrollLeft = startScrollRef.current - walk;
      syncScrollFrac();

      const now = performance.now();
      const dt  = now - lastTimeRef.current;
      if (dt > 0) velocityRef.current = ((e.clientX - lastXRef.current) / dt) * 16;
      lastXRef.current    = e.clientX;
      lastTimeRef.current = now;
    },
    [syncScrollFrac]
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      if (!isDraggingRef.current) return;
      isDraggingRef.current = false;
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);

      if (Math.abs(e.clientX - startXRef.current) < 5) {
        snapToNearest();
        return;
      }
      applyMomentum();
    },
    [snapToNearest, applyMomentum]
  );

  // ─── Wheel ───────────────────────────────────────────────────────────────

  const wheelDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleWheel = useCallback(
    (e: WheelEvent) => {
      e.preventDefault();
      if (!trackRef.current) return;
      pauseAutoRotate();
      cancelAnimationFrame(rafRef.current);
      cancelAnimationFrame(momentumRafRef.current);

      trackRef.current.scrollLeft += e.deltaX || e.deltaY;
      syncScrollFrac();

      if (wheelDebounceRef.current) clearTimeout(wheelDebounceRef.current);
      wheelDebounceRef.current = setTimeout(snapToNearest, 160);
    },
    [snapToNearest, pauseAutoRotate, syncScrollFrac]
  );

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    track.addEventListener("wheel", handleWheel, { passive: false });
    return () => track.removeEventListener("wheel", handleWheel);
  }, [handleWheel]);

  // ─── Keyboard ────────────────────────────────────────────────────────────

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
        pauseAutoRotate();
        const dir   = e.key === "ArrowLeft" ? -1 : 1;
        const next  = normalize(currentIndex + dir);
        setCurrentIndex(next);
        scrollToLogical(next, 420);
        onSelect?.(items[next]?.id);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [currentIndex, items, normalize, scrollToLogical, onSelect, pauseAutoRotate]);

  // ─── Card click ──────────────────────────────────────────────────────────

  const handleCardClick = useCallback(
    (logicalIdx: number, id: string) => {
      if (Math.abs(velocityRef.current) > 2) return; // was a drag
      pauseAutoRotate();
      setCurrentIndex(logicalIdx);
      onSelect?.(id);
      scrollToLogical(logicalIdx, 500);
      if (typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate(10);
    },
    [pauseAutoRotate, onSelect, scrollToLogical]
  );

  // ─── Mount & initialise ───────────────────────────────────────────────────

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (!mounted || !trackRef.current) return;
    const initial = selectedId ? items.findIndex((i) => i.id === selectedId) : 0;
    const valid   = Math.max(0, initial);
    const phys    = physicalOf(valid);
    setCurrentIndex(valid);
    trackRef.current.scrollLeft = phys * totalCardWidth;
    scrollFracRef.current = phys;
    setScrollFrac(phys);
  }, [mounted, items, selectedId, physicalOf]);

  // ─── Cleanup ─────────────────────────────────────────────────────────────

  useEffect(() => () => {
    cancelAnimationFrame(rafRef.current);
    cancelAnimationFrame(momentumRafRef.current);
    if (autoTimerRef.current)    clearInterval(autoTimerRef.current);
    if (interactTimerRef.current) clearTimeout(interactTimerRef.current);
    if (wheelDebounceRef.current) clearTimeout(wheelDebounceRef.current);
  }, []);

  // ─── SSR placeholder ──────────────────────────────────────────────────────

  if (!mounted) {
    return (
      <div className={`relative w-full ${className}`}>
        <div className="flex justify-center gap-3 py-8">
          {items.slice(0, 3).map((item) => (
            <div key={item.id} className="h-[175px] w-[130px] animate-pulse rounded-2xl bg-white/5" />
          ))}
        </div>
      </div>
    );
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className={`relative w-full ${className}`} ref={containerRef}>
      {/* Track */}
      <div
        ref={trackRef}
        className="flex touch-pan-y select-none overflow-x-auto scrollbar-hide"
        style={{
          scrollbarWidth: "none",
          msOverflowStyle: "none",
          WebkitOverflowScrolling: "touch",
          cursor: isDraggingRef.current ? "grabbing" : "grab",
          paddingLeft:  `calc(50% - ${cardWidth / 2}px)`,
          paddingRight: `calc(50% - ${cardWidth / 2}px)`,
          maskImage:
            "linear-gradient(90deg, transparent 0%, rgba(0,0,0,0.5) 8%, black 18%, black 82%, rgba(0,0,0,0.5) 92%, transparent 100%)",
          WebkitMaskImage:
            "linear-gradient(90deg, transparent 0%, rgba(0,0,0,0.5) 8%, black 18%, black 82%, rgba(0,0,0,0.5) 92%, transparent 100%)",
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onPointerLeave={handlePointerUp}
      >
        <div className="flex" style={{ gap }}>
          {loopedItems.map((item, index) => {
            const logicalIdx = normalize(index);

            // Fractional distance from the current scroll center
            // scrollFrac is in physical-index units
            const fracDist  = Math.abs(index - scrollFrac);
            // Wrap-around distance (for items on the other side of the loop)
            const wrapDist  = loopedItems.length - fracDist;
            const distance  = Math.min(fracDist, wrapDist);

            // Smooth eased scale and opacity — no discrete jumps
            const t       = Math.min(distance, 2.5) / 2.5; // 0 at center, 1 at edge
            const eased   = easeInOutQuad(t);
            const scale   = 1 - eased * 0.14;
            const opacity = 1 - eased * 0.52;

            const isSelected = selectedId
              ? logicalIdx === currentIndex && item.id === selectedId
              : logicalIdx === currentIndex;

            return (
              <button
                key={`${item.id}-${index}`}
                onClick={() => handleCardClick(logicalIdx, item.id)}
                className={`
                  pixel-card group relative flex-shrink-0 overflow-hidden
                  ${isSelected
                    ? "border-cyan-200/80"
                    : "border-white/15 hover:border-fuchsia-300/45"
                  }
                `}
                style={{
                  width:         cardWidth,
                  height:        cardHeight,
                  transform:     `scale(${scale.toFixed(4)})`,
                  opacity:       opacity.toFixed(4),
                  willChange:    "transform, opacity",
                  // Only transition border-color, not transform/opacity
                  // (continuous scroll sync provides the animation)
                  transition:    "border-color 0.25s ease",
                }}
              >
                {/* Background */}
                {item.image ? (
                  <Image
                    src={item.image}
                    alt={item.label}
                    fill
                    className="object-cover"
                    sizes="130px"
                  />
                ) : (
                  <div className={`absolute inset-0 bg-gradient-to-br ${item.gradient}`} />
                )}

                {/* Overlays */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />
                <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent_0%,rgba(5,8,20,0.06)_50%,rgba(5,8,20,0.24)_100%)]" />
                <div className="absolute inset-x-0 top-0 h-px bg-white/30" />
                <div className="absolute inset-y-0 left-0 w-px bg-white/20" />

                {/* Shimmer on hover */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-cyan-200/15 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 ease-out" />

                {/* Label */}
                <div className="relative z-10 flex h-full flex-col justify-end p-3">
                  <div className="truncate text-[0.7rem] font-medium uppercase tracking-[0.08em] text-white drop-shadow-lg sm:text-sm">
                    {item.label}
                  </div>
                  {item.description && (
                    <div className="mt-1 text-[0.56rem] uppercase tracking-[0.2em] text-[#c7d3cb]/70">
                      {item.description}
                    </div>
                  )}
                </div>

                {/* Selected glow */}
                {isSelected && (
                  <div className="absolute inset-0 animate-pulse bg-[#b7c9bd]/6" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Dot indicators */}
      <div className="mt-5 flex items-center justify-center gap-1.5">
        {items.map((item, index) => (
          <button
            key={item.id}
            onClick={() => handleCardClick(index, item.id)}
            className={`h-1.5 border border-white/10 transition-all duration-300 ${
              index === currentIndex
                ? "w-6 bg-[#b7c9bd]/80"
                : "w-1.5 bg-white/18 hover:bg-[#81988a]/45"
            }`}
            aria-label={`Go to ${item.label}`}
          />
        ))}
      </div>
    </div>
  );
}
