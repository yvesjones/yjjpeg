import Ipod from "@/components/ipod/Ipod";
import type { CollectionMusic } from "@/data/gallery";
import type { PlayerTrack } from "@/lib/itunes";

/**
 * A collection's soundtrack, as an iPod showing that one track.
 *
 * The track comes straight from the collection's `music` field, so changing
 * the audio in /admin changes what this plays — there is nothing to keep in
 * step by hand.
 *
 * An uploaded file plays here. A Spotify release cannot: an embed is not an
 * audio file, so the device shows the track and the play button opens Spotify
 * instead of pretending to play it.
 */
export default function CollectionPlayer({
  music,
  collection,
  cover,
}: {
  music: CollectionMusic;
  collection: string;
  /** Collection cover, used as the album art on screen. */
  cover?: string;
}) {
  const isFile = music.source === "file";

  const track: PlayerTrack = {
    id: collection,
    title: music.title,
    artist: music.artist,
    album: isFile && music.note ? music.note : collection,
    preview: isFile ? music.src : "",
    externalUrl: isFile ? undefined : spotifyLink(music.embed),
    artwork: cover ?? "",
    year: "",
  };

  return (
    <Ipod
      name={collection}
      menu={[
        {
          label: music.title,
          marker: "note",
          action: "track",
          trackIndex: 0,
        },
      ]}
      tracks={[track]}
      startInPlayer
      screenTitle="Soundtrack"
      note={isFile ? "" : "Play on Spotify"}
      widthClass="w-[min(100%,260px)]"
    />
  );
}

/** The embed URL points at the player; this points at the release itself. */
function spotifyLink(embed: string): string {
  return embed.replace("/embed/", "/");
}
