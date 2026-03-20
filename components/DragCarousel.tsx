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

export default function DragCarousel({
  items,
  selectedId,
  onSelect,
  className = "",
  autoRotate = true,
  autoRotateInterval = 4000,
}: DragCarouselProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);
  const [velocity, setVelocity] = useState(0);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [mounted, setMounted] = useState(false);
  const [isInteracting, setIsInteracting] = useState(false);
  const lastX = useRef(0);
  const lastTime = useRef(0);
  const rafRef = useRef<number>(0);
  const momentumRef = useRef<number>(0);
  const autoRotateRef = useRef<NodeJS.Timeout | null>(null);
  const interactionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const physicalIndexRef = useRef(0);

  // Responsive card dimensions
  const cardWidth = 130;
  const cardHeight = 175;
  const gap = 14;
  const totalCardWidth = cardWidth + gap;
  const loopMultiplier = 3;
  const baseOffset = items.length;
  const loopedItems = [...items, ...items, ...items];

  const normalizeIndex = useCallback(
    (index: number) => {
      if (!items.length) return 0;
      return ((index % items.length) + items.length) % items.length;
    },
    [items.length]
  );

  const getPhysicalIndex = useCallback(
    (index: number) => normalizeIndex(index) + baseOffset,
    [baseOffset, normalizeIndex]
  );

  // Detect mount
  useEffect(() => {
    setMounted(true);
  }, []);

  // Get center position for a card index
  const getCenterPosition = useCallback(
    (index: number) => {
      return index * totalCardWidth;
    },
    [totalCardWidth]
  );

  // Smooth scroll to index
  const scrollToIndex = useCallback(
    (index: number, duration = 500) => {
      if (!trackRef.current || !containerRef.current) return;

      const logicalIndex = normalizeIndex(index);
      const targetPhysicalIndex = getPhysicalIndex(index);
      setCurrentIndex(logicalIndex);
      physicalIndexRef.current = targetPhysicalIndex;

      const targetScroll = getCenterPosition(targetPhysicalIndex);
      const startScroll = trackRef.current.scrollLeft;
      const distance = targetScroll - startScroll;
      const startTime = performance.now();

      const animate = (time: number) => {
        const elapsed = time - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);

        if (trackRef.current) {
          trackRef.current.scrollLeft = startScroll + distance * eased;
        }

        if (progress < 1) {
          rafRef.current = requestAnimationFrame(animate);
        }
      };

      rafRef.current = requestAnimationFrame(animate);
    },
    [getCenterPosition, getPhysicalIndex, normalizeIndex]
  );

  // Snap to nearest card
  const snapToNearest = useCallback(() => {
    if (!trackRef.current || !containerRef.current) return;

    const currentScroll = trackRef.current.scrollLeft;
    const nearestPhysicalIndex = Math.round(currentScroll / totalCardWidth);
    const logicalIndex = normalizeIndex(nearestPhysicalIndex);

    setCurrentIndex((prev) => {
      if (logicalIndex !== prev && typeof navigator !== "undefined" && "vibrate" in navigator) {
        navigator.vibrate(5);
      }
      return logicalIndex;
    });

    scrollToIndex(logicalIndex, 400);
  }, [normalizeIndex, totalCardWidth, scrollToIndex]);

  // Auto-rotate logic
  useEffect(() => {
    if (!autoRotate || !mounted || isInteracting) return;

    const startAutoRotate = () => {
      autoRotateRef.current = setInterval(() => {
        setCurrentIndex((prev) => {
          const nextIndex = normalizeIndex(prev + 1);
          scrollToIndex(nextIndex, 600);
          return nextIndex;
        });
      }, autoRotateInterval);
    };

    startAutoRotate();

    return () => {
      if (autoRotateRef.current) {
        clearInterval(autoRotateRef.current);
      }
    };
  }, [autoRotate, autoRotateInterval, items.length, mounted, isInteracting, normalizeIndex, scrollToIndex]);

  // Handle user interaction pause
  const pauseAutoRotate = useCallback(() => {
    setIsInteracting(true);
    if (autoRotateRef.current) {
      clearInterval(autoRotateRef.current);
    }
    if (interactionTimeoutRef.current) {
      clearTimeout(interactionTimeoutRef.current);
    }
    // Resume auto-rotate after 8 seconds of no interaction
    interactionTimeoutRef.current = setTimeout(() => {
      setIsInteracting(false);
    }, 8000);
  }, []);

  // Apply momentum scrolling
  const applyMomentum = useCallback(() => {
    if (!trackRef.current || Math.abs(velocity) < 0.5) {
      snapToNearest();
      return;
    }

    const friction = 0.95;
    let currentVelocity = velocity;

    const tick = () => {
      if (!trackRef.current) return;

      currentVelocity *= friction;
      trackRef.current.scrollLeft -= currentVelocity;

      if (Math.abs(currentVelocity) > 0.5) {
        momentumRef.current = requestAnimationFrame(tick);
      } else {
        snapToNearest();
      }
    };

    momentumRef.current = requestAnimationFrame(tick);
  }, [velocity, snapToNearest]);

  // Handle pointer down
  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (!trackRef.current) return;

      pauseAutoRotate();
      cancelAnimationFrame(rafRef.current);
      cancelAnimationFrame(momentumRef.current);

      setIsDragging(true);
      setStartX(e.clientX);
      setScrollLeft(trackRef.current.scrollLeft);
      lastX.current = e.clientX;
      lastTime.current = performance.now();
      setVelocity(0);

      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    },
    [pauseAutoRotate]
  );

  // Handle pointer move
  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!isDragging || !trackRef.current) return;

      const x = e.clientX;
      const walk = x - startX;
      trackRef.current.scrollLeft = scrollLeft - walk;

      const now = performance.now();
      const dt = now - lastTime.current;
      if (dt > 0) {
        const dx = x - lastX.current;
        setVelocity((dx / dt) * 16);
      }
      lastX.current = x;
      lastTime.current = now;
    },
    [isDragging, startX, scrollLeft]
  );

  // Handle pointer up
  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      if (!isDragging) return;

      setIsDragging(false);
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);

      const movedDistance = Math.abs(e.clientX - startX);
      if (movedDistance < 5) {
        snapToNearest();
        return;
      }

      applyMomentum();
    },
    [isDragging, startX, applyMomentum, snapToNearest]
  );

  // Haptic feedback helper
  const triggerHaptic = useCallback(() => {
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate(10);
    }
  }, []);

  // Handle card click
  const handleCardClick = useCallback(
    (index: number, id: string) => {
      if (isDragging) return;

      pauseAutoRotate();
      setCurrentIndex(index);
      onSelect?.(id);
      triggerHaptic();
      scrollToIndex(index, 500);
    },
    [isDragging, onSelect, pauseAutoRotate, scrollToIndex, triggerHaptic]
  );

  // Initialize scroll position
  useEffect(() => {
    if (!mounted || !trackRef.current || !containerRef.current) return;

    const initialIndex = selectedId
      ? items.findIndex((item) => item.id === selectedId)
      : 0;
    const validIndex = Math.max(0, initialIndex);
    const physicalIndex = getPhysicalIndex(validIndex);

    setCurrentIndex(validIndex);
    physicalIndexRef.current = physicalIndex;
    const targetScroll = getCenterPosition(physicalIndex);
    trackRef.current.scrollLeft = targetScroll;
  }, [items, selectedId, getCenterPosition, getPhysicalIndex, mounted]);

  // Handle wheel scroll
  const handleWheel = useCallback(
    (e: WheelEvent) => {
      e.preventDefault();
      if (!trackRef.current) return;

      pauseAutoRotate();
      cancelAnimationFrame(rafRef.current);
      cancelAnimationFrame(momentumRef.current);

      trackRef.current.scrollLeft += e.deltaX || e.deltaY;
      setVelocity(0);

      clearTimeout((handleWheel as unknown as { timeout: number }).timeout);
      (handleWheel as unknown as { timeout: number }).timeout = window.setTimeout(() => {
        snapToNearest();
      }, 150);
    },
    [snapToNearest, pauseAutoRotate]
  );

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;

    track.addEventListener("wheel", handleWheel, { passive: false });
    return () => track.removeEventListener("wheel", handleWheel);
  }, [handleWheel]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") {
        pauseAutoRotate();
        const newIndex = normalizeIndex(currentIndex - 1);
        handleCardClick(newIndex, items[newIndex].id);
      } else if (e.key === "ArrowRight") {
        pauseAutoRotate();
        const newIndex = normalizeIndex(currentIndex + 1);
        handleCardClick(newIndex, items[newIndex].id);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentIndex, items, handleCardClick, normalizeIndex, pauseAutoRotate]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      cancelAnimationFrame(rafRef.current);
      cancelAnimationFrame(momentumRef.current);
      if (autoRotateRef.current) clearInterval(autoRotateRef.current);
      if (interactionTimeoutRef.current) clearTimeout(interactionTimeoutRef.current);
    };
  }, []);

  // Show placeholder during SSR
  if (!mounted) {
    return (
      <div className={`relative w-full ${className}`}>
        <div className="flex justify-center gap-3 py-8">
          {items.slice(0, 3).map((item) => (
            <div
              key={item.id}
              className="h-[175px] w-[130px] animate-pulse rounded-2xl bg-white/5"
            />
          ))}
        </div>
      </div>
    );
  }

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
          cursor: isDragging ? "grabbing" : "grab",
          paddingLeft: `calc(50% - ${cardWidth / 2}px)`,
          paddingRight: `calc(50% - ${cardWidth / 2}px)`,
          maskImage: "linear-gradient(90deg, transparent 0%, rgba(0,0,0,0.5) 8%, black 18%, black 82%, rgba(0,0,0,0.5) 92%, transparent 100%)",
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
            const logicalIndex = normalizeIndex(index);
            const isSelected = selectedId
              ? logicalIndex === currentIndex && item.id === selectedId
              : logicalIndex === currentIndex;
            const distance = Math.min(
              Math.abs(logicalIndex - currentIndex),
              items.length - Math.abs(logicalIndex - currentIndex)
            );
            const scale = Math.max(0.85, 1 - distance * 0.06);
            const opacity = Math.max(0.5, 1 - distance * 0.12);

            return (
              <button
                key={`${item.id}-${index}`}
                onClick={() => handleCardClick(logicalIndex, item.id)}
                className={`
                  pixel-card group relative flex-shrink-0 overflow-hidden
                  transition-all duration-300 ease-out
                  ${isSelected
                    ? "border-cyan-200/80"
                    : "border-white/15 hover:border-fuchsia-300/45"
                  }
                `}
                style={{
                  width: cardWidth,
                  height: cardHeight,
                  transform: `scale(${scale})`,
                  opacity,
                }}
              >
                {/* Image or gradient background */}
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

                {/* Dark overlay for text readability */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />
                <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent_0%,rgba(5,8,20,0.06)_50%,rgba(5,8,20,0.24)_100%)]" />
                <div className="absolute inset-x-0 top-0 h-px bg-white/30" />
                <div className="absolute inset-y-0 left-0 w-px bg-white/20" />

                {/* Shimmer effect */}
                <div
                  className={`
                    absolute inset-0 bg-gradient-to-r from-transparent via-cyan-200/15 to-transparent
                    translate-x-[-100%] group-hover:translate-x-[100%]
                    transition-transform duration-700 ease-out
                  `}
                />

                {/* Content - just the label */}
                <div className="relative z-10 flex h-full flex-col justify-end p-3">
                  <div className="truncate text-[0.7rem] font-medium uppercase tracking-[0.08em] text-white drop-shadow-lg sm:text-sm">
                    {item.label}
                  </div>
                  {item.description ? (
                    <div className="mt-1 text-[0.56rem] uppercase tracking-[0.2em] text-[#c7d3cb]/70">
                      {item.description}
                    </div>
                  ) : null}
                </div>

                {/* Glow effect for selected */}
                {isSelected && (
                  <div className="absolute inset-0 animate-pulse bg-[#b7c9bd]/6" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Progress indicators */}
      <div className="mt-5 flex items-center justify-center gap-1.5">
        {items.map((item, index) => (
          <button
            key={item.id}
            onClick={() => handleCardClick(index, item.id)}
            className={`
              h-1.5 border border-white/10 transition-all duration-300
              ${index === currentIndex
                ? "w-6 bg-[#b7c9bd]/80"
                : "w-1.5 bg-white/18 hover:bg-[#81988a]/45"
              }
            `}
            aria-label={`Go to ${item.label}`}
          />
        ))}
      </div>
    </div>
  );
}
