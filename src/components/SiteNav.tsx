import Link from "next/link";

const navLinks = [
  // The wordmark is already a link home, so on a narrow screen this one is
  // dropped rather than letting four links collide with it.
  { href: "/", label: "Home", wideOnly: true },
  { href: "/gallery", label: "Gallery" },
  { href: "/#about", label: "About" },
  { href: "/contact", label: "Contact" },
];

/**
 * Lives in the root layout rather than on the home page, so every route gets
 * it. Section links are absolute (`/#work`) so they still reach the home page
 * when you are on /gallery.
 */
export default function SiteNav() {
  return (
    <nav className="fixed top-0 right-0 left-0 z-40 bg-background/80 backdrop-blur-md hairline-b">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        <Link
          href="/"
          className="display shrink-0 text-lg transition-colors hover:text-accent sm:text-xl"
        >
          YJ.JPEG
        </Link>
        <div className="flex items-center gap-4 sm:gap-7">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`mono-label whitespace-nowrap transition-colors hover:text-foreground${
                link.wideOnly ? " hidden sm:inline" : ""
              }`}
            >
              {link.label}
            </Link>
          ))}
        </div>
      </div>
    </nav>
  );
}
