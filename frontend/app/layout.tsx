import type { Metadata, Viewport } from "next";
import "./globals.css";

export const viewport: Viewport = {
  themeColor: "#04070d",
};

export const metadata: Metadata = {
  title: "ShipStack — Deployment Platform",
  description: "Cinematic deployment infrastructure. Submit a repo, watch the build orchestrate, go live.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <head>
        <meta name="color-scheme" content="dark" />
      </head>
      <body className="antialiased">{children}</body>
    </html>
  );
}
