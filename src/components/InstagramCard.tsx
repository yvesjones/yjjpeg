import type { InstagramPost } from "@/data/gallery";

/**
 * Inline mark rather than a lucide import: lucide v1 dropped its brand icons,
 * so there is no Instagram glyph in the package any more.
 */
function InstagramMark({ size = 14 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
    </svg>
  );
}

/**
 * The Instagram post as it appears beside the extra photos.
 *
 * A real embed (instagram.com/embed.js) would be heavier, slower and can't be
 * styled, so this renders the post's own image and caption in the site's
 * design and links out to the permalink.
 */
export default function InstagramCard({
  post,
  title,
}: {
  post: InstagramPost;
  title: string;
}) {
  const body = (
    <>
      <div className="relative aspect-square w-full overflow-hidden bg-surface-alt">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={post.cover}
          alt={`Instagram post — ${title}`}
          className="h-full w-full object-cover"
        />
      </div>

      <div className="p-5">
        <div className="mono-label flex items-center gap-2">
          <InstagramMark />
          <span>@yvesjones</span>
          {post.postedAt && (
            <>
              <span aria-hidden>&middot;</span>
              <span>
                {new Date(post.postedAt).toLocaleDateString("en-GB", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              </span>
            </>
          )}
        </div>

        <p className="mt-4 text-sm leading-relaxed text-muted">
          {post.caption}
        </p>

        {post.live ? (
          <span className="mono-label mt-5 inline-block transition-colors group-hover:text-accent">
            View on Instagram &rarr;
          </span>
        ) : (
          <span className="mono-readout mt-5 inline-block">
            Draft &mdash; not yet posted
          </span>
        )}
      </div>
    </>
  );

  const shell =
    "block overflow-hidden rounded-2xl hairline border bg-surface transition-colors";

  // A drafted post has nowhere to link to, so it isn't a link.
  return post.live && post.permalink ? (
    <a
      href={post.permalink}
      target="_blank"
      rel="noopener noreferrer"
      className={`${shell} group hover:border-accent/50`}
    >
      {body}
    </a>
  ) : (
    <div className={shell}>{body}</div>
  );
}
