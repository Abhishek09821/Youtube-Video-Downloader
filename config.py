"""
VDOWN Configuration Module
Centralized configuration with environment variable support.
"""

import os
from pathlib import Path
from dotenv import load_dotenv

# Load .env file if present
load_dotenv()

# ── Base Paths ──
BASE_DIR = Path(__file__).parent
FRONTEND_DIST = BASE_DIR / "frontend" / "dist"
DOWNLOAD_DIR = Path(os.getenv("DOWNLOAD_DIR", "./downloads"))
CACHE_DIR = Path(os.getenv("SUBTITLE_CACHE_DIR", "./cache/subtitles"))

# Ensure directories exist
DOWNLOAD_DIR.mkdir(exist_ok=True)
CACHE_DIR.mkdir(exist_ok=True, parents=True)

# ── Server Configuration ──
HOST = os.getenv("HOST", "0.0.0.0")
PORT = int(os.getenv("PORT", "8080"))
DEBUG = os.getenv("DEBUG", "False").lower() == "true"

# ── CORS Configuration ──
CORS_ORIGINS = [
    o.strip()
    for o in os.getenv(
        "VIDOWN_CORS_ORIGINS",
        "http://localhost:5173,http://127.0.0.1:5173"
    ).split(",")
    if o.strip()
]

# ── Whisper Configuration ──
WHISPER_MODEL = os.getenv("WHISPER_MODEL", "base")  # tiny, base, small, medium, large, large-v2, large-v3
WHISPER_DEVICE = os.getenv("WHISPER_DEVICE", "auto")  # auto, cuda, cpu
WHISPER_COMPUTE_TYPE = os.getenv("WHISPER_COMPUTE_TYPE", "default")

# ── Subtitle Configuration ──
SUBTITLE_CACHE_TTL_DAYS = int(os.getenv("SUBTITLE_CACHE_TTL_DAYS", "30"))
MAX_VIDEO_DURATION = int(os.getenv("MAX_VIDEO_DURATION_SECONDS", "7200"))  # 2 hours
MAX_AUDIO_SIZE_MB = int(os.getenv("MAX_AUDIO_SIZE_MB", "500"))
SUPPORTED_FORMATS = os.getenv("SUPPORTED_SUBTITLE_FORMATS", "srt,vtt,txt").split(",")
ENABLE_AI_SUBTITLES = os.getenv("ENABLE_AI_SUBTITLES", "True").lower() == "true"
AI_SUBTITLE_TIMEOUT = int(os.getenv("AI_SUBTITLE_TIMEOUT_SECONDS", "600"))

# ── Redis Configuration ──
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")

# ── Download Configuration ──
DOWNLOAD_CLEANUP_DELAY = int(os.getenv("DOWNLOAD_CLEANUP_MINUTES", "5")) * 60

# ── AI Video Enhance (upscaling) Configuration ──
# When a Real-ESRGAN backend is available it is used for true neural
# super-resolution; otherwise VDown falls back to a high-quality FFmpeg
# Lanczos + unsharp upscaler. Install the `realesrgan-ncnn-vulkan` binary
# (https://github.com/xinntao/Real-ESRGAN) and point REALESRGAN_BIN at it.
ENABLE_REALESRGAN = os.getenv("ENABLE_REALESRGAN", "True").lower() == "true"
REALESRGAN_BIN = os.getenv("REALESRGAN_BIN", "realesrgan-ncnn-vulkan")
REALESRGAN_MODEL = os.getenv("REALESRGAN_MODEL", "realesrgan-x4plus")
# Frame-by-frame neural upscaling is expensive; cap the input duration.
REALESRGAN_MAX_SECONDS = int(os.getenv("REALESRGAN_MAX_SECONDS", "180"))

# ── Caption fetch headers (YouTube timedtext endpoints expect these) ──
BROWSER_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept-Language": "en-US,en;q=0.9,hi;q=0.8",
    "Accept": "*/*",
    "Referer": "https://www.youtube.com/",
    "Origin": "https://www.youtube.com",
}

# ── yt-dlp Base Options ──
# NOTE: Do NOT force a YouTube Referer/Origin here — that breaks extraction on
# other platforms (Instagram, X, Reddit, TikTok, ...). yt-dlp sets the correct
# per-site headers automatically; we only supply a realistic User-Agent.
YDL_BASE_OPTS = {
    "quiet": True,
    "no_warnings": True,
    "socket_timeout": 20,
    "http_headers": {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept-Language": "en-US,en;q=0.9",
    },
}
