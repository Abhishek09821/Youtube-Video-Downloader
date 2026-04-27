"""
Video Bloom — Backend v4.0
KEY FIX: Caption URLs cached at /api/info time.
/api/subtitles/view just downloads from cached URL — no yt-dlp call, instant.
"""

from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
import yt_dlp
import os, threading, uuid, time, re, json
import urllib.request, urllib.error
from pathlib import Path

app = Flask(__name__)
CORS(app, origins=["*"])

DOWNLOAD_DIR = Path("downloads")
DOWNLOAD_DIR.mkdir(exist_ok=True)

jobs = {}

# ── Caption URL cache: {video_id: {lang: {url, kind}, ...}, ...}
caption_cache = {}

AUDIO_CODEC_MAP = {
    "mp3":"mp3","flac":"flac","wav":"wav","aac":"aac","ogg":"vorbis","m4a":"m4a",
}

BROWSER_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept-Language": "en-US,en;q=0.9,hi;q=0.8",
    "Accept": "*/*",
    "Referer": "https://www.youtube.com/",
    "Origin": "https://www.youtube.com",
}

YDL_BASE = {
    "quiet": True,
    "no_warnings": True,
    "socket_timeout": 20,
    "http_headers": BROWSER_HEADERS,
}

# ─────────────────────────────────────────────────────────────
# HELPERS
# ─────────────────────────────────────────────────────────────

def _extract_video_id(url):
    """Extract YouTube video ID from any URL format."""
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


def format_bytes(b):
    if not b: return "0 B"
    for u in ["B","KB","MB","GB"]:
        if b < 1024: return f"{b:.1f} {u}"
        b /= 1024
    return f"{b:.1f} TB"


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


# ─────────────────────────────────────────────
# ROUTES
# ─────────────────────────────────────────────

@app.route("/api/health")
def health():
    return jsonify({"status":"ok","version":"4.0.0"})


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

    opts = {**YDL_BASE, "skip_download": True}
    try:
        with yt_dlp.YoutubeDL(opts) as ydl:
            info = ydl.extract_info(url, download=False)

        # ── Cache caption URLs ──
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

        return jsonify({
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
        })
    except Exception as e:
        return jsonify({"error":str(e)}), 400


@app.route("/api/subtitles/view", methods=["POST"])
def view_subtitles():
    """
    Fast path: use cached caption URL from /api/info.
    Only does a small HTTP fetch — no yt-dlp, no 10s wait.
    Falls back to full yt-dlp fetch if cache miss.
    """
    data = request.json or {}
    url  = (data.get("url") or "").strip()
    lang = (data.get("lang") or "en").strip()
    if not url:
        return jsonify({"error":"URL required"}), 400

    vid_id = _extract_video_id(url)
    cache  = caption_cache.get(vid_id)

    # ── FAST PATH: use cached caption URLs ──
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
                # Caption URL expired or rate limited — do full refetch
                caption_cache.pop(vid_id, None)
                return jsonify({"error":"Rate limited (429). Click Analyse again, then retry."}), 429
            return jsonify({"error":f"HTTP {e.code} fetching captions."}), 500
        except Exception as e:
            return jsonify({"error":str(e)}), 500

    # ── SLOW FALLBACK: cache miss — do full yt-dlp fetch ──
    result, done = {}, threading.Event()

    def _worker():
        try:
            opts = {**YDL_BASE, "skip_download": True}
            with yt_dlp.YoutubeDL(opts) as ydl:
                info = ydl.extract_info(url, download=False)

            # Rebuild cache for next time
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
    data = request.json or {}
    url  = (data.get("url") or "").strip()
    lang = (data.get("lang") or "en").strip()
    fmt  = (data.get("format") or "srt").lower()
    if not url:
        return jsonify({"error":"URL required"}), 400

    job_id = str(uuid.uuid4())[:8]
    jobs[job_id] = {"status":"starting","progress":5,"type":"subtitle"}

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
                opts = {**YDL_BASE, "skip_download": True}
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
    if not url: return jsonify({"error":"URL required"}), 400

    job_id   = str(uuid.uuid4())[:8]
    out_path = DOWNLOAD_DIR / f"{job_id}.%(ext)s"
    fmt_str  = (
        f"bestvideo[height<={quality}][ext={fmt}]+bestaudio[ext=m4a]"
        f"/bestvideo[height<={quality}]+bestaudio/best[height<={quality}]/best"
    )
    opts = {
        **YDL_BASE,
        "format":fmt_str,"outtmpl":str(out_path),
        "merge_output_format":fmt,
        "progress_hooks":[make_progress_hook(job_id)],
        "socket_timeout":30,
        "postprocessors":[{"key":"FFmpegVideoConvertor","preferedformat":fmt}],
    }
    jobs[job_id] = {"status":"starting","progress":0,"type":"video"}

    def run():
        try:
            with yt_dlp.YoutubeDL(opts) as ydl:
                info = ydl.extract_info(url, download=True)
            title = info.get("title","video")
            for ext in [fmt,"mp4","mkv","webm"]:
                p = DOWNLOAD_DIR / f"{job_id}.{ext}"
                if p.exists():
                    jobs[job_id].update({"status":"done","progress":100,
                        "filepath":str(p),"filename":f"{title[:60]}.{ext}"})
                    clean_job(job_id); return
            jobs[job_id].update({"status":"error","error":"Output file not found."})
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
        **YDL_BASE,
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


if __name__ == "__main__":
    print("\n🌸 Video Bloom Backend v4.0 — http://localhost:8080\n")
    print("   Caption URLs cached at Analyse time — View is now instant!\n")
    app.run(host="0.0.0.0", port=8080, debug=False, threaded=True)
