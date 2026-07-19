"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import ShieldMark from "./ShieldMark";
import { useExperience } from "@/providers/ExperienceProvider";
import { assets } from "@/lib/theme";
import { EASE_IN_OUT, EASE_OUT } from "@/lib/motion";

const SESSION_KEY = "vdown-intro-seen";

// Timeline (ms) after the tap.
const T = {
  headlightBlink: 0,
  gateOpen: 1300,
  engine: 1300,
  reveal: 2500,
  finish: 3900,
  reduced: 900,
};

type Phase = "idle" | "playing";

export default function IntroSequence() {
  const reduce = useReducedMotion();
  const { setIntroDone, setAudioUnlocked } = useExperience();
  const [phase, setPhase] = useState<Phase>("idle");
  const [visible, setVisible] = useState(true);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (sessionStorage.getItem(SESSION_KEY)) {
      setVisible(false);
      setIntroDone(true);
    }
  }, [setIntroDone]);

  const finish = useCallback(() => {
    sessionStorage.setItem(SESSION_KEY, "1");
    setVisible(false);
    setIntroDone(true);
  }, [setIntroDone]);

  const start = useCallback(() => {
    if (phase !== "idle") return;
    setPhase("playing");

    if (reduce) {
      window.setTimeout(finish, T.reduced);
      return;
    }

    // Engine ignition fires as the gates open (the tap already unlocked audio).
    window.setTimeout(() => {
      const audio = new Audio(assets.ignition);
      audio.volume = 0.85;
      audioRef.current = audio;
      audio.play().then(() => setAudioUnlocked(true)).catch(() => {});
    }, T.engine);

    window.setTimeout(finish, T.finish);
  }, [phase, reduce, finish, setAudioUnlocked]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && phase === "playing") finish();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase, finish]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-center justify-center overflow-hidden bg-black"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.8, ease: EASE_IN_OUT } }}
        >
          {/* ===== IDLE: minimal tap prompt (Linear-style restraint) ===== */}
          <AnimatePresence>
            {phase === "idle" && (
              <motion.button
                type="button"
                onClick={start}
                className="absolute inset-0 flex flex-col items-center justify-center gap-5"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0, transition: { duration: 0.3 } }}
                aria-label="Start the VDOWN intro"
              >
                <motion.span
                  aria-hidden
                  className="h-14 w-14 rounded-full border border-white/25"
                  animate={reduce ? {} : { scale: [1, 1.12, 1], opacity: [0.4, 1, 0.4] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                />
                <span className="text-xs uppercase tracking-[0.4em] text-white/60">
                  Tap to start
                </span>
              </motion.button>
            )}
          </AnimatePresence>

          {/* ===== PLAYING ===== */}
          {phase === "playing" && (
            <>
              {/* Headlights blink (car front) */}
              {!reduce && <Headlights />}

              {/* Gate doors */}
              {!reduce && (
                <>
                  <motion.div
                    className="metal absolute inset-y-0 left-0 z-20 w-1/2 border-r border-[rgba(255,30,46,0.5)]"
                    initial={{ x: 0 }}
                    animate={{ x: "-100%" }}
                    transition={{ duration: 1.1, ease: EASE_IN_OUT, delay: T.gateOpen / 1000 }}
                  >
                    <span className="absolute right-0 top-0 h-full w-[2px] bg-accent glow-red" />
                  </motion.div>
                  <motion.div
                    className="metal absolute inset-y-0 right-0 z-20 w-1/2 border-l border-[rgba(255,30,46,0.5)]"
                    initial={{ x: 0 }}
                    animate={{ x: "100%" }}
                    transition={{ duration: 1.1, ease: EASE_IN_OUT, delay: T.gateOpen / 1000 }}
                  >
                    <span className="absolute left-0 top-0 h-full w-[2px] bg-accent glow-red" />
                  </motion.div>
                </>
              )}

              {/* Reveal: logo + wordmark */}
              <div className="relative z-10 flex flex-col items-center gap-7">
                <motion.div
                  initial={{ opacity: 0, scale: reduce ? 1 : 0.85 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{
                    duration: reduce ? 0.5 : 0.9,
                    delay: reduce ? 0 : T.reveal / 1000,
                    ease: EASE_OUT,
                  }}
                >
                  <ShieldMark size={190} breathe={!reduce} priority />
                </motion.div>
                <motion.div
                  className="text-center"
                  initial={{ opacity: 0, y: reduce ? 0 : 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: reduce ? 0.2 : (T.reveal + 400) / 1000, ease: EASE_OUT }}
                >
                  <h1 className="text-metal text-5xl font-extrabold tracking-[0.25em] sm:text-7xl">
                    VDOWN
                  </h1>
                  <p className="eyebrow mt-3 opacity-80">Media Engine</p>
                </motion.div>
              </div>

              <button
                type="button"
                onClick={finish}
                className="absolute bottom-6 right-6 z-30 rounded-full border border-white/15 px-4 py-1.5 text-xs uppercase tracking-widest text-white/60 transition-colors hover:border-accent hover:text-white"
              >
                Skip
              </button>
            </>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/** Two headlight beams that flicker on (double blink), then hold. */
function Headlights() {
  const blink = { opacity: [0, 0.25, 0, 0.9, 0.55, 1], scale: [0.9, 1, 0.95, 1.05, 1, 1] };
  const t = { duration: 1.25, ease: "easeInOut" as const, times: [0, 0.15, 0.3, 0.5, 0.7, 1] };
  return (
    <div className="absolute inset-0 z-0 flex items-center justify-center">
      <div className="flex gap-24 sm:gap-40">
        {[0, 1].map((i) => (
          <motion.div
            key={i}
            className="h-24 w-24 rounded-full sm:h-32 sm:w-32"
            style={{
              background:
                "radial-gradient(circle, rgba(255,255,255,0.95) 0%, rgba(255,220,180,0.5) 35%, rgba(255,30,46,0.12) 70%, transparent 80%)",
              filter: "blur(2px)",
            }}
            initial={{ opacity: 0 }}
            animate={blink}
            transition={t}
          />
        ))}
      </div>
    </div>
  );
}
