"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import ShieldMark from "@/components/intro/ShieldMark";
import MetalButton from "@/components/ui/MetalButton";
import { useExperience } from "@/providers/ExperienceProvider";
import { EASE_OUT } from "@/lib/motion";

const links = [
  { href: "#performance", label: "Performance" },
  { href: "#features", label: "Features" },
  { href: "#formats", label: "Formats" },
];

export default function Navbar() {
  const { introDone } = useExperience();

  return (
    <motion.header
      initial={{ y: -80, opacity: 0 }}
      animate={introDone ? { y: 0, opacity: 1 } : { y: -80, opacity: 0 }}
      transition={{ duration: 0.7, ease: EASE_OUT, delay: 0.2 }}
      className="fixed inset-x-0 top-0 z-50"
    >
      <div className="mx-auto mt-4 flex max-w-6xl items-center justify-between rounded-full border border-[rgba(255,30,46,0.15)] bg-black/40 px-4 py-2.5 backdrop-blur-xl sm:px-6">
        <Link href="#top" className="flex items-center gap-2.5">
          <ShieldMark size={34} halo={false} />
          <span className="font-[family-name:var(--font-orbitron)] text-lg font-bold tracking-widest">
            VDOWN
          </span>
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          {links.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="text-sm uppercase tracking-widest text-silver/70 transition-colors hover:text-white"
            >
              {l.label}
            </a>
          ))}
        </nav>

        <MetalButton href="#app" className="px-5 py-2.5 text-xs">
          Launch App
        </MetalButton>
      </div>
    </motion.header>
  );
}
