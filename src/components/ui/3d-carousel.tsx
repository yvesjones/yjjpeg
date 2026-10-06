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

/** Verified Unsplash photo ids — every one checked for a 200 before shipping. */
const photoIds = [
  "1506744038136-46273834b3fb",
  "1470770841072-f978cf4d019e",
  "1464822759023-fed622ff2c3b",
  "1441974231531-c6227db76b6e",
  "1501785888041-af3ef285b470",
  "1433086966358-54859d0ed716",
  "1426604966848-d7adac402bff",
  "1444723121867-7a241cacace9",
  "1493246507139-91e8fad9978e",
  "1447752875215-b2761acb3c5d",
  "1472214103451-9374bd1c798e",
  "1418065460487-3e41a6c84dc5",
  "1469474968028-56623f02e42e",
  "1458668383970-8ddd3927deed",
  "1439853949127-fa647821eba0",
];

const unsplash = (id: string, w: number) =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&q=80`;

const easeOut: [number, number, number, number] = [0.32, 0.72, 0, 1];
const easeSoft: [number, number, number, number] = [0.25, 0.1, 0.25, 1];

const transition = { duration: 0.15, ease: easeOut };
const transitionOverlay = { duration: 0.5, ease: easeOut };

/** Degrees of cylinder rotation per pixel scrolled. */
const SCROLL_ROTATION_FACTOR = 0.08;
/** Degrees per pixel dragged. */
const DRAG_ROTATION_FACTOR = 0.25;
/** Pointer travel beyond this is treated as a drag, not a click. */
const DRAG_CLICK_THRESHOLD_PX = 8;
/** Per-frame velocity decay after releasing a drag. */
const MOMENTUM_DECAY = 0.94;

/**
 * The cylinder is rotated by writing `transform` straight onto the node rather
 * than through framer-motion. framer composes `transform` from its own props
 * (rotateY, x, scale…), so a `transform` string MotionValue never reaches the
 * DOM, and its drag handling writes a competing transform of its own.
 */
const Carousel = memo(function Carousel({
  handleClick,
  cards,
  isCarouselActive,
}: {
  handleClick: (imgUrl: string, index: number) => void;
  cards: string[];
  isCarouselActive: boolean;
}) {
  const isScreenSizeSm = useMediaQuery("(max-width: 640px)");
  // A wider cylinder gives both wider faces and a bigger radius, which brings
  // the front frames closer to the camera — so the photos read much larger.
  const cylinderWidth = isScreenSizeSm ? 1600 : 3000;
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

  // Scrolling the page turns the cylinder.
  useEffect(() => {
    apply();
    let last = window.scrollY;
    const onScroll = () => {
      const y = window.scrollY;
      const delta = y - last;
      last = y;
      if (!activeRef.current) return;
      stopMomentum();
      turn(delta * SCROLL_ROTATION_FACTOR);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [apply, turn, stopMomentum]);

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
      className="flex h-full touch-pan-y items-center justify-center"
      style={{
        perspective: "1000px",
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
              width: `${faceWidth}px`,
              transform: `rotateY(${
                i * (360 / faceCount)
              }deg) translateZ(${radius}px)`,
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
              alt={`Photograph ${i + 1}`}
              layoutId={`img-${imgUrl}`}
              className="pointer-events-none w-full rounded-xl object-cover aspect-square shadow-sm"
              initial={{ filter: "blur(4px)" }}
              animate={{ filter: "blur(0px)" }}
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
  const cards = useMemo(() => photoIds.map((id) => unsplash(id, 1200)), []);

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
          className="fixed inset-0 z-50 m-5 flex items-center justify-center rounded-3xl bg-white/90 backdrop-blur-sm md:m-24 lg:mx-[14rem]"
          style={{ willChange: "opacity" }}
          transition={transitionOverlay}
        >
          <motion.img
            layoutId={`img-${activeImg}`}
            src={activeImg}
            alt="Expanded photograph"
            className="max-h-full max-w-full rounded-lg shadow-xl"
            initial={{ scale: 0.5 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.5, duration: 0.5, ease: easeSoft }}
            style={{ willChange: "transform" }}
          />
        </motion.div>
      )}
      <div className="relative h-[460px] w-full overflow-hidden sm:h-[620px]">
        <Carousel
          handleClick={handleClick}
          cards={cards}
          isCarouselActive={isCarouselActive}
        />
      </div>
    </div>
  );
}

export { ThreeDPhotoCarousel };
