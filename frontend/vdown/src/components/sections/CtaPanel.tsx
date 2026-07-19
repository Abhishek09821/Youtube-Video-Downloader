"use client";

import { motion } from "framer-motion";
import MetalButton from "@/components/ui/MetalButton";
import SectionReveal from "@/components/ui/SectionReveal";
import ShieldMark from "@/components/intro/ShieldMark";
import { rise } from "@/lib/motion";

export default function CtaPanel() {
  return (
    <section id="cta" className="relative px-6 py-28">
      <SectionReveal className="mx-auto max-w-4xl">
        <motion.div
          variants={rise}
          className="hud-frame relative overflow-hidden px-8 py-16 text-center sm:px-16"
        >
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "radial-gradient(60% 60% at 50% 0%, rgba(255,30,46,0.18), transparent 70%)",
            }}
          />
          <div className="relative flex flex-col items-center">
            <ShieldMark size={72} breathe />
            <h2 className="mt-6 text-4xl font-extrabold sm:text-5xl">
              <span className="text-metal">Start the engine.</span>
            </h2>
            <p className="mx-auto mt-4 max-w-md text-silver/80">
              Paste a link, pick a format, and pull the file at full speed. No
              accounts. No clutter.
            </p>
            <div className="mt-9">
              <MetalButton href="#top">Launch VDOWN</MetalButton>
            </div>
          </div>
        </motion.div>
      </SectionReveal>
    </section>
  );
}
