import type { Metadata } from "next";
import { Geist_Mono, Instrument_Serif } from "next/font/google";
import MotionProvider from "@/components/motion/MotionProvider";
import "./globals.css";

// Mono labels/eyebrows/FHENIX marks. Geist Mono is a variable font (covers 400–500).
const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Accent serif — used only for the italic word "private" in the headline.
const instrumentSerif = Instrument_Serif({
  variable: "--font-instrument-serif",
  weight: "400",
  style: "italic",
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
        <MotionProvider>{children}</MotionProvider>
      </body>
    </html>
  );
}
