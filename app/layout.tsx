import type { Metadata } from "next";
import { Geist_Mono, Instrument_Serif } from "next/font/google";
import MotionProvider from "@/components/motion/MotionProvider";
import SmoothScroll from "@/components/motion/SmoothScroll";
import "lenis/dist/lenis.css";
import "./globals.css";

// Mono labels/eyebrows/FHENIX marks. Geist Mono is a variable font (covers 400–500).
const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Accent serif — italic for the accent words in headlines ("yield", "value", "Money",
// "Dual-mode"), and upright for the big "LIVE ON ARBITRUM SOON" footer headline. Load both
// styles so `.font-serif` renders correctly with or without the `italic` utility.
const instrumentSerif = Instrument_Serif({
  variable: "--font-instrument-serif",
  weight: "400",
  style: ["normal", "italic"],
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "fUSD — The dual-mode dollar with yield",
  description:
    "Confidential by default — public when you want. One token, one toggle, two modes.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistMono.variable} ${instrumentSerif.variable} h-full antialiased`}
    >
      <body className="min-h-full">
        <MotionProvider>
          <SmoothScroll>{children}</SmoothScroll>
        </MotionProvider>
      </body>
    </html>
  );
}
