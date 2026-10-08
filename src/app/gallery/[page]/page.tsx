import Link from "next/link";
import { notFound } from "next/navigation";

import InstagramCard from "@/components/InstagramCard";
import MorphGallery from "@/components/ui/morph-gallery";
import { collections, getCollectionByPage, totalPages } from "@/data/gallery";

/** One static route per collection. */
export function generateStaticParams() {
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

  const collection = getCollectionByPage(page);
  if (!collection) notFound();

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

      {/* Post on the left, the photos that didn't make it on the right. */}
      <section className="px-6 pb-10">
        <div className="mx-auto grid max-w-7xl grid-cols-1 gap-8 lg:grid-cols-[minmax(0,380px)_minmax(0,1fr)] lg:items-start">
          <div className="lg:sticky lg:top-24">
            <p className="mono-eyebrow mb-4">The post</p>
            <InstagramCard post={collection.instagram} title={collection.title} />
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
                <div key={orientation}>
                  <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
                    <p className="mono-eyebrow">
                      Not on Instagram &middot; {orientation} &middot;{" "}
                      {frames.length}{" "}
                      {frames.length === 1 ? "frame" : "frames"}
                    </p>
                    {frames.length > 1 && (
                      <p className="mono-label">Drag or use the arrows</p>
                    )}
                  </div>
                  {/* The box takes the orientation's own aspect ratio, so the
                      frames very nearly fill it and the letterbox all but
                      disappears. The portrait box is also width-capped, or the
                      column would stretch it back into a near-square. */}
                  <div
                    className={
                      orientation === "landscape"
                        ? "aspect-[3/2] w-full"
                        : "mx-auto aspect-[2/3] w-full max-w-[470px]"
                    }
                  >
                    <MorphGallery
                      items={frames}
                      height="100%"
                      autoplay={5000}
                      fit="contain"
                      background={[0.957, 0.957, 0.957]}
                      drift={0.18}
                      className="rounded-2xl"
                    />
                  </div>
                </div>
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
