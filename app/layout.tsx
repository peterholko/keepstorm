import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Musterhold — Place wisely. March relentlessly.",
  description:
    "Place foundries across a double-width scrolling battlefield, route automatic cohorts, and outbuild an adaptive rival in Musterhold.",
  keywords: ["strategy game", "browser game", "base building", "Musterhold"],
  openGraph: {
    title: "Musterhold — Place wisely. March relentlessly.",
    description: "Build a true 2D construction yard on a scrolling battlefield and outmatch an adaptive rival in this original automated siege strategy Alpha.",
    type: "website",
    siteName: "Musterhold",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "Daybreak and Nightveil forces clash in Musterhold" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Musterhold — Place wisely. March relentlessly.",
    description: "Build a true 2D construction yard and outmatch an adaptive rival.",
    images: ["/og.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
