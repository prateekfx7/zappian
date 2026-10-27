import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ReelBrain — Video Autopsy & Remix Engine",
  description:
    "Analyze reels and TikToks frame by frame, uncover retention mechanics with timestamped evidence, and remix original concepts.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600&family=Geist+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen bg-neutral text-ink antialiased selection:bg-primary selection:text-tertiary">
        {children}
      </body>
    </html>
  );
}
