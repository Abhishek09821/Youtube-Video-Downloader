"use client";

import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import SectionReveal from "@/components/ui/SectionReveal";
import HudPanel from "@/components/ui/HudPanel";
import { rise } from "@/lib/motion";
import { motion } from "framer-motion";

gsap.registerPlugin(ScrollTrigger);

const READOUTS = [
  { label: "Max Resolution", value: 2160, suffix: "p", display: (v: number) => Math.round(v).toString() },
  { label: "Audio Bitrate", value: 320, suffix: "kbps", display: (v: number) => Math.round(v).toString() },
  { label: "Caption Languages", value: 100, suffix: "+", display: (v: number) => Math.round(v).toString() },
];

// Needle sweeps across a 240° arc.
const MIN_ANGLE = -120;
const MAX_ANGLE = 120;

export default function SpeedometerStats() {
  const root = useRef<HTMLDivElement | null>(null);
  const needle = useRef<SVGGElement | null>(null);
  const readoutRefs = useRef<(HTMLSpanElement | null)[]>([]);

  useEffect(() => {
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const ctx = gsap.context(() => {
      if (prefersReduced) {
        // Snap to final state without scrubbing.
        gsap.set(needle.current, { rotation: MAX_ANGLE, transformOrigin: "50% 100%" });
        READOUTS.forEach((r, i) => {
          const el = readoutRefs.current[i];
          if (el) el.textContent = r.display(r.value);
        });
        return;
      }

      // Needle sweep tied to scroll progress through the section.
      gsap.fromTo(
        needle.current,
        { rotation: MIN_ANGLE, transformOrigin: "50% 100%" },
        {
          rotation: MAX_ANGLE,
          ease: "none",
          scrollTrigger: {
            trigger: root.current,
            start: "top 75%",
            end: "bottom 60%",
            scrub: 0.6,
          },
        },
      );

      // Count-up readouts.
      READOUTS.forEach((r, i) => {
        const el = readoutRefs.current[i];
        if (!el) return;
        const obj = { v: 0 };
        gsap.to(obj, {
          v: r.value,
          ease: "none",
          scrollTrigger: {
            trigger: root.current,
            start: "top 75%",
            end: "bottom 60%",
            scrub: 0.6,
          },
          onUpdate: () => { el.textContent = r.display(obj.v); },
        });
      });
    }, root);

    return () => ctx.revert();
  }, []);

  return (
    <section id="performance" ref={root} className="relative px-6 py-28">
      <SectionReveal className="mx-auto max-w-6xl">
        <motion.span variants={rise} className="eyebrow">
          Performance
        </motion.span>
        <motion.h2 variants={rise} className="mt-4 max-w-2xl text-4xl font-bold sm:text-5xl">
          <span className="text-metal">Instrument-grade throughput.</span>
        </motion.h2>

        <div className="mt-14 grid items-center gap-12 lg:grid-cols-[420px_1fr]">
          {/* Speedometer */}
          <motion.div variants={rise} className="mx-auto">
            <Gauge needleRef={needle} />
          </motion.div>

          {/* Digital readouts */}
          <ul className="grid gap-5 sm:grid-cols-3 lg:grid-cols-1">
            {READOUTS.map((r, i) => (
              <HudPanel as="li" key={r.label} interactive className="flex items-baseline justify-between">
                <span className="text-sm uppercase tracking-widest text-silver/70">
                  {r.label}
                </span>
                <span className="font-[family-name:var(--font-orbitron)] text-3xl font-bold text-white">
                  <span ref={(el) => { readoutRefs.current[i] = el; }}>0</span>
                  <span className="ml-1 text-lg text-accent">{r.suffix}</span>
                </span>
              </HudPanel>
            ))}
          </ul>
        </div>
      </SectionReveal>
    </section>
  );
}

function Gauge({ needleRef }: { needleRef: React.RefObject<SVGGElement | null> }) {
  // Tick marks around a 240° arc.
  const ticks = Array.from({ length: 25 }, (_, i) => {
    const angle = -120 + (240 / 24) * i;
    return { angle, major: i % 4 === 0 };
  });

  return (
    <svg viewBox="0 0 300 300" width={380} height={380} className="max-w-full">
      <defs>
        <radialGradient id="gaugeFace" cx="50%" cy="50%" r="60%">
          <stop offset="0%" stopColor="#141414" />
          <stop offset="100%" stopColor="#0a0a0a" />
        </radialGradient>
        <linearGradient id="needleGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ff5560" />
          <stop offset="100%" stopColor="#9e0018" />
        </linearGradient>
      </defs>

      <circle cx="150" cy="150" r="140" fill="url(#gaugeFace)" stroke="#2b2b2b" strokeWidth="2" />
      <circle cx="150" cy="150" r="140" fill="none" stroke="#ff1e2e" strokeWidth="1" opacity="0.25" />

      {/* Ticks */}
      <g>
        {ticks.map((t, i) => (
          <line
            key={i}
            x1="150"
            y1="30"
            x2="150"
            y2={t.major ? 48 : 40}
            stroke={t.major ? "#ff1e2e" : "#5a5a5a"}
            strokeWidth={t.major ? 3 : 1.5}
            transform={`rotate(${t.angle} 150 150)`}
            opacity={t.major ? 0.9 : 0.6}
          />
        ))}
      </g>

      {/* Redline arc */}
      <path
        d="M 150 30 A 120 120 0 0 1 254 210"
        fill="none"
        stroke="#ff1e2e"
        strokeWidth="4"
        opacity="0.5"
        transform="rotate(6 150 150)"
        style={{ filter: "drop-shadow(0 0 6px rgba(255,30,46,0.6))" }}
      />

      {/* Needle (pivot at 150,150) */}
      <g ref={needleRef}>
        <polygon points="150,44 145,150 155,150" fill="url(#needleGrad)" style={{ filter: "drop-shadow(0 0 6px rgba(255,30,46,0.7))" }} />
      </g>
      <circle cx="150" cy="150" r="12" fill="#1a1a1a" stroke="#ff1e2e" strokeWidth="2" />
      <circle cx="150" cy="150" r="4" fill="#ff1e2e" />

      <text x="150" y="220" textAnchor="middle" className="fill-silver" style={{ fontSize: 11, letterSpacing: 3, textTransform: "uppercase" }}>
        Engine RPM
      </text>
    </svg>
  );
}
