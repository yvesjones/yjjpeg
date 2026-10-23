import { NextResponse } from "next/server";

import { isAdmin, unauthorized } from "@/lib/admin-auth";
import {
  publicStoragePrefix,
  STORAGE_BUCKET,
  supabaseAdmin,
} from "@/lib/supabase";

export const dynamic = "force-dynamic";

const EXTENSIONS = new Set([
  "jpg", "jpeg", "png", "webp", "avif",
  "mp3", "m4a", "aac", "wav",
]);

/**
 * Hands the browser a one-shot signed URL so it can PUT the file straight to
 * Supabase Storage.
 *
 * The file never passes through this function, which matters twice over: a
 * serverless request body is capped at a few megabytes, well under a full-size
 * scan, and the original bytes reach storage unmodified — nothing re-encodes
 * them on the way through.
 */
export async function POST(request: Request) {
  if (!isAdmin(request)) return unauthorized();

  const { folder, filename } = (await request.json()) as {
    folder?: string;
    filename?: string;
  };

  const safeFolder = String(folder ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9/-]/g, "-")
    .replace(/\/+/g, "/")
    .replace(/^\/|\/$/g, "");

  const name = String(filename ?? "");
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  if (!EXTENSIONS.has(ext)) {
    return NextResponse.json(
      { error: `Unsupported file type: .${ext}` },
      { status: 400 },
    );
  }

  const base =
    name
      .slice(0, name.lastIndexOf("."))
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 60) || "file";

  // A random suffix keeps two uploads of "IMG_0001.jpg" from overwriting each
  // other, and means a replaced photo gets a fresh URL rather than fighting a
  // CDN cache holding the old bytes.
  const suffix = crypto.randomUUID().slice(0, 8);
  const path = `${safeFolder ? `${safeFolder}/` : ""}${base}-${suffix}.${ext}`;

  const { data, error } = await supabaseAdmin()
    .storage.from(STORAGE_BUCKET)
    .createSignedUploadUrl(path);

  if (error || !data) {
    return NextResponse.json(
      { error: error?.message ?? "Could not create an upload URL" },
      { status: 500 },
    );
  }

  // supabase-js returns an absolute URL; the REST endpoint underneath it
  // returns a path. Normalise, so the browser can PUT to it either way.
  const signedUrl = data.signedUrl.startsWith("http")
    ? data.signedUrl
    : `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1${data.signedUrl}`;

  return NextResponse.json({
    path,
    signedUrl,
    publicUrl: `${publicStoragePrefix}${path}`,
  });
}
