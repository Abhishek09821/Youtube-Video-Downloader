"""
Subtitle Cache Service
Handles caching of generated subtitles to avoid regeneration.
"""

import json
import hashlib
from pathlib import Path
from typing import Optional, Dict, Any
from datetime import datetime, timedelta
from filelock import FileLock

from config import CACHE_DIR, SUBTITLE_CACHE_TTL_DAYS
from models import SubtitleResult, SubtitleMetadata, SubtitleLine, SubtitleSource
from utils.logging_utils import get_logger

logger = get_logger(__name__)


class SubtitleCache:
    """
    File-based subtitle cache with TTL support.
    Thread-safe using file locks.
    """
    
    def __init__(self, cache_dir: Path = CACHE_DIR):
        self.cache_dir = cache_dir
        self.cache_dir.mkdir(parents=True, exist_ok=True)
        self.ttl_days = SUBTITLE_CACHE_TTL_DAYS
    
    def _get_cache_key(self, video_id: str, language: str, source: str) -> str:
        """Generate cache key from video ID, language, and source."""
        key_str = f"{video_id}_{language}_{source}"
        return hashlib.sha256(key_str.encode()).hexdigest()[:16]
    
    def _get_cache_path(self, cache_key: str) -> Path:
        """Get file path for cache key."""
        return self.cache_dir / f"{cache_key}.json"
    
    def _get_lock_path(self, cache_key: str) -> Path:
        """Get lock file path for cache key."""
        return self.cache_dir / f"{cache_key}.lock"
    
    def get(
        self,
        video_id: str,
        language: str,
        source: Optional[str] = None
    ) -> Optional[SubtitleResult]:
        """
        Retrieve cached subtitles.
        
        Args:
            video_id: YouTube video ID
            language: Language code
            source: Optional source filter (youtube_manual, youtube_auto, ai_generated)
            
        Returns:
            SubtitleResult if found and not expired, None otherwise
        """
        # Try specific source first, then any source
        sources_to_try = [source] if source else [
            SubtitleSource.YOUTUBE_MANUAL.value,
            SubtitleSource.YOUTUBE_AUTO.value,
            SubtitleSource.AI_GENERATED.value,
        ]
        
        for src in sources_to_try:
            cache_key = self._get_cache_key(video_id, language, src)
            cache_path = self._get_cache_path(cache_key)
            lock_path = self._get_lock_path(cache_key)
            
            if not cache_path.exists():
                continue
            
            try:
                with FileLock(str(lock_path), timeout=5):
                    with open(cache_path, 'r', encoding='utf-8') as f:
                        data = json.load(f)
                    
                    # Check expiry
                    cached_at = datetime.fromisoformat(data['metadata']['generated_at'])
                    if datetime.now() - cached_at > timedelta(days=self.ttl_days):
                        logger.info(f"Cache expired for {video_id} ({language})")
                        cache_path.unlink(missing_ok=True)
                        continue
                    
                    # Reconstruct SubtitleResult
                    lines = [
                        SubtitleLine(
                            text=line['text'],
                            time=line.get('time', ''),
                            start_ms=line.get('start_ms', 0),
                            end_ms=line.get('end_ms', 0)
                        )
                        for line in data['lines']
                    ]
                    
                    metadata = SubtitleMetadata(
                        language=data['metadata']['language'],
                        source=SubtitleSource(data['metadata']['source']),
                        line_count=data['metadata']['line_count'],
                        video_id=data['metadata']['video_id'],
                        generated_at=cached_at,
                        duration_seconds=data['metadata'].get('duration_seconds'),
                        model_used=data['metadata'].get('model_used'),
                    )
                    
                    logger.info(
                        f"Cache HIT: {video_id} ({language}, {src}) - "
                        f"{len(lines)} lines"
                    )
                    return SubtitleResult(
                        lines=lines,
                        metadata=metadata,
                        raw_content=data.get('raw_content')
                    )
                    
            except Exception as e:
                logger.warning(f"Cache read error for {cache_key}: {e}")
                continue
        
        logger.info(f"Cache MISS: {video_id} ({language})")
        return None
    
    def set(
        self,
        video_id: str,
        language: str,
        source: SubtitleSource,
        result: SubtitleResult
    ) -> bool:
        """
        Store subtitles in cache.
        
        Args:
            video_id: YouTube video ID
            language: Language code
            source: Subtitle source
            result: SubtitleResult to cache
            
        Returns:
            True if cached successfully, False otherwise
        """
        cache_key = self._get_cache_key(video_id, language, source.value)
        cache_path = self._get_cache_path(cache_key)
        lock_path = self._get_lock_path(cache_key)
        
        try:
            data = {
                'lines': [
                    {
                        'text': line.text,
                        'time': line.time,
                        'start_ms': line.start_ms,
                        'end_ms': line.end_ms,
                    }
                    for line in result.lines
                ],
                'metadata': {
                    'language': result.metadata.language,
                    'source': result.metadata.source.value,
                    'line_count': result.metadata.line_count,
                    'video_id': result.metadata.video_id,
                    'generated_at': result.metadata.generated_at.isoformat(),
                    'duration_seconds': result.metadata.duration_seconds,
                    'model_used': result.metadata.model_used,
                },
                'raw_content': result.raw_content,
            }
            
            with FileLock(str(lock_path), timeout=10):
                with open(cache_path, 'w', encoding='utf-8') as f:
                    json.dump(data, f, indent=2, ensure_ascii=False)
            
            logger.info(
                f"Cached: {video_id} ({language}, {source.value}) - "
                f"{len(result.lines)} lines"
            )
            return True
            
        except Exception as e:
            logger.error(f"Cache write error for {cache_key}: {e}")
            return False
    
    def clear_expired(self) -> int:
        """
        Remove expired cache entries.
        
        Returns:
            Number of entries removed
        """
        removed = 0
        cutoff = datetime.now() - timedelta(days=self.ttl_days)
        
        for cache_file in self.cache_dir.glob("*.json"):
            try:
                with open(cache_file, 'r') as f:
                    data = json.load(f)
                cached_at = datetime.fromisoformat(data['metadata']['generated_at'])
                
                if cached_at < cutoff:
                    cache_file.unlink()
                    # Also remove lock file
                    lock_file = cache_file.with_suffix('.lock')
                    lock_file.unlink(missing_ok=True)
                    removed += 1
                    
            except Exception as e:
                logger.warning(f"Error checking {cache_file}: {e}")
                continue
        
        if removed > 0:
            logger.info(f"Cleared {removed} expired cache entries")
        
        return removed
    
    def get_stats(self) -> Dict[str, Any]:
        """Get cache statistics."""
        cache_files = list(self.cache_dir.glob("*.json"))
        total_size = sum(f.stat().st_size for f in cache_files)
        
        return {
            "total_entries": len(cache_files),
            "total_size_mb": total_size / (1024 * 1024),
            "cache_dir": str(self.cache_dir),
            "ttl_days": self.ttl_days,
        }


# Global cache instance
subtitle_cache = SubtitleCache()
