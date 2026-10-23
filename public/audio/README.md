# Audio for gallery collections

Drop a track in here, then point a collection at it in `src/data/gallery.ts`:

```ts
music: {
  source: "file",
  src: "/audio/berlin-demo.mp3",   // path under public/, leading slash
  title: "Untitled (Berlin)",
  artist: "Yves Jones",
  note: "Unreleased",              // optional line above the title
},
```

**Format.** MP3 or M4A/AAC — both play in every browser. Not WAV or AIFF:
they are ten times the size for no audible gain over a laptop speaker, and the
whole file has to arrive before it plays. 192–256 kbps is plenty.

Converting a WAV without installing anything (macOS ships `afconvert`):

```
afconvert -f m4af -d aac -b 192000 track.wav public/audio/track.m4a
```

**Size.** Keep each file under ~10 MB. These are committed to the repo and
deployed with the site, so a folder of 50 MB WAVs makes every clone and every
deploy slower.

**Protection.** There is none, and there cannot be: anything the browser can
play, a visitor can save out of the network tab. Only put up work you are
comfortable having copied. For something you want heard but not kept, upload a
90-second excerpt rather than the full track.
