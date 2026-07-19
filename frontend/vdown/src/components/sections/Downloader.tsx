"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import { ClipboardPaste, Link2, Loader2, X } from "lucide-react";
import { api, type JobStatus, type MediaInfo, type SubLine } from "@/lib/api";
import { humanSize, isValidUrl, parseDuration, SUB_LANGS } from "@/lib/format";
import MetalButton from "@/components/ui/MetalButton";

const VIDEO_ROWS = [
  { q: "2160", label: "4K", res: "3840 × 2160", mbps: 45 },
  { q: "1440", label: "2K", res: "2560 × 1440", mbps: 16 },
  { q: "1080", label: "1080p", res: "1920 × 1080", mbps: 8 },
  { q: "720", label: "720p", res: "1280 × 720", mbps: 5 },
  { q: "480", label: "480p", res: "854 × 480", mbps: 2.5 },
  { q: "360", label: "360p", res: "640 × 360", mbps: 1 },
];
const VIDEO_FORMATS = ["mp4", "mkv", "webm"];
const AUDIO_ROWS = [
  { kbps: "320", label: "Best", res: "320 kbps", abr: 320 },
  { kbps: "256", label: "High", res: "256 kbps", abr: 256 },
  { kbps: "192", label: "Standard", res: "192 kbps", abr: 192 },
  { kbps: "128", label: "Compact", res: "128 kbps", abr: 128 },
];
const AUDIO_FORMATS = ["mp3", "flac", "wav", "aac", "ogg"];
const SUB_FORMATS = ["srt", "vtt", "txt"];
const TABS = [
  { id: "video", label: "Video" },
  { id: "audio", label: "Audio" },
  { id: "subtitle", label: "Subtitles" },
] as const;
type TabId = (typeof TABS)[number]["id"];

type Job = (JobStatus & { rowId: string }) | null;

function statusLabel(job: JobStatus) {
  switch (job.status) {
    case "starting": return "Connecting…";
    case "downloading": return "Downloading…";
    case "processing": return "Processing…";
    case "enhancing": return "AI enhancing…";
    case "done": return "Complete";
    default: return job.status || "Working…";
  }
}

export default function Downloader() {
  const [url, setUrl] = useState("");
  const [analysedUrl, setAnalysedUrl] = useState("");
  const [phase, setPhase] = useState<"input" | "loading" | "ready">("input");
  const [info, setInfo] = useState<MediaInfo | null>(null);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<TabId>("video");

  const [videoFormat, setVideoFormat] = useState("mp4");
  const [audioFormat, setAudioFormat] = useState("mp3");
  const [subLang, setSubLang] = useState("en");
  const [subFormat, setSubFormat] = useState("srt");

  const [job, setJob] = useState<Job>(null);
  const [fileUrl, setFileUrl] = useState("");
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [subLines, setSubLines] = useState<SubLine[] | null>(null);
  const [subMeta, setSubMeta] = useState<{ lang: string; kind: string; count: number } | null>(null);
  const [subLoading, setSubLoading] = useState(false);

  useEffect(() => () => { if (pollRef.current) clearInterval(pollRef.current); }, []);

  const durationSec = parseDuration(info?.duration);
  const nativeHeights = (info?.available_qualities || [])
    .map((q) => parseInt(q.quality, 10))
    .filter(Boolean);
  const nativeMax = nativeHeights.length ? Math.max(...nativeHeights) : 0;

  function stopPoll() { if (pollRef.current) clearInterval(pollRef.current); }

  async function handleAnalyse() {
    const clean = url.trim();
    if (!isValidUrl(clean)) {
      setError("Enter a valid link starting with http:// or https://");
      return;
    }
    stopPoll();
    setPhase("loading");
    setError("");
    setInfo(null); setJob(null); setFileUrl("");
    setSubLines(null); setSubMeta(null); setTab("video");
    try {
      const d = await api.info(clean);
      if (d.error) { setError(d.error); setPhase("input"); return; }
      setInfo(d); setAnalysedUrl(clean); setPhase("ready");
    } catch {
      setError("Cannot reach the engine. Is the backend running on :8080?");
      setPhase("input");
    }
  }

  function resetAll() {
    stopPoll();
    setUrl(""); setAnalysedUrl(""); setPhase("input");
    setInfo(null); setError(""); setJob(null); setFileUrl("");
    setSubLines(null); setSubMeta(null); setTab("video");
  }

  function pollJob(jobId: string, rowId: string) {
    stopPoll();
    pollRef.current = setInterval(async () => {
      try {
        const d = await api.status(jobId);
        setJob({ ...d, rowId });
        if (d.status === "done") { stopPoll(); setFileUrl(api.fileUrl(jobId)); }
        else if (d.status === "error") { stopPoll(); setError(d.error || "Download failed."); }
      } catch {
        stopPoll(); setError("Lost connection to the engine.");
      }
    }, 800);
  }

  async function startVideo(row: (typeof VIDEO_ROWS)[number], enhance = false) {
    setError(""); setFileUrl("");
    setJob({ status: "starting", progress: 0, rowId: `v-${row.q}` });
    try {
      const d = await api.downloadVideo(analysedUrl, row.q + "p", videoFormat, enhance);
      if (d.error || !d.job_id) { setError(d.error || "Failed to start."); setJob(null); return; }
      pollJob(d.job_id, `v-${row.q}`);
    } catch { setError("Cannot reach the engine."); setJob(null); }
  }

  async function startAudio(row: (typeof AUDIO_ROWS)[number]) {
    setError(""); setFileUrl("");
    setJob({ status: "starting", progress: 0, rowId: `a-${row.kbps}` });
    try {
      const d = await api.downloadAudio(analysedUrl, row.kbps, audioFormat);
      if (d.error || !d.job_id) { setError(d.error || "Failed to start."); setJob(null); return; }
      pollJob(d.job_id, `a-${row.kbps}`);
    } catch { setError("Cannot reach the engine."); setJob(null); }
  }

  function stopDownload() { stopPoll(); setJob(null); setFileUrl(""); }

  async function handleViewSubtitles() {
    setSubLoading(true); setSubLines(null); setSubMeta(null); setError("");
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 50000);
      const d = await api.viewSubtitles(analysedUrl, subLang, ctrl.signal);
      clearTimeout(t);
      if (d.error) { setError(d.error); return; }
      setSubLines(d.lines || []);
      setSubMeta({ lang: d.lang, kind: d.kind, count: d.count });
    } catch {
      setError("Cannot reach the engine (or timed out).");
    } finally { setSubLoading(false); }
  }

  async function handleDownloadSubtitle() {
    setError(""); setFileUrl("");
    setJob({ status: "starting", progress: 5, rowId: "sub" });
    try {
      const d = await api.downloadSubtitle(analysedUrl, subLang, subFormat);
      if (d.error || !d.job_id) { setError(d.error || "Failed to start."); setJob(null); return; }
      pollJob(d.job_id, "sub");
    } catch { setError("Cannot reach the engine."); setJob(null); }
  }

  return (
    <section id="app" className="relative px-6 py-24">
      <div className="mx-auto max-w-5xl">
        <div className="text-center">
          <span className="eyebrow">The Engine Room</span>
          <h2 className="mt-4 text-4xl font-bold sm:text-5xl">
            <span className="text-metal">Paste a link. Pull the file.</span>
          </h2>
        </div>

        {/* URL bar */}
        <div className="mx-auto mt-10 max-w-3xl">
          <UrlInput url={url} setUrl={setUrl} onSubmit={handleAnalyse} loading={phase === "loading"} />
          <div className="mt-3 flex items-center justify-center gap-3 text-xs text-silver/60">
            <HealthBadge />
            {phase === "ready" && (
              <button onClick={resetAll} className="rounded-full border border-white/10 px-3 py-1.5 font-medium transition-colors hover:border-accent hover:text-white">
                New download
              </button>
            )}
          </div>
        </div>

        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
              className="mx-auto mt-6 flex max-w-3xl items-center justify-between gap-4 rounded-lg border border-accent/40 bg-accent/10 px-4 py-3 text-sm text-white"
            >
              <span>{error}</span>
              <button onClick={() => setError("")} className="shrink-0 text-xs font-semibold text-accent hover:text-white">Dismiss</button>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence mode="wait">
          {phase === "loading" && (
            <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="mt-12 flex flex-col items-center gap-4 py-16 text-silver">
              <Loader2 className="h-8 w-8 animate-spin text-accent" />
              <span className="text-sm">Analysing media…</span>
            </motion.div>
          )}

          {phase === "ready" && info && (
            <motion.div key="ready" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              transition={{ duration: 0.35 }} className="mt-12 grid gap-6 lg:grid-cols-[360px_1fr]">
              <MediaCard info={info} />
              <div className="glass rounded-2xl p-1.5">
                <div className="flex gap-1 rounded-xl bg-black/40 p-1">
                  {TABS.map((t) => {
                    const active = tab === t.id;
                    return (
                      <button key={t.id} onClick={() => setTab(t.id)}
                        className={["relative flex-1 rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors", active ? "text-white" : "text-silver/70 hover:text-white"].join(" ")}>
                        {active && <motion.span layoutId="tab-pill" className="absolute inset-0 rounded-lg bg-accent/15 ring-1 ring-accent/40" transition={{ type: "spring", stiffness: 400, damping: 32 }} />}
                        <span className="relative z-10">{t.label}</span>
                      </button>
                    );
                  })}
                </div>
                <div className="p-4 sm:p-5">
                  {tab === "video" && (
                    <>
                      <FormatSelector label="Container" options={VIDEO_FORMATS} value={videoFormat} onChange={setVideoFormat} />
                      <OptionsTable
                        rows={VIDEO_ROWS.map((r) => {
                          const h = parseInt(r.q, 10);
                          const needsEnhance = nativeMax > 0 && h > nativeMax;
                          return {
                            id: `v-${r.q}`, quality: r.label, resolution: r.res,
                            format: needsEnhance ? "MP4 · AI" : videoFormat.toUpperCase(),
                            size: humanSize((durationSec * r.mbps) / 8),
                            enhance: needsEnhance,
                            onDownload: () => startVideo(r, needsEnhance),
                          };
                        })}
                        job={job} fileUrl={fileUrl} onStop={stopDownload}
                      />
                    </>
                  )}
                  {tab === "audio" && (
                    <>
                      <FormatSelector label="Format" options={AUDIO_FORMATS} value={audioFormat} onChange={setAudioFormat} />
                      <OptionsTable
                        rows={AUDIO_ROWS.map((r) => ({
                          id: `a-${r.kbps}`, quality: r.label, resolution: r.res,
                          format: audioFormat.toUpperCase(),
                          size: humanSize((durationSec * r.abr) / 8 / 1000),
                          onDownload: () => startAudio(r),
                        }))}
                        job={job} fileUrl={fileUrl} onStop={stopDownload}
                      />
                    </>
                  )}
                  {tab === "subtitle" && (
                    <SubtitleWorkspace
                      subLang={subLang} setSubLang={setSubLang}
                      subFormat={subFormat} setSubFormat={setSubFormat}
                      onView={handleViewSubtitles} onDownload={handleDownloadSubtitle}
                      loading={subLoading} lines={subLines} meta={subMeta}
                      job={job} fileUrl={fileUrl}
                    />
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
}

/* ==================== SUB COMPONENTS ==================== */

function UrlInput({
  url, setUrl, onSubmit, loading,
}: { url: string; setUrl: (v: string) => void; onSubmit: () => void; loading: boolean }) {
  async function paste() {
    try { setUrl(await navigator.clipboard.readText()); } catch { /* ignore */ }
  }
  return (
    <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-black/40 p-2 backdrop-blur-md transition-all duration-300 focus-within:border-accent focus-within:glow-red-sm">
      <span className="grid h-9 w-9 shrink-0 place-items-center text-silver/70">
        <Link2 className="h-5 w-5" />
      </span>
      <input
        type="url" value={url} onChange={(e) => setUrl(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && onSubmit()}
        placeholder="Paste a video link (YouTube, Instagram, X, Reddit, TikTok…)"
        className="min-w-0 flex-1 bg-transparent text-sm text-white placeholder:text-silver/40 focus:outline-none"
      />
      <button onClick={paste} type="button" className="hidden shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium text-silver/70 transition-colors hover:text-white sm:flex">
        <ClipboardPaste className="h-3.5 w-3.5" /> Paste
      </button>
      <MetalButton onClick={onSubmit} className="shrink-0 px-5 py-2.5 text-xs">
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Analyse"}
      </MetalButton>
    </div>
  );
}

function HealthBadge() {
  const [online, setOnline] = useState<boolean | null>(null);
  useEffect(() => {
    let active = true;
    const check = async () => {
      try { const ok = await api.health(); if (active) setOnline(ok); }
      catch { if (active) setOnline(false); }
    };
    check();
    const id = setInterval(check, 15000);
    return () => { active = false; clearInterval(id); };
  }, []);
  const label = online === null ? "Checking engine…" : online ? "Engine online" : "Engine offline";
  const dot = online === null ? "bg-silver/50 animate-pulse" : online ? "bg-accent glow-red-sm" : "bg-silver/30";
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/40 px-3.5 py-1.5 font-medium text-silver/70">
      <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
      {label}
    </span>
  );
}

function MediaCard({ info }: { info: MediaInfo }) {
  return (
    <div className="glass h-max overflow-hidden rounded-2xl">
      <div className="relative aspect-video bg-black">
        {info.thumbnail ? (
          <Image src={info.thumbnail} alt="" fill sizes="360px" className="object-cover" unoptimized />
        ) : (
          <div className="h-full w-full bg-gradient-to-br from-carbon-2 to-black" />
        )}
        {info.duration && (
          <span className="absolute bottom-2 right-2 rounded bg-black/80 px-1.5 py-0.5 font-[family-name:var(--font-geist-mono)] text-xs text-white">
            {info.duration}
          </span>
        )}
      </div>
      <div className="p-4">
        <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-white">{info.title}</h3>
        <div className="mt-3 flex flex-wrap gap-2">
          {info.channel && <Tag>{info.channel}</Tag>}
          {info.views && <Tag>{info.views} views</Tag>}
          {info.has_subtitles && <Tag accent>Captions available</Tag>}
        </div>
      </div>
    </div>
  );
}

function Tag({ children, accent }: { children: React.ReactNode; accent?: boolean }) {
  return (
    <span className={["rounded-md border px-2 py-1 text-xs", accent ? "border-accent/40 bg-accent/10 text-accent" : "border-white/10 bg-white/5 text-silver/70"].join(" ")}>
      {children}
    </span>
  );
}

function FormatSelector({
  label, options, value, onChange,
}: { label: string; options: string[]; value: string; onChange: (v: string) => void }) {
  return (
    <div className="mb-4 flex flex-wrap items-center gap-2">
      <span className="mr-1 text-xs font-semibold uppercase tracking-wider text-silver/60">{label}</span>
      {options.map((f) => {
        const active = value === f;
        return (
          <button key={f} onClick={() => onChange(f)}
            className={["rounded-md border px-3 py-1.5 text-xs font-semibold uppercase transition-all", active ? "border-accent bg-accent/15 text-accent" : "border-white/10 bg-white/5 text-silver/70 hover:border-white/20 hover:text-white"].join(" ")}>
            {f}
          </button>
        );
      })}
    </div>
  );
}

type Row = {
  id: string; quality: string; resolution: string; format: string; size: string;
  enhance?: boolean; onDownload: () => void;
};

function OptionsTable({
  rows, job, fileUrl, onStop,
}: { rows: Row[]; job: Job; fileUrl: string; onStop: () => void }) {
  return (
    <div className="overflow-hidden rounded-xl border border-white/8">
      <div className="grid grid-cols-[1.1fr_1.1fr_0.7fr_0.7fr_auto] gap-2 border-b border-white/8 bg-black/40 px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-silver/60">
        <span>Quality</span>
        <span className="hidden sm:block">Resolution</span>
        <span>Format</span>
        <span>Size</span>
        <span className="text-right">Action</span>
      </div>
      <div className="divide-y divide-white/5">
        {rows.map((r) => {
          const isRowJob = job?.rowId === r.id;
          const active = isRowJob && job.status !== "done" && job.status !== "error";
          const done = isRowJob && job.status === "done";
          return (
            <div key={r.id} className={["grid grid-cols-[1.1fr_1.1fr_0.7fr_0.7fr_auto] items-center gap-2 px-4 py-3 text-sm transition-colors", isRowJob ? "bg-accent/5" : "hover:bg-white/[0.02]"].join(" ")}>
              <span className="flex items-center gap-2 font-semibold text-white">
                {r.quality}
                {r.enhance && <span className="rounded border border-accent/40 bg-accent/15 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-accent">AI</span>}
              </span>
              <span className="hidden font-[family-name:var(--font-geist-mono)] text-xs text-silver/70 sm:block">{r.resolution}</span>
              <span className="text-silver/70">{r.format}</span>
              <span className="text-silver/70">{r.size}</span>
              <div className="flex justify-end">
                {done && fileUrl ? (
                  <a href={fileUrl} className="rounded-lg bg-accent px-3 py-1.5 text-xs font-semibold text-white hover:bg-accent-hover">Save</a>
                ) : active ? (
                  <button onClick={onStop} className="inline-flex items-center gap-1.5 rounded-lg border border-accent/40 bg-accent/10 px-3 py-1.5 text-xs font-semibold text-accent">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    {Math.round(job!.progress || 0)}%
                  </button>
                ) : (
                  <button onClick={r.onDownload} disabled={!!job && job.status !== "done" && job.status !== "error"}
                    className={["px-3 py-1.5 text-xs font-semibold disabled:opacity-30", r.enhance ? "inline-flex items-center gap-1.5 rounded-lg border border-accent/50 text-accent transition-colors hover:bg-accent/10" : "rounded-lg bg-accent text-white hover:bg-accent-hover"].join(" ")}>
                    {r.enhance ? "AI Enhance" : "Download"}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
      <AnimatePresence>
        {job && ["downloading", "processing", "starting", "enhancing"].includes(job.status) && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
            className="border-t border-white/8 bg-black/40 px-4 py-3">
            <div className="mb-1.5 flex items-center justify-between text-xs">
              <span className="font-medium text-white">{statusLabel(job)}</span>
              <span className="text-silver/70">{Math.round(job.progress || 0)}%</span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/5">
              <div className="h-full rounded-full bg-accent glow-red-sm transition-all duration-300" style={{ width: `${job.progress || 0}%` }} />
            </div>
            {job.speed && <div className="mt-1.5 text-xs text-silver/50">{job.speed}</div>}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function SubtitleWorkspace({
  subLang, setSubLang, subFormat, setSubFormat, onView, onDownload, loading, lines, meta, job, fileUrl,
}: {
  subLang: string; setSubLang: (v: string) => void;
  subFormat: string; setSubFormat: (v: string) => void;
  onView: () => void; onDownload: () => void; loading: boolean;
  lines: SubLine[] | null; meta: { lang: string; kind: string; count: number } | null;
  job: Job; fileUrl: string;
}) {
  const subJobDone = job?.rowId === "sub" && job.status === "done";
  const subJobBusy = job?.rowId === "sub" && job.status !== "done" && job.status !== "error";
  return (
    <div>
      <div className="flex flex-wrap items-end gap-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold uppercase tracking-wider text-silver/60">Language (10+)</label>
          <select value={subLang} onChange={(e) => setSubLang(e.target.value)}
            className="appearance-none rounded-lg border border-white/10 bg-black py-2.5 pl-3.5 pr-9 text-sm text-white transition-colors hover:border-accent/40 focus:border-accent focus:outline-none">
            {SUB_LANGS.map((l) => <option key={l.code} value={l.code} className="bg-black">{l.label}</option>)}
          </select>
        </div>
        <FormatSelector label="Export" options={SUB_FORMATS} value={subFormat} onChange={setSubFormat} />
        <button onClick={onView} disabled={loading}
          className="ml-auto rounded-lg border border-white/10 px-4 py-2.5 text-sm font-semibold text-silver/80 transition-colors hover:border-accent hover:text-white disabled:opacity-40">
          {loading ? "Loading…" : "View captions"}
        </button>
      </div>

      {(loading || lines) && (
        <div className="mt-5 overflow-hidden rounded-xl border border-white/8 bg-black">
          <div className="flex items-center gap-3 border-b border-white/8 bg-carbon-2 px-4 py-2.5">
            <div className="flex gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-accent/70" />
              <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
              <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
            </div>
            <span className="font-[family-name:var(--font-geist-mono)] text-xs text-silver/70">captions.preview</span>
            {meta && <span className="text-xs text-silver/50">{meta.lang?.toUpperCase()} · {meta.count} lines · {meta.kind}</span>}
          </div>
          <div className="max-h-72 overflow-y-auto px-4 py-3 font-[family-name:var(--font-geist-mono)] text-[13px] leading-relaxed">
            {loading && <div className="flex items-center gap-2 py-6 text-silver/70"><Loader2 className="h-3.5 w-3.5 animate-spin text-accent" /> Fetching captions…</div>}
            {!loading && lines && lines.length === 0 && <div className="py-6 text-silver/70">No caption lines found.</div>}
            {!loading && lines?.map((l, i) => (
              <div key={i} className="flex gap-3 py-0.5">
                {l.time && <span className="shrink-0 select-none text-accent/70">{l.time}</span>}
                <span className="text-white/90">{l.text}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-5 flex items-center justify-end gap-3">
        {subJobBusy && <span className="text-xs text-silver/70">{statusLabel(job)} {Math.round(job!.progress || 0)}%</span>}
        {subJobDone && fileUrl ? (
          <a href={fileUrl} className="rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-white hover:bg-accent-hover">Save subtitle file</a>
        ) : (
          <button onClick={onDownload} disabled={subJobBusy}
            className="rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-white hover:bg-accent-hover disabled:opacity-40">
            Download .{subFormat.toUpperCase()}
          </button>
        )}
      </div>
    </div>
  );
}
