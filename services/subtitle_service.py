"""
Subtitle Service
Production-grade subtitle pipeline with automatic AI fallback.

Pipeline:
1. Try manual YouTube subtitles
2. Try auto-generated YouTube subtitles  
3. On failure, automatically generate with AI (Whisper)
4. Cache results for future requests
"""

import re
import json
import time
import urllib.request
import urllib.error
from typing import Optional, List, Dict, Tuple, Callable
from datetime import datetime

import yt_dlp

from config import YDL_BASE_OPTS, BROWSER_HEADERS, ENABLE_AI_SUBTITLES
from models import (
    SubtitleResult,
    SubtitleMetadata,
    SubtitleLine,
    SubtitleSource,
    CaptionInfo,
    ProgressUpdate,
)
from services.subtitle_cache import subtitle_cache
from services.whisper_service import whisper_service
from utils.logging_utils import get_logger, PerformanceMetrics
from utils.video_utils import extract_video_id

logger = get_logger(__name__)


class SubtitleService:
    """
    Main subtitle service with intelligent fallback pipeline.
    """
    
    def __init__(self):
        self.caption_url_cache: Dict[str, Dict] = {}
        logger.info("SubtitleService initialized")
    
    def get_subtitles(
        self,
        video_url: str,
        language: str = "en",
        progress_callback: Optional[Callable[[ProgressUpdate], None]] = None
    ) -> SubtitleResult:
        """
        Get subtitles with automatic fallback pipeline.
        
        Pipeline:
        1. Check cache
        2. Try manual YouTube subtitles
        3. Try auto-generated YouTube subtitles
        4. Generate with AI (Whisper)
        
        Args:
            video_url: YouTube video URL
            language: Target language code (e.g., 'en', 'hi')
            progress_callback: Optional callback for progress updates
            
        Returns:
            SubtitleResult with lines and metadata
            
        Raises:
            RuntimeError: If all methods fail
        """
        video_id = extract_video_id(video_url)
        
        with PerformanceMetrics(logger, f"Subtitle retrieval for {video_id}") as metrics:
            
            def send_progress(stage: str, progress: int, message: str):
                if progress_callback:
                    progress_callback(ProgressUpdate(stage, progress, message))
            
            # Step 0: Check cache
            send_progress("cache", 5, "Checking cache...")
            cached = subtitle_cache.get(video_id, language)
            if cached:
                logger.info(f"Returning cached subtitles for {video_id}")
                metrics.add_metric("source", "cache")
                cached.metadata.source = SubtitleSource.CACHED
                return cached
            
            # Step 1: Try manual subtitles
            send_progress("manual", 10, "Checking manual subtitles...")
            try:
                result = self._try_youtube_subtitles(
                    video_url,
                    video_id,
                    language,
                    prefer_manual=True
                )
                if result:
                    logger.info(f"Manual subtitles found for {video_id}")
                    metrics.add_metric("source", "youtube_manual")
                    subtitle_cache.set(video_id, language, result.metadata.source, result)
                    return result
            except Exception as e:
                logger.warning(f"Manual subtitle attempt failed: {e}")
            
            # Step 2: Try auto-generated subtitles
            send_progress("auto", 30, "Checking auto-generated subtitles...")
            try:
                result = self._try_youtube_subtitles(
                    video_url,
                    video_id,
                    language,
                    prefer_manual=False
                )
                if result:
                    logger.info(f"Auto-generated subtitles found for {video_id}")
                    metrics.add_metric("source", "youtube_auto")
                    subtitle_cache.set(video_id, language, result.metadata.source, result)
                    return result
            except Exception as e:
                logger.warning(f"Auto subtitle attempt failed: {e}")
            
            # Step 3: Generate with AI
            if not ENABLE_AI_SUBTITLES:
                raise RuntimeError(
                    "Subtitles unavailable and AI generation is disabled. "
                    "Enable ENABLE_AI_SUBTITLES in config."
                )
            
            logger.info(f"YouTube subtitles unavailable, generating with AI for {video_id}")
            send_progress("ai_extract", 40, "Preparing audio for AI...")
            
            try:
                result = self._generate_ai_subtitles(
                    video_url,
                    video_id,
                    language,
                    progress_callback=send_progress
                )
                metrics.add_metric("source", "ai_generated")
                subtitle_cache.set(video_id, language, result.metadata.source, result)
                return result
                
            except Exception as e:
                logger.error(f"AI subtitle generation failed: {e}")
                raise RuntimeError(
                    f"All subtitle methods failed. Last error: {str(e)}"
                )
    
    def _try_youtube_subtitles(
        self,
        video_url: str,
        video_id: str,
        language: str,
        prefer_manual: bool = True
    ) -> Optional[SubtitleResult]:
        """
        Attempt to download YouTube subtitles.
        
        Args:
            video_url: YouTube video URL
            video_id: Extracted video ID
            language: Target language
            prefer_manual: If True, only try manual; if False, only try auto
            
        Returns:
            SubtitleResult if successful, None otherwise
        """
        try:
            # Get caption URLs from cache or fetch fresh
            caption_map = self._get_caption_map(video_url, video_id)
            
            if not caption_map:
                return None
            
            # Find best matching caption
            caption_url, kind, matched_lang = self._resolve_language(
                caption_map,
                language,
                prefer_manual
            )
            
            if not caption_url:
                return None
            
            # Download and parse captions
            raw_content = self._download_caption_content(caption_url)
            if not raw_content:
                return None
            
            lines = self._parse_caption_content(raw_content)
            if not lines:
                return None
            
            # Create result
            source = (
                SubtitleSource.YOUTUBE_MANUAL
                if kind == "manual"
                else SubtitleSource.YOUTUBE_AUTO
            )
            
            metadata = SubtitleMetadata(
                language=matched_lang,
                source=source,
                line_count=len(lines),
                video_id=video_id,
                generated_at=datetime.now(),
            )
            
            return SubtitleResult(
                lines=lines,
                metadata=metadata,
                raw_content=raw_content,
            )
            
        except Exception as e:
            logger.warning(f"YouTube subtitle download failed: {e}")
            return None
    
    def _generate_ai_subtitles(
        self,
        video_url: str,
        video_id: str,
        language: Optional[str],
        progress_callback: Optional[Callable] = None
    ) -> SubtitleResult:
        """
        Generate subtitles using AI (Whisper).
        
        Args:
            video_url: YouTube video URL
            video_id: Video ID
            language: Optional language hint
            progress_callback: Progress update callback
            
        Returns:
            SubtitleResult with AI-generated subtitles
            
        Raises:
            RuntimeError: If generation fails
        """
        if progress_callback:
            progress_callback("ai_audio", 50, "Extracting audio...")
        
        # Generate subtitles
        lines, detected_lang = whisper_service.generate_subtitles(
            video_url,
            language
        )
        
        if progress_callback:
            progress_callback("ai_complete", 95, "Finalizing subtitles...")
        
        # Create metadata
        metadata = SubtitleMetadata(
            language=detected_lang,
            source=SubtitleSource.AI_GENERATED,
            line_count=len(lines),
            video_id=video_id,
            generated_at=datetime.now(),
            model_used=whisper_service.model_name,
        )
        
        logger.info(
            f"AI subtitles generated: {len(lines)} lines, "
            f"language={detected_lang}, model={whisper_service.model_name}"
        )
        
        return SubtitleResult(
            lines=lines,
            metadata=metadata,
        )
    
    def _get_caption_map(self, video_url: str, video_id: str) -> Dict[str, CaptionInfo]:
        """
        Get caption URL map from cache or fetch from yt-dlp.
        
        Returns:
            Dict mapping language code to CaptionInfo
        """
        # Check cache (5 minute TTL)
        cached = self.caption_url_cache.get(video_id)
        if cached and time.time() - cached.get('cached_at', 0) < 300:
            return cached.get('captions', {})
        
        # Fetch fresh from yt-dlp
        try:
            opts = {**YDL_BASE_OPTS, 'skip_download': True}
            with yt_dlp.YoutubeDL(opts) as ydl:
                info = ydl.extract_info(video_url, download=False)
            
            caption_map = {}
            
            # Manual subtitles
            manual_subs = info.get('subtitles') or {}
            for lang, formats in manual_subs.items():
                best_fmt = self._pick_best_format(formats)
                if best_fmt and best_fmt.get('url'):
                    caption_map[lang] = CaptionInfo(
                        url=best_fmt['url'],
                        kind='manual',
                        language=lang
                    )
            
            # Auto-generated subtitles
            auto_subs = info.get('automatic_captions') or {}
            for lang, formats in auto_subs.items():
                if lang not in caption_map:  # Manual takes priority
                    best_fmt = self._pick_best_format(formats)
                    if best_fmt and best_fmt.get('url'):
                        caption_map[lang] = CaptionInfo(
                            url=best_fmt['url'],
                            kind='auto',
                            language=lang
                        )
            
            # Cache the result
            self.caption_url_cache[video_id] = {
                'captions': caption_map,
                'cached_at': time.time(),
            }
            
            logger.info(f"Fetched {len(caption_map)} caption URLs for {video_id}")
            return caption_map
            
        except Exception as e:
            logger.error(f"Failed to fetch caption map: {e}")
            return {}
    
    def _pick_best_format(self, formats: List[Dict]) -> Optional[Dict]:
        """Pick best caption format (prefer json3, vtt, srv3)."""
        if not formats:
            return None
        
        # Preference order
        for preferred_ext in ['json3', 'vtt', 'srv3', 'srv2', 'srv1']:
            for fmt in formats:
                if fmt.get('ext') == preferred_ext and fmt.get('url'):
                    return fmt
        
        # Fallback to first format with URL
        for fmt in formats:
            if fmt.get('url'):
                return fmt
        
        return None
    
    def _resolve_language(
        self,
        caption_map: Dict[str, CaptionInfo],
        language: str,
        prefer_manual: bool
    ) -> Tuple[Optional[str], Optional[str], Optional[str]]:
        """
        Find best matching language in caption map.
        
        Returns:
            Tuple of (url, kind, matched_language)
        """
        # Build list of language variants to try
        variants = [language]
        base = language.split('-')[0]
        if base != language:
            variants.append(base)
        if '-' not in language:
            # Try common variants
            variants.extend([f"{language}-US", f"{language}-GB", f"{language}-IN"])
        
        # Try each variant
        for variant in variants:
            if variant in caption_map:
                info = caption_map[variant]
                # Filter by preference
                if prefer_manual and info.kind != 'manual':
                    continue
                if not prefer_manual and info.kind == 'manual':
                    continue
                return info.url, info.kind, variant
        
        return None, None, None
    
    def _download_caption_content(self, url: str, retries: int = 3) -> Optional[str]:
        """Download caption content from URL with retries."""
        for attempt in range(retries):
            try:
                req = urllib.request.Request(url, headers=BROWSER_HEADERS)
                with urllib.request.urlopen(req, timeout=20) as response:
                    return response.read().decode('utf-8', errors='replace')
            except urllib.error.HTTPError as e:
                if e.code == 429 and attempt < retries - 1:
                    # Rate limited, wait and retry
                    time.sleep(4 * (attempt + 1))
                    continue
                logger.error(f"HTTP error downloading caption: {e.code}")
                return None
            except Exception as e:
                if attempt < retries - 1:
                    time.sleep(2)
                    continue
                logger.error(f"Failed to download caption: {e}")
                return None
        
        return None
    
    def _parse_caption_content(self, raw_content: str) -> List[SubtitleLine]:
        """
        Parse caption content (JSON3, VTT, or SRT format).
        
        Args:
            raw_content: Raw caption text
            
        Returns:
            List of SubtitleLine objects
        """
        raw_content = raw_content.strip()
        lines = []
        seen_texts = set()
        
        # Try JSON3 format first
        if raw_content.startswith('{') or raw_content.startswith('['):
            try:
                data = json.loads(raw_content)
                events = data.get('events', [])
                
                for event in events:
                    segs = event.get('segs')
                    if not segs:
                        continue
                    
                    text = ''.join(s.get('utf8', '') for s in segs)
                    text = re.sub(r'\s+', ' ', text).strip()
                    
                    if not text or text in seen_texts or text == '\n':
                        continue
                    
                    seen_texts.add(text)
                    
                    start_ms = event.get('tStartMs', 0)
                    duration_ms = event.get('dDurationMs', 0)
                    end_ms = start_ms + duration_ms
                    
                    # Format time
                    start_sec = start_ms // 1000
                    mm, ss = divmod(start_sec, 60)
                    time_str = f"{mm:02d}:{ss:02d}"
                    
                    lines.append(SubtitleLine(
                        text=text,
                        time=time_str,
                        start_ms=start_ms,
                        end_ms=end_ms,
                    ))
                
                if lines:
                    return lines
                    
            except Exception as e:
                logger.debug(f"JSON3 parsing failed: {e}")
        
        # Try VTT/SRT format
        blocks = re.split(r'\n{2,}', raw_content)
        
        for block in blocks:
            block = block.strip()
            if not block or block.upper().startswith('WEBVTT') or block.startswith('NOTE'):
                continue
            
            block_lines = [l.strip() for l in block.splitlines() if l.strip()]
            time_str = ''
            text_parts = []
            
            for line in block_lines:
                if '-->' in line:
                    time_str = line.split('-->')[0].strip()
                elif not line.isdigit():
                    text_parts.append(line)
            
            if not text_parts:
                continue
            
            text = ' '.join(text_parts)
            # Remove HTML tags
            text = re.sub(r'<[^>]+>', '', text)
            # Remove timing tags
            text = re.sub(r'\{[^}]+\}', '', text)
            # HTML entities
            for entity, char in [
                ('&amp;', '&'), ('&lt;', '<'), ('&gt;', '>'),
                ('&#39;', "'"), ('&quot;', '"')
            ]:
                text = text.replace(entity, char)
            
            text = re.sub(r'\s+', ' ', text).strip()
            
            if not text or text in seen_texts:
                continue
            
            seen_texts.add(text)
            
            # Parse timestamp
            formatted_time = ''
            try:
                t = re.sub(r',', '.', time_str).split('.')[0]
                parts = t.split(':')
                if len(parts) == 3:
                    total_sec = int(parts[0]) * 3600 + int(parts[1]) * 60 + int(float(parts[2]))
                elif len(parts) == 2:
                    total_sec = int(parts[0]) * 60 + int(float(parts[1]))
                else:
                    total_sec = 0
                
                mm, ss = divmod(total_sec, 60)
                formatted_time = f"{mm:02d}:{ss:02d}"
            except Exception:
                formatted_time = ''
            
            lines.append(SubtitleLine(
                text=text,
                time=formatted_time,
            ))
        
        return lines


# Global subtitle service instance
subtitle_service = SubtitleService()
