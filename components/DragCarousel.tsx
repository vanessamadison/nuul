"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export interface CarouselItem {
  id: string;
  label: string;
  description?: string;
  gradient: string;
  icon?: React.ReactNode;
}

interface DragCarouselProps {
  items: CarouselItem[];
  selectedId?: string;
  onSelect?: (id: string) => void;
  className?: string;
  cardWidth?: number;
  cardHeight?: number;
}

export default function DragCarousel({
  items,
  selectedId,
  onSelect,
  className = "",
  cardWidth: propCardWidth,
  cardHeight: propCardHeight,
}: DragCarouselProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);
  const [velocity, setVelocity] = useState(0);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isMobile, setIsMobile] = useState(false);
  const lastX = useRef(0);
  const lastTime = useRef(0);
  const rafRef = useRef<number>(0);
  const momentumRef = useRef<number>(0);

  // Detect mobile for responsive sizing
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 640);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Card dimensions - responsive
  const cardWidth = propCardWidth ?? (isMobile ? 120 : 140);
  const cardHeight = propCardHeight ?? (isMobile ? 160 : 180);
  const gap = isMobile ? 12 : 16;
  const totalCardWidth = cardWidth + gap;

  // Get center position for a card index
  const getCenterPosition = useCallback(
    (index: number) => {
      if (!containerRef.current) return 0;
      const containerWidth = containerRef.current.offsetWidth;
      return index * totalCardWidth - containerWidth / 2 + cardWidth / 2;
    },
    [totalCardWidth, cardWidth]
  );

  // Snap to nearest card
  const snapToNearest = useCallback(() => {
    if (!trackRef.current || !containerRef.current) return;

    const currentScroll = trackRef.current.scrollLeft;
    const containerWidth = containerRef.current.offsetWidth;
    const centerOffset = currentScroll + containerWidth / 2;
    const nearestIndex = Math.round(
      (centerOffset - cardWidth / 2) / totalCardWidth
    );
    const clampedIndex = Math.max(0, Math.min(items.length - 1, nearestIndex));

    setCurrentIndex((prev) => {
      // Trigger haptic on index change
      if (clampedIndex !== prev) {
        if (typeof navigator !== "undefined" && "vibrate" in navigator) {
          navigator.vibrate(5);
        }
      }
      return clampedIndex;
    });

    const targetScroll = getCenterPosition(clampedIndex);

    // Smooth scroll animation
    const startScroll = trackRef.current.scrollLeft;
    const distance = targetScroll - startScroll;
    const duration = 400;
    const startTime = performance.now();

    const animate = (time: number) => {
      const elapsed = time - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);

      if (trackRef.current) {
        trackRef.current.scrollLeft = startScroll + distance * eased;
      }

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate);
      }
    };

    rafRef.current = requestAnimationFrame(animate);
  }, [items.length, totalCardWidth, cardWidth, getCenterPosition]);

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
    []
  );

  // Handle pointer move
  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!isDragging || !trackRef.current) return;

      const x = e.clientX;
      const walk = x - startX;
      trackRef.current.scrollLeft = scrollLeft - walk;

      // Calculate velocity
      const now = performance.now();
      const dt = now - lastTime.current;
      if (dt > 0) {
        const dx = x - lastX.current;
        setVelocity(dx / dt * 16); // Normalize to 60fps
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

      // Check if it was a tap (minimal movement)
      const movedDistance = Math.abs(e.clientX - startX);
      if (movedDistance < 5) {
        // It was a tap, don't apply momentum
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

      setCurrentIndex(index);
      onSelect?.(id);
      triggerHaptic();

      // Smooth scroll to center the clicked card
      if (!trackRef.current) return;
      const targetScroll = getCenterPosition(index);

      const startScroll = trackRef.current.scrollLeft;
      const distance = targetScroll - startScroll;
      const duration = 500;
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
    [isDragging, onSelect, getCenterPosition, triggerHaptic]
  );

  // Initialize scroll position
  useEffect(() => {
    if (!trackRef.current || !containerRef.current) return;

    const initialIndex = selectedId
      ? items.findIndex((item) => item.id === selectedId)
      : 0;
    const validIndex = Math.max(0, initialIndex);

    setCurrentIndex(validIndex);
    const targetScroll = getCenterPosition(validIndex);
    trackRef.current.scrollLeft = targetScroll;
  }, [items, selectedId, getCenterPosition]);

  // Handle wheel scroll
  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault();
    if (!trackRef.current) return;

    cancelAnimationFrame(rafRef.current);
    cancelAnimationFrame(momentumRef.current);

    trackRef.current.scrollLeft += e.deltaX || e.deltaY;
    setVelocity(0);

    // Debounce snap
    clearTimeout((handleWheel as unknown as { timeout: number }).timeout);
    (handleWheel as unknown as { timeout: number }).timeout = window.setTimeout(() => {
      snapToNearest();
    }, 150);
  }, [snapToNearest]);

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
        const newIndex = Math.max(0, currentIndex - 1);
        handleCardClick(newIndex, items[newIndex].id);
      } else if (e.key === "ArrowRight") {
        const newIndex = Math.min(items.length - 1, currentIndex + 1);
        handleCardClick(newIndex, items[newIndex].id);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentIndex, items, handleCardClick]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      cancelAnimationFrame(rafRef.current);
      cancelAnimationFrame(momentumRef.current);
    };
  }, []);

  return (
    <div className={`relative w-full ${className}`} ref={containerRef}>
      {/* Gradient fades */}
      <div className="pointer-events-none absolute left-0 top-0 z-10 h-full w-16 bg-gradient-to-r from-black to-transparent" />
      <div className="pointer-events-none absolute right-0 top-0 z-10 h-full w-16 bg-gradient-to-l from-black to-transparent" />

      {/* Track */}
      <div
        ref={trackRef}
        className="flex touch-pan-y select-none overflow-x-auto scrollbar-hide"
        style={{
          scrollbarWidth: "none",
          msOverflowStyle: "none",
          WebkitOverflowScrolling: "touch",
          cursor: isDragging ? "grabbing" : "grab",
          paddingLeft: "50%",
          paddingRight: "50%",
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onPointerLeave={handlePointerUp}
      >
        <div className="flex" style={{ gap }}>
          {items.map((item, index) => {
            const isSelected = selectedId
              ? item.id === selectedId
              : index === currentIndex;
            const distance = Math.abs(index - currentIndex);
            const scale = Math.max(0.8, 1 - distance * 0.08);
            const opacity = Math.max(0.4, 1 - distance * 0.15);

            return (
              <button
                key={item.id}
                onClick={() => handleCardClick(index, item.id)}
                className={`
                  group relative flex-shrink-0 overflow-hidden rounded-2xl
                  transition-all duration-300 ease-out
                  ${isSelected
                    ? "ring-2 ring-white/50 ring-offset-2 ring-offset-black"
                    : "ring-1 ring-white/10 hover:ring-white/30"
                  }
                `}
                style={{
                  width: cardWidth,
                  height: cardHeight,
                  transform: `scale(${scale})`,
                  opacity,
                }}
              >
                {/* Gradient background */}
                <div
                  className={`absolute inset-0 bg-gradient-to-br ${item.gradient}`}
                />

                {/* Glass overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-white/5" />

                {/* Shimmer effect */}
                <div
                  className={`
                    absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent
                    translate-x-[-100%] group-hover:translate-x-[100%]
                    transition-transform duration-700 ease-out
                  `}
                />

                {/* Content */}
                <div className="relative z-10 flex h-full flex-col justify-end p-4">
                  {item.icon && (
                    <div className="mb-2 text-white/80">{item.icon}</div>
                  )}
                  <div className="text-left">
                    <div className="text-sm font-medium text-white">
                      {item.label}
                    </div>
                    {item.description && (
                      <div className="mt-1 text-[0.65rem] text-white/60 leading-tight">
                        {item.description}
                      </div>
                    )}
                  </div>

                  {/* Selection indicator */}
                  <div
                    className={`
                      absolute right-3 top-3 h-2 w-2 rounded-full
                      transition-all duration-300
                      ${isSelected
                        ? "bg-white scale-100"
                        : "bg-white/30 scale-75"
                      }
                    `}
                  />
                </div>

                {/* Glow effect for selected */}
                {isSelected && (
                  <div className="absolute inset-0 animate-pulse bg-white/5" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Progress indicators */}
      <div className="mt-6 flex items-center justify-center gap-1.5">
        {items.map((item, index) => (
          <button
            key={item.id}
            onClick={() => handleCardClick(index, item.id)}
            className={`
              h-1 rounded-full transition-all duration-300
              ${index === currentIndex
                ? "w-6 bg-white/80"
                : "w-1.5 bg-white/20 hover:bg-white/40"
              }
            `}
            aria-label={`Go to ${item.label}`}
          />
        ))}
      </div>
    </div>
  );
}
