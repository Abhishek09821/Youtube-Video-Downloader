"use client";

import { motion } from "framer-motion";
import { Gauge, Music4, Captions, Activity, Layers, ShieldCheck } from "lucide-react";
import SectionReveal from "@/components/ui/SectionReveal";
import HudPanel from "@/components/ui/HudPanel";
import { rise } from "@/lib/motion";

const features = [
  { icon: Gauge, title: "4K Video", text: "144p through 2160p in MP4, MKV or WebM containers." },
  { icon: Music4, title: "Studio Audio", text: "Extract up to 320kbps as MP3, FLAC, WAV, AAC or OGG." },
  { icon: Captions, title: "Smart Captions", text: "Manual tracks with AI-generated fallback, 10+ languages." },
  { icon: Activity, title: "Live Telemetry", text: "Real-time speed and progress via job polling." },
  { icon: Layers, title: "Multi-Source", text: "YouTube, Instagram, X, Reddit, TikTok and more." },
  { icon: ShieldCheck, title: "No Clutter", text: "No accounts, no trackers, no fake buttons." },
];

export default function FeaturesHUD() {
  return (
    <section id="features" className="relative px-6 py-28">
      <SectionReveal className="mx-auto max-w-6xl">
        <motion.span variants={rise} className="eyebrow">
          Cockpit
        </motion.span>
        <motion.h2 variants={rise} className="mt-4 max-w-2xl text-4xl font-bold sm:text-5xl">
          <span className="text-metal">Every control within reach.</span>
        </motion.h2>

        <ul className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => {
            const Icon = f.icon;
            return (
              <HudPanel as="li" key={f.title} interactive>
                <span className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-md border border-[rgba(255,30,46,0.3)] bg-accent/10 text-accent glow-red-sm">
                  <Icon className="h-5 w-5" strokeWidth={1.6} />
                </span>
                <h3 className="text-lg font-semibold text-white">{f.title}</h3>
                <p className="mt-2 text-sm text-silver/70">{f.text}</p>
              </HudPanel>
            );
          })}
        </ul>
      </SectionReveal>
    </section>
  );
}
