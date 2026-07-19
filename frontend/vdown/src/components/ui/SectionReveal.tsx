"use client";

import { motion } from "framer-motion";
import { rise, riseStagger } from "@/lib/motion";

/**
 * Cinematic in-view reveal. Wrap a section's content; children using
 * `variants={rise}` will stagger in. Triggers once when scrolled into view.
 */
export default function SectionReveal({
  children,
  className = "",
  stagger = true,
  amount = 0.25,
}: {
  children: React.ReactNode;
  className?: string;
  stagger?: boolean;
  amount?: number;
}) {
  return (
    <motion.div
      className={className}
      variants={stagger ? riseStagger : rise}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount }}
    >
      {children}
    </motion.div>
  );
}
