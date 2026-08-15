import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Keepstorm — Build the answer. Time the march.",
  description:
    "Choose an asymmetric faction, place and upgrade structures across a scrolling battlefield, synchronize automatic cohorts, and outbuild an adaptive rival in Keepstorm.",
  keywords: ["strategy game", "browser game", "base building", "auto battler", "Keepstorm"],
  openGraph: {
    title: "Keepstorm — Build the answer. Time the march.",
    description: "Command one of three original factions through counters, economy, upgrades, abilities, and synchronized siege waves.",
    type: "website",
    siteName: "Keepstorm",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "Original automated siege forces clash in Keepstorm" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Keepstorm — Build the answer. Time the march.",
    description: "Choose a faction, shape a 2D construction yard, and outmatch an adaptive rival.",
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
