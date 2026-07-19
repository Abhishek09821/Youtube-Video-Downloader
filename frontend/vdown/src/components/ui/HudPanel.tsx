"use client";

import { motion } from "framer-motion";
import { rise } from "@/lib/motion";
import { cn } from "@/lib/utils";

/**
 * A dashboard/HUD panel with notched corners, glass fill and a soft red edge.
 * Use inside a SectionReveal for staggered entrance.
 */
export default function HudPanel({
  children,
  className = "",
  as = "div",
  interactive = false,
}: {
  children: React.ReactNode;
  className?: string;
  as?: "div" | "li";
  interactive?: boolean;
}) {
  const Comp = as === "li" ? motion.li : motion.div;
  return (
    <Comp
      variants={rise}
      className={cn(
        "hud-frame p-6 transition-shadow duration-300",
        interactive && "hover:glow-red-sm",
        className,
      )}
    >
      {children}
    </Comp>
  );
}
