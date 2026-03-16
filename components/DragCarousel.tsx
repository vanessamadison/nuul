"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";

export interface CarouselItem {
  id: string;
  label: string;
  image?: string;
  gradient: string;
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

  // Responsive card dimensions
  const cardWidth = 130;
  const cardHeight = 175;
  const gap = 14;
  const totalCardWidth = cardWidth + gap;

  // Detect mount
  useEffect(() => {
    setMounted(true);
  }, []);

  // Get center position for a card index
  const getCenterPosition = useCallback(
    (index: number) => {
      if (!containerRef.current) return 0;
      const containerWidth = containerRef.current.offsetWidth;
      return index * totalCardWidth - containerWidth / 2 + cardWidth / 2;
    },
    [totalCardWidth, cardWidth]
  );

  // Smooth scroll to index
  const scrollToIndex = useCallback(
    (index: number, duration = 500) => {
      if (!trackRef.current || !containerRef.current) return;

      const clampedIndex = Math.max(0, Math.min(items.length - 1, index));
      setCurrentIndex(clampedIndex);

      const targetScroll = getCenterPosition(clampedIndex);
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
    [items.length, getCenterPosition]
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
      if (clampedIndex !== prev && typeof navigator !== "undefined" && "vibrate" in navigator) {
        navigator.vibrate(5);
      }
      return clampedIndex;
    });

    scrollToIndex(clampedIndex, 400);
  }, [items.length, totalCardWidth, cardWidth, scrollToIndex]);

  // Auto-rotate logic
  useEffect(() => {
    if (!autoRotate || !mounted || isInteracting) return;

    const startAutoRotate = () => {
      autoRotateRef.current = setInterval(() => {
        setCurrentIndex((prev) => {
          const nextIndex = (prev + 1) % items.length;
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
  }, [autoRotate, autoRotateInterval, items.length, mounted, isInteracting, scrollToIndex]);

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

    setCurrentIndex(validIndex);
    const targetScroll = getCenterPosition(validIndex);
    trackRef.current.scrollLeft = targetScroll;
  }, [items, selectedId, getCenterPosition, mounted]);

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
        const newIndex = Math.max(0, currentIndex - 1);
        handleCardClick(newIndex, items[newIndex].id);
      } else if (e.key === "ArrowRight") {
        pauseAutoRotate();
        const newIndex = Math.min(items.length - 1, currentIndex + 1);
        handleCardClick(newIndex, items[newIndex].id);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentIndex, items, handleCardClick, pauseAutoRotate]);

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
      {/* Gradient fades */}
      <div className="pointer-events-none absolute left-0 top-0 z-10 h-full w-8 bg-gradient-to-r from-black to-transparent sm:w-12" />
      <div className="pointer-events-none absolute right-0 top-0 z-10 h-full w-8 bg-gradient-to-l from-black to-transparent sm:w-12" />

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
            const scale = Math.max(0.85, 1 - distance * 0.06);
            const opacity = Math.max(0.5, 1 - distance * 0.12);

            return (
              <button
                key={item.id}
                onClick={() => handleCardClick(index, item.id)}
                className={`
                  group relative flex-shrink-0 overflow-hidden rounded-xl
                  transition-all duration-300 ease-out
                  ${isSelected
                    ? "ring-2 ring-white/60 ring-offset-2 ring-offset-black"
                    : "ring-1 ring-white/20 hover:ring-white/40"
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
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

                {/* Shimmer effect */}
                <div
                  className={`
                    absolute inset-0 bg-gradient-to-r from-transparent via-white/15 to-transparent
                    translate-x-[-100%] group-hover:translate-x-[100%]
                    transition-transform duration-700 ease-out
                  `}
                />

                {/* Content - just the label */}
                <div className="relative z-10 flex h-full flex-col justify-end p-3">
                  <div className="text-sm font-medium text-white drop-shadow-lg">
                    {item.label}
                  </div>

                  {/* Selection indicator */}
                  <div
                    className={`
                      absolute right-2 top-2 h-2 w-2 rounded-full
                      transition-all duration-300
                      ${isSelected
                        ? "bg-white scale-100 shadow-lg shadow-white/50"
                        : "bg-white/40 scale-75"
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
      <div className="mt-5 flex items-center justify-center gap-1.5">
        {items.map((item, index) => (
          <button
            key={item.id}
            onClick={() => handleCardClick(index, item.id)}
            className={`
              h-1 rounded-full transition-all duration-300
              ${index === currentIndex
                ? "w-6 bg-white/80"
                : "w-1.5 bg-white/25 hover:bg-white/50"
              }
            `}
            aria-label={`Go to ${item.label}`}
          />
        ))}
      </div>
    </div>
  );
}
