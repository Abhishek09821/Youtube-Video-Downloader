"use client";

import { motion } from "framer-motion";
import SectionReveal from "@/components/ui/SectionReveal";
import HudPanel from "@/components/ui/HudPanel";
import { rise } from "@/lib/motion";

const clusters = [
  {
    title: "Video",
    unit: "Resolution",
    rows: [
      { k: "4K UHD", v: "2160p" },
      { k: "Quad HD", v: "1440p" },
      { k: "Full HD", v: "1080p" },
      { k: "Containers", v: "MP4 · MKV · WEBM" },
    ],
  },
  {
    title: "Audio",
    unit: "Bitrate",
    rows: [
      { k: "Best", v: "320 kbps" },
      { k: "High", v: "256 kbps" },
      { k: "Standard", v: "192 kbps" },
      { k: "Formats", v: "MP3 · FLAC · WAV" },
    ],
  },
  {
    title: "Subtitles",
    unit: "Captions",
    rows: [
      { k: "Manual", v: "Native tracks" },
      { k: "Auto", v: "AI fallback" },
      { k: "Languages", v: "10+" },
      { k: "Export", v: "SRT · VTT · TXT" },
    ],
  },
];

export default function FormatsDashboard() {
  return (
    <section id="formats" className="relative px-6 py-28">
      <SectionReveal className="mx-auto max-w-6xl">
        <motion.span variants={rise} className="eyebrow">
          Dashboard
        </motion.span>
        <motion.h2 variants={rise} className="mt-4 max-w-2xl text-4xl font-bold sm:text-5xl">
          <span className="text-metal">Read the full instrument cluster.</span>
        </motion.h2>

        <div className="mt-14 grid gap-5 md:grid-cols-3">
          {clusters.map((c) => (
            <HudPanel key={c.title} interactive className="p-0">
              <div className="flex items-center justify-between border-b border-[rgba(255,30,46,0.15)] px-6 py-4">
                <span className="font-[family-name:var(--font-orbitron)] text-xl font-bold text-white">
                  {c.title}
                </span>
                <span className="eyebrow">{c.unit}</span>
              </div>
              <dl className="divide-y divide-white/5">
                {c.rows.map((r) => (
                  <div key={r.k} className="flex items-center justify-between px-6 py-3.5">
                    <dt className="text-sm text-silver/70">{r.k}</dt>
                    <dd className="font-[family-name:var(--font-geist-mono)] text-sm text-white">
                      {r.v}
                    </dd>
                  </div>
                ))}
              </dl>
            </HudPanel>
          ))}
        </div>
      </SectionReveal>
    </section>
  );
}
