"""
Video and YouTube Utilities
Functions for extracting video IDs and handling YouTube URLs.
"""

import re
import hashlib
from typing import Optional


def extract_video_id(url: str) -> str:
    """
    Extract a stable ID for any supported platform URL.

    YouTube URLs yield the native 11-char video ID. For other platforms
    (Instagram, X/Twitter, Reddit, TikTok, Snapchat, Telegram, etc.) there is
    no universal ID scheme, so a short deterministic hash of the normalized URL
    is used instead. This keeps cache keys clean and collision-free.

    Args:
        url: Media URL or video ID

    Returns:
        Stable ID string
    """
    # YouTube native ID
    yt_patterns = [
        r"(?:v=|youtu\.be/|shorts/|embed/|watch\?v=)([A-Za-z0-9_-]{11})",
    ]
    for pattern in yt_patterns:
        match = re.search(pattern, url)
        if match:
            return match.group(1)

    # Generic platforms: hash the normalized URL (strip query/fragment noise)
    normalized = url.strip().split("?")[0].split("#")[0].rstrip("/")
    if normalized:
        return hashlib.sha1(normalized.encode("utf-8")).hexdigest()[:16]

    # Last-resort fallback: use the raw URL as the key
    return url


# Platforms that yt-dlp can extract from (non-exhaustive, used for UX hints)
SUPPORTED_DOMAINS = (
    "youtube.com", "youtu.be",
    "instagram.com",
    "twitter.com", "x.com",
    "reddit.com", "redd.it",
    "tiktok.com",
    "snapchat.com",
    "t.me", "telegram.me",
    "facebook.com", "fb.watch",
    "vimeo.com",
    "dailymotion.com",
    "twitch.tv",
)


def is_youtube_url(url: str) -> bool:
    """Check if URL is a valid YouTube URL."""
    return bool(re.search(r"(youtube\.com|youtu\.be)", url, re.IGNORECASE))


def is_supported_url(url: str) -> bool:
    """
    Loose validation: accept any http(s) URL. yt-dlp supports 1000+ sites,
    so we let it attempt extraction rather than hard-blocking domains here.
    """
    return bool(re.match(r"^https?://", url.strip(), re.IGNORECASE))


def format_duration(seconds: Optional[int]) -> str:
    """Format duration in seconds to HH:MM:SS or MM:SS."""
    if not seconds:
        return "00:00"
    
    hours, remainder = divmod(int(seconds), 3600)
    minutes, secs = divmod(remainder, 60)
    
    if hours > 0:
        return f"{hours:02d}:{minutes:02d}:{secs:02d}"
    return f"{minutes:02d}:{secs:02d}"


def format_bytes(bytes_count: Optional[int]) -> str:
    """Format byte count to human-readable string."""
    if not bytes_count:
        return "0 B"
    
    for unit in ["B", "KB", "MB", "GB", "TB"]:
        if bytes_count < 1024:
            return f"{bytes_count:.1f} {unit}"
        bytes_count /= 1024
    
    return f"{bytes_count:.1f} TB"
