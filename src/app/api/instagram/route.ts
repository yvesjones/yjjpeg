import { NextResponse } from "next/server";

/**
 * Instagram media feed.
 *
 * Pulls recent posts from the Instagram Graph API and keeps only photos —
 * single images and the first frame of carousels. VIDEO and REELS are dropped,
 * since the gallery pairs a still post with still extras.
 *
 * Requires INSTAGRAM_ACCESS_TOKEN in .env.local. Without it this returns an
 * empty list and `configured: false`, and the gallery falls back to the
 * drafted collections in data/gallery.ts rather than erroring.
 *
 * Note: Instagram's Basic Display API was retired in December 2024. This uses
 * the Graph API via Instagram Login, which needs a Business or Creator account
 * linked to a Meta app. Tokens are long-lived but expire after 60 days and
 * must be refreshed.
 */

const GRAPH = "https://graph.instagram.com";
const FIELDS =
  "id,media_type,media_url,permalink,caption,timestamp,thumbnail_url,children{media_type,media_url}";

/** Cache for an hour — Instagram rate-limits, and posts are not urgent. */
export const revalidate = 3600;

interface GraphMedia {
  id: string;
  media_type: "IMAGE" | "VIDEO" | "CAROUSEL_ALBUM";
  media_url?: string;
  permalink: string;
  caption?: string;
  timestamp: string;
  thumbnail_url?: string;
  children?: { data: { media_type: string; media_url: string }[] };
}

export async function GET() {
  const token = process.env.INSTAGRAM_ACCESS_TOKEN;

  if (!token) {
    return NextResponse.json({
      configured: false,
      posts: [],
      note: "Set INSTAGRAM_ACCESS_TOKEN to enable the live feed.",
    });
  }

  try {
    const res = await fetch(
      `${GRAPH}/me/media?fields=${FIELDS}&limit=25&access_token=${token}`,
      { next: { revalidate } },
    );

    if (!res.ok) {
      const body = await res.text();
      return NextResponse.json(
        { configured: true, posts: [], error: `Instagram returned ${res.status}`, body },
        { status: 502 },
      );
    }

    const json = (await res.json()) as { data?: GraphMedia[] };
    const media = json.data ?? [];

    const posts = media
      // Photos only. A carousel counts if it contains at least one image.
      .filter((m) => {
        if (m.media_type === "IMAGE") return true;
        if (m.media_type === "CAROUSEL_ALBUM") {
          return (m.children?.data ?? []).some((c) => c.media_type === "IMAGE");
        }
        return false;
      })
      .map((m) => {
        const images =
          m.media_type === "CAROUSEL_ALBUM"
            ? (m.children?.data ?? [])
                .filter((c) => c.media_type === "IMAGE")
                .map((c) => c.media_url)
            : [m.media_url].filter((u): u is string => Boolean(u));

        return {
          id: m.id,
          permalink: m.permalink,
          caption: m.caption ?? "",
          postedAt: m.timestamp,
          cover: images[0] ?? m.thumbnail_url ?? "",
          images,
          live: true,
        };
      })
      .filter((p) => p.cover);

    return NextResponse.json({ configured: true, count: posts.length, posts });
  } catch (err) {
    return NextResponse.json(
      {
        configured: true,
        posts: [],
        error: err instanceof Error ? err.message : "Instagram request failed",
      },
      { status: 502 },
    );
  }
}
