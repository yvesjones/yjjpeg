import { NextResponse } from "next/server";

import { isAdmin, unauthorized } from "@/lib/admin-auth";
import { parseCollection, ValidationError } from "@/lib/gallery-store";
import { supabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";

type Context = { params: Promise<{ id: string }> };

export async function PUT(request: Request, { params }: Context) {
  if (!isAdmin(request)) return unauthorized();
  const { id } = await params;

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const data = parseCollection(body);

    const { data: row, error } = await supabaseAdmin()
      .from("gallery_collections")
      .update({
        slug: data.slug,
        position: Number(body.position) || 0,
        published: body.published === true,
        data,
      })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      const status = error.code === "23505" ? 409 : 500;
      const text =
        status === 409
          ? `A collection with the slug "${data.slug}" already exists.`
          : error.message;
      return NextResponse.json({ error: text }, { status });
    }

    return NextResponse.json({ collection: row });
  } catch (e) {
    if (e instanceof ValidationError) {
      return NextResponse.json({ error: e.message }, { status: 400 });
    }
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Something went wrong" },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request, { params }: Context) {
  if (!isAdmin(request)) return unauthorized();
  const { id } = await params;

  // Uploaded media is deliberately left in the bucket. A collection deleted by
  // mistake can then be rebuilt from the same files, and storage is cheap next
  // to re-uploading originals.
  const { error } = await supabaseAdmin()
    .from("gallery_collections")
    .delete()
    .eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
