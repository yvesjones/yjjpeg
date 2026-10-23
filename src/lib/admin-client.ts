"use client";

import type { MorphItem } from "@/components/ui/morph-gallery";

/** Longest edge of a generated thumbnail, in pixels. */
const THUMB_EDGE = 480;

export async function uploadFile(
  file: File,
  folder: string,
  token: string,
): Promise<string> {
  const res = await fetch("/api/admin/upload-url", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ folder, filename: file.name }),
  });

  const body = (await res.json()) as { signedUrl?: string; publicUrl?: string; error?: string };
  if (!res.ok || !body.signedUrl || !body.publicUrl) {
    throw new Error(body.error ?? "Could not start the upload");
  }

  // Straight to storage, original bytes, no re-encoding anywhere in between.
  const put = await fetch(body.signedUrl, {
    method: "PUT",
    headers: { "Content-Type": file.type || "application/octet-stream" },
    body: file,
  });
  if (!put.ok) throw new Error(`Upload failed (${put.status})`);

  return body.publicUrl;
}

/**
 * A small JPEG for the thumbnail strip, made in the browser.
 *
 * The full-size file is uploaded untouched; only this copy is re-encoded. The
 * strip would otherwise pull every full-resolution scan to draw postage
 * stamps.
 */
export async function makeThumb(file: File): Promise<File | null> {
  if (!file.type.startsWith("image/")) return null;

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    return null;
  }

  const longest = Math.max(bitmap.width, bitmap.height);
  if (longest <= THUMB_EDGE) {
    bitmap.close();
    return null;
  }

  const scale = THUMB_EDGE / longest;
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    bitmap.close();
    return null;
  }
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", 0.82),
  );
  if (!blob) return null;

  const stem = file.name.replace(/\.[^.]+$/, "");
  return new File([blob], `${stem}-thumb.jpg`, { type: "image/jpeg" });
}

/** Which slide a photo belongs on, from its own dimensions. */
export async function orientationOf(
  file: File,
): Promise<"landscape" | "portrait"> {
  try {
    const bitmap = await createImageBitmap(file);
    const portrait = bitmap.height > bitmap.width;
    bitmap.close();
    return portrait ? "portrait" : "landscape";
  } catch {
    return "landscape";
  }
}

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export type { MorphItem };
