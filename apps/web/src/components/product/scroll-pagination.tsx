"use client";

import { AnimatePresence, motion } from "framer-motion";
import type React from "react";
import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Scroll Pagination — Rauno Freiberg craft.
 *
 * Minimal flip-counter pagination. Single page number displayed
 * at center with direction-aware vertical flip on change.
 * Glass pill container. Arrow buttons with spring hover.
 * Scroll wheel or keyboard to navigate. Audio tick on every flip.
 */

/* ── Audio singleton ── */

let _a: AudioContext | null = null;
let _b: AudioBuffer | null = null;

function getCtx(): AudioContext {
  if (!_a)
    _a = new (
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    )();
  if (_a.state === "suspended") _a.resume();
  return _a;
}

function getBuf(ac: AudioContext): AudioBuffer {
  if (_b && _b.sampleRate === ac.sampleRate) return _b;
  const len = Math.floor(ac.sampleRate * 0.003);
  const buf = ac.createBuffer(1, len, ac.sampleRate);
  const ch = buf.getChannelData(0);
  for (let i = 0; i < len; i++) ch[i] = (Math.random() * 2 - 1) * (1 - i / len) ** 4;
  _b = buf;
  return buf;
}

function tick(ref: React.MutableRefObject<number>) {
  const now = performance.now();
  if (now - ref.current < 25) return;
  ref.current = now;
  try {
    const ac = getCtx();
    const src = ac.createBufferSource();
    const g = ac.createGain();
    src.buffer = getBuf(ac);
    g.gain.value = 0.06;
    src.connect(g).connect(ac.destination);
    src.start();
  } catch {
    /* silent */
  }
}

/* ── Types ── */

interface ScrollPaginationProps {
  totalPages?: number;
  onChange?: (page: number) => void;
  sound?: boolean;
}

/* ── Constants ── */

const SPRING = { type: "spring" as const, stiffness: 500, damping: 35 };

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v));
}

/* ── Component ── */

export function ScrollPagination({
  totalPages = 20,
  onChange,
  sound = true,
}: ScrollPaginationProps) {
  const [active, setActive] = useState(0);
  const [dir, setDir] = useState(1);
  const lastSound = useRef(0);
  const scrollAccum = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const go = useCallback(
    (next: number) => {
      const c = clamp(next, 0, totalPages - 1);
      if (c === active) return;
      setDir(c > active ? 1 : -1);
      if (sound) tick(lastSound);
      setActive(c);
      onChange?.(c);
    },
    [active, totalPages, onChange, sound],
  );

  // Wheel
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const handler = (e: WheelEvent) => {
      e.preventDefault();
      scrollAccum.current += e.deltaY;
      if (Math.abs(scrollAccum.current) >= 40) {
        const d = Math.sign(scrollAccum.current);
        scrollAccum.current = 0;
        go(active + d);
      }
    };
    el.addEventListener("wheel", handler, { passive: false });
    return () => el.removeEventListener("wheel", handler);
  }, [go, active]);

  const progress = totalPages > 1 ? active / (totalPages - 1) : 0;

  return (
    <div
      ref={containerRef}
      className="relative inline-flex select-none items-center gap-0.5 rounded-[14px] border border-black/5 bg-white/70 px-1.5 py-1 text-black shadow-[0_0_0_0.5px_rgba(0,0,0,0.04),0_2px_4px_rgba(0,0,0,0.04),0_8px_24px_rgba(0,0,0,0.06)] backdrop-blur-2xl dark:border-white/5 dark:bg-neutral-800/80 dark:text-white dark:shadow-[0_0_0_0.5px_rgba(255,255,255,0.04),0_2px_4px_rgba(0,0,0,0.2),0_8px_24px_rgba(0,0,0,0.3)]"
      style={{
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
      }}
    >
      {/* Prev */}
      <button
        type="button"
        aria-label="Previous page"
        className="flex cursor-pointer items-center justify-center rounded-lg border-0 bg-transparent p-2 transition-colors hover:bg-black/5 active:bg-black/10 dark:hover:bg-white/5 dark:active:bg-white/10"
        onClick={() => go(active - 1)}
        style={{ opacity: active === 0 ? 0.2 : 1 }}
        disabled={active === 0}
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 14 14"
          fill="none"
          aria-hidden="true"
          role="presentation"
        >
          <path
            d="M8.5 3.5L5.5 7L8.5 10.5"
            stroke="currentColor"
            opacity="0.55"
            strokeWidth="1.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {/* Number display */}
      <div
        style={{
          position: "relative",
          width: 48,
          height: 32,
          overflow: "hidden",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <AnimatePresence initial={false} mode="popLayout">
          <motion.span
            key={active}
            initial={{ y: dir * 18, opacity: 0, filter: "blur(2px)" }}
            animate={{ y: 0, opacity: 1, filter: "blur(0px)" }}
            exit={{ y: dir * -18, opacity: 0, filter: "blur(2px)" }}
            transition={SPRING}
            style={{
              position: "absolute",
              fontSize: 15,
              fontWeight: 560,
              opacity: 0.85,
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {active + 1}
          </motion.span>
        </AnimatePresence>
      </div>

      {/* Next */}
      <button
        type="button"
        aria-label="Next page"
        className="flex cursor-pointer items-center justify-center rounded-lg border-0 bg-transparent p-2 transition-colors hover:bg-black/5 active:bg-black/10 dark:hover:bg-white/5 dark:active:bg-white/10"
        onClick={() => go(active + 1)}
        style={{ opacity: active === totalPages - 1 ? 0.2 : 1 }}
        disabled={active === totalPages - 1}
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 14 14"
          fill="none"
          aria-hidden="true"
          role="presentation"
        >
          <path
            d="M5.5 3.5L8.5 7L5.5 10.5"
            stroke="currentColor"
            opacity="0.55"
            strokeWidth="1.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {/* Progress bar */}
      <div
        className="absolute bottom-0 left-1.5 right-1.5 h-0.5 overflow-hidden rounded bg-black/5 dark:bg-white/5"
        style={{
          position: "absolute",
          bottom: 0,
          left: 6,
          right: 6,
          height: 2,
          borderRadius: 1,
          overflow: "hidden",
        }}
      >
        <motion.div
          className="h-full rounded bg-black/20 dark:bg-white/20"
          animate={{ width: `${progress * 100}%` }}
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
          style={{
            height: "100%",
            borderRadius: 1,
          }}
        />
      </div>

      {/* Total label */}
      <span
        className="text-black/30 dark:text-white/30"
        style={{
          fontSize: 11,
          fontWeight: 400,
          marginLeft: 4,
          marginRight: 4,
          fontVariantNumeric: "tabular-nums",
        }}
      >
        / {totalPages}
      </span>
    </div>
  );
}

export default ScrollPagination;
