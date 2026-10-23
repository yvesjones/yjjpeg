import { NextResponse } from "next/server";

import { isAdmin, unauthorized } from "@/lib/admin-auth";
import { collections as bundled } from "@/data/gallery";
import { supabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";

/**
 * Copies the collections bundled in src/data/gallery.ts into the table, as
 * drafts, so there is something real to edit on day one.
 *
 * Refuses to run against a table that already has rows — this is a one-time
 * starting point, not a reset button.
 */
export async function POST(request: Request) {
  if (!isAdmin(request)) return unauthorized();

  const db = supabaseAdmin();

  const { count, error: countError } = await db
    .from("gallery_collections")
    .select("id", { count: "exact", head: true });

  if (countError) {
    return NextResponse.json({ error: countError.message }, { status: 500 });
  }
  if ((count ?? 0) > 0) {
    return NextResponse.json(
      { error: "The gallery already has collections — import skipped." },
      { status: 409 },
    );
  }

  const { error } = await db.from("gallery_collections").insert(
    bundled.map((data, i) => ({
      slug: data.slug,
      position: i,
      published: false,
      data,
    })),
  );

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, imported: bundled.length });
}
