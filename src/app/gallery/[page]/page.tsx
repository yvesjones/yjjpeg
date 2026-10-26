import Link from "next/link";
import { notFound } from "next/navigation";

import CollectionPlayer from "@/components/CollectionPlayer";
import GallerySlide from "@/components/GallerySlide";
import { getPublishedCollections } from "@/lib/gallery-store";

/**
 * Re-read the collections at most once a minute, so publishing from /admin
 * shows up without a redeploy.
 */
export const revalidate = 60;

/** Pages added after a build still render, rather than 404. */
export const dynamicParams = true;

export async function generateStaticParams() {
  const collections = await getPublishedCollections();
  return collections.map((_, i) => ({ page: String(i + 1) }));
}

export default async function GalleryPage({
  params,
}: {
  params: Promise<{ page: string }>;
}) {
  const { page: raw } = await params;
  const page = Number(raw);

  if (!Number.isInteger(page) || page < 1) notFound();

  const collections = await getPublishedCollections();
  const collection = collections[page - 1];
  if (!collection) notFound();

  const totalPages = collections.length;

  const prev = page > 1 ? page - 1 : null;
  const next = page < totalPages ? page + 1 : null;

  return (
    <main className="pt-16">
      <section className="topo topo-fade px-6 pt-10 pb-6">
        <div className="mx-auto max-w-7xl">
          <div className="mb-10 flex items-start justify-between gap-6">
            <div className="mono-label flex items-center gap-3">
              <span className="text-accent">
                {String(page).padStart(2, "0")}
              </span>
              <span className="hidden h-px w-8 bg-[var(--hairline)] sm:block" />
              <span>YJ_GALLERY</span>
            </div>
            <div className="mono-readout text-right leading-relaxed">
              {collection.location && <div>{collection.location}</div>}
              <div>{collection.date}</div>
            </div>
          </div>

          <h1 className="display display-xl">{collection.title}</h1>
          <p className="mono mt-6 max-w-xl text-sm leading-relaxed text-muted">
            {collection.blurb}
          </p>
        </div>
      </section>

      {/* Soundtrack on the left, the photographs on the right. It stays put
          while the frames scroll, so the music keeps the set company. */}
      <section className="px-6 pb-10">
        <div className="mx-auto grid max-w-7xl grid-cols-1 gap-8 lg:grid-cols-[minmax(0,380px)_minmax(0,1fr)] lg:items-start">
          <div className="lg:sticky lg:top-24">
            {/* Stands in for the slide's label row opposite, so the device's
                top edge lines up with the top of the landscape frames. Same
                classes, so it keeps that row's exact height. */}
            <p className="mono-eyebrow mb-3 hidden lg:block lg:invisible" aria-hidden="true">
              Soundtrack
            </p>
            {collection.music && (
              <CollectionPlayer
                music={collection.music}
                collection={collection.title}
                cover={collection.instagram.cover}
              />
            )}
          </div>

          <div className="space-y-10">
            {/* Two slides rather than one. A single box has to letterbox
                whichever orientation it wasn't shaped for; giving each its own
                box — 3:2 and 2:3 — means the frames nearly fill it, so there
                is almost no dead space and nothing is cropped. */}
            {(["landscape", "portrait"] as const).map((orientation) => {
              const frames = collection.extras[orientation];
              if (frames.length === 0) return null;

              return (
                <GallerySlide
                  key={orientation}
                  items={frames}
                  orientation={orientation}
                />
              );
            })}
          </div>
        </div>
      </section>

      {/* Pager */}
      <nav
        className="hairline-t px-6 py-10"
        aria-label="Gallery collections"
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          {prev ? (
            <Link href={`/gallery/${prev}`} className="pill pill-secondary">
              &larr; Previous
            </Link>
          ) : (
            <span />
          )}

          <span className="mono-label">
            {page} / {totalPages}
          </span>

          {next ? (
            <Link href={`/gallery/${next}`} className="pill pill-primary">
              Next &rarr;
            </Link>
          ) : (
            <span />
          )}
        </div>
      </nav>
    </main>
  );
}
