import "server-only";

import {
  collections as bundled,
  type Collection,
  type CollectionMusic,
} from "@/data/gallery";
import type { MorphItem } from "@/components/ui/morph-gallery";
import {
  isSupabaseConfigured,
  publicStoragePrefix,
  supabaseAdmin,
} from "./supabase";

const TABLE = "gallery_collections";

export interface CollectionRow {
  id: string;
  slug: string;
  position: number;
  published: boolean;
  data: Collection;
  created_at: string;
  updated_at: string;
}

/**
 * Published collections, in running order.
 *
 * Falls back to the collections bundled in src/data/gallery.ts when Supabase
 * is unreachable or the table has not been created yet — a database that is
 * down takes the admin page with it, but should never take the public gallery
 * with it. An empty table is respected as empty: once the table answers, it is
 * the truth, or deleting the last collection would resurrect the drafts.
 */
export async function getPublishedCollections(): Promise<Collection[]> {
  if (!isSupabaseConfigured) return bundled;

  const { data, error } = await supabaseAdmin()
    .from(TABLE)
    .select("data")
    .eq("published", true)
    .order("position", { ascending: true })
    .order("created_at", { ascending: false });

  if (error) {
    console.warn(`[gallery] falling back to bundled data: ${error.message}`);
    return bundled;
  }

  return (data ?? []).map((row) => (row as { data: Collection }).data);
}

/** Everything, drafts included. Admin only. */
export async function getAllCollections(): Promise<CollectionRow[]> {
  const { data, error } = await supabaseAdmin()
    .from(TABLE)
    .select("*")
    .order("position", { ascending: true })
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as CollectionRow[];
}

// ---------------------------------------------------------------------------
// Validation
//
// The admin is the only writer, but this body is rendered on a public page and
// stored as free-form JSONB, so it is checked rather than trusted. Media URLs
// in particular are pinned to this site or this project's storage bucket, so a
// bad paste cannot point the gallery at someone else's server.
// ---------------------------------------------------------------------------

export class ValidationError extends Error {}

const str = (v: unknown, field: string, { required = false } = {}): string => {
  // A missing field reads as missing, not as the wrong type.
  if (v == null) {
    if (required) throw new ValidationError(`${field} is required`);
    return "";
  }
  if (typeof v !== "string") {
    throw new ValidationError(`${field} must be text`);
  }
  const trimmed = v.trim();
  if (required && !trimmed) throw new ValidationError(`${field} is required`);
  return trimmed;
};

function mediaUrl(v: unknown, field: string, { required = false } = {}): string {
  const value = str(v, field, { required });
  if (!value) return "";
  const ok =
    value.startsWith("/") ||
    (publicStoragePrefix !== "" && value.startsWith(publicStoragePrefix));
  if (!ok) {
    throw new ValidationError(
      `${field} must be an uploaded file or a path on this site`,
    );
  }
  return value;
}

function parseItems(v: unknown, field: string): MorphItem[] {
  if (v == null) return [];
  if (!Array.isArray(v)) throw new ValidationError(`${field} must be a list`);
  return v.map((raw, i) => {
    const item = raw as Record<string, unknown>;
    const entry: MorphItem = {
      src: mediaUrl(item.src, `${field}[${i}].src`, { required: true }),
    };
    const thumb = mediaUrl(item.thumb, `${field}[${i}].thumb`);
    if (thumb) entry.thumb = thumb;
    const alt = str(item.alt, `${field}[${i}].alt`);
    if (alt) entry.alt = alt;
    return entry;
  });
}

function parseMusic(v: unknown): CollectionMusic | undefined {
  if (v == null) return undefined;
  const m = v as Record<string, unknown>;
  if (m.source === "spotify") {
    const embed = str(m.embed, "Spotify embed URL", { required: true });
    if (!embed.startsWith("https://open.spotify.com/embed/")) {
      throw new ValidationError(
        "Spotify embed URL must start with https://open.spotify.com/embed/",
      );
    }
    return {
      source: "spotify",
      embed,
      title: str(m.title, "Track title", { required: true }),
      artist: str(m.artist, "Artist", { required: true }),
    };
  }
  if (m.source === "file") {
    const music: CollectionMusic = {
      source: "file",
      src: mediaUrl(m.src, "Audio file", { required: true }),
      title: str(m.title, "Track title", { required: true }),
      artist: str(m.artist, "Artist", { required: true }),
    };
    const note = str(m.note, "Note");
    if (note) music.note = note;
    return music;
  }
  return undefined;
}

export function parseCollection(input: unknown): Collection {
  const body = (input ?? {}) as Record<string, unknown>;

  const slug = str(body.slug, "Slug", { required: true });
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    throw new ValidationError(
      "Slug must be lower-case letters, numbers and single hyphens",
    );
  }

  const ig = (body.instagram ?? {}) as Record<string, unknown>;
  const permalink = str(ig.permalink, "Instagram link");
  if (permalink && !/^https:\/\/(www\.)?instagram\.com\//.test(permalink)) {
    throw new ValidationError("Instagram link must be an instagram.com URL");
  }

  const collection: Collection = {
    slug,
    title: str(body.title, "Title", { required: true }),
    blurb: str(body.blurb, "Blurb"),
    date: str(body.date, "Date", { required: true }),
    instagram: {
      permalink,
      cover: mediaUrl(ig.cover, "Instagram cover"),
      caption: str(ig.caption, "Caption"),
      postedAt: str(ig.postedAt, "Posted date") || null,
      // A post is only live once there is somewhere to send people.
      live: permalink !== "",
    },
    extras: {
      landscape: parseItems(
        (body.extras as Record<string, unknown>)?.landscape,
        "Landscape photos",
      ),
      portrait: parseItems(
        (body.extras as Record<string, unknown>)?.portrait,
        "Portrait photos",
      ),
    },
  };

  const location = str(body.location, "Location");
  if (location) collection.location = location;

  const music = parseMusic(body.music);
  if (music) collection.music = music;

  return collection;
}
