import type { Metadata } from "next";
import { Geist_Mono, Inter, Orbitron } from "next/font/google";
import "./globals.css";
import SmoothScroll from "@/providers/SmoothScroll";
import { ExperienceProvider } from "@/providers/ExperienceProvider";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const orbitron = Orbitron({
  variable: "--font-orbitron",
  subsets: ["latin"],
  weight: ["500", "600", "700", "800", "900"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "VDOWN — Cinematic Media Engine",
  description:
    "VDOWN is a high-performance media downloader engineered like a hypercar. 4K video, studio audio and precise captions.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${orbitron.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-ink text-foreground">
        <ExperienceProvider>
          <SmoothScroll>{children}</SmoothScroll>
        </ExperienceProvider>
      </body>
    </html>
  );
}
