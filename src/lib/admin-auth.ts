import "server-only";

import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";

/**
 * The admin is one person with one password, sent as a bearer token.
 *
 * No ADMIN_PASSWORD set means locked, never open: a missing environment
 * variable in production must not leave the gallery writable by anyone who
 * guesses the URL.
 */
export function isAdmin(request: Request): boolean {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) return false;

  const header = request.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) return false;

  const given = Buffer.from(header.slice(7));
  const want = Buffer.from(expected);
  // timingSafeEqual throws on a length mismatch, so that is checked first.
  // Password length leaks either way; the contents do not.
  if (given.length !== want.length) return false;
  return timingSafeEqual(given, want);
}

export function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}
