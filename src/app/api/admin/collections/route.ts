import { NextResponse } from "next/server";

import { isAdmin, unauthorized } from "@/lib/admin-auth";
import {
  getAllCollections,
  parseCollection,
  ValidationError,
} from "@/lib/gallery-store";
import { supabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!isAdmin(request)) return unauthorized();

  try {
    return NextResponse.json({ collections: await getAllCollections() });
  } catch (e) {
    return NextResponse.json({ error: message(e) }, { status: 500 });
  }
}

export async function POST(request: Request) {
  if (!isAdmin(request)) return unauthorized();

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const data = parseCollection(body);

    const { data: row, error } = await supabaseAdmin()
      .from("gallery_collections")
      .insert({
        slug: data.slug,
        position: Number(body.position) || 0,
        published: body.published === true,
        data,
      })
      .select()
      .single();

    if (error) {
      // 23505 is Postgres' unique_violation — here, a duplicate slug.
      const status = error.code === "23505" ? 409 : 500;
      const text =
        status === 409
          ? `A collection with the slug "${data.slug}" already exists.`
          : error.message;
      return NextResponse.json({ error: text }, { status });
    }

    return NextResponse.json({ collection: row }, { status: 201 });
  } catch (e) {
    if (e instanceof ValidationError) {
      return NextResponse.json({ error: e.message }, { status: 400 });
    }
    return NextResponse.json({ error: message(e) }, { status: 500 });
  }
}

function message(e: unknown): string {
  return e instanceof Error ? e.message : "Something went wrong";
}
