"use client";

import type { MorphItem } from "@/components/ui/morph-gallery";

/** Longest edge of a generated thumbnail, in pixels. */
const THUMB_EDGE = 480;

/**
 * Largest file storage will take, in bytes.
 *
 * This mirrors the gallery bucket's own `file_size_limit`, which is at the
 * plan's ceiling and cannot be raised further. Checking it here turns a bare
 * "Upload failed (413)" from storage into a message that says which file and
 * how far over it is — worth doing because WAV runs to roughly 10MB a minute,
 * so a full-length track can land on the wrong side of this.
 */
export const MAX_UPLOAD_BYTES = 50 * 1024 * 1024;

/**
 * Content type for a file whose own `type` came back empty.
 *
 * The bucket only accepts an allowlist of media types, and a browser that
 * reports nothing for a file would otherwise have us send
 * `application/octet-stream` — which is not on that list, so the upload is
 * refused for a format that is actually allowed. Lossless audio is where this
 * shows up: the mapping from extension to type is far less consistently
 * implemented for WAV and AIFF than it is for JPEG or MP3.
 */
const TYPE_BY_EXTENSION: Record<string, string> = {
  wav: "audio/wav",
  wave: "audio/wav",
  aif: "audio/aiff",
  aiff: "audio/aiff",
  flac: "audio/flac",
  mp3: "audio/mpeg",
  m4a: "audio/mp4",
  aac: "audio/aac",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  avif: "image/avif",
};

function contentTypeOf(file: File): string {
  // Some browsers report "audio/x-wav" or "audio/wave" for the same bytes;
  // the bucket accepts those spellings too, so a non-empty type is honoured
  // as given rather than second-guessed.
  if (file.type) return file.type;
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  return TYPE_BY_EXTENSION[ext] ?? "application/octet-stream";
}

function describeSize(bytes: number): string {
  return `${(bytes / 1024 / 1024).toFixed(1)}MB`;
}

export async function uploadFile(
  file: File,
  folder: string,
  token: string,
): Promise<string> {
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new Error(
      `${file.name} is ${describeSize(file.size)}. The limit is ` +
        `${describeSize(MAX_UPLOAD_BYTES)} — a shorter edit, or a 16-bit ` +
        `44.1kHz export, will fit.`,
    );
  }

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
    headers: { "Content-Type": contentTypeOf(file) },
    body: file,
  });
  if (!put.ok) {
    // Storage answers with JSON; its message names the actual objection
    // (type, size, a path already taken), which beats a bare status code.
    const reason = await put.text().catch(() => "");
    let detail = "";
    try {
      detail = (JSON.parse(reason) as { message?: string }).message ?? "";
    } catch {
      detail = reason.slice(0, 200);
    }
    throw new Error(
      detail
        ? `Upload failed (${put.status}): ${detail}`
        : `Upload failed (${put.status})`,
    );
  }

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
