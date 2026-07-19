"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { assets } from "@/lib/theme";

/**
 * VDOWN brand mark — renders the real logo.png (1024²) with an optional
 * breathing red glow and a soft neon halo behind it. Props kept stable so the
 * intro cinematic and navbar can share the same component.
 */
export default function ShieldMark({
  size = 180,
  breathe = false,
  halo = true,
  priority = false,
  className = "",
}: {
  size?: number;
  /** breathing red drop-shadow (intro / hero) */
  breathe?: boolean;
  /** soft neon glow pool behind the mark */
  halo?: boolean;
  priority?: boolean;
  className?: string;
}) {
  return (
    <div
      className={`relative inline-flex items-center justify-center ${className}`}
      style={{ width: size, height: size }}
    >
      {halo && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 -z-10"
          style={{
            background:
              "radial-gradient(closest-side, rgba(255,30,46,0.45), rgba(255,30,46,0.12) 55%, transparent 75%)",
            transform: "scale(1.5)",
          }}
        />
      )}
      <motion.div
        className={breathe ? "animate-breathe" : ""}
        style={{ width: size, height: size }}
      >
        <Image
          src={assets.logo}
          alt="VDOWN"
          width={size}
          height={size}
          priority={priority}
          className="h-full w-full object-contain drop-shadow-[0_0_18px_rgba(255,30,46,0.35)]"
        />
      </motion.div>
    </div>
  );
}
