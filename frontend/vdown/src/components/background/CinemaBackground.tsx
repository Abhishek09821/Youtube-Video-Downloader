"use client";

import Image from "next/image";
import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import { assets } from "@/lib/theme";
import ParticleField from "./ParticleField";

/**
 * hero.png as the living background of the whole site. One image, subtle
 * Framer motion (slow Ken-Burns drift + scroll parallax), plus a dark
 * legibility scrim so foreground content stays readable. 60-30-10 friendly:
 * the image + dark grade own the 60/30, red is only in faint glows.
 */
export default function CinemaBackground() {
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll();

  const y = useTransform(scrollYProgress, [0, 1], ["0%", reduce ? "0%" : "-10%"]);
  const scale = useTransform(scrollYProgress, [0, 1], [1.02, reduce ? 1.02 : 1.1]);

  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-ink">
      {/* Hero image — dominant, with parallax + slow drift */}
      <motion.div className="absolute inset-0" style={{ y, scale }}>
        <motion.div
          className="absolute inset-0"
          initial={false}
          animate={reduce ? {} : { scale: [1, 1.05, 1], x: ["0%", "-1.2%", "0%"] }}
          transition={{ duration: 36, ease: "easeInOut", repeat: Infinity }}
        >
          <Image
            src={assets.hero}
            alt=""
            fill
            priority
            sizes="100vw"
            className="object-cover opacity-90"
          />
        </motion.div>
      </motion.div>

      {/* Drifting fog / atmosphere */}
      {!reduce && (
        <motion.div
          className="absolute -inset-1/4 opacity-30"
          style={{
            background:
              "radial-gradient(45% 45% at 70% 40%, rgba(120,120,140,0.10), transparent 70%)",
          }}
          animate={{ x: ["3%", "-3%", "3%"], y: ["1%", "-2%", "1%"] }}
          transition={{ duration: 34, ease: "easeInOut", repeat: Infinity }}
        />
      )}

      {/* Moving light streak (headlight sweep) */}
      {!reduce && (
        <motion.div
          className="absolute top-0 h-full w-48 blur-3xl"
          style={{
            background:
              "linear-gradient(90deg, transparent, rgba(255,60,70,0.08), transparent)",
          }}
          animate={{ left: ["-20%", "120%"] }}
          transition={{ duration: 14, ease: "easeInOut", repeat: Infinity, repeatDelay: 7 }}
        />
      )}

      <ParticleField density={0.6} />

      {/* Legibility grade: darken top & bottom, keep the car visible in the middle */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(180deg, rgba(10,10,10,0.82) 0%, rgba(10,10,10,0.35) 32%, rgba(10,10,10,0.45) 62%, rgba(10,10,10,0.92) 100%)",
        }}
      />
      {/* Faint red horizon glow (accent, ~10%) */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(70% 40% at 50% 8%, rgba(255,30,46,0.10), transparent 60%)",
        }}
      />
      {/* Edge vignette */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(120% 100% at 50% 45%, transparent 60%, rgba(0,0,0,0.6) 100%)",
        }}
      />
    </div>
  );
}
