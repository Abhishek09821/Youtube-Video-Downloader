"use client";

import { motion } from "framer-motion";
import MetalButton from "@/components/ui/MetalButton";
import { rise, riseStagger } from "@/lib/motion";
import { useExperience } from "@/providers/ExperienceProvider";

export default function Hero() {
  const { introDone } = useExperience();

  return (
    <section
      id="top"
      className="relative flex min-h-screen items-center justify-center px-6 pt-24"
    >
      <motion.div
        className="mx-auto max-w-4xl text-center"
        variants={riseStagger}
        initial="hidden"
        animate={introDone ? "show" : "hidden"}
      >
        <motion.span variants={rise} className="eyebrow">
          High-Performance Media Engine
        </motion.span>

        <motion.h1
          variants={rise}
          className="mt-6 text-5xl font-extrabold leading-[1.05] sm:text-7xl"
        >
          <span className="text-metal">Download at</span>{" "}
          <span className="text-accent-metal">Hypercar</span>
          <br />
          <span className="text-metal">Speed.</span>
        </motion.h1>

        <motion.p
          variants={rise}
          className="mx-auto mt-6 max-w-xl text-base text-silver/80 sm:text-lg"
        >
          4K video. Studio-grade audio. Precise captions. VDOWN turns any link
          into a clean file — engineered like a track machine, tuned for zero
          clutter.
        </motion.p>

        <motion.div
          variants={rise}
          className="mt-10 flex items-center justify-center gap-4"
        >
          <MetalButton href="#app">Launch App</MetalButton>
          <MetalButton href="#performance" variant="ghost">
            View Specs
          </MetalButton>
        </motion.div>
      </motion.div>

      {/* Scroll cue */}
      <motion.div
        className="absolute bottom-8 left-1/2 -translate-x-1/2"
        animate={{ y: [0, 8, 0], opacity: [0.4, 1, 0.4] }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
      >
        <span className="block h-9 w-5 rounded-full border border-[rgba(255,30,46,0.5)]">
          <span className="mx-auto mt-1.5 block h-2 w-0.5 rounded-full bg-accent" />
        </span>
      </motion.div>
    </section>
  );
}
