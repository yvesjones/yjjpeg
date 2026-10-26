import type { Metadata } from "next";
import { Inter, Space_Grotesk, JetBrains_Mono, Silkscreen } from "next/font/google";
import "./globals.css";
import SiteNav from "@/components/SiteNav";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
});

/** The iPod's bitmap face, in the spirit of Chicago. */
const silkscreen = Silkscreen({
  variable: "--font-silkscreen",
  weight: ["400", "700"],
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "YJ.JPEG | Photography by Yves Jones",
  description:
    "Photography by Yves Jones. Landscape, architecture, and street work from the UK and beyond.",
  keywords: ["Yves Jones", "photography", "photographer", "landscape", "architecture", "street"],
  openGraph: {
    title: "YJ.JPEG | Photography by Yves Jones",
    description: "Photography by Yves Jones.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${inter.variable} ${spaceGrotesk.variable} ${jetbrainsMono.variable} ${silkscreen.variable} antialiased`}
      >
        <SiteNav />
        {children}
      </body>
    </html>
  );
}
