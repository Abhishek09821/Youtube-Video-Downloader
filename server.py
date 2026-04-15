"""
YTGrab 3D - server.py
Flask + yt-dlp + FFmpeg

Install:  pip3 install flask flask-cors yt-dlp
Run:      python3 server.py
Open:     http://localhost:5000
"""

import os, json, uuid, threading, queue, re
import yt_dlp
from flask import Flask, request, jsonify, Response, send_from_directory
from flask_cors import CORS

BASE_DIR     = os.path.dirname(os.path.abspath(__file__))
DOWNLOAD_DIR = os.path.join(BASE_DIR, 'downloads')
os.makedirs(DOWNLOAD_DIR, exist_ok=True)

app = Flask(__name__, static_folder=BASE_DIR, static_url_path='')
CORS(app)

# ── Serve frontend ────────────────────────────────────────
@app.route('/')
def index():
    return send_from_directory(BASE_DIR, 'index.html')

# ── Base yt-dlp options ───────────────────────────────────
def base_opts():
    return {'quiet': True, 'no_warnings': True, 'nocheckcertificate': True}

# ── /info ─────────────────────────────────────────────────
@app.route('/info', methods=['POST'])
def get_info():
    url = (request.get_json(force=True) or {}).get('url', '').strip()
    if not url:
        return jsonify({'error': 'URL required'}), 400
    try:
        with yt_dlp.YoutubeDL({**base_opts(), 'skip_download': True}) as ydl:
            info = ydl.extract_info(url, download=False)
        return jsonify({
            'title':      info.get('title'),
            'thumbnail':  info.get('thumbnail'),
            'duration':   info.get('duration'),
            'uploader':   info.get('uploader'),
            'view_count': info.get('view_count'),
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 400

# ── /download  (SSE progress stream) ─────────────────────
@app.route('/download')
def download():
    url     = request.args.get('url', '').strip()
    dltype  = request.args.get('type', 'video')
    quality = request.args.get('quality', '1080')
    fmt     = request.args.get('format', 'mp4')
    bitrate = request.args.get('bitrate', '256')

    if not url:
        return Response('data: {"status":"error","message":"URL required"}\n\n',
                        mimetype='text/event-stream')

    q = queue.Queue()

    def hook(d):
        if d['status'] == 'downloading':
            raw = d.get('_percent_str', '0%').strip().replace('%', '')
            try: pct = int(float(raw))
            except: pct = 0
            speed = d.get('_speed_str', '').strip()
            eta   = d.get('_eta_str', '').strip()
            q.put({'status': 'progress', 'percent': pct,
                   'info': f'{speed} · ETA {eta}' if speed else ''})
        elif d['status'] == 'finished':
            q.put({'status': 'progress', 'percent': 95, 'info': 'FINALIZING…'})

    fid      = str(uuid.uuid4())[:8]
    out_tmpl = os.path.join(DOWNLOAD_DIR, f'{fid}.%(ext)s')

    if dltype == 'video':
        q_num = quality.rstrip('p')
        if fmt == 'webm':
            fmt_str = f'bestvideo[height<={q_num}][ext=webm]+bestaudio[ext=webm]/bestvideo[height<={q_num}]+bestaudio/best'
        else:
            fmt_str = f'bestvideo[height<={q_num}][ext=mp4]+bestaudio[ext=m4a]/bestvideo[height<={q_num}]+bestaudio/best[height<={q_num}]/best'
        ydl_opts = {**base_opts(), 'outtmpl': out_tmpl, 'format': fmt_str,
                    'merge_output_format': fmt, 'postprocessors': [], 'progress_hooks': [hook]}
    else:
        ydl_opts = {**base_opts(), 'outtmpl': out_tmpl, 'format': 'bestaudio/best',
                    'postprocessors': [{'key': 'FFmpegExtractAudio',
                                        'preferredcodec': fmt, 'preferredquality': bitrate}],
                    'progress_hooks': [hook]}

    result = {}

    def run():
        try:
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                info     = ydl.extract_info(url, download=True)
                filename = ydl.prepare_filename(info)
                if dltype == 'audio':
                    base = os.path.splitext(filename)[0]
                    for ext in [fmt, 'mp3', 'm4a', 'ogg', 'flac', 'opus']:
                        c = f'{base}.{ext}'
                        if os.path.exists(c): filename = c; break
                result['fn'] = os.path.basename(filename)
                q.put({'status': 'done', 'filename': result['fn']})
        except Exception as e:
            q.put({'status': 'error', 'message': str(e)})

    threading.Thread(target=run, daemon=True).start()

    def stream():
        while True:
            try:
                msg = q.get(timeout=180)
                yield f'data: {json.dumps(msg)}\n\n'
                if msg['status'] in ('done', 'error'): break
            except queue.Empty:
                yield 'data: {"status":"error","message":"Timed out"}\n\n'
                break

    return Response(stream(), mimetype='text/event-stream',
                    headers={'Cache-Control': 'no-cache',
                             'X-Accel-Buffering': 'no',
                             'Connection': 'keep-alive'})

# ── /file/<name>  serve completed download ────────────────
@app.route('/file/<path:filename>')
def serve_file(filename):
    return send_from_directory(DOWNLOAD_DIR, os.path.basename(filename), as_attachment=True)

# ── Run ───────────────────────────────────────────────────
if __name__ == '__main__':
    print('\n  ▶  YTGrab 3D  →  http://localhost:5000\n')
    app.run(debug=False, host='0.0.0.0', port=5000, threaded=True)

@app.route("/analyze", methods=["POST"])
def analyze():
    data = request.get_json()
    url = data.get("url")

    return jsonify({
        "status": "success",
        "message": "Backend connected",
        "url": url
    })
