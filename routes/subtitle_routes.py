"""
Subtitle API Routes
Flask endpoints for subtitle viewing and downloading with AI fallback.
"""

import threading
import uuid
from pathlib import Path
from typing import Dict, Any
from flask import Blueprint, request, jsonify, send_file

from config import DOWNLOAD_DIR
from models import SubtitleFormat, ProgressUpdate
from services.subtitle_service import subtitle_service
from services.subtitle_formatter import subtitle_formatter
from services.subtitle_cache import subtitle_cache
from utils.logging_utils import get_logger
from utils.video_utils import extract_video_id

logger = get_logger(__name__)

# Create Blueprint
subtitle_bp = Blueprint('subtitles', __name__, url_prefix='/api/subtitles')

# Job storage for background tasks
subtitle_jobs: Dict[str, Dict[str, Any]] = {}


def clean_job(job_id: str, delay: int = 300):
    """Clean up job and file after delay."""
    import time
    
    def _cleanup():
        time.sleep(delay)
        job = subtitle_jobs.pop(job_id, {})
        filepath = job.get('filepath')
        if filepath and Path(filepath).exists():
            try:
                Path(filepath).unlink()
                logger.debug(f"Cleaned up file: {filepath}")
            except Exception as e:
                logger.warning(f"Failed to clean up {filepath}: {e}")
    
    threading.Thread(target=_cleanup, daemon=True).start()


@subtitle_bp.route('/view', methods=['POST'])
def view_subtitles():
    """
    View subtitles with automatic AI fallback.
    
    Request:
        {
            "url": "https://youtube.com/watch?v=...",
            "lang": "en"  # optional, defaults to "en"
        }
    
    Response:
        {
            "lines": [{"text": "...", "time": "00:00"}, ...],
            "lang": "en",
            "kind": "youtube_manual" | "youtube_auto" | "ai_generated",
            "source": "youtube_manual" | "youtube_auto" | "ai_generated",
            "count": 123,
            "model": "base"  # only for AI-generated
        }
    """
    try:
        data = request.json or {}
        url = (data.get('url') or '').strip()
        language = (data.get('lang') or 'en').strip()
        
        if not url:
            return jsonify({'error': 'URL required'}), 400
        
        logger.info(f"View subtitles request: url={url}, lang={language}")
        
        # Get subtitles with fallback pipeline
        result = subtitle_service.get_subtitles(url, language)
        
        # Convert to response format
        response = {
            'lines': [line.to_dict() for line in result.lines],
            'lang': result.metadata.language,
            'kind': result.metadata.source.value,
            'source': result.metadata.source.value,
            'count': result.metadata.line_count,
        }
        
        if result.metadata.model_used:
            response['model'] = result.metadata.model_used
        
        logger.info(
            f"Subtitles returned: {result.metadata.line_count} lines, "
            f"source={result.metadata.source.value}"
        )
        
        return jsonify(response)
        
    except Exception as e:
        logger.error(f"View subtitles error: {e}")
        return jsonify({'error': str(e)}), 500


@subtitle_bp.route('/download', methods=['POST'])
def download_subtitle():
    """
    Download subtitle file with automatic AI fallback.
    
    Request:
        {
            "url": "https://youtube.com/watch?v=...",
            "lang": "en",
            "format": "srt" | "vtt" | "txt"
        }
    
    Response:
        {
            "job_id": "abc123"
        }
    
    Then poll /api/status/<job_id> for progress.
    """
    try:
        data = request.json or {}
        url = (data.get('url') or '').strip()
        language = (data.get('lang') or 'en').strip()
        format_str = (data.get('format') or 'srt').lower()
        
        if not url:
            return jsonify({'error': 'URL required'}), 400
        
        # Validate format
        try:
            subtitle_format = SubtitleFormat(format_str)
        except ValueError:
            return jsonify({'error': f'Invalid format: {format_str}'}), 400
        
        # Create job
        job_id = str(uuid.uuid4())[:8]
        subtitle_jobs[job_id] = {
            'status': 'starting',
            'progress': 5,
            'type': 'subtitle',
        }
        
        logger.info(
            f"Subtitle download job created: id={job_id}, "
            f"url={url}, lang={language}, format={format_str}"
        )
        
        def run_job():
            """Background job to generate and save subtitle file."""
            try:
                video_id = extract_video_id(url)
                
                # Progress callback
                def progress_callback(update: ProgressUpdate):
                    subtitle_jobs[job_id]['progress'] = update.progress
                    subtitle_jobs[job_id]['status'] = update.stage
                    logger.debug(f"Job {job_id}: {update.message}")
                
                # Get subtitles with fallback
                result = subtitle_service.get_subtitles(
                    url,
                    language,
                    progress_callback=progress_callback
                )
                
                subtitle_jobs[job_id]['progress'] = 80
                
                # Format subtitles
                content = subtitle_formatter.format(result.lines, subtitle_format)
                
                # Save to file
                filename = f"{job_id}_subs_{result.metadata.language}.{format_str}"
                filepath = DOWNLOAD_DIR / filename
                filepath.write_text(content, encoding='utf-8')
                
                subtitle_jobs[job_id].update({
                    'status': 'done',
                    'progress': 100,
                    'filepath': str(filepath),
                    'filename': f"subtitles_{result.metadata.language}.{format_str}",
                    'source': result.metadata.source.value,
                    'line_count': result.metadata.line_count,
                })
                
                logger.info(
                    f"Job {job_id} completed: {result.metadata.line_count} lines, "
                    f"source={result.metadata.source.value}"
                )
                
                # Clean up after 5 minutes
                clean_job(job_id)
                
            except Exception as e:
                logger.error(f"Job {job_id} failed: {e}")
                subtitle_jobs[job_id].update({
                    'status': 'error',
                    'error': str(e),
                })
        
        # Start background job
        threading.Thread(target=run_job, daemon=True).start()
        
        return jsonify({'job_id': job_id})
        
    except Exception as e:
        logger.error(f"Download subtitle error: {e}")
        return jsonify({'error': str(e)}), 500


@subtitle_bp.route('/cache/stats', methods=['GET'])
def cache_stats():
    """
    Get cache statistics.
    
    Response:
        {
            "total_entries": 42,
            "total_size_mb": 12.5,
            "cache_dir": "/path/to/cache",
            "ttl_days": 30
        }
    """
    try:
        stats = subtitle_cache.get_stats()
        return jsonify(stats)
    except Exception as e:
        logger.error(f"Cache stats error: {e}")
        return jsonify({'error': str(e)}), 500


@subtitle_bp.route('/cache/clear', methods=['POST'])
def clear_cache():
    """
    Clear expired cache entries.
    
    Response:
        {
            "cleared": 5,
            "message": "Cleared 5 expired cache entries"
        }
    """
    try:
        cleared = subtitle_cache.clear_expired()
        return jsonify({
            'cleared': cleared,
            'message': f'Cleared {cleared} expired cache entries'
        })
    except Exception as e:
        logger.error(f"Clear cache error: {e}")
        return jsonify({'error': str(e)}), 500


def register_subtitle_routes(app):
    """Register subtitle routes with Flask app."""
    app.register_blueprint(subtitle_bp)
    logger.info("Subtitle routes registered")
