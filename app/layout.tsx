import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Keepstorm — Build the line. Break the keep.",
  description:
    "Raise enchanted Musterworks, counter the rival line, and break the opposing Heartkeep in this original lane strategy prototype.",
  keywords: ["strategy game", "browser game", "auto battler", "Keepstorm"],
  icons: {
    icon: "/keepstorm-social-card.jpg",
    shortcut: "/keepstorm-social-card.jpg",
  },
  openGraph: {
    title: "Keepstorm",
    description: "Build the line. Break the keep.",
    type: "website",
    images: [{ url: "/keepstorm-social-card.jpg", width: 1731, height: 909, alt: "Two living enchanted keeps facing across a storm-lit battlefield" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Keepstorm",
    description: "Build the line. Break the keep.",
    images: ["/keepstorm-social-card.jpg"],
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
