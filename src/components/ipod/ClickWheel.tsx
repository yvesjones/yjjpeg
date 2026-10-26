"use client";

import * as React from "react";

/** Degrees of rotation per menu step. Roughly a real wheel's detent. */
const DEGREES_PER_STEP = 22;

/**
 * The click wheel.
 *
 * Rotation is tracked as an angle about the centre rather than as raw pointer
 * movement, so a circular drag reads as circular however the thumb travels.
 * Steps accumulate and fire once per detent, which is what makes it feel
 * mechanical rather than like a scrollbar.
 *
 * The buttons are real buttons: the wheel is an enhancement on top of a menu
 * that already works by tapping and by keyboard.
 */
export default function ClickWheel({
  onStep,
  onSelect,
  onMenu,
  onPrev,
  onNext,
  onPlayPause,
}: {
  onStep: (direction: 1 | -1) => void;
  onSelect: () => void;
  onMenu: () => void;
  onPrev: () => void;
  onNext: () => void;
  onPlayPause: () => void;
}) {
  const ringRef = React.useRef<HTMLDivElement>(null);
  const lastAngle = React.useRef<number | null>(null);
  const carry = React.useRef(0);

  const angleFrom = (e: PointerEvent | React.PointerEvent) => {
    const ring = ringRef.current;
    if (!ring) return null;
    const box = ring.getBoundingClientRect();
    const cx = box.left + box.width / 2;
    const cy = box.top + box.height / 2;
    return (Math.atan2(e.clientY - cy, e.clientX - cx) * 180) / Math.PI;
  };

  const onPointerDown = (e: React.PointerEvent) => {
    lastAngle.current = angleFrom(e);
    carry.current = 0;

    const move = (ev: PointerEvent) => {
      const now = angleFrom(ev);
      if (now === null || lastAngle.current === null) return;

      // Normalise across the ±180° seam, or every pass through the top of the
      // wheel would register as most of a full turn in the wrong direction.
      let delta = now - lastAngle.current;
      if (delta > 180) delta -= 360;
      if (delta < -180) delta += 360;

      lastAngle.current = now;
      carry.current += delta;

      while (Math.abs(carry.current) >= DEGREES_PER_STEP) {
        const direction = carry.current > 0 ? 1 : -1;
        carry.current -= direction * DEGREES_PER_STEP;
        onStep(direction as 1 | -1);
      }
    };

    const up = () => {
      lastAngle.current = null;
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
    };

    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
  };

  return (
    <div
      ref={ringRef}
      onPointerDown={onPointerDown}
      // touch-none: a drag on the wheel is a wheel turn, never a page scroll.
      className="relative aspect-square w-full touch-none select-none rounded-full bg-[var(--ipod-wheel)] shadow-[inset_0_1px_2px_rgba(255,255,255,0.9),0_1px_3px_rgba(0,0,0,0.18)]"
    >
      <WheelButton
        label="Menu"
        onClick={onMenu}
        className="top-0 left-1/2 h-[26%] w-[46%] -translate-x-1/2 pt-[6%]"
      >
        <span className="ipod-type text-[clamp(7px,3.5cqw,14px)] lowercase">
          menu
        </span>
      </WheelButton>

      <WheelButton
        label="Previous"
        onClick={onPrev}
        className="top-1/2 left-0 h-[46%] w-[26%] -translate-y-1/2 pl-[6%]"
      >
        <Glyph>&#9664;&#9664;</Glyph>
      </WheelButton>

      <WheelButton
        label="Next"
        onClick={onNext}
        className="top-1/2 right-0 h-[46%] w-[26%] -translate-y-1/2 pr-[6%]"
      >
        <Glyph>&#9654;&#9654;</Glyph>
      </WheelButton>

      <WheelButton
        label="Play or pause"
        onClick={onPlayPause}
        className="bottom-0 left-1/2 h-[26%] w-[46%] -translate-x-1/2 pb-[6%]"
      >
        <Glyph>&#9654;&#10073;&#10073;</Glyph>
      </WheelButton>

      <button
        type="button"
        onClick={onSelect}
        aria-label="Select"
        // Stops a tap on the centre from also spinning the ring underneath.
        onPointerDown={(e) => e.stopPropagation()}
        className="absolute top-1/2 left-1/2 h-[38%] w-[38%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[var(--ipod-centre)] shadow-[inset_0_1px_2px_rgba(255,255,255,0.8),0_1px_4px_rgba(0,0,0,0.2)] active:shadow-[inset_0_2px_5px_rgba(0,0,0,0.18)]"
      />
    </div>
  );
}

function Glyph({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-[clamp(7px,3.7cqw,15px)] tracking-[0.1em] text-[var(--ipod-wheel-ink)]">
      {children}
    </span>
  );
}

function WheelButton({
  label,
  onClick,
  className,
  children,
}: {
  label: string;
  onClick: () => void;
  className: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      onPointerDown={(e) => e.stopPropagation()}
      className={`absolute flex items-center justify-center text-[var(--ipod-wheel-ink)] transition-opacity active:opacity-50 ${className}`}
    >
      {children}
    </button>
  );
}
