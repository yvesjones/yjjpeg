"use client";

import * as React from "react";

import type { PlayerTrack } from "@/lib/itunes";

export interface MenuEntry {
  label: string;
  /** Right-hand marker: a chevron, a note, or free text like "Soon". */
  marker?: "chevron" | "note" | string;
  /** Where selecting it goes. */
  action: "submenu" | "player" | "track" | "link" | "none";
  /** For action "track": which track to start playing. */
  trackIndex?: number;
  href?: string;
  external?: boolean;
  children?: MenuEntry[];
}

export function TitleBar({ title }: { title: string }) {
  return (
    <div className="flex items-center justify-between gap-2 bg-[var(--lcd-bar)] px-2 py-1 text-[var(--lcd-bar-ink)]">
      <span aria-hidden="true" className="text-[9px] leading-none">
        &#9654;
      </span>
      <span className="ipod-type truncate text-[clamp(7px,3.3cqw,13px)] tracking-wider uppercase">
        {title}
      </span>
      <Battery />
    </div>
  );
}

/** Drawn rather than an image, so it stays crisp at any device size. */
function Battery() {
  return (
    <span
      aria-hidden="true"
      className="flex h-[10px] w-[18px] shrink-0 items-center rounded-[2px] border border-current p-[1.5px]"
    >
      <span className="h-full w-full bg-current" />
    </span>
  );
}

export function MenuScreen({
  title,
  entries,
  selected,
  onPick,
}: {
  title: string;
  entries: MenuEntry[];
  selected: number;
  onPick: (index: number) => void;
}) {
  const listRef = React.useRef<HTMLUListElement>(null);

  // Keep the highlighted row in view when the wheel runs past the bottom.
  React.useEffect(() => {
    const row = listRef.current?.children[selected] as HTMLElement | undefined;
    row?.scrollIntoView({ block: "nearest" });
  }, [selected]);

  return (
    <div className="flex h-full flex-col">
      <TitleBar title={title} />
      <ul ref={listRef} className="min-h-0 flex-1 overflow-y-auto">
        {entries.map((entry, i) => {
          const active = i === selected;
          return (
            <li key={entry.label}>
              <button
                type="button"
                onClick={() => onPick(i)}
                aria-current={active}
                className={`flex w-full items-center justify-between gap-3 px-2 py-[0.45em] text-left ${
                  active
                    ? "bg-[var(--lcd-bar)] text-[var(--lcd-bar-ink)]"
                    : "text-[var(--lcd-ink)]"
                }`}
              >
                <span className="ipod-type truncate text-[clamp(7px,3.9cqw,15px)]">
                  {entry.label}
                </span>
                <Marker marker={entry.marker} />
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function Marker({ marker }: { marker?: string }) {
  if (!marker) return null;
  if (marker === "chevron") {
    return (
      <span aria-hidden="true" className="ipod-type shrink-0 text-[clamp(7px,3.9cqw,16px)]">
        &gt;
      </span>
    );
  }
  if (marker === "note") {
    return (
      <span aria-hidden="true" className="shrink-0 text-[clamp(7px,3.9cqw,16px)]">
        &#9835;
      </span>
    );
  }
  return (
    <span className="ipod-type shrink-0 text-[clamp(6px,3cqw,12px)] opacity-70">
      {marker}
    </span>
  );
}

export function NowPlaying({
  track,
  position,
  duration,
  playing,
  index,
  total,
  title,
  note,
}: {
  track: PlayerTrack | null;
  position: number;
  duration: number;
  playing: boolean;
  index: number;
  total: number;
  /** Overrides the title bar — "Soundtrack" on a gallery collection. */
  title?: string;
  /** Replaces the "30 second preview" footnote. */
  note?: string;
}) {
  if (!track) {
    return (
      <div className="flex h-full flex-col">
        <TitleBar title={title ?? "Now Playing"} />
        <div className="flex flex-1 items-center justify-center p-4">
          <p className="ipod-type text-center text-[clamp(7px,3.5cqw,14px)] text-[var(--lcd-ink)]">
            Nothing to play
          </p>
        </div>
      </div>
    );
  }

  const progress = duration > 0 ? Math.min(position / duration, 1) : 0;

  return (
    <div className="flex h-full flex-col">
      <TitleBar title={title ?? (playing ? "Now Playing" : "Paused")} />
      <div className="flex min-h-0 flex-1 gap-3 p-3 text-[var(--lcd-ink)]">
        {track.artwork && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={track.artwork}
            alt=""
            className="aspect-square h-auto w-[38%] shrink-0 self-start border border-[var(--lcd-ink)]/30 object-cover"
          />
        )}
        <div className="ipod-type flex min-w-0 flex-1 flex-col justify-center gap-[0.35em] text-[clamp(7px,3.5cqw,14px)]">
          <p className="truncate">{track.title}</p>
          <p className="truncate opacity-70">{track.artist}</p>
          <p className="truncate opacity-70">{track.album}</p>
        </div>
      </div>
      <div className="ipod-type px-3 pb-3 text-[clamp(5px,2.8cqw,11px)] text-[var(--lcd-ink)]">
        <div className="mb-1 flex justify-between">
          <span>{clock(position)}</span>
          {total > 1 && (
            <span>
              {index + 1} of {total}
            </span>
          )}
          <span>-{clock(Math.max(duration - position, 0))}</span>
        </div>
        <div className="h-[6px] w-full border border-[var(--lcd-ink)]/50 p-[1px]">
          <div
            className="h-full bg-[var(--lcd-ink)]"
            style={{ width: `${progress * 100}%` }}
          />
        </div>
        {note !== "" && (
          <p className="mt-2 text-center opacity-60">
            {note ?? "30 second preview"}
          </p>
        )}
      </div>
    </div>
  );
}

function clock(seconds: number): string {
  if (!Number.isFinite(seconds)) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}
