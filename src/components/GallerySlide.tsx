"use client";

import * as React from "react";

import MorphGallery, { type MorphItem } from "@/components/ui/morph-gallery";

/** A drag that moves less than this is a click, not a swipe. */
const CLICK_THRESHOLD_PX = 8;

/**
 * One orientation's slide, plus a full-screen viewer for it.
 *
 * Deliberately a fixed overlay rather than the Fullscreen API: iOS Safari
 * only grants real fullscreen to <video>, so requestFullscreen would quietly
 * do nothing on a phone — which is where these are most likely to be viewed.
 */
export default function GallerySlide({
  items,
  orientation,
}: {
  items: MorphItem[];
  orientation: "landscape" | "portrait";
}) {
  /** Which frame the slide is on. A ref, because nothing renders from it —
      it is only read when the viewer opens, and making it state would
      re-render the gallery in the middle of its own dissolve. */
  const active = React.useRef(0);
  /** Index being shown full screen, or null when the viewer is closed. */
  const [viewing, setViewing] = React.useState<number | null>(null);

  const show = (index: number) => setViewing(((index % items.length) + items.length) % items.length);

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
        <p className="mono-eyebrow">
          {orientation} &middot; {items.length}{" "}
          {items.length === 1 ? "frame" : "frames"}
        </p>
        <div className="flex items-center gap-4">
          {items.length > 1 && (
            <p className="mono-label">Drag or use the arrows</p>
          )}
          <button
            type="button"
            onClick={() => show(active.current)}
            className="mono-label underline-offset-4 transition-colors hover:text-accent hover:underline"
          >
            Full screen
          </button>
        </div>
      </div>

      <ClickCatcher onClick={() => show(active.current)}>
        <div
          className={
            orientation === "landscape"
              ? "aspect-[3/2] w-full"
              : "mx-auto aspect-[2/3] w-full max-w-[470px]"
          }
        >
          <MorphGallery
            items={items}
            height="100%"
            fit="contain"
            background={[0.957, 0.957, 0.957]}
            drift={0.18}
            className="rounded-2xl"
            onIndexChange={(i) => {
              active.current = i;
            }}
          />
        </div>
      </ClickCatcher>

      {viewing !== null && (
        <FullScreenViewer
          items={items}
          index={viewing}
          onIndex={show}
          onClose={() => setViewing(null)}
        />
      )}
    </div>
  );
}

/**
 * Opens the viewer on a tap of the photograph itself.
 *
 * Never on a drag — the gallery underneath is draggable, and a swipe that
 * ends in a lightbox is infuriating. And never on the gallery's own controls:
 * the arrows and thumbnails are inside this box, and opening full screen over
 * them hid the dissolve they had just started.
 */
function ClickCatcher({
  onClick,
  children,
}: {
  onClick: () => void;
  children: React.ReactNode;
}) {
  const start = React.useRef<{ x: number; y: number } | null>(null);

  return (
    <div
      onPointerDown={(e) => {
        start.current = { x: e.clientX, y: e.clientY };
      }}
      onPointerUp={(e) => {
        const from = start.current;
        start.current = null;
        if (!from) return;

        // Arrows, thumbnails — anything clickable belongs to the gallery.
        if ((e.target as HTMLElement).closest("button, a, [role='button']")) {
          return;
        }

        const moved = Math.hypot(e.clientX - from.x, e.clientY - from.y);
        if (moved <= CLICK_THRESHOLD_PX) onClick();
      }}
    >
      {children}
    </div>
  );
}

function FullScreenViewer({
  items,
  index,
  onIndex,
  onClose,
}: {
  items: MorphItem[];
  index: number;
  onIndex: (index: number) => void;
  onClose: () => void;
}) {
  const closeRef = React.useRef<HTMLButtonElement>(null);
  const swipeFrom = React.useRef<number | null>(null);
  const item = items[index];

  // Cross-fade between frames rather than cutting. The outgoing photograph is
  // held for the length of the fade, then dropped.
  const [outgoing, setOutgoing] = React.useState<number | null>(null);
  const shown = React.useRef(index);

  React.useEffect(() => {
    if (shown.current === index) return;
    setOutgoing(shown.current);
    shown.current = index;
    const timer = window.setTimeout(() => setOutgoing(null), 450);
    return () => window.clearTimeout(timer);
  }, [index]);

  React.useEffect(() => {
    closeRef.current?.focus();

    // The page behind must not scroll while the viewer is up.
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") onIndex(index + 1);
      if (e.key === "ArrowLeft") onIndex(index - 1);
    };
    window.addEventListener("keydown", onKey);

    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, [index, onClose, onIndex]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`${item.alt ?? "Photograph"}, ${index + 1} of ${items.length}`}
      className="fixed inset-0 z-50 flex flex-col bg-background/97 backdrop-blur-sm"
      onPointerDown={(e) => {
        swipeFrom.current = e.clientX;
      }}
      onPointerUp={(e) => {
        const from = swipeFrom.current;
        swipeFrom.current = null;
        if (from === null) return;
        const dx = e.clientX - from;
        if (Math.abs(dx) > 50) onIndex(index + (dx < 0 ? 1 : -1));
      }}
    >
      <div className="flex shrink-0 items-center justify-between gap-4 px-6 py-4">
        <span className="mono-label">
          {index + 1} / {items.length}
        </span>
        <button
          ref={closeRef}
          type="button"
          onClick={onClose}
          className="pill pill-secondary"
        >
          Close
        </button>
      </div>

      <div className="relative flex min-h-0 flex-1 items-center justify-center px-4 pb-4">
        {outgoing !== null && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={`out-${outgoing}`}
            src={items[outgoing].src}
            alt=""
            aria-hidden="true"
            className="absolute inset-0 m-auto max-h-full max-w-full object-contain opacity-0 transition-opacity duration-[450ms] motion-reduce:transition-none"
            draggable={false}
          />
        )}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          key={`in-${index}`}
          src={item.src}
          alt={item.alt ?? ""}
          // The full file at its own shape, scaled only to fit the screen.
          className="ipod-fade-in max-h-full max-w-full object-contain"
          draggable={false}
        />
      </div>

      {items.length > 1 && (
        <div className="flex shrink-0 items-center justify-center gap-3 px-6 pb-6">
          <button
            type="button"
            onClick={() => onIndex(index - 1)}
            aria-label="Previous photograph"
            className="pill pill-secondary"
          >
            &larr;
          </button>
          <button
            type="button"
            onClick={() => onIndex(index + 1)}
            aria-label="Next photograph"
            className="pill pill-secondary"
          >
            &rarr;
          </button>
        </div>
      )}
    </div>
  );
}
