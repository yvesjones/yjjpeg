import type { MorphItem } from "@/components/ui/morph-gallery";

/**
 * A gallery collection: one Instagram post, plus the photos that never made
 * the post. One collection per page — the post on the left, the extras on the
 * right — so there is a reason to come here rather than just scroll Instagram.
 */
export interface Collection {
  /** URL segment. */
  slug: string;
  title: string;
  /** Short line under the title. */
  blurb: string;
  /** Where and when, shown in the mono readout. */
  location?: string;
  date: string;
  instagram: InstagramPost;
  /**
   * The music this set is paired with. Shown as a player beside the title, so
   * a collection reads as a scene rather than a contact sheet. Omit and the
   * page simply renders without one.
   */
  music?: CollectionMusic;
  /**
   * The photos not on Instagram — the draw. Split by orientation so each gets
   * a slide shaped to suit it, rather than one box that letterboxes whichever
   * orientation it wasn't built for.
   */
  extras: {
    landscape: MorphItem[];
    portrait: MorphItem[];
  };
}

/**
 * The music paired with a collection — either a released track on Spotify, or
 * a file hosted here.
 *
 * Use `source: "file"` for unreleased material: it plays from this site, so
 * there is something on the page that exists nowhere else. Drop the audio in
 * `public/audio/` and point `src` at it (see public/audio/README.md).
 *
 * Use `source: "spotify"` for anything already out. `embed` is the embed URL,
 * not the share link: take https://open.spotify.com/album/<ID> and insert
 * `/embed` after the domain. Albums and single tracks both work; leave the
 * query string off, the player adds it.
 */
export type CollectionMusic =
  | {
      source: "file";
      /** Path under `public`, e.g. "/audio/berlin-demo.mp3". */
      src: string;
      title: string;
      artist: string;
      /** Small line above the title — "Unreleased", "Demo", "Rough mix". */
      note?: string;
    }
  | {
      source: "spotify";
      embed: string;
      title: string;
      artist: string;
    };

export interface InstagramPost {
  /** Permalink. Empty string marks a drafted placeholder, not a live post. */
  permalink: string;
  /** Square-ish cover image for the embed card. */
  cover: string;
  caption: string;
  /** ISO date, or null while drafted. */
  postedAt: string | null;
  /** False for the drafted example, true once pulled from the Graph API. */
  live: boolean;
}

type Orientation = "landscape" | "portrait";

const frames = (
  slug: string,
  orientation: Orientation,
  count: number,
  label: string,
): MorphItem[] =>
  Array.from({ length: count }, (_, i) => ({
    src: `/gallery/${slug}/${orientation}/${i + 1}.jpg`,
    thumb: `/gallery/${slug}/${orientation}/thumb/${i + 1}.jpg`,
    alt: `${label}, ${orientation} frame ${i + 1}`,
  }));

/**
 * Drafted collections.
 *
 * `live: false` on the Instagram post means this is a mock-up — nothing has
 * actually been posted yet. The page labels it as a draft rather than passing
 * it off as a real post. Once the Graph API is connected these are replaced by
 * real posts, and anything still drafted can simply be deleted.
 */
export const collections: Collection[] = [
  {
    slug: "berlin-2026",
    title: "Berlin",
    blurb:
      "Three days on 35mm. The post got four frames — these are the rest of the roll.",
    location: "Berlin, DE",
    date: "2026",
    music: {
      source: "spotify",
      embed: "https://open.spotify.com/embed/album/3VX46XMco0fSHMzGgrEoTl",
      title: "Between Hello & Goodbye",
      artist: "Fieves",
    },
    instagram: {
      permalink: "",
      cover: "/gallery/berlin-2026/portrait/1.jpg",
      caption:
        "berlin on film. four frames here, the rest of the roll is on the site — link in bio",
      postedAt: null,
      live: false,
    },
    extras: {
      landscape: frames("berlin-2026", "landscape", 5, "Berlin"),
      portrait: frames("berlin-2026", "portrait", 5, "Berlin"),
    },
  },
  {
    slug: "sunsets",
    title: "Sunsets",
    blurb:
      "An ongoing roll. Whatever the sky was doing, wherever I happened to be.",
    date: "2021–2026",
    music: {
      source: "spotify",
      embed: "https://open.spotify.com/embed/track/2fLVQsDmPoU1kaT9s9Z9H0",
      title: "Streetlights",
      artist: "Yves Jones",
    },
    instagram: {
      permalink: "",
      cover: "/gallery/sunsets/landscape/1.jpg",
      caption:
        "a few years of skies. full set on the site — link in bio",
      postedAt: null,
      live: false,
    },
    extras: {
      landscape: frames("sunsets", "landscape", 5, "Sunset"),
      portrait: frames("sunsets", "portrait", 2, "Sunset"),
    },
  },
];

export function getCollection(slug: string): Collection | undefined {
  return collections.find((c) => c.slug === slug);
}

export function getCollectionByPage(page: number): Collection | undefined {
  return collections[page - 1];
}

export const totalPages = collections.length;
