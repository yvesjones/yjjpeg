import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

/** False in a checkout with no .env.local — the site still renders. */
export const isSupabaseConfigured = Boolean(url && serviceKey);

export const STORAGE_BUCKET = "gallery";

export const publicStoragePrefix = url
  ? `${url}/storage/v1/object/public/${STORAGE_BUCKET}/`
  : "";

let client: SupabaseClient | null = null;

/**
 * Service-role client. Bypasses Row Level Security, so this module is marked
 * `server-only`: importing it from a client component is a build error rather
 * than a key printed into the browser bundle.
 */
export function supabaseAdmin(): SupabaseClient {
  if (!url || !serviceKey) {
    throw new Error(
      "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local.",
    );
  }
  client ??= createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return client;
}
