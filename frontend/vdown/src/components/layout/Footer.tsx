import Link from "next/link";
import ShieldMark from "@/components/intro/ShieldMark";

export default function Footer() {
  return (
    <footer className="carbon relative border-t border-[rgba(255,30,46,0.15)]">
      <div className="mx-auto grid max-w-6xl gap-10 px-6 py-16 md:grid-cols-[1.6fr_1fr_1fr]">
        <div>
          <div className="flex items-center gap-3">
            <ShieldMark size={40} halo={false} />
            <span className="font-[family-name:var(--font-orbitron)] text-xl font-bold tracking-widest">
              VDOWN
            </span>
          </div>
          <p className="mt-4 max-w-xs text-sm text-silver/70">
            A high-performance media engine. Engineered for speed, precision and
            zero clutter.
          </p>
        </div>

        <div className="flex flex-col gap-3 text-sm">
          <h4 className="eyebrow mb-1">Product</h4>
          <a className="text-silver/70 transition-colors hover:text-white" href="#features">Features</a>
          <a className="text-silver/70 transition-colors hover:text-white" href="#formats">Formats</a>
          <a className="text-silver/70 transition-colors hover:text-white" href="#performance">Performance</a>
        </div>

        <div className="flex flex-col gap-3 text-sm">
          <h4 className="eyebrow mb-1">Company</h4>
          <Link className="text-silver/70 transition-colors hover:text-white" href="#">About</Link>
          <Link className="text-silver/70 transition-colors hover:text-white" href="#">Privacy</Link>
        </div>
      </div>
      <div className="border-t border-white/5">
        <div className="mx-auto max-w-6xl px-6 py-5 text-xs text-silver/50">
          © {new Date().getFullYear()} VDOWN · yt-dlp powered · Personal use only
        </div>
      </div>
    </footer>
  );
}
