import Link from "next/link";

const navLinks = [
  { href: "/#work", label: "Work" },
  { href: "/gallery", label: "Gallery" },
  { href: "/#about", label: "About" },
  { href: "/#contact", label: "Contact" },
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
          className="display text-xl transition-colors hover:text-accent"
        >
          YJJPEG
        </Link>
        <div className="flex items-center gap-7">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="mono-label transition-colors hover:text-foreground"
            >
              {link.label}
            </Link>
          ))}
        </div>
      </div>
    </nav>
  );
}
