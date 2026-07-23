import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "TwelveFrame — AI reel production studio",
    template: "%s · TwelveFrame",
  },
  description: "Create twelve consistent six-second portrait clips with one Gemini API key.",
  openGraph: {
    title: "TwelveFrame — AI reel production studio",
    description: "Twelve shots. One visual world.",
    images: [{ url: "/opengraph-image.png", width: 1200, height: 630, alt: "TwelveFrame fashion reel production studio" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "TwelveFrame — AI reel production studio",
    description: "Twelve shots. One visual world.",
    images: ["/opengraph-image.png"],
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
