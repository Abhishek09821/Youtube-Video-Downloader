"""
Video Bloom — Backend Server v2.0
Complete rewrite of subtitle system:
- Auto-generated captions always tried first
- In-app subtitle viewer (no download needed)
- Proper timeout handling
- OGG codec fix
"""

from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
import yt_dlp
import os
import threading
import uuid
import time
import re
from pathlib import Path

app = Flask(__name__)
CORS(app, origins=["*"])

DOWNLOAD_DIR = Path("downloads")
DOWNLOAD_DIR.mkdir(exist_ok=True)

jobs = {}

AUDIO_CODEC_MAP = {
    "mp3":  "mp3",
    "flac": "flac",
    "wav":  "wav",
    "aac":  "aac",
    "ogg":  "vorbis",
    "m4a":  "m4a",
}

# ─────────────────────────────────────────────
# UTILITIES
# ─────────────────────────────────────────────

def format_bytes(b):
    if not b:
        return "0 B"
    for unit in ["B", "KB", "MB", "GB"]:
        if b < 1024:
            return f"{b:.1f} {unit}"
        b /= 1024
    return f"{b:.1f} TB"


def make_progress_hook(job_id):
    def hook(d):
        if d["status"] == "downloading":
            total = d.get("total_bytes") or d.get("total_bytes_estimate", 0)
            downloaded = d.get("downloaded_bytes", 0)
            speed = d.get("speed", 0) or 0
            pct = (downloaded / total * 100) if total else 0
            jobs[job_id].update({
                "status": "downloading",
                "progress": round(pct, 1),
                "speed": format_bytes(speed) + "/s",
                "downloaded": format_bytes(downloaded),
                "total": format_bytes(total),
            })
        elif d["status"] == "finished":
            jobs[job_id]["status"] = "processing"
            jobs[job_id]["progress"] = 95
    return hook


def clean_job(job_id, delay=300):
    def _clean():
        time.sleep(delay)
        job = jobs.pop(job_id, {})
        fpath = job.get("filepath")
        if fpath and os.path.exists(fpath):
            try: os.remove(fpath)
            except: pass
    threading.Thread(target=_clean, daemon=True).start()


def vtt_to_plain(vtt_text):
    """Convert VTT/SRT subtitle text to plain readable lines with timestamps."""
    lines = vtt_text.splitlines()
    result = []
    current_time = ""
    current_text = []
    seen_texts = set()

    for line in lines:
        line = line.strip()
        if not line or line == "WEBVTT" or line.startswith("NOTE") or line.isdigit():
            if current_text:
                text = " ".join(current_text).strip()
                # Remove HTML tags
                text = re.sub(r'<[^>]+>', '', text)
                text = re.sub(r'&amp;', '&', text)
                text = re.sub(r'&lt;', '<', text)
                text = re.sub(r'&gt;', '>', text)
                text = text.strip()
                if text and text not in seen_texts:
                    seen_texts.add(text)
                    result.append({"time": current_time, "text": text})
            current_text = []
            current_time = ""
            continue

        # Timestamp line
        if "-->" in line:
            # Extract start time only
            start = line.split("-->")[0].strip()
            # Simplify to MM:SS
            parts = start.replace(",", ".").split(":")
            try:
                if len(parts) == 3:
                    h, m, s = int(parts[0]), int(parts[1]), float(parts[2])
                    total_sec = int(h * 3600 + m * 60 + s)
                    mm, ss = divmod(total_sec, 60)
                    current_time = f"{mm:02d}:{ss:02d}"
                else:
                    current_time = start
            except:
                current_time = start
        else:
            current_text.append(line)

    # Catch last block
    if current_text:
        text = " ".join(current_text).strip()
        text = re.sub(r'<[^>]+>', '', text)
        text = text.strip()
        if text and text not in seen_texts:
            result.append({"time": current_time, "text": text})

    return result


def fetch_subtitles_internal(url, lang="en", auto=True):
    """
    Core subtitle fetcher. Returns (lines_list, raw_text, lang_used, error_str)
    Tries in order:
      1. Manual subtitles for requested lang
      2. Auto-generated for requested lang
      3. Auto-generated English fallback
      4. Any available auto-caption
    """
    job_tmp = str(uuid.uuid4())[:6]
    out_path = DOWNLOAD_DIR / f"tmp_{job_tmp}"

    # Try multiple lang codes (e.g. "hi" also try "hi-IN")
    lang_variants = [lang, f"{lang}-IN", f"{lang}-US", f"{lang}-GB", "en", "en-US", "en-GB", "en-IN"]
    lang_variants = list(dict.fromkeys(lang_variants))  # dedupe

    ydl_opts = {
        "skip_download": True,
        "writesubtitles": True,
        "writeautomaticsub": True,
        "subtitleslangs": lang_variants,
        "subtitlesformat": "vtt",
        "outtmpl": str(out_path),
        "quiet": True,
        "no_warnings": True,
        "socket_timeout": 20,
    }

    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=True)

        # Find any downloaded subtitle file
        sub_files = sorted(DOWNLOAD_DIR.glob(f"tmp_{job_tmp}*.vtt"))

        if sub_files:
            raw = sub_files[0].read_text(encoding="utf-8", errors="replace")
            lang_used = sub_files[0].stem.split(".")[-1] if "." in sub_files[0].stem else lang
            lines = vtt_to_plain(raw)
            # Cleanup temp files
            for f in sub_files:
                try: f.unlink()
                except: pass
            return lines, raw, lang_used, None

        # No file downloaded — check what's actually available
        manual_langs = list(info.get("subtitles", {}).keys())
        auto_langs   = list((info.get("automatic_captions") or {}).keys())
        all_avail = manual_langs + auto_langs

        if not all_avail:
            return [], "", lang, "No subtitles or captions available for this video."

        # Suggest available langs
        avail_str = ", ".join(sorted(set(all_avail))[:10])
        return [], "", lang, f"No subtitles in '{lang}'. Available languages: {avail_str}"

    except Exception as e:
        # Cleanup
        for f in DOWNLOAD_DIR.glob(f"tmp_{job_tmp}*"):
            try: f.unlink()
            except: pass
        return [], "", lang, str(e)


# ─────────────────────────────────────────────
# ROUTES
# ─────────────────────────────────────────────

@app.route("/api/health")
def health():
    return jsonify({"status": "ok", "version": "2.0.0"})


@app.route("/api/info", methods=["POST"])
def get_info():
    data = request.json or {}
    url = data.get("url", "").strip()
    if not url:
        return jsonify({"error": "URL is required"}), 400

    ydl_opts = {
        "quiet": True,
        "no_warnings": True,
        "skip_download": True,
        "socket_timeout": 20,
    }
    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=False)

        formats = []
        seen_res = set()
        for f in info.get("formats", []):
            res = f.get("height")
            if res and f.get("vcodec", "none") != "none" and res not in seen_res:
                seen_res.add(res)
                formats.append({
                    "quality": f"{res}p",
                    "filesize": format_bytes(f.get("filesize") or f.get("filesize_approx") or 0),
                })
        formats.sort(key=lambda x: int(x["quality"][:-1]), reverse=True)

        manual_langs = list(info.get("subtitles", {}).keys())
        auto_langs   = list((info.get("automatic_captions") or {}).keys())

        return jsonify({
            "title":            info.get("title", "Unknown"),
            "channel":          info.get("uploader", "Unknown"),
            "duration":         info.get("duration_string") or f"{info.get('duration',0)}s",
            "duration_sec":     info.get("duration", 0),
            "views":            f"{info.get('view_count', 0):,}",
            "thumbnail":        info.get("thumbnail"),
            "available_qualities": formats,
            "has_subtitles":    bool(manual_langs or auto_langs),
            "manual_langs":     manual_langs,
            "auto_langs":       auto_langs,
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 400


# ── NEW: View subtitles in-app (no download) ──────────────────────
@app.route("/api/subtitles/view", methods=["POST"])
def view_subtitles():
    """
    Returns subtitle lines as JSON for in-app display.
    Always tries auto-generated, falls back gracefully.
    Has a hard 45-second timeout.
    """
    data = request.json or {}
    url  = data.get("url", "").strip()
    lang = data.get("lang", "en").strip()

    if not url:
        return jsonify({"error": "URL is required"}), 400

    result = {"lines": [], "lang_used": lang, "error": None, "done": False}
    done_event = threading.Event()

    def fetch():
        lines, raw, lang_used, err = fetch_subtitles_internal(url, lang, auto=True)
        result["lines"]     = lines
        result["lang_used"] = lang_used
        result["error"]     = err
        result["done"]      = True
        done_event.set()

    t = threading.Thread(target=fetch, daemon=True)
    t.start()
    finished = done_event.wait(timeout=45)   # ← hard 45s timeout

    if not finished:
        return jsonify({
            "error": "Timed out fetching subtitles (45s). Try a different language or video.",
            "lines": [],
            "lang_used": lang,
        }), 408

    if result["error"]:
        return jsonify({"error": result["error"], "lines": [], "lang_used": result["lang_used"]}), 404

    return jsonify({
        "lines":     result["lines"],
        "lang_used": result["lang_used"],
        "count":     len(result["lines"]),
    })


# ── Download subtitle file ────────────────────────────────────────
@app.route("/api/download/subtitle", methods=["POST"])
def download_subtitle():
    data = request.json or {}
    url  = data.get("url", "").strip()
    lang = data.get("lang", "en").strip()
    fmt  = data.get("format", "srt").lower()

    if not url:
        return jsonify({"error": "URL is required"}), 400

    job_id = str(uuid.uuid4())[:8]
    jobs[job_id] = {"status": "starting", "progress": 0, "type": "subtitle"}

    def run():
        try:
            jobs[job_id]["progress"] = 10
            lines, raw_vtt, lang_used, err = fetch_subtitles_internal(url, lang, auto=True)

            if err:
                jobs[job_id]["status"] = "error"
                jobs[job_id]["error"]  = err
                return

            jobs[job_id]["progress"] = 80

            # Convert to requested format
            if fmt == "txt":
                content = "\n".join(
                    f"[{l['time']}] {l['text']}" for l in lines
                )
                ext = "txt"
            elif fmt in ("srt",):
                # Convert VTT raw to SRT-like
                srt_lines = []
                for i, l in enumerate(lines, 1):
                    srt_lines.append(str(i))
                    srt_lines.append(l["time"] + " --> " + l["time"])
                    srt_lines.append(l["text"])
                    srt_lines.append("")
                content = "\n".join(srt_lines)
                ext = "srt"
            else:
                content = raw_vtt
                ext = "vtt"

            # Save file
            title_slug = re.sub(r'[^\w\s-]', '', lang_used)[:40]
            out_file = DOWNLOAD_DIR / f"{job_id}_subtitles_{lang_used}.{ext}"
            out_file.write_text(content, encoding="utf-8")

            jobs[job_id].update({
                "status":   "done",
                "progress": 100,
                "filepath": str(out_file),
                "filename": f"subtitles_{lang_used}.{ext}",
            })
            clean_job(job_id)

        except Exception as e:
            jobs[job_id]["status"] = "error"
            jobs[job_id]["error"]  = str(e)

    # Watchdog: kill if stuck > 50s
    def watchdog():
        time.sleep(50)
        if jobs.get(job_id, {}).get("status") in ("starting",):
            jobs[job_id]["status"] = "error"
            jobs[job_id]["error"]  = "Timed out. No subtitles found in 50s."

    threading.Thread(target=run,      daemon=True).start()
    threading.Thread(target=watchdog, daemon=True).start()
    return jsonify({"job_id": job_id})


@app.route("/api/download/video", methods=["POST"])
def download_video():
    data    = request.json or {}
    url     = data.get("url", "").strip()
    quality = data.get("quality", "1080p").replace("p", "")
    fmt     = data.get("format", "mp4").lower()

    if not url:
        return jsonify({"error": "URL is required"}), 400

    job_id   = str(uuid.uuid4())[:8]
    out_path = DOWNLOAD_DIR / f"{job_id}.%(ext)s"
    fmt_str  = (
        f"bestvideo[height<={quality}][ext={fmt}]+bestaudio[ext=m4a]"
        f"/bestvideo[height<={quality}]+bestaudio/best[height<={quality}]/best"
    )

    ydl_opts = {
        "format":               fmt_str,
        "outtmpl":              str(out_path),
        "merge_output_format":  fmt,
        "progress_hooks":       [make_progress_hook(job_id)],
        "quiet":                True,
        "no_warnings":          True,
        "socket_timeout":       30,
        "postprocessors":       [{"key": "FFmpegVideoConvertor", "preferedformat": fmt}],
    }

    jobs[job_id] = {"status": "starting", "progress": 0, "type": "video"}

    def run():
        try:
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                info  = ydl.extract_info(url, download=True)
                title = info.get("title", "video")
            for ext in [fmt, "mp4", "mkv", "webm"]:
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
    url   = data.get("url", "").strip()
    kbps  = data.get("kbps", "320")
    fmt   = data.get("format", "mp3").lower()
    codec = AUDIO_CODEC_MAP.get(fmt, fmt)

    if not url:
        return jsonify({"error": "URL is required"}), 400

    job_id   = str(uuid.uuid4())[:8]
    out_path = DOWNLOAD_DIR / f"{job_id}.%(ext)s"

    ydl_opts = {
        "format":         "bestaudio/best",
        "outtmpl":        str(out_path),
        "progress_hooks": [make_progress_hook(job_id)],
        "quiet":          True,
        "no_warnings":    True,
        "socket_timeout": 30,
        "postprocessors": [{"key":"FFmpegExtractAudio","preferredcodec":codec,"preferredquality":str(kbps)}],
    }

    jobs[job_id] = {"status": "starting", "progress": 0, "type": "audio"}

    def run():
        try:
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                info  = ydl.extract_info(url, download=True)
                title = info.get("title", "audio")
            for ext in [fmt, "ogg", "mp3", "m4a", "opus", "webm"]:
                p = DOWNLOAD_DIR / f"{job_id}.{ext}"
                if p.exists():
                    jobs[job_id].update({"status":"done","progress":100,
                        "filepath":str(p),"filename":f"{title[:60]}.{ext}"})
                    clean_job(job_id); return
            jobs[job_id].update({"status":"error","error":"Audio file not found. Check FFmpeg is installed."})
        except Exception as e:
            err = str(e)
            if "codec" in err.lower() or "encoder" in err.lower():
                err = f"{fmt.upper()} encoding failed. Try MP3 or AAC instead."
            jobs[job_id].update({"status":"error","error":err})

    threading.Thread(target=run, daemon=True).start()
    return jsonify({"job_id": job_id})


@app.route("/api/status/<job_id>")
def job_status(job_id):
    job = jobs.get(job_id)
    if not job:
        return jsonify({"error": "Job not found"}), 404
    return jsonify(job)


@app.route("/api/file/<job_id>")
def serve_file(job_id):
    job = jobs.get(job_id)
    if not job or job.get("status") != "done":
        return jsonify({"error": "File not ready"}), 404
    fp = job.get("filepath")
    fn = job.get("filename", "download")
    if not fp or not os.path.exists(fp):
        return jsonify({"error": "File not found on server"}), 404
    return send_file(fp, as_attachment=True, download_name=fn)


if __name__ == "__main__":
    print("\n🌸 Video Bloom Backend v2.0 — http://localhost:8080\n")
    app.run(host="0.0.0.0", port=8080, debug=False, threaded=True)
