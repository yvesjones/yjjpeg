import AudioPlayer from "@/components/AudioPlayer";
import type { CollectionMusic } from "@/data/gallery";

/**
 * The soundtrack for a collection, shown beside the title.
 *
 * Unreleased tracks play from a file hosted here; released ones hand off to
 * Spotify's own iframe, which handles previews, full playback for logged-in
 * listeners, and keeps the play on the release rather than stranding it in a
 * local copy.
 */
export default function CollectionPlayer({
  music,
  collection,
}: {
  music: CollectionMusic;
  collection: string;
}) {
  return (
    <div className="w-full shrink-0 lg:w-[360px]">
      <p className="mono-eyebrow mb-3">Soundtrack</p>
      {music.source === "file" ? (
        <AudioPlayer
          src={music.src}
          title={music.title}
          artist={music.artist}
          note={music.note}
        />
      ) : (
        <iframe
          src={`${music.embed}?utm_source=generator&theme=0`}
          title={`${music.title} by ${music.artist} — soundtrack to ${collection}`}
          width="100%"
          height={152}
          loading="lazy"
          allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
          className="block rounded-xl"
          style={{ border: 0 }}
        />
      )}
    </div>
  );
}
