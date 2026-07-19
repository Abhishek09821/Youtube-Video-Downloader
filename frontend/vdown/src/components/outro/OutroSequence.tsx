"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { assets } from "@/lib/theme";

/**
 * Cinematic outro after the footer. When scrolled into view, the outro video
 * plays once (car accelerates away) then fades to black. If the video is
 * missing, falls back to the hero frame dimming to black. No looping.
 */
export default function OutroSequence() {
  const root = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [inView, setInView] = useState(false);
  const [failed, setFailed] = useState(false);
  const [ended, setEnded] = useState(false);

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          io.disconnect();
        }
      },
      { threshold: 0.5 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!inView) return;
    const v = videoRef.current;
    if (v && !failed) {
      v.play().catch(() => setFailed(true));
    }
  }, [inView, failed]);

  return (
    <section
      ref={root}
      className="relative flex h-screen items-center justify-center overflow-hidden bg-black"
    >
      {!failed ? (
        <video
          ref={videoRef}
          className="absolute inset-0 h-full w-full object-cover"
          muted
          playsInline
          preload="none"
          poster={assets.hero}
          onEnded={() => setEnded(true)}
          onError={() => setFailed(true)}
        >
          <source src={assets.outro} type="video/mp4" />
        </video>
      ) : (
        // Fallback: hero frame slowly dimming, "accelerates away" feel.
        <motion.div
          className="absolute inset-0"
          initial={{ scale: 1.05, opacity: 0.6 }}
          animate={inView ? { scale: 1.25, opacity: 0 } : {}}
          transition={{ duration: 3.2, ease: [0.65, 0, 0.35, 1] }}
        >
          <Image src={assets.hero} alt="" fill priority={false} sizes="100vw" className="object-cover" />
        </motion.div>
      )}

      {/* Fade-to-black overlay once the clip ends (or immediately for fallback) */}
      <motion.div
        className="absolute inset-0 bg-black"
        initial={{ opacity: failed ? 0 : 0 }}
        animate={{ opacity: ended || failed ? (inView ? 1 : 0) : 0 }}
        transition={{ duration: failed ? 3.4 : 1.2, ease: "easeInOut" }}
      />

      {/* Sign-off */}
      <motion.div
        className="relative text-center"
        initial={{ opacity: 0 }}
        animate={inView ? { opacity: 1 } : {}}
        transition={{ duration: 1, delay: failed ? 2.4 : 0.2 }}
      >
        <p className="font-[family-name:var(--font-orbitron)] text-2xl font-bold tracking-[0.3em] text-silver sm:text-3xl">
          SEE YOU ON THE TRACK
        </p>
      </motion.div>
    </section>
  );
}
