"use client";

import { createContext, useContext, useMemo, useState } from "react";

type ExperienceState = {
  /** true once the intro cinematic has finished (or been skipped). */
  introDone: boolean;
  setIntroDone: (v: boolean) => void;
  /** true once the user gesture has unlocked audio playback. */
  audioUnlocked: boolean;
  setAudioUnlocked: (v: boolean) => void;
};

const ExperienceContext = createContext<ExperienceState | null>(null);

export function ExperienceProvider({ children }: { children: React.ReactNode }) {
  const [introDone, setIntroDone] = useState(false);
  const [audioUnlocked, setAudioUnlocked] = useState(false);

  const value = useMemo(
    () => ({ introDone, setIntroDone, audioUnlocked, setAudioUnlocked }),
    [introDone, audioUnlocked],
  );

  return (
    <ExperienceContext.Provider value={value}>
      {children}
    </ExperienceContext.Provider>
  );
}

export function useExperience() {
  const ctx = useContext(ExperienceContext);
  if (!ctx) throw new Error("useExperience must be used within ExperienceProvider");
  return ctx;
}
