import "server-only";

/** Apple artist IDs, verified against this site's own release list. */
const ARTIST_IDS = [
  "1456363376", // Yves Jones
  "1434477995", // Fieves — recent singles
  "1694366314", // Fieves — the 2024 catalogue, on a second Apple profile
];

export interface PlayerTrack {
  id: string;
  title: string;
  artist: string;
  album: string;
  /** Audio to play. Empty when the track only exists somewhere else. */
  preview: string;
  /** Where to send the listener when there is no `preview` to play. */
  externalUrl?: string;
  artwork: string;
  year: string;
}

/**
 * Tracks to put at the top of the iPod, in this order.
 *
 * Matched on the start of the title, because Apple appends credits to them —
 * "Over Now" has to match "Over Now (feat. luke royalty)". Anything listed
 * here that Apple does not return is simply skipped.
 */
const PINNED = ["over now", "fade", "man up"];

/** Apple's artwork URLs carry their size in the filename. */
function artworkAt(url: string, px: number): string {
  return url.replace(/\/\d+x\d+bb\./, `/${px}x${px}bb.`);
}

/**
 * Tracks for the iPod's Now Playing screen.
 *
 * Fetched on the server and passed down, because the iTunes endpoint does not
 * send CORS headers — the browser could not call it directly. Playing the mp3
 * afterwards needs no CORS, so only this lookup has to happen here.
 *
 * A failure returns an empty list rather than throwing: the menu still works,
 * the player just says there is nothing to play.
 */
export async function getPlayerTracks(): Promise<PlayerTrack[]> {
  const seen = new Map<string, PlayerTrack>();

  for (const id of ARTIST_IDS) {
    try {
      const res = await fetch(
        `https://itunes.apple.com/lookup?id=${id}&entity=song&limit=30`,
        { next: { revalidate: 86_400 } },
      );
      if (!res.ok) continue;

      const body = (await res.json()) as {
        results: Array<Record<string, string>>;
      };

      for (const row of body.results) {
        if (row.wrapperType !== "track" || !row.previewUrl) continue;
        const key = (row.trackName ?? "").toLowerCase();
        if (!key || seen.has(key)) continue;

        seen.set(key, {
          id: String(row.trackId),
          title: row.trackName,
          artist: row.artistName,
          album: row.collectionName ?? "",
          preview: row.previewUrl,
          artwork: artworkAt(row.artworkUrl100 ?? "", 400),
          year: (row.releaseDate ?? "").slice(0, 4),
        });
      }
    } catch {
      // Keep whatever the other artists returned.
    }
  }

  const rank = (track: PlayerTrack) => {
    const title = track.title.toLowerCase();
    const pin = PINNED.findIndex((name) => title.startsWith(name));
    return pin === -1 ? PINNED.length : pin;
  };

  return [...seen.values()]
    .sort((a, b) => {
      const byPin = rank(a) - rank(b);
      if (byPin !== 0) return byPin;
      return b.year.localeCompare(a.year);
    })
    .slice(0, 12);
}
