import Link from "next/link";

import { ThreeDPhotoCarousel } from "@/components/ui/3d-carousel";
import Ipod from "@/components/ipod/Ipod";
import { getPublishedCollections } from "@/lib/gallery-store";
import { getPlayerTracks } from "@/lib/itunes";

/** Keeps the collection list in step with what is published, as the gallery does. */
export const revalidate = 60;

export default async function Home() {
  const [collections, tracks] = await Promise.all([
    getPublishedCollections(),
    getPlayerTracks(),
  ]);

  return (
    <>
      <main className="pt-16">
        {/* Carousel first, so the photographs are on screen before any scroll. */}
        <section
          id="work"
          className="topo topo-fade relative overflow-hidden pt-6 pb-10 sm:pt-8 md:pb-20"
        >
          <div className="mx-auto max-w-7xl px-6">
            <div className="mb-4 flex items-start justify-between gap-6">
              <div className="mono-label flex items-center gap-3">
                <span className="text-accent">01</span>
                <span className="hidden h-px w-8 bg-[var(--hairline)] sm:block" />
                <span>YJ_PHOTO</span>
              </div>
              <div className="mono-readout text-right leading-relaxed">
                <div>FORMAT: 35MM / DIGITAL</div>
                <div>ARCHIVE: 2021&ndash;2026</div>
              </div>
            </div>
          </div>

          <ThreeDPhotoCarousel />

          <div className="mx-auto max-w-7xl px-6">
            <p className="mono-label mt-2 text-center">
              Drag to rotate &middot; click a frame to enlarge
            </p>
          </div>

          {/* Half out of frame in the corner until the pointer finds it, then
              the whole device rises. On touch there is no hover to wait for,
              so it simply sits in the flow instead. */}
          {tracks.length > 0 && (
            <div className="ipod-peek mx-auto mt-10 w-[240px] md:absolute md:right-8 md:bottom-0 md:z-20 md:mt-0">
              <p className="mono-eyebrow mb-3 md:hidden">Listen</p>
              <Ipod
                name="Yves Jones"
                menu={tracks.map((track, i) => ({
                  label: track.title,
                  marker: "note" as const,
                  action: "track" as const,
                  trackIndex: i,
                }))}
                tracks={tracks}
                startInPlayer
                widthClass="w-[240px]"
              />
            </div>
          )}
        </section>

        {/* Name sits below the work, as the caption to it. */}
        <section className="hairline-t hairline-b px-6 py-14 md:py-20">
          <div className="mx-auto grid max-w-7xl grid-cols-1 gap-12 md:grid-cols-2 md:items-start">
            <div>
              <h1 className="display display-xl">
                <span className="block">Yves</span>
                <span className="block">Jones</span>
              </h1>
              <p className="mono mt-8 max-w-xl text-sm leading-relaxed text-muted">
                Blending music and photography
              </p>
              <Link href="/gallery" className="pill pill-primary mt-8">
                View the gallery
              </Link>
            </div>

            {/* Straight into any one set, rather than paging from the first. */}
            {collections.length > 0 && (
              <nav aria-label="Gallery collections">
                <p className="mono-eyebrow mb-4">Collections</p>
                <ul className="hairline-t">
                  {collections.map((collection, i) => (
                    <li key={collection.slug}>
                      <Link
                        href={`/gallery/${i + 1}`}
                        className="hairline-b flex items-baseline justify-between gap-6 py-4 transition-opacity hover:opacity-60"
                      >
                        <span className="flex items-baseline gap-4">
                          <span className="mono-label text-accent">
                            {String(i + 1).padStart(2, "0")}
                          </span>
                          <span className="display display-sm">
                            {collection.title}
                          </span>
                        </span>
                        <span className="mono-label shrink-0 text-right">
                          {collection.location
                            ? `${collection.location} · ${collection.date}`
                            : collection.date}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>
            )}
          </div>
        </section>

        {/* About */}
        <section id="about" className="bg-surface px-6 py-20 md:py-28">
          <div className="mx-auto grid max-w-7xl grid-cols-1 gap-12 md:grid-cols-2">
            <div>
              <p className="mono-eyebrow mb-4">About</p>
              <h2 className="display display-lg">Look and listen</h2>
            </div>
            <div className="space-y-6">
              <p className="text-lg leading-relaxed text-muted">
                Photography paired with music. Each collection carries a track
                &mdash; released &amp; unreleased. Same trips, same rolls, same
                year: one set to look at, one to listen to.
              </p>
              <p className="text-lg leading-relaxed text-muted">
                Work spans 35mm film and digital, shot around the world. Prints
                and commissions available on request.
              </p>
              <div className="pt-2">
                <h3 className="display display-sm">Get in touch</h3>
                <div className="mt-4 flex flex-wrap gap-3">
                  <a
                    href="https://www.instagram.com/yvesjoness/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="pill pill-secondary"
                  >
                    Instagram
                  </a>
                  <Link href="/contact" className="pill pill-primary">
                    Email
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

      </main>

      <footer className="hairline-t bg-surface px-6 py-12">
        <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <span className="display display-sm">YJ.JPEG</span>
          <span className="mono-label">
            &copy; {new Date().getFullYear()} Yves Jones
          </span>
        </div>
      </footer>
    </>
  );
}
