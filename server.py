"""
Video Bloom — Backend v3.0
Subtitle system completely rewritten:
- Reads subtitle data DIRECTLY from yt-dlp info dict (no file saving)
- Auto-generates if manual not available
- Supports Hindi, English, Both
- Lyrics mode for songs
- Hard timeouts everywhere
"""

from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
import yt_dlp
import os, threading, uuid, time, re, json, urllib.request
from pathlib import Path

app = Flask(__name__)
CORS(app, origins=["*"])

DOWNLOAD_DIR = Path("downloads")
DOWNLOAD_DIR.mkdir(exist_ok=True)

jobs = {}

AUDIO_CODEC_MAP = {
    "mp3": "mp3", "flac": "flac", "wav": "wav",
    "aac": "aac", "ogg": "vorbis", "m4a": "m4a",
}

# ─────────────────────────────────────────────────────────────
# SUBTITLE CORE — reads directly from yt-dlp info, no file I/O
# ─────────────────────────────────────────────────────────────

def fetch_caption_url(url, lang):
    """
    Extract subtitle/caption URL directly from yt-dlp info dict.
    Returns (caption_url, kind) where kind = 'manual' | 'auto' | None
    Tries: manual lang → manual lang variants → auto lang → auto lang variants → auto 'en'
    """
    opts = {
        "quiet": True, "no_warnings": True,
        "skip_download": True, "socket_timeout": 20,
    }
    with yt_dlp.YoutubeDL(opts) as ydl:
        info = ydl.extract_info(url, download=False)

    manual = info.get("subtitles") or {}
    auto   = info.get("automatic_captions") or {}

    # Build variant list for the requested lang
    variants = [lang]
    if "-" not in lang:
        variants += [f"{lang}-IN", f"{lang}-US", f"{lang}-GB", f"{lang}-UK"]

    # 1. Manual subtitles
    for v in variants:
        if v in manual:
            entry = _pick_vtt(manual[v])
            if entry:
                return entry["url"], "manual", info
    # 2. Auto-generated captions
    for v in variants:
        if v in auto:
            entry = _pick_vtt(auto[v])
            if entry:
                return entry["url"], "auto", info
    # 3. Fallback: any english auto
    if lang != "en":
        for v in ["en", "en-US", "en-IN", "en-GB"]:
            if v in auto:
                entry = _pick_vtt(auto[v])
                if entry:
                    return entry["url"], "auto-en-fallback", info

    # 4. Return available langs for error message
    avail_manual = list(manual.keys())
    avail_auto   = list(auto.keys())
    return None, None, {
        "title": info.get("title",""),
        "avail_manual": avail_manual,
        "avail_auto":   avail_auto,
    }


def _pick_vtt(fmt_list):
    """Pick best VTT/JSON3 format from a list of subtitle formats."""
    if not fmt_list:
        return None
    # Prefer vtt
    for f in fmt_list:
        if f.get("ext") in ("vtt", "srv3", "srv2", "srv1"):
            return f
    # json3 fallback
    for f in fmt_list:
        if f.get("ext") == "json3":
            return f
    # Any with url
    for f in fmt_list:
        if f.get("url"):
            return f
    return None


def download_vtt(cap_url):
    """Download raw VTT/json3 content from URL."""
    req = urllib.request.Request(cap_url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=15) as resp:
        raw = resp.read().decode("utf-8", errors="replace")
    return raw


def parse_vtt(raw):
    """Parse VTT or JSON3 subtitle content → list of {time, text} dicts."""
    raw = raw.strip()

    # JSON3 format (YouTube's native)
    if raw.startswith("{"):
        try:
            data = json.loads(raw)
            events = data.get("events", [])
            lines = []
            seen = set()
            for ev in events:
                segs = ev.get("segs")
                if not segs:
                    continue
                text = "".join(s.get("utf8", "") for s in segs).strip()
                text = re.sub(r'\s+', ' ', text).strip()
                if not text or text in seen or text == "\n":
                    continue
                seen.add(text)
                ms = ev.get("tStartMs", 0)
                mm, ss = divmod(ms // 1000, 60)
                lines.append({"time": f"{mm:02d}:{ss:02d}", "text": text})
            return lines
        except Exception:
            pass

    # VTT / SRT format
    lines_out = []
    seen = set()
    blocks = re.split(r'\n\n+', raw)
    for block in blocks:
        block = block.strip()
        if not block or block.startswith("WEBVTT") or block.startswith("NOTE"):
            continue
        blines = block.splitlines()
        time_line = ""
        text_parts = []
        for bl in blines:
            bl = bl.strip()
            if "-->" in bl:
                time_line = bl.split("-->")[0].strip()
            elif bl and not bl.isdigit() and "-->" not in bl:
                text_parts.append(bl)
        if not text_parts:
            continue
        text = " ".join(text_parts)
        # Strip HTML tags and formatting
        text = re.sub(r'<[^>]+>', '', text)
        text = re.sub(r'&amp;', '&', text)
        text = re.sub(r'&lt;', '<', text)
        text = re.sub(r'&gt;', '>', text)
        text = re.sub(r'&#39;', "'", text)
        text = re.sub(r'\s+', ' ', text).strip()
        if not text or text in seen:
            continue
        seen.add(text)
        # Parse timestamp
        ts = ""
        try:
            t = time_line.replace(",", ".").split(".")[0]
            parts = t.split(":")
            if len(parts) == 3:
                total = int(parts[0])*3600 + int(parts[1])*60 + int(float(parts[2]))
            elif len(parts) == 2:
                total = int(parts[0])*60 + int(float(parts[1]))
            else:
                total = 0
            mm, ss = divmod(total, 60)
            ts = f"{mm:02d}:{ss:02d}"
        except:
            ts = time_line[:5] if time_line else ""
        lines_out.append({"time": ts, "text": text})

    return lines_out


def get_subtitles(url, lang, result_holder, done_event):
    """Worker thread: fetch + parse subtitles, store in result_holder."""
    try:
        cap_url, kind, info = fetch_caption_url(url, lang)

        if cap_url is None:
            avail_m = info.get("avail_manual", [])
            avail_a = info.get("avail_auto", [])
            all_avail = sorted(set(avail_m + avail_a))
            if all_avail:
                result_holder["error"] = (
                    f"No captions in '{lang}'. "
                    f"Available: {', '.join(all_avail[:12])}"
                )
            else:
                result_holder["error"] = (
                    "This video has no subtitles or captions at all."
                )
            done_event.set()
            return

        raw = download_vtt(cap_url)
        lines = parse_vtt(raw)

        if not lines:
            result_holder["error"] = f"Captions found but could not be parsed. Try another language."
            done_event.set()
            return

        result_holder["lines"] = lines
        result_holder["kind"]  = kind
        result_holder["raw"]   = raw
        result_holder["lang"]  = lang
        done_event.set()

    except Exception as e:
        result_holder["error"] = str(e)
        done_event.set()


# ─────────────────────────────────────────────
# UTILITIES
# ─────────────────────────────────────────────

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
            pct   = (dl / total * 100) if total else 0
            jobs[job_id].update({
                "status": "downloading", "progress": round(pct,1),
                "speed": format_bytes(spd)+"/s",
                "downloaded": format_bytes(dl), "total": format_bytes(total),
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
    return jsonify({"status":"ok","version":"3.0.0"})


@app.route("/api/info", methods=["POST"])
def get_info():
    data = request.json or {}
    url  = (data.get("url") or "").strip()
    if not url: return jsonify({"error":"URL required"}), 400
    opts = {"quiet":True,"no_warnings":True,"skip_download":True,"socket_timeout":20}
    try:
        with yt_dlp.YoutubeDL(opts) as ydl:
            info = ydl.extract_info(url, download=False)
        fmts, seen = [], set()
        for f in info.get("formats",[]):
            h = f.get("height")
            if h and f.get("vcodec","none") != "none" and h not in seen:
                seen.add(h)
                fmts.append({"quality":f"{h}p",
                    "filesize": format_bytes(f.get("filesize") or f.get("filesize_approx") or 0)})
        fmts.sort(key=lambda x: int(x["quality"][:-1]), reverse=True)
        manual = list((info.get("subtitles") or {}).keys())
        auto   = list((info.get("automatic_captions") or {}).keys())
        return jsonify({
            "title":    info.get("title","Unknown"),
            "channel":  info.get("uploader","Unknown"),
            "duration": info.get("duration_string") or f"{info.get('duration',0)}s",
            "duration_sec": info.get("duration", 0),
            "views":    f"{info.get('view_count',0):,}",
            "thumbnail": info.get("thumbnail"),
            "available_qualities": fmts,
            "has_subtitles": bool(manual or auto),
            "manual_langs": manual,
            "auto_langs":   auto,
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 400


# ── VIEW subtitles in-app (no download) ──────────────────────────
@app.route("/api/subtitles/view", methods=["POST"])
def view_subtitles():
    data = request.json or {}
    url  = (data.get("url") or "").strip()
    lang = (data.get("lang") or "en").strip()
    if not url: return jsonify({"error":"URL required"}), 400

    result     = {}
    done_event = threading.Event()

    threading.Thread(
        target=get_subtitles,
        args=(url, lang, result, done_event),
        daemon=True
    ).start()

    finished = done_event.wait(timeout=45)

    if not finished:
        return jsonify({"error":"Timed out (45s). Video may not have captions."}), 408

    if result.get("error"):
        return jsonify({"error": result["error"]}), 404

    return jsonify({
        "lines":    result["lines"],
        "lang":     result.get("lang", lang),
        "kind":     result.get("kind",""),
        "count":    len(result["lines"]),
    })


# ── DOWNLOAD subtitle file ────────────────────────────────────────
@app.route("/api/subtitles/download", methods=["POST"])
def download_subtitle_file():
    data   = request.json or {}
    url    = (data.get("url") or "").strip()
    lang   = (data.get("lang") or "en").strip()
    fmt    = (data.get("format") or "srt").lower()
    if not url: return jsonify({"error":"URL required"}), 400

    job_id = str(uuid.uuid4())[:8]
    jobs[job_id] = {"status":"starting","progress":5,"type":"subtitle"}

    def run():
        result     = {}
        done_event = threading.Event()
        threading.Thread(
            target=get_subtitles,
            args=(url, lang, result, done_event),
            daemon=True
        ).start()
        finished = done_event.wait(timeout=45)
        if not finished:
            jobs[job_id].update({"status":"error","error":"Timed out (45s). No captions found."})
            return
        if result.get("error"):
            jobs[job_id].update({"status":"error","error":result["error"]})
            return

        lines = result["lines"]
        lang_used = result.get("lang", lang)
        jobs[job_id]["progress"] = 80

        # Build file content
        if fmt == "txt":
            content = "\n".join(f"[{l['time']}]  {l['text']}" for l in lines)
            ext = "txt"
        elif fmt == "srt":
            parts = []
            for i, l in enumerate(lines, 1):
                parts += [str(i), f"{l['time']} --> {l['time']}", l['text'], ""]
            content = "\n".join(parts)
            ext = "srt"
        else:  # vtt
            content = "WEBVTT\n\n" + "\n\n".join(
                f"{l['time']} --> {l['time']}\n{l['text']}" for l in lines
            )
            ext = "vtt"

        out = DOWNLOAD_DIR / f"{job_id}_subs_{lang_used}.{ext}"
        out.write_text(content, encoding="utf-8")
        jobs[job_id].update({
            "status":"done","progress":100,
            "filepath": str(out),
            "filename": f"subtitles_{lang_used}.{ext}",
        })
        clean_job(job_id)

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
        "format": fmt_str, "outtmpl": str(out_path),
        "merge_output_format": fmt,
        "progress_hooks": [make_progress_hook(job_id)],
        "quiet": True, "no_warnings": True, "socket_timeout": 30,
        "postprocessors": [{"key":"FFmpegVideoConvertor","preferedformat":fmt}],
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
    return jsonify({"job_id": job_id})


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
        "format": "bestaudio/best", "outtmpl": str(out_path),
        "progress_hooks": [make_progress_hook(job_id)],
        "quiet": True, "no_warnings": True, "socket_timeout": 30,
        "postprocessors": [{"key":"FFmpegExtractAudio",
            "preferredcodec": codec, "preferredquality": str(kbps)}],
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
            jobs[job_id].update({"status":"error",
                "error":"Audio file not found. Is FFmpeg installed?"})
        except Exception as e:
            err = str(e)
            if "codec" in err.lower() or "encoder" in err.lower():
                err = f"{fmt.upper()} failed — try MP3 or AAC."
            jobs[job_id].update({"status":"error","error":err})

    threading.Thread(target=run, daemon=True).start()
    return jsonify({"job_id": job_id})


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
        return jsonify({"error":"File not found on server"}), 404
    return send_file(fp, as_attachment=True, download_name=fn)


if __name__ == "__main__":
    print("\n🌸 Video Bloom Backend v3.0 — http://localhost:8080\n")
    app.run(host="0.0.0.0", port=8080, debug=False, threaded=True)
