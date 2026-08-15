import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://keepstorm.com"),
  title: "Keepstorm",
  description:
    "A browser strategy game where buildings create units automatically and players race to destroy the enemy Keep.",
  keywords: ["strategy game", "browser game", "base building", "auto battler", "Keepstorm"],
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon.png", type: "image/png", sizes: "64x64" },
    ],
    shortcut: "/favicon.ico",
    apple: [{ url: "/apple-touch-icon.png", type: "image/png", sizes: "180x180" }],
  },
  openGraph: {
    title: "Keepstorm",
    description: "Build structures that create units automatically, then destroy the enemy Keep.",
    type: "website",
    siteName: "Keepstorm",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "Keepstorm browser strategy game" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Keepstorm",
    description: "Build structures that create units automatically, then destroy the enemy Keep.",
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
