"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";

type Props = {
  children: React.ReactNode;
  href?: string;
  onClick?: () => void;
  variant?: "primary" | "ghost";
  className?: string;
};

/**
 * Hypercar CTA. Primary = solid red with glow; ghost = outlined red.
 */
export default function MetalButton({
  children,
  href,
  onClick,
  variant = "primary",
  className = "",
}: Props) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-md px-7 py-3.5 text-sm font-semibold uppercase tracking-[0.15em] transition-all duration-200 active:translate-y-px";
  const styles =
    variant === "primary"
      ? "bg-accent text-white hover:bg-accent-hover hover:glow-red"
      : "border border-[rgba(255,30,46,0.4)] text-silver hover:border-accent hover:text-white hover:glow-red-sm";

  const cls = cn(base, styles, className);

  if (href) {
    return (
      <Link href={href} className={cls}>
        {children}
      </Link>
    );
  }
  return (
    <button type="button" onClick={onClick} className={cls}>
      {children}
    </button>
  );
}
