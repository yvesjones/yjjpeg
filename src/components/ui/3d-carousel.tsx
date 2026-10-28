"use client";

import {
  memo,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { motion } from "framer-motion";

export const useIsomorphicLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

type UseMediaQueryOptions = {
  defaultValue?: boolean;
  initializeWithValue?: boolean;
};

const IS_SERVER = typeof window === "undefined";

export function useMediaQuery(
  query: string,
  {
    defaultValue = false,
    // Default to false so server and first client render agree; the real value
    // lands in the layout effect before paint. Reading matchMedia during the
    // first render instead would cause a hydration mismatch.
    initializeWithValue = false,
  }: UseMediaQueryOptions = {},
): boolean {
  const getMatches = (query: string): boolean => {
    if (IS_SERVER) {
      return defaultValue;
    }
    return window.matchMedia(query).matches;
  };

  const [matches, setMatches] = useState<boolean>(() => {
    if (initializeWithValue) {
      return getMatches(query);
    }
    return defaultValue;
  });

  useIsomorphicLayoutEffect(() => {
    const matchMedia = window.matchMedia(query);
    const handleChange = () => setMatches(matchMedia.matches);

    handleChange();
    matchMedia.addEventListener("change", handleChange);

    return () => {
      matchMedia.removeEventListener("change", handleChange);
    };
  }, [query]);

  return matches;
}

/**
 * The hero frames — hand-picked, all landscape so the row stays uniform.
 * WebP rather than PNG: these are photographs, and lossless PNG cost 26MB on
 * every first visit for no visible gain at the size they are drawn.
 * Mirrors public/hero/_manifest.json, which records the source filename and
 * folder for each so a frame can be traced back or swapped by name.
 */
const heroPhotos: { src: string; alt: string }[] = [
  { src: "/hero/000002630009.webp", alt: "Croatia 2026" },
  { src: "/hero/img-3524.webp", alt: "Flowers" },
  { src: "/hero/000068150024.webp", alt: "Finn" },
  { src: "/hero/000068130031.webp", alt: "Linda" },
  { src: "/hero/000002630035.webp", alt: "Croatia 2026" },
  { src: "/hero/000081400032.webp", alt: "Sky" },
  { src: "/hero/000002630025.webp", alt: "Croatia 2026" },
  { src: "/hero/000019270003.webp", alt: "Morrocco 2026" },
  { src: "/hero/img-4058.webp", alt: "Levanto / Pisa 2024" },
  { src: "/hero/img-3516.webp", alt: "Sky" },
  { src: "/hero/img-4249.webp", alt: "Cal" },
  { src: "/hero/000018410006.webp", alt: "Elcee" },
  { src: "/hero/img-23532.webp", alt: "Film Photography" },
  { src: "/hero/img-3499-4.webp", alt: "Sunsets" },
  { src: "/hero/img-5496.webp", alt: "Film Photography" },
];

const easeOut: [number, number, number, number] = [0.32, 0.72, 0, 1];
const easeSoft: [number, number, number, number] = [0.25, 0.1, 0.25, 1];

const transition = { duration: 0.15, ease: easeOut };
const transitionOverlay = { duration: 0.5, ease: easeOut };

/** Degrees per pixel dragged. */
const DRAG_ROTATION_FACTOR = 0.25;
/** Pointer travel beyond this is treated as a drag, not a click. */
const DRAG_CLICK_THRESHOLD_PX = 8;
/**
 * Frames are laid out this much larger than their place on the cylinder, then
 * scaled back down by the same factor. The arrangement is identical, but the
 * browser rasterises the image at the bigger layout size — matching what the
 * perspective magnifies it to, instead of upscaling a small raster and
 * softening the photo. Set to the front-card magnification,
 * perspective / (perspective - radius).
 */
const OVERSAMPLE = 1.85;
/** Per-frame velocity decay after releasing a drag. */
const MOMENTUM_DECAY = 0.94;

/**
 * The cylinder is rotated by writing `transform` straight onto the node rather
 * than through framer-motion. framer composes `transform` from its own props
 * (rotateY, x, scale…), so a `transform` string MotionValue never reaches the
 * DOM, and its drag handling writes a competing transform of its own.
 */
function CarouselArrow({
  side,
  onPress,
}: {
  side: "left" | "right";
  onPress: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={side === "left" ? "Previous photograph" : "Next photograph"}
      // The cylinder listens for pointerdown to start a drag; without this a
      // tap on the arrow would also begin one.
      onPointerDown={(e) => e.stopPropagation()}
      onClick={onPress}
      style={{ transform: "translate3d(0, -50%, 0)", willChange: "transform" }}
      className={`absolute top-1/2 z-30 flex h-11 w-11 items-center justify-center rounded-full border border-[var(--hairline)] bg-background/85 text-foreground shadow-md backdrop-blur-sm transition-opacity active:opacity-60 md:hidden ${
        side === "left" ? "left-3" : "right-3"
      }`}
    >
      <span aria-hidden="true" className="text-lg leading-none">
        {side === "left" ? "\u2039" : "\u203a"}
      </span>
    </button>
  );
}

const Carousel = memo(function Carousel({
  handleClick,
  cards,
  isCarouselActive,
  stepRef,
}: {
  handleClick: (imgUrl: string, index: number) => void;
  cards: string[];
  isCarouselActive: boolean;
  /**
   * Published upward so the arrows can live outside this component. They have
   * to: everything in here shares a `preserve-3d` context, where z-index is
   * ignored and painting order follows 3D position — the frames are pushed
   * towards the camera by translateZ, so any button in here sits behind them.
   */
  stepRef?: React.MutableRefObject<((direction: 1 | -1) => void) | null>;
}) {
  const isScreenSizeSm = useMediaQuery("(max-width: 640px)");
  // A wider cylinder gives both wider faces and a bigger radius, which brings
  // the front frames closer to the camera — so the photos read much larger.
  //
  // On a phone the front frame lands at roughly (width / faces) × perspective
  // / (perspective − radius): 3500 puts it near 350px of a 375px screen, where
  // 2560 left it at 225px adrift in white space. It stays under OVERSAMPLE, so
  // the frames are still drawn larger than they are shown and nothing softens.
  const cylinderWidth = isScreenSizeSm ? 3500 : 4800;
  const faceCount = cards.length;
  const faceWidth = cylinderWidth / faceCount;
  const radius = cylinderWidth / (2 * Math.PI);

  const cylinderRef = useRef<HTMLDivElement>(null);
  const angle = useRef(0);
  const velocity = useRef(0);
  const frame = useRef<number | null>(null);
  const dragging = useRef(false);
  const lastPointerX = useRef(0);
  const dragDistance = useRef(0);

  const activeRef = useRef(isCarouselActive);
  useEffect(() => {
    activeRef.current = isCarouselActive;
  }, [isCarouselActive]);

  const apply = useCallback(() => {
    const node = cylinderRef.current;
    if (node) {
      node.style.transform = `rotate3d(0, 1, 0, ${angle.current}deg)`;
    }
  }, []);

  const turn = useCallback(
    (degrees: number) => {
      angle.current += degrees;
      apply();
    },
    [apply],
  );

  const stopMomentum = useCallback(() => {
    if (frame.current !== null) {
      cancelAnimationFrame(frame.current);
      frame.current = null;
    }
    velocity.current = 0;
  }, []);

  /**
   * Turn by exactly one photograph.
   *
   * Drag is lovely with a thumb but imprecise, so a phone gets arrows too.
   * The cards sit at i x (360 / faceCount), so advancing one means turning
   * the cylinder back by that same step.
   */
  const stepBy = useCallback(
    (direction: 1 | -1) => {
      stopMomentum();
      const perFace = 360 / faceCount;
      const from = angle.current;
      const to = from - direction * perFace;

      const reduced =
        typeof window !== "undefined" &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (reduced) {
        angle.current = to;
        apply();
        return;
      }

      const startedAt = performance.now();
      const span = 420;
      const ease = (t: number) => 1 - Math.pow(1 - t, 3);

      const tick = () => {
        const t = Math.min((performance.now() - startedAt) / span, 1);
        angle.current = from + (to - from) * ease(t);
        apply();
        frame.current = t < 1 ? requestAnimationFrame(tick) : null;
      };
      frame.current = requestAnimationFrame(tick);
    },
    [apply, faceCount, stopMomentum],
  );

  useEffect(() => {
    if (!stepRef) return;
    stepRef.current = stepBy;
    return () => {
      stepRef.current = null;
    };
  }, [stepRef, stepBy]);

  // Glide to a stop after a flick.
  const startMomentum = useCallback(() => {
    stopMomentum();
    const tick = () => {
      if (!activeRef.current || Math.abs(velocity.current) < 0.02) {
        frame.current = null;
        return;
      }
      turn(velocity.current);
      velocity.current *= MOMENTUM_DECAY;
      frame.current = requestAnimationFrame(tick);
    };
    frame.current = requestAnimationFrame(tick);
  }, [stopMomentum, turn]);

  // The cylinder turns on drag only — scrolling the page leaves it alone.
  useEffect(() => {
    apply();
  }, [apply]);

  useEffect(() => {
    if (!isCarouselActive) stopMomentum();
  }, [isCarouselActive, stopMomentum]);

  useEffect(() => () => stopMomentum(), [stopMomentum]);

  // Drag is tracked on window rather than via setPointerCapture: capturing
  // retargets the subsequent click to the cylinder, so the frame's own onClick
  // would never fire and the lightbox could not be opened by clicking.
  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!activeRef.current) return;
    stopMomentum();
    dragging.current = true;
    dragDistance.current = 0;
    lastPointerX.current = e.clientX;

    const onMove = (ev: PointerEvent) => {
      if (!dragging.current) return;
      const dx = ev.clientX - lastPointerX.current;
      lastPointerX.current = ev.clientX;
      dragDistance.current += Math.abs(dx);
      velocity.current = dx * DRAG_ROTATION_FACTOR;
      turn(dx * DRAG_ROTATION_FACTOR);
    };

    const onUp = () => {
      dragging.current = false;
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
      startMomentum();
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
  };

  return (
    <div
      className="relative flex h-full touch-pan-y items-center justify-center"
      style={{
        perspective: "1700px",
        transformStyle: "preserve-3d",
      }}
    >

      <div
        ref={cylinderRef}
        className="relative flex h-full origin-center cursor-grab justify-center select-none active:cursor-grabbing"
        style={{
          width: cylinderWidth,
          transformStyle: "preserve-3d",
          willChange: "transform",
        }}
        onPointerDown={onPointerDown}
      >
        {cards.map((imgUrl, i) => (
          <div
            key={`key-${imgUrl}-${i}`}
            className="absolute flex h-full origin-center items-center justify-center rounded-xl p-2"
            style={{
              width: `${faceWidth * OVERSAMPLE}px`,
              // scale() last, about the card's own centre, so it lands in the
              // same place on the cylinder at the same apparent size.
              transform: `rotateY(${
                i * (360 / faceCount)
              }deg) translateZ(${radius}px) scale(${1 / OVERSAMPLE})`,
            }}
            // A flick shouldn't also count as a click on whatever ends up
            // under the cursor — but a real click jitters a few pixels, so
            // only suppress once the pointer has genuinely travelled.
            onClick={() => {
              if (dragDistance.current > DRAG_CLICK_THRESHOLD_PX) return;
              handleClick(imgUrl, i);
            }}
          >
            <motion.img
              src={imgUrl}
              alt={heroPhotos[i]?.alt ?? `Photograph ${i + 1}`}
              layoutId={`img-${imgUrl}`}
              // No aspect-square / object-cover: the frames keep their own
              // rectangular shape rather than being cropped to a square, which
              // threw away a third of every 3:2 photo.
              className="pointer-events-none block h-auto w-full rounded-xl shadow-sm"
              // Fades in rather than un-blurring. The blur version left
              // `filter: blur(0px)` on the element permanently, and any filter
              // forces its own rasterised layer — which the 3D perspective
              // then magnifies, softening the photo.
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={transition}
              draggable={false}
            />
          </div>
        ))}
      </div>
    </div>
  );
});

function ThreeDPhotoCarousel() {
  const [activeImg, setActiveImg] = useState<string | null>(null);
  const [isCarouselActive, setIsCarouselActive] = useState(true);
  const stepRef = useRef<((direction: 1 | -1) => void) | null>(null);
  const cards = useMemo(() => heroPhotos.map((p) => p.src), []);

  const handleClick = (imgUrl: string) => {
    setActiveImg(imgUrl);
    setIsCarouselActive(false);
  };

  const handleClose = () => {
    setActiveImg(null);
    setIsCarouselActive(true);
  };

  // Let Escape dismiss the lightbox, not just a click.
  useEffect(() => {
    if (!activeImg) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [activeImg]);

  return (
    <div className="relative">
      {/* Deliberately not wrapped in AnimatePresence: the lightbox image shares
          a `layoutId` with its thumbnail, which stops the exit completing and
          strands an aria-modal node in the tree. The open transition still
          animates; the close is immediate. */}
      {activeImg && (
        <motion.div
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          onClick={handleClose}
          role="dialog"
          aria-modal="true"
          aria-label="Expanded photograph"
          // Full-bleed scrim: no margin and no rounding, so there is no panel
          // edge framing the photo. Inset margins previously drew a visible
          // white box, which the page scrolling behind made obvious. Sizing
          // moved onto the image itself, since this no longer bounds it.
          className="fixed inset-0 z-50 flex items-center justify-center bg-white/90 backdrop-blur-sm"
          style={{ willChange: "opacity" }}
          transition={transitionOverlay}
        >
          <motion.img
            layoutId={`img-${activeImg}`}
            src={activeImg}
            alt="Expanded photograph"
            // Viewport units rather than max-*-full: these reproduce the
            // enlarged size the overlay margins used to set, now that the
            // scrim covers the whole screen.
            className="max-h-[88vh] max-w-[92vw] rounded-lg shadow-xl"
            initial={{ scale: 0.5 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.5, duration: 0.5, ease: easeSoft }}
            style={{ willChange: "transform" }}
          />
        </motion.div>
      )}
      <div className="relative h-[460px] w-full overflow-hidden sm:h-[620px]">
        {/* `isolate` confines the 3D scene to its own stacking context. Without
            it WebKit promotes the translateZ'd frames to composited layers that
            paint above later siblings whatever their z-index, which left the
            arrows stuck behind the photographs on iOS while Chromium ordered
            them correctly. */}
        <div className="absolute inset-0 isolate">
          <Carousel
            handleClick={handleClick}
            cards={cards}
            isCarouselActive={isCarouselActive}
            stepRef={stepRef}
          />
        </div>

        {/* Phones only: a thumb can drag the cylinder, but tapping through it
            one photograph at a time is far easier one-handed. */}
        <CarouselArrow side="left" onPress={() => stepRef.current?.(-1)} />
        <CarouselArrow side="right" onPress={() => stepRef.current?.(1)} />
      </div>
    </div>
  );
}

export { ThreeDPhotoCarousel };
