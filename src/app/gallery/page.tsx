import Link from "next/link";
import { redirect } from "next/navigation";

import { getPublishedCollections } from "@/lib/gallery-store";

export const revalidate = 60;

/** /gallery is the first collection — unless nothing is published yet. */
export default async function GalleryIndex() {
  const collections = await getPublishedCollections();
  if (collections.length > 0) redirect("/gallery/1");

  return (
    <main className="mx-auto max-w-3xl px-6 py-32 text-center pt-40">
      <p className="mono-eyebrow mb-4">Gallery</p>
      <h1 className="display display-lg">Nothing here yet</h1>
      <p className="mono mt-6 text-sm leading-relaxed text-muted">
        The first collection is on its way.
      </p>
      <Link href="/" className="pill pill-secondary mt-10">
        Back home
      </Link>
    </main>
  );
}
