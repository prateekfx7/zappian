import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "FrameDNA — Video Autopsy & Structure Remix Engine",
  description:
    "Analyse videos frame by frame, uncover growth & retention mechanics with timestamped evidence, and generate original remixes.",
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
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen bg-surface-canvas text-body">
        {children}
      </body>
    </html>
  );
}
