"""
VIDown — Backend v5.0
MAJOR UPGRADE: Production-grade subtitle system with automatic AI fallback.

Subtitle Pipeline (4-step fallback):
1. Try manual YouTube subtitles
2. Try auto-generated YouTube subtitles
3. If unavailable or fails → Automatically generate with AI (Whisper)
4. Cache results to avoid regeneration

Frontend receives subtitles exactly the same way regardless of source.
User should almost never see "Subtitles unavailable."

Serves the built React frontend (frontend/dist) when present, with an SPA
fallback so client-side routes (e.g. /download) resolve on direct load/refresh.
"""

from flask import Flask, request, jsonify, send_file, send_from_directory
from flask_cors import CORS
import yt_dlp
import os, threading, uuid, time, re, json
import shutil, tempfile, subprocess
import urllib.request, urllib.error
from pathlib import Path

# Import new production subtitle system
try:
    from config import (
        FRONTEND_DIST, DOWNLOAD_DIR, CORS_ORIGINS,
        YDL_BASE_OPTS, BROWSER_HEADERS, ENABLE_AI_SUBTITLES
    )
    from models import SubtitleFormat, ProgressUpdate
    from services.subtitle_service import subtitle_service
    from services.subtitle_formatter import subtitle_formatter
    from services.subtitle_cache import subtitle_cache
    from utils.logging_utils import get_logger
    from utils.video_utils import extract_video_id, format_bytes
    
    PRODUCTION_SUBTITLE_SYSTEM = True
    logger = get_logger(__name__)
    logger.info("✓ Production subtitle system loaded with AI fallback")
except ImportError as e:
    # Fallback to legacy system if new modules not available
    PRODUCTION_SUBTITLE_SYSTEM = False
    print(f"⚠ Using legacy subtitle system (production modules not found: {e})")
    
    # Legacy configuration
    FRONTEND_DIST = Path(__file__).parent / "frontend" / "dist"
    DOWNLOAD_DIR = Path("downloads")
    DOWNLOAD_DIR.mkdir(exist_ok=True)
    
    CORS_ORIGINS = [
        o.strip()
        for o in os.environ.get(
            "VIDOWN_CORS_ORIGINS",
            "http://localhost:5173,http://127.0.0.1:5173",
        ).split(",")
        if o.strip()
    ]
    
    BROWSER_HEADERS = {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept-Language": "en-US,en;q=0.9,hi;q=0.8",
        "Accept": "*/*",
        "Referer": "https://www.youtube.com/",
        "Origin": "https://www.youtube.com",
    }
    
    YDL_BASE_OPTS = {
        "quiet": True,
        "no_warnings": True,
        "socket_timeout": 20,
        "http_headers": BROWSER_HEADERS,
    }
    
    def format_bytes(b):
        if not b: return "0 B"
        for u in ["B","KB","MB","GB"]:
            if b < 1024: return f"{b:.1f} {u}"
            b /= 1024
        return f"{b:.1f} TB"

app = Flask(__name__, static_folder=None)

# ── CORS: only needed for the React dev server (Vite). In production the
#    frontend is served from this same origin, so no CORS is required.
CORS(app, resources={r"/api/*": {"origins": CORS_ORIGINS}})

# ── Job storage for downloads and subtitle generation ──
jobs = {}

# ── Legacy caption URL cache (kept for backward compatibility) ──
caption_cache = {}

AUDIO_CODEC_MAP = {
    "mp3":"mp3","flac":"flac","wav":"wav","aac":"aac","ogg":"vorbis","m4a":"m4a",
}

# ─────────────────────────────────────────────────────────────
# HELPERS
# ─────────────────────────────────────────────────────────────

def _extract_video_id(url):
    """Extract YouTube video ID from any URL format."""
    if PRODUCTION_SUBTITLE_SYSTEM:
        return extract_video_id(url)
    # Legacy fallback
    patterns = [
        r"(?:v=|youtu\.be/|shorts/|embed/|watch\?v=)([A-Za-z0-9_-]{11})",
    ]
    for p in patterns:
        m = re.search(p, url)
        if m:
            return m.group(1)
    return url  # fallback: use url as key


def _pick_best_fmt(fmt_list):
    if not fmt_list:
        return None
    for pref in ("json3", "vtt", "srv3", "srv2", "srv1"):
        for f in fmt_list:
            if f.get("ext") == pref and f.get("url"):
                return f
    for f in fmt_list:
        if f.get("url"):
            return f
    return None

def _build_caption_map(info):
    """
    Build a flat map of {lang_code: {url, kind}} from yt-dlp info.
    Covers manual + auto-generated for all languages.
    """
    cap_map = {}
    manual = info.get("subtitles") or {}
    auto   = info.get("automatic_captions") or {}

    for lang, fmts in manual.items():
        entry = _pick_best_fmt(fmts)
        if entry and entry.get("url"):
            cap_map[lang] = {"url": entry["url"], "kind": "manual"}

    for lang, fmts in auto.items():
        if lang not in cap_map:  # manual takes priority
            entry = _pick_best_fmt(fmts)
            if entry and entry.get("url"):
                cap_map[lang] = {"url": entry["url"], "kind": "auto"}

    return cap_map

def _resolve_lang(cap_map, lang):
    """
    Find best matching lang in cap_map.
    Tries: exact → variants (en-IN, en-US etc) → base lang.
    Returns (url, kind, matched_lang) or (None, None, None)
    """
    variants = [lang]
    base = lang.split("-")[0]
    if base != lang:
        variants.append(base)
    if "-" not in lang:
        variants += [f"{lang}-IN", f"{lang}-US", f"{lang}-GB", f"{lang}-UK"]

    for v in variants:
        if v in cap_map:
            entry = cap_map[v]
            return entry["url"], entry["kind"], v

    return None, None, None


def _download_url(url, retries=3):
    for attempt in range(retries):
        try:
            req = urllib.request.Request(url, headers=BROWSER_HEADERS)
            with urllib.request.urlopen(req, timeout=20) as resp:
                return resp.read().decode("utf-8", errors="replace")
        except urllib.error.HTTPError as e:
            if e.code == 429 and attempt < retries - 1:
                time.sleep(4 * (attempt + 1))
                continue
            raise
        except Exception:
            if attempt < retries - 1:
                time.sleep(2)
                continue
            raise
    return ""


def _parse_captions(raw):
    raw = raw.strip()
    lines_out, seen = [], set()

    # JSON3
    if raw.startswith("{") or raw.startswith("["):
        try:
            data   = json.loads(raw)
            events = data.get("events", [])
            for ev in events:
                segs = ev.get("segs")
                if not segs:
                    continue
                text = "".join(s.get("utf8","") for s in segs)
                text = re.sub(r'\s+', ' ', text).strip()
                if not text or text in seen or text == "\n":
                    continue
                seen.add(text)
                ms = ev.get("tStartMs", 0)
                mm, ss = divmod(int(ms)//1000, 60)
                lines_out.append({"time": f"{mm:02d}:{ss:02d}", "text": text})
            if lines_out:
                return lines_out
        except Exception:
            pass

    # VTT / SRT
    blocks = re.split(r'\n{2,}', raw)
    for block in blocks:
        block = block.strip()
        if not block or block.upper().startswith("WEBVTT") or block.startswith("NOTE"):
            continue
        blines     = [l.strip() for l in block.splitlines() if l.strip()]
        time_str   = ""
        text_parts = []
        for bl in blines:
            if "-->" in bl:
                time_str = bl.split("-->")[0].strip()
            elif not bl.isdigit():
                text_parts.append(bl)
        if not text_parts:
            continue
        text = " ".join(text_parts)
        text = re.sub(r'<[^>]+>', '', text)
        text = re.sub(r'\{[^}]+\}', '', text)
        for ent, char in [("&amp;","&"),("&lt;","<"),("&gt;",">"),("&#39;","'"),("&quot;",'"')]:
            text = text.replace(ent, char)
        text = re.sub(r'\s+', ' ', text).strip()
        if not text or text in seen:
            continue
        seen.add(text)
        ts = ""
        try:
            t = re.sub(r',', '.', time_str).split('.')[0]
            p = t.split(":")
            total = int(p[0])*3600 + int(p[1])*60 + int(float(p[2])) if len(p)==3 \
                    else int(p[0])*60 + int(float(p[1])) if len(p)==2 else 0
            mm, ss = divmod(total, 60)
            ts = f"{mm:02d}:{ss:02d}"
        except Exception:
            ts = ""
        lines_out.append({"time": ts, "text": text})

    return lines_out



def make_progress_hook(job_id):
    def hook(d):
        if d["status"] == "downloading":
            total = d.get("total_bytes") or d.get("total_bytes_estimate", 0)
            dl    = d.get("downloaded_bytes", 0)
            spd   = d.get("speed", 0) or 0
            pct   = (dl/total*100) if total else 0
            jobs[job_id].update({
                "status":"downloading","progress":round(pct,1),
                "speed":format_bytes(spd)+"/s",
                "downloaded":format_bytes(dl),"total":format_bytes(total),
            })
        elif d["status"] == "finished":
            jobs[job_id].update({"status":"processing","progress":95})
    return hook


def clean_job(job_id, delay=300):
    def _c():
        time.sleep(delay)
        j = jobs.pop(job_id, {})
        fp = j.get("filepath")
        if fp and os.path.exists(fp):
            try: os.remove(fp)
            except: pass
    threading.Thread(target=_c, daemon=True).start()


def _log(level, msg):
    try:
        getattr(logger, level)(msg)
    except Exception:
        print(f"[{level}] {msg}")


def _probe_height(path):
    """Return the video height in pixels, or 0 if it can't be determined."""
    try:
        out = subprocess.run(
            ["ffprobe", "-v", "error", "-select_streams", "v:0",
             "-show_entries", "stream=height", "-of", "csv=p=0", str(path)],
            capture_output=True, text=True, timeout=30,
        )
        return int((out.stdout or "0").strip().split("\n")[0] or 0)
    except Exception:
        return 0


def _probe_duration(path):
    """Return the video duration in seconds (float), or 0."""
    try:
        out = subprocess.run(
            ["ffprobe", "-v", "error", "-show_entries", "format=duration",
             "-of", "csv=p=0", str(path)],
            capture_output=True, text=True, timeout=30,
        )
        return float((out.stdout or "0").strip() or 0)
    except Exception:
        return 0.0


def _probe_fps(path):
    """Return the video frame rate as a float, defaulting to 30."""
    try:
        out = subprocess.run(
            ["ffprobe", "-v", "error", "-select_streams", "v:0",
             "-show_entries", "stream=r_frame_rate", "-of", "csv=p=0", str(path)],
            capture_output=True, text=True, timeout=30,
        )
        raw = (out.stdout or "").strip().split("\n")[0]
        if "/" in raw:
            num, den = raw.split("/")
            den = float(den)
            return float(num) / den if den else 30.0
        return float(raw) if raw else 30.0
    except Exception:
        return 30.0


def _realesrgan_bin():
    """Return a usable Real-ESRGAN binary path, or None if unavailable."""
    if os.environ.get("ENABLE_REALESRGAN", "True").lower() != "true":
        return None
    binname = os.environ.get("REALESRGAN_BIN", "realesrgan-ncnn-vulkan")
    if os.path.isfile(binname) and os.access(binname, os.X_OK):
        return binname
    return shutil.which(binname)


def _enhance_with_realesrgan(src_path, target_height, job_id, binp):
    """
    True neural super-resolution using Real-ESRGAN (ncnn-vulkan).

    Pipeline: extract frames → upscale each frame with Real-ESRGAN (x4) →
    reassemble at the original frame rate, downscale to the exact target
    height, and mux the original audio back in.

    Returns the enhanced .mp4 path, or None to signal the caller to fall back.
    """
    duration = _probe_duration(src_path)
    max_sec = int(os.environ.get("REALESRGAN_MAX_SECONDS", "180"))
    if duration and duration > max_sec:
        _log("warning",
             f"Real-ESRGAN skipped: {duration:.0f}s exceeds cap {max_sec}s")
        return None

    model = os.environ.get("REALESRGAN_MODEL", "realesrgan-x4plus")
    fps = _probe_fps(src_path)
    out_path = Path(src_path).with_name(f"{Path(src_path).stem}_esr{target_height}.mp4")
    work = Path(tempfile.mkdtemp(prefix="vdown_esr_"))
    frames_in = work / "in"
    frames_out = work / "out"
    frames_in.mkdir()
    frames_out.mkdir()

    try:
        jobs[job_id].update({"status": "enhancing", "progress": 96})
        # 1) Extract frames (lossless PNG)
        subprocess.run(
            ["ffmpeg", "-y", "-i", str(src_path), "-qscale:v", "1",
             str(frames_in / "frame_%08d.png")],
            check=True, capture_output=True, timeout=1800,
        )

        # 2) Neural upscale every frame (x4)
        subprocess.run(
            [binp, "-i", str(frames_in), "-o", str(frames_out),
             "-n", model, "-s", "4", "-f", "png"],
            check=True, capture_output=True, timeout=7200,
        )

        jobs[job_id].update({"progress": 98})
        # 3) Reassemble + downscale to exact target + remux original audio
        subprocess.run(
            ["ffmpeg", "-y",
             "-framerate", f"{fps:.5f}",
             "-i", str(frames_out / "frame_%08d.png"),
             "-i", str(src_path),
             "-map", "0:v:0", "-map", "1:a:0?",
             "-vf", f"scale=-2:{target_height}:flags=lanczos",
             "-c:v", "libx264", "-preset", "medium", "-crf", "18",
             "-pix_fmt", "yuv420p",
             "-c:a", "aac", "-b:a", "192k",
             "-movflags", "+faststart", "-shortest",
             str(out_path)],
            check=True, capture_output=True, timeout=3600,
        )

        if out_path.exists() and out_path.stat().st_size > 0:
            _log("info", f"Real-ESRGAN enhance complete: {out_path.name}")
            return out_path
        return None
    except Exception as e:
        _log("warning", f"Real-ESRGAN enhance failed, will fall back: {e}")
        return None
    finally:
        shutil.rmtree(work, ignore_errors=True)


def _enhance_ffmpeg(src_path, target_height, job_id):
    """
    Fallback upscaler: high-quality FFmpeg Lanczos scaling + adaptive unsharp
    masking, re-encoded with libx264. GPU-free; runs everywhere.

    Returns the enhanced .mp4 path, or the original path on failure.
    """
    out_path = Path(src_path).with_name(f"{Path(src_path).stem}_ai{target_height}.mp4")
    jobs[job_id].update({"status": "enhancing", "progress": 96})
    vf = f"scale=-2:{target_height}:flags=lanczos,unsharp=5:5:0.9:5:5:0.3"
    cmd = [
        "ffmpeg", "-y", "-i", str(src_path),
        "-vf", vf,
        "-c:v", "libx264", "-preset", "medium", "-crf", "18",
        "-pix_fmt", "yuv420p",
        "-c:a", "aac", "-b:a", "192k",
        "-movflags", "+faststart",
        str(out_path),
    ]
    try:
        subprocess.run(cmd, check=True, capture_output=True, timeout=3600)
        if out_path.exists() and out_path.stat().st_size > 0:
            return out_path
    except Exception as e:
        _log("warning", f"FFmpeg enhance failed, keeping original: {e}")
    return Path(src_path)


def ai_enhance_video(src_path, target_height, job_id):
    """
    AI Video Enhance — upscale a lower-resolution source toward `target_height`.

    Prefers true neural super-resolution via Real-ESRGAN when its binary is
    available; otherwise falls back to a high-quality FFmpeg Lanczos + unsharp
    upscaler. Returns the path to the enhanced file (or the original on no-op).
    """
    src_path = Path(src_path)
    src_h = _probe_height(src_path)
    if src_h and src_h >= target_height:
        # Already at/above target — nothing to enhance.
        return src_path

    jobs[job_id].update({"status": "enhancing", "progress": 96})

    # 1) Try true neural upscaling first.
    binp = _realesrgan_bin()
    if binp:
        _log("info", f"Using Real-ESRGAN backend: {binp}")
        result = _enhance_with_realesrgan(src_path, target_height, job_id, binp)
        if result and Path(result) != src_path:
            try:
                src_path.unlink(missing_ok=True)
            except Exception:
                pass
            return result

    # 2) Fallback: FFmpeg high-quality upscale.
    result = _enhance_ffmpeg(src_path, target_height, job_id)
    if Path(result) != src_path:
        try:
            src_path.unlink(missing_ok=True)
        except Exception:
            pass
    return result


# ─────────────────────────────────────────────────────────────
# ROUTES
# ─────────────────────────────────────────────────────────────

@app.route("/api/health")
def health():
    system_info = {
        "status": "ok",
        "version": "5.0.0",
        "subtitle_system": "production_ai" if PRODUCTION_SUBTITLE_SYSTEM else "legacy",
    }
    
    if PRODUCTION_SUBTITLE_SYSTEM:
        system_info["features"] = {
            "ai_subtitles": ENABLE_AI_SUBTITLES,
            "subtitle_cache": True,
            "auto_fallback": True,
        }
    
    return jsonify(system_info)


@app.route("/api/info", methods=["POST"])
def get_info():
    """
    Fetch video metadata AND cache all caption URLs.
    After this, View Now is instant — no yt-dlp needed again.
    """
    data = request.json or {}
    url  = (data.get("url") or "").strip()
    if not url:
        return jsonify({"error":"URL required"}), 400

    opts = {**YDL_BASE_OPTS, "skip_download": True}
    try:
        with yt_dlp.YoutubeDL(opts) as ydl:
            info = ydl.extract_info(url, download=False)

        # ── Cache caption URLs (legacy system) ──
        vid_id  = _extract_video_id(url)
        cap_map = _build_caption_map(info)
        caption_cache[vid_id] = {
            "cap_map": cap_map,
            "cached_at": time.time(),
        }

        # Video formats
        fmts, seen = [], set()
        for f in info.get("formats", []):
            h = f.get("height")
            if h and f.get("vcodec","none") != "none" and h not in seen:
                seen.add(h)
                fmts.append({"quality":f"{h}p",
                    "filesize":format_bytes(f.get("filesize") or f.get("filesize_approx") or 0)})
        fmts.sort(key=lambda x: int(x["quality"][:-1]), reverse=True)

        manual_langs = [k for k,v in cap_map.items() if v["kind"]=="manual"]
        auto_langs   = [k for k,v in cap_map.items() if v["kind"]=="auto"]

        response = {
            "title":       info.get("title","Unknown"),
            "channel":     info.get("uploader","Unknown"),
            "duration":    info.get("duration_string") or f"{info.get('duration',0)}s",
            "duration_sec": info.get("duration",0),
            "views":       f"{info.get('view_count',0):,}",
            "thumbnail":   info.get("thumbnail"),
            "available_qualities": fmts,
            "has_subtitles": bool(cap_map),
            "manual_langs":  manual_langs,
            "auto_langs":    auto_langs,
            "all_caption_langs": sorted(cap_map.keys()),
            "caption_cached": True,
        }
        
        # Add AI subtitle capability info
        if PRODUCTION_SUBTITLE_SYSTEM and ENABLE_AI_SUBTITLES:
            response["ai_subtitles_available"] = True
            response["subtitle_note"] = "AI generation available if YouTube captions unavailable"
        
        return jsonify(response)
    except Exception as e:
        return jsonify({"error":str(e)}), 400


@app.route("/api/subtitles/view", methods=["POST"])
def view_subtitles():
    """
    View subtitles with AUTOMATIC AI FALLBACK (Production v5.0).
    
    Pipeline:
    1. Check cache
    2. Try manual YouTube subtitles
    3. Try auto-generated YouTube subtitles
    4. Auto-generate with AI (Whisper) if YouTube fails
    
    User should almost never see "Subtitles unavailable."
    """
    data = request.json or {}
    url  = (data.get("url") or "").strip()
    lang = (data.get("lang") or "en").strip()
    if not url:
        return jsonify({"error":"URL required"}), 400

    # ── PRODUCTION SYSTEM: AI-powered fallback ──
    if PRODUCTION_SUBTITLE_SYSTEM:
        try:
            if PRODUCTION_SUBTITLE_SYSTEM:
                logger.info(f"View subtitles (AI-enabled): url={url}, lang={lang}")
            
            # Get subtitles with full fallback pipeline
            result = subtitle_service.get_subtitles(url, lang)
            
            # Convert to frontend format (unchanged from v4.1)
            response = {
                "lines": [line.to_dict() for line in result.lines],
                "lang": result.metadata.language,
                "kind": result.metadata.source.value,
                "source": result.metadata.source.value,
                "count": result.metadata.line_count,
            }
            
            if result.metadata.model_used:
                response["model"] = result.metadata.model_used
            
            if PRODUCTION_SUBTITLE_SYSTEM:
                logger.info(
                    f"Subtitles delivered: {result.metadata.line_count} lines, "
                    f"source={result.metadata.source.value}"
                )
            
            return jsonify(response)
            
        except Exception as e:
            error_msg = str(e)
            if PRODUCTION_SUBTITLE_SYSTEM:
                logger.error(f"Subtitle retrieval failed: {e}")
            
            # User-friendly error messages
            if "too long" in error_msg.lower():
                return jsonify({"error": "Video too long for AI generation. Try shorter videos."}), 400
            elif "ffmpeg" in error_msg.lower():
                return jsonify({"error": "FFmpeg not found. AI subtitles require FFmpeg installation."}), 500
            else:
                return jsonify({"error": f"Unable to retrieve subtitles: {error_msg}"}), 500

    # ── LEGACY SYSTEM FALLBACK (v4.1 logic) ──
    vid_id = _extract_video_id(url)
    cache  = caption_cache.get(vid_id)

    # Fast path: use cached caption URLs
    if cache and cache.get("cap_map"):
        cap_map = cache["cap_map"]
        cap_url, kind, matched = _resolve_lang(cap_map, lang)

        if not cap_url:
            all_avail = sorted(cap_map.keys())
            return jsonify({
                "error": f"No captions in '{lang}'. Available: {', '.join(all_avail[:15])}"
            }), 404

        try:
            raw   = _download_url(cap_url, retries=3)
            lines = _parse_captions(raw)
            if not lines:
                return jsonify({"error":"Captions empty or could not be parsed."}), 404
            return jsonify({
                "lines": lines,
                "lang":  matched,
                "kind":  kind,
                "count": len(lines),
                "from_cache": True,
            })
        except urllib.error.HTTPError as e:
            if e.code == 429:
                caption_cache.pop(vid_id, None)
                return jsonify({"error":"Rate limited (429). Click Analyse again, then retry."}), 429
            return jsonify({"error":f"HTTP {e.code} fetching captions."}), 500
        except Exception as e:
            return jsonify({"error":str(e)}), 500

    # Slow fallback: cache miss — do full yt-dlp fetch
    result, done = {}, threading.Event()

    def _worker():
        try:
            opts = {**YDL_BASE_OPTS, "skip_download": True}
            with yt_dlp.YoutubeDL(opts) as ydl:
                info = ydl.extract_info(url, download=False)

            cap_map = _build_caption_map(info)
            caption_cache[vid_id] = {"cap_map": cap_map, "cached_at": time.time()}

            cap_url, kind, matched = _resolve_lang(cap_map, lang)
            if not cap_url:
                all_avail = sorted(cap_map.keys())
                result["error"] = f"No captions in '{lang}'. Available: {', '.join(all_avail[:15])}"
                done.set(); return

            raw   = _download_url(cap_url, retries=3)
            lines = _parse_captions(raw)
            if not lines:
                result["error"] = "Captions empty or could not be parsed."
                done.set(); return

            result.update({"lines":lines,"lang":matched,"kind":kind})
            done.set()
        except urllib.error.HTTPError as e:
            result["error"] = "Rate limited (429). Click Analyse again." if e.code==429 else f"HTTP {e.code}"
            done.set()
        except Exception as e:
            result["error"] = str(e)
            done.set()

    threading.Thread(target=_worker, daemon=True).start()
    if not done.wait(timeout=50):
        return jsonify({"error":"Timed out. Click Analyse again and retry."}), 408

    if result.get("error"):
        return jsonify({"error":result["error"]}), 404

    return jsonify({
        "lines": result["lines"],
        "lang":  result.get("lang", lang),
        "kind":  result.get("kind",""),
        "count": len(result["lines"]),
        "from_cache": False,
    })


@app.route("/api/subtitles/download", methods=["POST"])
def download_subtitle_file():
    """
    Download subtitle file with AUTOMATIC AI FALLBACK (Production v5.0).
    Returns job_id for progress polling.
    """
    data = request.json or {}
    url  = (data.get("url") or "").strip()
    lang = (data.get("lang") or "en").strip()
    fmt  = (data.get("format") or "srt").lower()
    if not url:
        return jsonify({"error":"URL required"}), 400

    job_id = str(uuid.uuid4())[:8]
    jobs[job_id] = {"status":"starting","progress":5,"type":"subtitle"}

    # ── PRODUCTION SYSTEM: AI-powered subtitle download ──
    if PRODUCTION_SUBTITLE_SYSTEM:
        def run():
            try:
                vid_id = _extract_video_id(url)
                
                if PRODUCTION_SUBTITLE_SYSTEM:
                    logger.info(
                        f"Subtitle download job {job_id}: "
                        f"url={url}, lang={lang}, format={fmt}"
                    )
                
                # Progress callback
                def progress_callback(update):
                    jobs[job_id]['progress'] = update.progress
                    jobs[job_id]['status'] = update.stage
                
                # Get subtitles with full fallback pipeline
                try:
                    subtitle_format = SubtitleFormat(fmt)
                except ValueError:
                    jobs[job_id].update({
                        "status":"error",
                        "error":f"Invalid format: {fmt}"
                    })
                    return
                
                result = subtitle_service.get_subtitles(
                    url,
                    lang,
                    progress_callback=progress_callback
                )
                
                jobs[job_id]["progress"] = 80
                
                # Format subtitles
                content = subtitle_formatter.format(result.lines, subtitle_format)
                
                # Save to file
                filename = f"{job_id}_subs_{result.metadata.language}.{fmt}"
                out = DOWNLOAD_DIR / filename
                out.write_text(content, encoding="utf-8")
                
                jobs[job_id].update({
                    "status":"done","progress":100,
                    "filepath":str(out),
                    "filename":f"subtitles_{result.metadata.language}.{fmt}",
                    "source": result.metadata.source.value,
                    "line_count": result.metadata.line_count,
                })
                
                if PRODUCTION_SUBTITLE_SYSTEM:
                    logger.info(
                        f"Job {job_id} completed: {result.metadata.line_count} lines, "
                        f"source={result.metadata.source.value}"
                    )
                
                clean_job(job_id)
                
            except Exception as e:
                if PRODUCTION_SUBTITLE_SYSTEM:
                    logger.error(f"Job {job_id} failed: {e}")
                jobs[job_id].update({"status":"error","error":str(e)})

        threading.Thread(target=run, daemon=True).start()
        return jsonify({"job_id": job_id})

    # ── LEGACY SYSTEM (v4.1 logic) ──
    def run():
        vid_id = _extract_video_id(url)
        cache  = caption_cache.get(vid_id)

        cap_url, kind, matched = None, None, lang

        # Use cache if available
        if cache and cache.get("cap_map"):
            cap_url, kind, matched = _resolve_lang(cache["cap_map"], lang)

        # Fallback: full fetch
        if not cap_url:
            try:
                jobs[job_id]["progress"] = 10
                opts = {**YDL_BASE_OPTS, "skip_download": True}
                with yt_dlp.YoutubeDL(opts) as ydl:
                    info = ydl.extract_info(url, download=False)
                cap_map = _build_caption_map(info)
                caption_cache[vid_id] = {"cap_map": cap_map, "cached_at": time.time()}
                cap_url, kind, matched = _resolve_lang(cap_map, lang)
            except Exception as e:
                jobs[job_id].update({"status":"error","error":str(e)}); return

        if not cap_url:
            jobs[job_id].update({"status":"error","error":f"No captions in '{lang}'."})
            return

        try:
            jobs[job_id]["progress"] = 50
            raw   = _download_url(cap_url, retries=3)
            lines = _parse_captions(raw)
            if not lines:
                jobs[job_id].update({"status":"error","error":"Captions empty."}); return

            jobs[job_id]["progress"] = 80

            if fmt == "txt":
                content = "\n".join(f"[{l['time']}]  {l['text']}" for l in lines)
                ext = "txt"
            elif fmt == "srt":
                parts = []
                for i, l in enumerate(lines, 1):
                    t = l['time'] or "00:00"
                    parts += [str(i), f"{t} --> {t}", l['text'], ""]
                content = "\n".join(parts)
                ext = "srt"
            else:
                content = "WEBVTT\n\n" + "\n\n".join(
                    f"{l['time']} --> {l['time']}\n{l['text']}" for l in lines)
                ext = "vtt"

            out = DOWNLOAD_DIR / f"{job_id}_subs_{matched}.{ext}"
            out.write_text(content, encoding="utf-8")
            jobs[job_id].update({
                "status":"done","progress":100,
                "filepath":str(out),
                "filename":f"subtitles_{matched}.{ext}",
            })
            clean_job(job_id)

        except urllib.error.HTTPError as e:
            msg = "Rate limited (429). Click Analyse again." if e.code==429 else f"HTTP {e.code}"
            jobs[job_id].update({"status":"error","error":msg})
        except Exception as e:
            jobs[job_id].update({"status":"error","error":str(e)})

    threading.Thread(target=run, daemon=True).start()
    return jsonify({"job_id": job_id})


@app.route("/api/download/video", methods=["POST"])
def download_video():
    data    = request.json or {}
    url     = (data.get("url") or "").strip()
    quality = (data.get("quality") or "1080p").replace("p","")
    fmt     = (data.get("format") or "mp4").lower()
    enhance = bool(data.get("enhance"))
    if not url: return jsonify({"error":"URL required"}), 400

    try:
        target_h = int(quality)
    except ValueError:
        target_h = 1080

    job_id   = str(uuid.uuid4())[:8]
    out_path = DOWNLOAD_DIR / f"{job_id}.%(ext)s"

    # When AI enhancing, grab the BEST available source (no height cap) so the
    # upscaler has the highest-quality input to work from.
    if enhance:
        fmt_str = "bestvideo+bestaudio/best"
    else:
        fmt_str = (
            f"bestvideo[height<={quality}][ext={fmt}]+bestaudio[ext=m4a]"
            f"/bestvideo[height<={quality}]+bestaudio/best[height<={quality}]/best"
        )
    opts = {
        **YDL_BASE_OPTS,
        "format":fmt_str,"outtmpl":str(out_path),
        "merge_output_format":fmt,
        "progress_hooks":[make_progress_hook(job_id)],
        "socket_timeout":30,
        "postprocessors":[{"key":"FFmpegVideoConvertor","preferedformat":fmt}],
    }
    jobs[job_id] = {"status":"starting","progress":0,"type":"video","enhance":enhance}

    def run():
        try:
            with yt_dlp.YoutubeDL(opts) as ydl:
                info = ydl.extract_info(url, download=True)
            title = info.get("title","video")
            src = None
            for ext in [fmt,"mp4","mkv","webm"]:
                p = DOWNLOAD_DIR / f"{job_id}.{ext}"
                if p.exists():
                    src = p
                    break
            if not src:
                jobs[job_id].update({"status":"error","error":"Output file not found."})
                return

            final = src
            final_ext = src.suffix.lstrip(".")
            if enhance:
                final = ai_enhance_video(src, target_h, job_id)
                final_ext = final.suffix.lstrip(".")

            tag = f" [AI {target_h}p]" if enhance else ""
            jobs[job_id].update({
                "status":"done","progress":100,
                "filepath":str(final),
                "filename":f"{title[:60]}{tag}.{final_ext}",
            })
            clean_job(job_id)
        except Exception as e:
            jobs[job_id].update({"status":"error","error":str(e)})

    threading.Thread(target=run, daemon=True).start()
    return jsonify({"job_id":job_id})


@app.route("/api/download/audio", methods=["POST"])
def download_audio():
    data  = request.json or {}
    url   = (data.get("url") or "").strip()
    kbps  = data.get("kbps","320")
    fmt   = (data.get("format") or "mp3").lower()
    codec = AUDIO_CODEC_MAP.get(fmt, fmt)
    if not url: return jsonify({"error":"URL required"}), 400

    job_id   = str(uuid.uuid4())[:8]
    out_path = DOWNLOAD_DIR / f"{job_id}.%(ext)s"
    opts = {
        **YDL_BASE_OPTS,
        "format":"bestaudio/best","outtmpl":str(out_path),
        "progress_hooks":[make_progress_hook(job_id)],
        "socket_timeout":30,
        "postprocessors":[{"key":"FFmpegExtractAudio",
            "preferredcodec":codec,"preferredquality":str(kbps)}],
    }
    jobs[job_id] = {"status":"starting","progress":0,"type":"audio"}

    def run():
        try:
            with yt_dlp.YoutubeDL(opts) as ydl:
                info = ydl.extract_info(url, download=True)
            title = info.get("title","audio")
            for ext in [fmt,"ogg","mp3","m4a","opus","webm"]:
                p = DOWNLOAD_DIR / f"{job_id}.{ext}"
                if p.exists():
                    jobs[job_id].update({"status":"done","progress":100,
                        "filepath":str(p),"filename":f"{title[:60]}.{ext}"})
                    clean_job(job_id); return
            jobs[job_id].update({"status":"error","error":"Audio not found. Is FFmpeg installed?"})
        except Exception as e:
            err = str(e)
            if "codec" in err.lower() or "encoder" in err.lower():
                err = f"{fmt.upper()} failed. Try MP3 or AAC."
            jobs[job_id].update({"status":"error","error":err})

    threading.Thread(target=run, daemon=True).start()
    return jsonify({"job_id":job_id})


@app.route("/api/status/<job_id>")
def job_status(job_id):
    j = jobs.get(job_id)
    if not j: return jsonify({"error":"Job not found"}), 404
    return jsonify(j)


@app.route("/api/file/<job_id>")
def serve_file(job_id):
    j = jobs.get(job_id)
    if not j or j.get("status") != "done":
        return jsonify({"error":"File not ready"}), 404
    fp = j.get("filepath")
    fn = j.get("filename","download")
    if not fp or not os.path.exists(fp):
        return jsonify({"error":"File not found"}), 404
    return send_file(fp, as_attachment=True, download_name=fn)


# ───────────────────────────────────────────────────────────────
# FRONTEND (serve built React app)
# ───────────────────────────────────────────────────────────────

@app.route("/", defaults={"path": ""})
@app.route("/<path:path>")
def serve_frontend(path):
    """
    Serve the built React app. If the requested path is a real file in the
    build (JS/CSS/assets), return it; otherwise fall back to index.html so
    React Router can handle client-side routes like /download.
    """
    if not FRONTEND_DIST.exists():
        return jsonify({
            "error": "Frontend build not found. Run `npm run build` in frontend/."
        }), 404

    target = FRONTEND_DIST / path
    if path and target.is_file():
        return send_from_directory(FRONTEND_DIST, path)
    return send_from_directory(FRONTEND_DIST, "index.html")


if __name__ == "__main__":
    print("\n" + "="*60)
    print("VIDown Backend v5.0 — Production Subtitle System")
    print("="*60)
    
    if PRODUCTION_SUBTITLE_SYSTEM:
        print("\n✓ Production subtitle system with AI fallback ENABLED")
        if ENABLE_AI_SUBTITLES:
            from services.whisper_service import whisper_service
            print(f"  • Whisper model: {whisper_service.model_name}")
            print(f"  • Device: {whisper_service.device}")
            print(f"  • AI fallback: ACTIVE")
        else:
            print("  • AI fallback: DISABLED (set ENABLE_AI_SUBTITLES=True)")
        
        # Check FFmpeg
        try:
            from services.whisper_service import whisper_service
            if whisper_service.check_ffmpeg():
                print("  • FFmpeg: FOUND")
            else:
                print("  ⚠ FFmpeg: NOT FOUND (required for AI subtitles)")
        except:
            pass
    else:
        print("\n⚠ Using LEGACY subtitle system (v4.1)")
        print("  Install production modules to enable AI fallback:")
        print("  pip install -r requirements.txt")
    
    if FRONTEND_DIST.exists():
        print(f"\n✓ Serving built frontend from {FRONTEND_DIST}")
        print(f"  Access at: http://0.0.0.0:8080")
    else:
        print(f"\n⚠ Frontend build not found at {FRONTEND_DIST}")
        print("  Run: cd frontend && npm run build")
        print("  Or use Vite dev server: cd frontend && npm run dev")
    
    print("\n" + "="*60 + "\n")
    
    app.run(host="0.0.0.0", port=8080, debug=False, threaded=True)