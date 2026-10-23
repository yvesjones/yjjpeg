"use client";

import * as React from "react";

/**
 * A player for a file hosted on this site — unreleased tracks that exist
 * nowhere else.
 *
 * Deliberately not the browser's default `controls`: those look like a
 * different website every browser you open it in. This is the same mono /
 * hairline vocabulary as the rest of the page.
 *
 * Note on protection: a file the browser can play is a file the visitor can
 * save. There is no DRM here and nothing short of a streaming licence would
 * add any. Post what you are comfortable having copied.
 */

/** Other players on the page stop when one starts. */
const PLAY_EVENT = "yj:audio-play";

function clock(seconds: number): string {
  if (!Number.isFinite(seconds)) return "--:--";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

export default function AudioPlayer({
  src,
  title,
  artist,
  note,
}: {
  src: string;
  title: string;
  artist: string;
  /** Small line above the title — "Unreleased", "Demo", "Rough mix". */
  note?: string;
}) {
  const audioRef = React.useRef<HTMLAudioElement>(null);
  const id = React.useId();

  const [playing, setPlaying] = React.useState(false);
  const [time, setTime] = React.useState(0);
  const [duration, setDuration] = React.useState(Number.NaN);
  /** While the thumb is held, the audio leads the slider, not the reverse. */
  const [scrubbing, setScrubbing] = React.useState(false);
  const [failed, setFailed] = React.useState(false);

  // `loadedmetadata` can fire before hydration attaches the handler — the
  // element is in the server-rendered HTML and starts fetching immediately,
  // and the event does not fire a second time. Without this the duration
  // stays NaN, which leaves the readout at --:-- and the scrub bar disabled.
  React.useEffect(() => {
    const el = audioRef.current;
    if (el && el.readyState >= HTMLMediaElement.HAVE_METADATA) {
      setDuration(el.duration);
    }
  }, [src]);

  // A pointer released outside the slider still ends the scrub.
  React.useEffect(() => {
    if (!scrubbing) return;
    const end = () => setScrubbing(false);
    window.addEventListener("pointerup", end);
    window.addEventListener("pointercancel", end);
    return () => {
      window.removeEventListener("pointerup", end);
      window.removeEventListener("pointercancel", end);
    };
  }, [scrubbing]);

  React.useEffect(() => {
    const stop = (e: Event) => {
      if ((e as CustomEvent<string>).detail === id) return;
      audioRef.current?.pause();
    };
    window.addEventListener(PLAY_EVENT, stop);
    return () => window.removeEventListener(PLAY_EVENT, stop);
  }, [id]);

  const toggle = () => {
    const el = audioRef.current;
    if (!el) return;
    if (el.paused) {
      window.dispatchEvent(new CustomEvent(PLAY_EVENT, { detail: id }));
      void el.play().catch(() => setFailed(true));
    } else {
      el.pause();
    }
  };

  const seek = (value: number) => {
    const el = audioRef.current;
    if (!el || !Number.isFinite(duration)) return;
    el.currentTime = value;
    setTime(value);
  };

  const progress = Number.isFinite(duration) && duration > 0 ? time / duration : 0;

  return (
    <div className="hairline rounded-xl border bg-surface p-4">
      <audio
        ref={audioRef}
        src={src}
        preload="metadata"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => {
          setPlaying(false);
          setTime(0);
        }}
        onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
        onDurationChange={(e) => setDuration(e.currentTarget.duration)}
        onTimeUpdate={(e) => {
          if (!scrubbing) setTime(e.currentTarget.currentTime);
        }}
        onError={() => setFailed(true)}
      />

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={toggle}
          disabled={failed}
          aria-label={`${playing ? "Pause" : "Play"} ${title} by ${artist}`}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-foreground text-background transition-opacity hover:opacity-80 disabled:opacity-40"
        >
          {playing ? (
            <svg width="12" height="14" viewBox="0 0 12 14" aria-hidden="true">
              <rect width="4" height="14" fill="currentColor" />
              <rect x="8" width="4" height="14" fill="currentColor" />
            </svg>
          ) : (
            <svg width="12" height="14" viewBox="0 0 12 14" aria-hidden="true">
              <path d="M0 0l12 7-12 7z" fill="currentColor" />
            </svg>
          )}
        </button>

        <div className="min-w-0 flex-1">
          {note && <p className="mono-eyebrow mb-1">{note}</p>}
          <p className="truncate text-sm font-medium">{title}</p>
          <p className="mono-label truncate">{artist}</p>
        </div>
      </div>

      {failed ? (
        <p className="mono-label mt-3">Track unavailable</p>
      ) : (
        <div className="mt-3">
          <input
            type="range"
            min={0}
            max={Number.isFinite(duration) ? duration : 0}
            step={0.01}
            value={time}
            disabled={!Number.isFinite(duration)}
            onPointerDown={() => setScrubbing(true)}
            onChange={(e) => seek(Number(e.currentTarget.value))}
            aria-label={`Seek within ${title}`}
            className="audio-scrub w-full"
            style={{ ["--progress" as string]: `${progress * 100}%` }}
          />
          <div className="mono-label mt-2 flex justify-between">
            <span>{clock(time)}</span>
            <span>{clock(duration)}</span>
          </div>
        </div>
      )}
    </div>
  );
}
