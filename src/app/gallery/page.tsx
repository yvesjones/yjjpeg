import { redirect } from "next/navigation";

/** /gallery is the first collection. */
export default function GalleryIndex() {
  redirect("/gallery/1");
}
