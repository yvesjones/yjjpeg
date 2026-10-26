import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Admin | YJ.JPEG",
  // Nothing here should ever turn up in a search result.
  robots: { index: false, follow: false },
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
