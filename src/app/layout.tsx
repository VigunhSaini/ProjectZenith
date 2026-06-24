import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Project Zenith — Real-Time Cosmic Radar",
  description:
    "Track satellites, planets, and stars in real-time from any location on Earth. Project Zenith gives you a live sky view powered by CesiumJS and NASA data.",
  keywords: ["astronomy", "satellites", "ISS", "planets", "stars", "celestial", "sky tracker"],
  openGraph: {
    title: "Project Zenith — Real-Time Cosmic Radar",
    description: "Live sky tracking for satellites, planets, and stars.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={inter.variable}>
      <head>
        {/* Cesium CSS — served from public/cesium/ via postinstall copy */}
      {/* eslint-disable-next-line @next/next/no-css-tags */}
        <link rel="stylesheet" href="/cesium/Widgets/widgets.css" />
      </head>
      <body className="antialiased bg-black text-white overflow-hidden">
        {children}
      </body>
    </html>
  );
}
