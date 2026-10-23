"use client";

import * as React from "react";

import type { MorphItem } from "@/components/ui/morph-gallery";
import {
  makeThumb,
  orientationOf,
  slugify,
  uploadFile,
} from "@/lib/admin-client";

const TOKEN_KEY = "yjjpeg-admin";
type Orientation = "landscape" | "portrait";

interface Row {
  id: string;
  slug: string;
  position: number;
  published: boolean;
  data: {
    slug: string;
    title: string;
    blurb: string;
    location?: string;
    date: string;
    instagram: {
      permalink: string;
      cover: string;
      caption: string;
      postedAt: string | null;
    };
    music?: {
      source: "file" | "spotify";
      src?: string;
      embed?: string;
      title: string;
      artist: string;
      note?: string;
    };
    extras: { landscape: MorphItem[]; portrait: MorphItem[] };
  };
  updated_at: string;
}

interface Draft {
  id: string | null;
  slug: string;
  title: string;
  blurb: string;
  location: string;
  date: string;
  position: number;
  published: boolean;
  instagram: { permalink: string; cover: string; caption: string; postedAt: string };
  music: {
    mode: "none" | "file" | "spotify";
    src: string;
    embed: string;
    title: string;
    artist: string;
    note: string;
  };
  extras: { landscape: MorphItem[]; portrait: MorphItem[] };
}

const blankDraft = (): Draft => ({
  id: null,
  slug: "",
  title: "",
  blurb: "",
  location: "",
  date: String(new Date().getFullYear()),
  position: 0,
  published: false,
  instagram: { permalink: "", cover: "", caption: "", postedAt: "" },
  music: { mode: "none", src: "", embed: "", title: "", artist: "", note: "" },
  extras: { landscape: [], portrait: [] },
});

function toDraft(row: Row): Draft {
  const m = row.data.music;
  return {
    id: row.id,
    slug: row.slug,
    title: row.data.title,
    blurb: row.data.blurb ?? "",
    location: row.data.location ?? "",
    date: row.data.date,
    position: row.position,
    published: row.published,
    instagram: {
      permalink: row.data.instagram?.permalink ?? "",
      cover: row.data.instagram?.cover ?? "",
      caption: row.data.instagram?.caption ?? "",
      postedAt: row.data.instagram?.postedAt ?? "",
    },
    music: {
      mode: m?.source ?? "none",
      src: m?.src ?? "",
      embed: m?.embed ?? "",
      title: m?.title ?? "",
      artist: m?.artist ?? "",
      note: m?.note ?? "",
    },
    extras: {
      landscape: row.data.extras?.landscape ?? [],
      portrait: row.data.extras?.portrait ?? [],
    },
  };
}

function toPayload(draft: Draft) {
  const music =
    draft.music.mode === "file"
      ? {
          source: "file",
          src: draft.music.src,
          title: draft.music.title,
          artist: draft.music.artist,
          note: draft.music.note,
        }
      : draft.music.mode === "spotify"
        ? {
            source: "spotify",
            embed: draft.music.embed,
            title: draft.music.title,
            artist: draft.music.artist,
          }
        : null;

  return {
    slug: draft.slug,
    title: draft.title,
    blurb: draft.blurb,
    location: draft.location,
    date: draft.date,
    position: draft.position,
    published: draft.published,
    instagram: draft.instagram,
    music,
    extras: draft.extras,
  };
}

export default function AdminPage() {
  const [token, setToken] = React.useState<string | null>(null);
  const [checking, setChecking] = React.useState(true);

  React.useEffect(() => {
    const saved = sessionStorage.getItem(TOKEN_KEY);
    if (saved) setToken(saved);
    setChecking(false);
  }, []);

  if (checking) return null;

  return (
    <main className="mx-auto min-h-screen max-w-5xl px-6 py-16 pt-24">
      <div className="mb-10 flex items-end justify-between gap-6">
        <div>
          <p className="mono-eyebrow mb-3">YJ_ADMIN</p>
          <h1 className="display display-lg">Gallery</h1>
        </div>
        {token && (
          <button
            type="button"
            className="pill pill-secondary"
            onClick={() => {
              sessionStorage.removeItem(TOKEN_KEY);
              setToken(null);
            }}
          >
            Sign out
          </button>
        )}
      </div>

      {token ? (
        <Manager
          token={token}
          onExpired={() => {
            sessionStorage.removeItem(TOKEN_KEY);
            setToken(null);
          }}
        />
      ) : (
        <SignIn
          onSignedIn={(value) => {
            sessionStorage.setItem(TOKEN_KEY, value);
            setToken(value);
          }}
        />
      )}
    </main>
  );
}

function SignIn({ onSignedIn }: { onSignedIn: (token: string) => void }) {
  const [value, setValue] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    // The password is the bearer token, so a successful list is the check.
    const res = await fetch("/api/admin/collections", {
      headers: { Authorization: `Bearer ${value}` },
    });
    setBusy(false);

    // The route checks the password before it touches the database, so only a
    // 401 means the password is wrong. Anything else — the table not created
    // yet, Supabase unreachable — is a correct password meeting a broken
    // backend, and the manager explains those far better than this form can.
    if (res.status === 401) {
      setError("That password is not right.");
      return;
    }
    onSignedIn(value);
  };

  return (
    <form onSubmit={submit} className="hairline max-w-sm rounded-xl border p-6">
      <label className="mono-label mb-2 block" htmlFor="password">
        Password
      </label>
      <input
        id="password"
        type="password"
        autoFocus
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="hairline w-full rounded-lg border px-3 py-2 text-sm"
      />
      {error && <p className="mono-label mt-3 text-accent">{error}</p>}
      <button
        type="submit"
        disabled={busy || !value}
        className="pill pill-primary mt-5 disabled:opacity-40"
      >
        {busy ? "Checking…" : "Sign in"}
      </button>
    </form>
  );
}

function Manager({
  token,
  onExpired,
}: {
  token: string;
  onExpired: () => void;
}) {
  const [rows, setRows] = React.useState<Row[]>([]);
  const [draft, setDraft] = React.useState<Draft | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [notice, setNotice] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);

  const auth = React.useMemo(
    () => ({ Authorization: `Bearer ${token}` }),
    [token],
  );

  const load = React.useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/admin/collections", { headers: auth });
    setLoading(false);
    if (res.status === 401) return onExpired();
    const body = (await res.json()) as { collections?: Row[]; error?: string };
    if (!res.ok) return setError(body.error ?? "Could not load collections.");
    setError(null);
    setRows(body.collections ?? []);
  }, [auth, onExpired]);

  React.useEffect(() => {
    void load();
  }, [load]);

  const save = async (value: Draft) => {
    const editing = value.id !== null;
    const res = await fetch(
      editing ? `/api/admin/collections/${value.id}` : "/api/admin/collections",
      {
        method: editing ? "PUT" : "POST",
        headers: { ...auth, "Content-Type": "application/json" },
        body: JSON.stringify(toPayload(value)),
      },
    );
    const body = (await res.json()) as { error?: string };
    if (!res.ok) throw new Error(body.error ?? "Could not save.");
    setNotice(editing ? "Saved." : "Collection created.");
    setDraft(null);
    await load();
  };

  const remove = async (row: Row) => {
    if (!confirm(`Delete "${row.data.title}"? The photos stay in storage.`)) {
      return;
    }
    const res = await fetch(`/api/admin/collections/${row.id}`, {
      method: "DELETE",
      headers: auth,
    });
    if (!res.ok) {
      const body = (await res.json()) as { error?: string };
      return setError(body.error ?? "Could not delete.");
    }
    setNotice("Deleted.");
    await load();
  };

  const seed = async () => {
    const res = await fetch("/api/admin/seed", { method: "POST", headers: auth });
    const body = (await res.json()) as { error?: string; imported?: number };
    if (!res.ok) return setError(body.error ?? "Could not import.");
    setNotice(`Imported ${body.imported} collections as drafts.`);
    await load();
  };

  if (draft) {
    return (
      <Editor
        draft={draft}
        token={token}
        onChange={setDraft}
        onCancel={() => setDraft(null)}
        onSave={save}
      />
    );
  }

  return (
    <div>
      {error && (
        <div className="hairline mb-6 rounded-xl border p-4">
          <p className="mono-label text-accent">{error}</p>
          {error.includes("gallery_collections") && (
            <p className="mt-2 text-sm text-muted">
              The table does not exist yet. Run supabase/schema.sql in the
              Supabase dashboard → SQL Editor, then reload this page.
            </p>
          )}
        </div>
      )}
      {notice && <p className="mono-label mb-6">{notice}</p>}

      <div className="mb-6 flex flex-wrap gap-3">
        <button
          type="button"
          className="pill pill-primary"
          onClick={() => setDraft(blankDraft())}
        >
          New collection
        </button>
        {!loading && rows.length === 0 && (
          <button type="button" className="pill pill-secondary" onClick={seed}>
            Import bundled drafts
          </button>
        )}
      </div>

      {loading ? (
        <p className="mono-label">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-muted">
          No collections yet. Create one, or import the two drafted in the code
          as a starting point.
        </p>
      ) : (
        <ul className="space-y-3">
          {rows.map((row) => (
            <li
              key={row.id}
              className="hairline flex flex-wrap items-center justify-between gap-4 rounded-xl border p-4"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium">{row.data.title}</span>
                  <span className="mono-label">
                    {row.published ? "LIVE" : "DRAFT"}
                  </span>
                </div>
                <p className="mono-label mt-1 truncate">
                  /{row.slug} &middot; {row.data.extras.landscape.length +
                    row.data.extras.portrait.length}{" "}
                  photos &middot; position {row.position}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  className="pill pill-secondary"
                  onClick={() => setDraft(toDraft(row))}
                >
                  Edit
                </button>
                <button
                  type="button"
                  className="pill pill-secondary"
                  onClick={() => remove(row)}
                >
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mono-label mb-2 block">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-muted">{hint}</span>}
    </label>
  );
}

const inputClass = "hairline w-full rounded-lg border px-3 py-2 text-sm";

function Editor({
  draft,
  token,
  onChange,
  onCancel,
  onSave,
}: {
  draft: Draft;
  token: string;
  onChange: (d: Draft) => void;
  onCancel: () => void;
  onSave: (d: Draft) => Promise<void>;
}) {
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [progress, setProgress] = React.useState<string | null>(null);

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) =>
    onChange({ ...draft, [key]: value });

  const folder = draft.slug || slugify(draft.title) || "untitled";

  const addPhotos = async (files: FileList | null) => {
    if (!files?.length) return;
    setError(null);
    const next = {
      landscape: [...draft.extras.landscape],
      portrait: [...draft.extras.portrait],
    };

    try {
      let done = 0;
      for (const file of Array.from(files)) {
        setProgress(`Uploading ${++done} of ${files.length}…`);
        const orientation: Orientation = await orientationOf(file);
        const src = await uploadFile(file, `${folder}/${orientation}`, token);

        const thumbFile = await makeThumb(file);
        const thumb = thumbFile
          ? await uploadFile(thumbFile, `${folder}/${orientation}/thumb`, token)
          : undefined;

        next[orientation].push({
          src,
          ...(thumb ? { thumb } : {}),
          alt: `${draft.title || "Photo"}, ${orientation} frame ${next[orientation].length + 1}`,
        });
      }
      onChange({ ...draft, extras: next });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setProgress(null);
    }
  };

  const uploadOne = async (
    file: File | null | undefined,
    apply: (url: string) => void,
  ) => {
    if (!file) return;
    setError(null);
    setProgress("Uploading…");
    try {
      apply(await uploadFile(file, folder, token));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setProgress(null);
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await onSave({ ...draft, slug: draft.slug || slugify(draft.title) });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-10 pb-24">
      <div className="flex items-center justify-between gap-4">
        <p className="mono-eyebrow">
          {draft.id ? "Editing" : "New collection"}
        </p>
        <button type="button" className="pill pill-secondary" onClick={onCancel}>
          Back
        </button>
      </div>

      <section className="grid gap-6 sm:grid-cols-2">
        <Field label="Title">
          <input
            className={inputClass}
            value={draft.title}
            required
            onChange={(e) => {
              const title = e.target.value;
              onChange({
                ...draft,
                title,
                // The slug tracks the title until it has been saved once;
                // after that it is a live URL and must not move underneath
                // anyone who has linked to it.
                slug: draft.id ? draft.slug : slugify(title),
              });
            }}
          />
        </Field>
        <Field label="Slug" hint="Used in the URL. Letters, numbers, hyphens.">
          <input
            className={inputClass}
            value={draft.slug}
            onChange={(e) => set("slug", e.target.value)}
          />
        </Field>
        <Field label="Location" hint="Optional. Shown in the corner readout.">
          <input
            className={inputClass}
            value={draft.location}
            onChange={(e) => set("location", e.target.value)}
          />
        </Field>
        <Field label="Date" hint="Free text — 2026, or 2021–2026.">
          <input
            className={inputClass}
            value={draft.date}
            required
            onChange={(e) => set("date", e.target.value)}
          />
        </Field>
        <div className="sm:col-span-2">
          <Field label="Blurb">
            <textarea
              className={`${inputClass} min-h-20`}
              value={draft.blurb}
              onChange={(e) => set("blurb", e.target.value)}
            />
          </Field>
        </div>
        <Field label="Position" hint="Lower numbers come first.">
          <input
            type="number"
            className={inputClass}
            value={draft.position}
            onChange={(e) => set("position", Number(e.target.value))}
          />
        </Field>
        <label className="flex items-end gap-3 pb-2">
          <input
            type="checkbox"
            checked={draft.published}
            onChange={(e) => set("published", e.target.checked)}
          />
          <span className="mono-label">Published</span>
        </label>
      </section>

      <section className="hairline rounded-xl border p-6">
        <p className="mono-eyebrow mb-4">The Instagram post</p>
        <div className="grid gap-6 sm:grid-cols-2">
          <Field label="Post link" hint="Leave empty and it shows as a draft.">
            <input
              className={inputClass}
              value={draft.instagram.permalink}
              onChange={(e) =>
                set("instagram", {
                  ...draft.instagram,
                  permalink: e.target.value,
                })
              }
            />
          </Field>
          <Field label="Posted date" hint="Optional, e.g. 2026-04-12.">
            <input
              className={inputClass}
              value={draft.instagram.postedAt}
              onChange={(e) =>
                set("instagram", {
                  ...draft.instagram,
                  postedAt: e.target.value,
                })
              }
            />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Caption">
              <textarea
                className={`${inputClass} min-h-20`}
                value={draft.instagram.caption}
                onChange={(e) =>
                  set("instagram", {
                    ...draft.instagram,
                    caption: e.target.value,
                  })
                }
              />
            </Field>
          </div>
          <div className="sm:col-span-2">
            <span className="mono-label mb-2 block">Cover image</span>
            {draft.instagram.cover && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={draft.instagram.cover}
                alt=""
                className="mb-3 h-32 w-32 rounded-lg object-cover"
              />
            )}
            <input
              type="file"
              accept="image/*"
              className="text-xs"
              onChange={(e) =>
                void uploadOne(e.target.files?.[0], (url) =>
                  onChange({
                    ...draft,
                    instagram: { ...draft.instagram, cover: url },
                  }),
                )
              }
            />
          </div>
        </div>
      </section>

      <section className="hairline rounded-xl border p-6">
        <p className="mono-eyebrow mb-4">Soundtrack</p>
        <div className="mb-5 flex flex-wrap gap-4">
          {(["none", "file", "spotify"] as const).map((mode) => (
            <label key={mode} className="flex items-center gap-2">
              <input
                type="radio"
                name="music-mode"
                checked={draft.music.mode === mode}
                onChange={() => set("music", { ...draft.music, mode })}
              />
              <span className="mono-label">
                {mode === "file"
                  ? "Upload a track"
                  : mode === "spotify"
                    ? "Spotify"
                    : "None"}
              </span>
            </label>
          ))}
        </div>

        {draft.music.mode !== "none" && (
          <div className="grid gap-6 sm:grid-cols-2">
            <Field label="Track title">
              <input
                className={inputClass}
                value={draft.music.title}
                onChange={(e) =>
                  set("music", { ...draft.music, title: e.target.value })
                }
              />
            </Field>
            <Field label="Artist">
              <input
                className={inputClass}
                value={draft.music.artist}
                onChange={(e) =>
                  set("music", { ...draft.music, artist: e.target.value })
                }
              />
            </Field>

            {draft.music.mode === "spotify" ? (
              <div className="sm:col-span-2">
                <Field
                  label="Embed URL"
                  hint="https://open.spotify.com/embed/album/… — insert /embed into the share link."
                >
                  <input
                    className={inputClass}
                    value={draft.music.embed}
                    onChange={(e) =>
                      set("music", { ...draft.music, embed: e.target.value })
                    }
                  />
                </Field>
              </div>
            ) : (
              <>
                <Field label="Note" hint='Optional — "Unreleased", "Demo".'>
                  <input
                    className={inputClass}
                    value={draft.music.note}
                    onChange={(e) =>
                      set("music", { ...draft.music, note: e.target.value })
                    }
                  />
                </Field>
                <div>
                  <span className="mono-label mb-2 block">Audio file</span>
                  {draft.music.src && (
                    <p className="mb-2 truncate text-xs text-muted">
                      {draft.music.src.split("/").pop()}
                    </p>
                  )}
                  <input
                    type="file"
                    accept="audio/*"
                    className="text-xs"
                    onChange={(e) =>
                      void uploadOne(e.target.files?.[0], (url) =>
                        onChange({
                          ...draft,
                          music: { ...draft.music, src: url },
                        }),
                      )
                    }
                  />
                </div>
              </>
            )}
          </div>
        )}
      </section>

      <section className="hairline rounded-xl border p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <p className="mono-eyebrow">Photos</p>
          <input
            type="file"
            accept="image/*"
            multiple
            className="text-xs"
            onChange={(e) => {
              void addPhotos(e.target.files);
              e.target.value = "";
            }}
          />
        </div>
        <p className="mb-6 text-xs text-muted">
          Landscape and portrait are sorted automatically from each file&rsquo;s
          own dimensions. Originals upload untouched; a small thumbnail is made
          alongside for the strip.
        </p>

        {(["landscape", "portrait"] as const).map((orientation) => (
          <PhotoList
            key={orientation}
            orientation={orientation}
            items={draft.extras[orientation]}
            onChange={(items) =>
              onChange({
                ...draft,
                extras: { ...draft.extras, [orientation]: items },
              })
            }
          />
        ))}
      </section>

      {progress && <p className="mono-label">{progress}</p>}
      {error && <p className="mono-label text-accent">{error}</p>}

      <div className="hairline-t sticky bottom-0 flex gap-3 bg-background py-4">
        <button
          type="submit"
          disabled={busy || progress !== null}
          className="pill pill-primary disabled:opacity-40"
        >
          {busy ? "Saving…" : draft.id ? "Save changes" : "Create collection"}
        </button>
        <button type="button" className="pill pill-secondary" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  );
}

function PhotoList({
  orientation,
  items,
  onChange,
}: {
  orientation: Orientation;
  items: MorphItem[];
  onChange: (items: MorphItem[]) => void;
}) {
  const move = (from: number, to: number) => {
    if (to < 0 || to >= items.length) return;
    const next = [...items];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    onChange(next);
  };

  return (
    <div className="mb-8 last:mb-0">
      <p className="mono-label mb-3">
        {orientation} &middot; {items.length}
      </p>
      {items.length === 0 ? (
        <p className="text-xs text-muted">None yet.</p>
      ) : (
        <ul className="space-y-3">
          {items.map((item, i) => (
            <li
              key={item.src}
              className="hairline flex items-center gap-4 rounded-lg border p-3"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={item.thumb ?? item.src}
                alt=""
                className="h-16 w-16 shrink-0 rounded object-cover"
              />
              <input
                className={inputClass}
                value={item.alt ?? ""}
                placeholder="Alt text"
                onChange={(e) => {
                  const next = [...items];
                  next[i] = { ...item, alt: e.target.value };
                  onChange(next);
                }}
              />
              <div className="flex shrink-0 gap-1">
                <button
                  type="button"
                  aria-label="Move up"
                  className="pill pill-secondary px-3"
                  onClick={() => move(i, i - 1)}
                >
                  &uarr;
                </button>
                <button
                  type="button"
                  aria-label="Move down"
                  className="pill pill-secondary px-3"
                  onClick={() => move(i, i + 1)}
                >
                  &darr;
                </button>
                <button
                  type="button"
                  aria-label="Remove"
                  className="pill pill-secondary px-3"
                  onClick={() => onChange(items.filter((_, j) => j !== i))}
                >
                  &times;
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
