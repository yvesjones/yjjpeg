import Link from "next/link";

import { ThreeDPhotoCarousel } from "@/components/ui/3d-carousel";

const navLinks = [
  { href: "#work", label: "Work" },
  { href: "#about", label: "About" },
  { href: "#contact", label: "Contact" },
];

export default function Home() {
  return (
    <>
      {/* Nav */}
      <nav className="fixed top-0 right-0 left-0 z-40 bg-background/80 backdrop-blur-md hairline-b">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <Link href="/" className="display text-xl transition-colors hover:text-accent">
            YJJPEG
          </Link>
          <div className="flex items-center gap-7">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="mono-label transition-colors hover:text-foreground"
              >
                {link.label}
              </a>
            ))}
          </div>
        </div>
      </nav>

      <main className="pt-16">
        {/* Carousel first, so the photographs are on screen before any scroll. */}
        <section id="work" className="topo topo-fade pt-6 pb-10 sm:pt-8">
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
        </section>

        {/* Name sits below the work, as the caption to it. */}
        <section className="hairline-t hairline-b px-6 py-14 md:py-20">
          <div className="mx-auto max-w-7xl">
            <h1 className="display display-xl">
              <span className="block">Yves</span>
              <span className="block">Jones</span>
            </h1>
            <p className="mono mt-8 max-w-xl text-sm leading-relaxed text-muted">
              Photography. Landscape, architecture, and the spaces in between.
            </p>
          </div>
        </section>

        {/* About */}
        <section id="about" className="bg-surface px-6 py-20 md:py-28">
          <div className="mx-auto grid max-w-7xl grid-cols-1 gap-12 md:grid-cols-2">
            <div>
              <p className="mono-eyebrow mb-4">About</p>
              <h2 className="display display-lg">Behind the lens</h2>
            </div>
            <div className="space-y-6">
              <p className="text-lg leading-relaxed text-muted">
                I shoot the places most people walk past &mdash; the geometry of a
                stairwell, the way light falls across a motorway at dusk, a
                skyline flattened into layers by a long lens.
              </p>
              <p className="text-lg leading-relaxed text-muted">
                Work spans 35mm film and digital, shot across the UK and Europe.
                Prints and commissions available on request.
              </p>
              <a href="#contact" className="pill pill-primary mt-2">
                Get in touch
              </a>
            </div>
          </div>
        </section>

        {/* Contact */}
        <section id="contact" className="hairline-t px-6 py-20 md:py-28">
          <div className="mx-auto max-w-3xl text-center">
            <p className="mono-eyebrow mb-4">Contact</p>
            <h2 className="display display-lg">Work with me</h2>
            <p className="mono mt-6 text-sm leading-relaxed text-muted">
              Commissions, prints, and editorial enquiries.
            </p>
            <div className="mt-10 flex flex-wrap justify-center gap-3">
              <a href="mailto:yvesjonesmusic@gmail.com" className="pill pill-primary">
                Email
              </a>
              <a
                href="https://instagram.com"
                target="_blank"
                rel="noopener noreferrer"
                className="pill pill-secondary"
              >
                Instagram
              </a>
            </div>
          </div>
        </section>
      </main>

      <footer className="hairline-t bg-surface px-6 py-12">
        <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <span className="display display-sm">YJJPEG</span>
          <span className="mono-label">
            &copy; {new Date().getFullYear()} Yves Jones
          </span>
        </div>
      </footer>
    </>
  );
}
