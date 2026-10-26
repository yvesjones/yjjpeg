"use client";

import * as React from "react";

import ClickWheel from "./ClickWheel";
import { MenuScreen, NowPlaying, type MenuEntry } from "./Screen";
import type { PlayerTrack } from "@/lib/itunes";

type View =
  | { kind: "menu"; title: string; entries: MenuEntry[] }
  | { kind: "player" };

export default function Ipod({
  name,
  menu,
  tracks,
  /** Opens on Now Playing, with MENU revealing the list behind it. */
  startInPlayer = false,
  /** Overrides the Now Playing title bar. */
  screenTitle,
  /** Replaces the footnote under the scrubber. Pass "" to drop it. */
  note,
  /**
   * Tailwind width for the body — a definite width, not a max-width. Size
   * containment means the contents no longer give the box its own width, so
   * it has to come from outside or the device collapses to nothing.
   */
  widthClass = "w-[min(92vw,380px)]",
  floating = false,
}: {
  name: string;
  menu: MenuEntry[];
  tracks: PlayerTrack[];
  startInPlayer?: boolean;
  screenTitle?: string;
  note?: string;
  widthClass?: string;
  floating?: boolean;
}) {
  const [stack, setStack] = React.useState<View[]>(() => {
    const root: View = { kind: "menu", title: name, entries: menu };
    return startInPlayer ? [root, { kind: "player" }] : [root];
  });
  // One cursor per level, so going back lands where you left.
  const [cursors, setCursors] = React.useState<number[]>(
    startInPlayer ? [0, 0] : [0],
  );

  const [trackIndex, setTrackIndex] = React.useState(0);
  const [playing, setPlaying] = React.useState(false);
  const [position, setPosition] = React.useState(0);
  const [duration, setDuration] = React.useState(0);

  const audioRef = React.useRef<HTMLAudioElement>(null);
  const view = stack[stack.length - 1];
  const cursor = cursors[cursors.length - 1];
  const track = tracks[trackIndex] ?? null;

  const step = (direction: 1 | -1) => {
    if (view.kind !== "menu") return;
    setCursors((prev) => {
      const next = [...prev];
      const count = view.entries.length;
      next[next.length - 1] = Math.min(
        count - 1,
        Math.max(0, next[next.length - 1] + direction),
      );
      return next;
    });
  };

  const open = (entry: MenuEntry) => {
    if (entry.action === "submenu" && entry.children?.length) {
      setStack((s) => [
        ...s,
        { kind: "menu", title: entry.label, entries: entry.children! },
      ]);
      setCursors((c) => [...c, 0]);
      return;
    }
    if (entry.action === "track" && entry.trackIndex !== undefined) {
      setTrackIndex(entry.trackIndex);
      setPosition(0);
      setStack((s) => [...s, { kind: "player" }]);
      setCursors((c) => [...c, 0]);
      void play();
      return;
    }
    if (entry.action === "player") {
      setStack((s) => [...s, { kind: "player" }]);
      setCursors((c) => [...c, 0]);
      void play();
      return;
    }
    if (entry.action === "link" && entry.href) {
      if (entry.external) {
        window.open(entry.href, "_blank", "noopener,noreferrer");
      } else {
        window.location.href = entry.href;
      }
    }
  };

  const select = () => {
    if (view.kind === "menu") open(view.entries[cursor]);
    else togglePlay();
  };

  const back = () => {
    if (stack.length === 1) return;
    setStack((s) => s.slice(0, -1));
    setCursors((c) => c.slice(0, -1));
  };

  const play = async () => {
    // A track with nowhere to play from lives on another service — send the
    // listener there rather than failing silently.
    if (track && !track.preview && track.externalUrl) {
      window.open(track.externalUrl, "_blank", "noopener,noreferrer");
      return;
    }
    try {
      await audioRef.current?.play();
    } catch {
      // Autoplay refused until a gesture; the play button still works.
    }
  };

  const togglePlay = () => {
    const el = audioRef.current;
    if (!el) return;
    if (el.paused) void play();
    else el.pause();
  };

  const skip = (by: 1 | -1) => {
    if (tracks.length === 0) return;
    setTrackIndex((i) => (i + by + tracks.length) % tracks.length);
    setPosition(0);
  };

  // `loadedmetadata` can fire before React attaches its handler — a cached
  // clip resolves that fast — leaving the duration at zero and the remaining
  // time stuck at -0:00 while the track plays. Read it directly instead,
  // whenever the source changes.
  React.useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    setDuration(el.readyState >= HTMLMediaElement.HAVE_METADATA ? el.duration : 0);
  }, [trackIndex]);

  // A new track should carry on playing, as a real one would.
  React.useEffect(() => {
    if (playing) void audioRef.current?.play().catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trackIndex]);

  // Arrow keys and Enter, for anyone not using the wheel.
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const keys = ["ArrowDown", "ArrowUp", "Enter", "Escape", "Backspace"];
      if (!keys.includes(e.key)) return;
      e.preventDefault();
      if (e.key === "ArrowDown") step(1);
      if (e.key === "ArrowUp") step(-1);
      if (e.key === "Enter") select();
      if (e.key === "Escape" || e.key === "Backspace") back();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  return (
    <div
      className={`ipod-frame mx-auto ${widthClass} ${floating ? "ipod-float" : ""}`}
    >
      <div className="ipod-body flex w-full flex-col gap-[6cqw] rounded-[8%/4%] p-[6cqw]">
        <audio
          ref={audioRef}
          src={track?.preview || undefined}
          preload="metadata"
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onEnded={() => skip(1)}
          onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
          onDurationChange={(e) => setDuration(e.currentTarget.duration)}
          onTimeUpdate={(e) => setPosition(e.currentTarget.currentTime)}
        />

        {/* The screen: 4:3, as the original was. */}
        <div className="ipod-bezel rounded-[3%] p-[3.5%]">
          <div className="aspect-[4/3] w-full overflow-hidden bg-[var(--lcd)]">
            {view.kind === "menu" ? (
              <MenuScreen
                title={view.title}
                entries={view.entries}
                selected={cursor}
                onPick={(i) => {
                  setCursors((c) => {
                    const next = [...c];
                    next[next.length - 1] = i;
                    return next;
                  });
                  open(view.entries[i]);
                }}
              />
            ) : (
              <NowPlaying
                track={track}
                position={position}
                duration={duration}
                playing={playing}
                index={trackIndex}
                total={tracks.length}
                title={screenTitle}
                note={note}
              />
            )}
          </div>
        </div>

        <div className="mx-auto w-[74%] py-[2%]">
          <ClickWheel
            onStep={step}
            onSelect={select}
            onMenu={back}
            onPrev={() => skip(-1)}
            onNext={() => skip(1)}
            onPlayPause={togglePlay}
          />
        </div>
      </div>
    </div>
  );
}
