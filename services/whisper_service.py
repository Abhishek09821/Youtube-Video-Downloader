"""
Whisper AI Service
Handles AI-powered subtitle generation using OpenAI Whisper.
"""

import os
import tempfile
import subprocess
from pathlib import Path
from typing import Optional, Dict, List, Tuple
import warnings

from config import (
    WHISPER_MODEL,
    WHISPER_DEVICE,
    MAX_VIDEO_DURATION,
    MAX_AUDIO_SIZE_MB,
)
from models import SubtitleLine
from utils.logging_utils import get_logger, PerformanceMetrics

logger = get_logger(__name__)

# Suppress Whisper warnings
warnings.filterwarnings("ignore", category=FutureWarning)
warnings.filterwarnings("ignore", category=UserWarning)


class WhisperService:
    """
    OpenAI Whisper service for AI subtitle generation.
    Loads model once and reuses it for performance.
    """
    
    def __init__(self):
        self.model = None
        self.model_name = WHISPER_MODEL
        self.device = self._determine_device()
        logger.info(f"Whisper service initialized (model={self.model_name}, device={self.device})")
    
    def _determine_device(self) -> str:
        """Determine the best device to use (GPU vs CPU)."""
        if WHISPER_DEVICE.lower() == "cpu":
            return "cpu"
        
        if WHISPER_DEVICE.lower() == "cuda":
            try:
                import torch
                if torch.cuda.is_available():
                    logger.info("CUDA available, using GPU for Whisper")
                    return "cuda"
            except ImportError:
                pass
        
        # Auto-detect
        try:
            import torch
            if torch.cuda.is_available():
                logger.info("Auto-detected CUDA, using GPU")
                return "cuda"
            elif hasattr(torch.backends, 'mps') and torch.backends.mps.is_available():
                logger.info("Auto-detected Apple Silicon, using MPS")
                return "mps"
        except ImportError:
            pass
        
        logger.info("Using CPU for Whisper")
        return "cpu"
    
    def _load_model(self):
        """Lazy load Whisper model."""
        if self.model is not None:
            return
        
        try:
            import whisper
            logger.info(f"Loading Whisper model: {self.model_name}")
            self.model = whisper.load_model(self.model_name, device=self.device)
            logger.info(f"Whisper model loaded successfully on {self.device}")
        except Exception as e:
            logger.error(f"Failed to load Whisper model: {e}")
            raise RuntimeError(f"Whisper initialization failed: {e}")
    
    def extract_audio(
        self,
        video_url: str,
        output_path: Path,
        duration_limit: int = MAX_VIDEO_DURATION
    ) -> Tuple[Path, float]:
        """
        Extract audio from video using FFmpeg.
        
        Args:
            video_url: YouTube video URL or local video path
            output_path: Output audio file path
            duration_limit: Maximum video duration in seconds
            
        Returns:
            Tuple of (audio_path, duration_seconds)
            
        Raises:
            RuntimeError: If extraction fails
        """
        with PerformanceMetrics(logger, f"Audio extraction") as metrics:
            try:
                import yt_dlp
                from config import YDL_BASE_OPTS
                
                # Download audio using yt-dlp
                ydl_opts = {
                    **YDL_BASE_OPTS,
                    'format': 'bestaudio/best',
                    'outtmpl': str(output_path.with_suffix('')),
                    'postprocessors': [{
                        'key': 'FFmpegExtractAudio',
                        'preferredcodec': 'wav',
                        'preferredquality': '16',  # 16kHz for Whisper
                    }],
                    'quiet': True,
                    'no_warnings': True,
                }
                
                with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                    info = ydl.extract_info(video_url, download=True)
                    duration = info.get('duration', 0)
                    
                    # Check duration limit
                    if duration > duration_limit:
                        raise RuntimeError(
                            f"Video too long ({duration}s). "
                            f"Maximum: {duration_limit}s"
                        )
                    
                    metrics.add_metric("duration", f"{duration}s")
                
                # Find the extracted audio file
                audio_path = output_path.with_suffix('.wav')
                if not audio_path.exists():
                    # Try common alternatives
                    for ext in ['.wav', '.m4a', '.mp3', '.opus']:
                        alt_path = output_path.with_suffix(ext)
                        if alt_path.exists():
                            audio_path = alt_path
                            break
                
                if not audio_path.exists():
                    raise RuntimeError("Audio extraction failed: output file not found")
                
                # Check file size
                size_mb = audio_path.stat().st_size / (1024 * 1024)
                if size_mb > MAX_AUDIO_SIZE_MB:
                    audio_path.unlink(missing_ok=True)
                    raise RuntimeError(
                        f"Audio file too large ({size_mb:.1f}MB). "
                        f"Maximum: {MAX_AUDIO_SIZE_MB}MB"
                    )
                
                metrics.add_metric("size", f"{size_mb:.1f}MB")
                logger.info(f"Audio extracted: {audio_path} ({size_mb:.1f}MB, {duration}s)")
                
                return audio_path, duration
                
            except Exception as e:
                logger.error(f"Audio extraction failed: {e}")
                raise RuntimeError(f"Audio extraction failed: {e}")
    
    def transcribe(
        self,
        audio_path: Path,
        language: Optional[str] = None,
        force_language: bool = False
    ) -> Tuple[List[SubtitleLine], str, Dict]:
        """
        Transcribe audio using Whisper with anti-hallucination guards.

        Whisper is known to fabricate text on music, silence and non-speech
        audio, and to mistranslate when forced into the wrong language. This
        method:
          - Auto-detects the spoken language by default (truthful output).
            Only forces `language` when `force_language=True`.
          - Uses deterministic decoding with temperature fallback.
          - Disables `condition_on_previous_text` to stop repetition loops.
          - Drops segments flagged as hallucinations (high no-speech prob,
            low average log-prob, or abnormally high compression ratio).

        Args:
            audio_path: Path to audio file
            language: Optional language hint (e.g., 'en', 'hi')
            force_language: When True, transcribe in `language` even if the
                audio appears to be a different language.

        Returns:
            Tuple of (subtitle_lines, detected_language, whisper_result)

        Raises:
            RuntimeError: If transcription fails or no reliable speech is found
        """
        self._load_model()

        with PerformanceMetrics(logger, "Whisper transcription") as metrics:
            try:
                logger.info(f"Transcribing {audio_path} with Whisper")

                options = {
                    'task': 'transcribe',
                    'verbose': False,
                    # deterministic first pass, then fall back if it fails the
                    # quality thresholds below (prevents repetition loops)
                    'temperature': (0.0, 0.2, 0.4, 0.6, 0.8, 1.0),
                    'condition_on_previous_text': False,
                    'no_speech_threshold': 0.6,
                    'logprob_threshold': -1.0,
                    'compression_ratio_threshold': 2.4,
                    'fp16': self.device == 'cuda',
                }

                # Only force a specific language when explicitly requested;
                # otherwise let Whisper detect it so foreign audio isn't
                # mangled into gibberish English.
                if language and force_language:
                    options['language'] = language

                result = self.model.transcribe(str(audio_path), **options)

                detected_lang = result.get('language', language or 'en')
                segments = result.get('segments', [])

                metrics.add_metric("segments", len(segments))
                metrics.add_metric("language", detected_lang)

                # Convert to SubtitleLine format, filtering hallucinations
                lines = []
                dropped = 0
                last_text = None
                for segment in segments:
                    text = segment.get('text', '').strip()
                    if not text:
                        continue

                    if self._is_hallucination(segment, text, last_text):
                        dropped += 1
                        continue

                    start_ms = int(segment.get('start', 0) * 1000)
                    end_ms = int(segment.get('end', 0) * 1000)
                    start_sec = int(start_ms / 1000)
                    mm, ss = divmod(start_sec, 60)
                    time_str = f"{mm:02d}:{ss:02d}"

                    lines.append(SubtitleLine(
                        text=text,
                        time=time_str,
                        start_ms=start_ms,
                        end_ms=end_ms,
                    ))
                    last_text = text.lower()

                metrics.add_metric("dropped", dropped)
                logger.info(
                    f"Transcription complete: {len(lines)} lines kept, "
                    f"{dropped} dropped, language={detected_lang}"
                )

                # If nearly everything was dropped, the audio almost certainly
                # has no reliable speech (music video, ambience). Report
                # honestly instead of returning fabricated lines.
                if not lines:
                    raise RuntimeError(
                        "No reliable speech detected in this audio "
                        "(likely music or no dialogue)."
                    )

                return lines, detected_lang, result

            except RuntimeError:
                raise
            except Exception as e:
                logger.error(f"Whisper transcription failed: {e}")
                raise RuntimeError(f"Transcription failed: {e}")

    @staticmethod
    def _is_hallucination(segment: Dict, text: str, last_text: Optional[str]) -> bool:
        """
        Heuristic filter for Whisper hallucinations.

        Returns True when a segment should be discarded.
        """
        no_speech_prob = segment.get('no_speech_prob', 0.0) or 0.0
        avg_logprob = segment.get('avg_logprob', 0.0) or 0.0
        compression_ratio = segment.get('compression_ratio', 0.0) or 0.0

        # Strong non-speech signal → almost always fabricated
        if no_speech_prob > 0.75 and avg_logprob < -0.5:
            return True

        # Very low model confidence
        if avg_logprob < -1.0:
            return True

        # Repetitive / degenerate output (looping phrases)
        if compression_ratio > 2.4:
            return True

        # Immediate duplicate of the previous line (repetition loop)
        if last_text is not None and text.lower() == last_text:
            return True

        return False
    
    def generate_subtitles(
        self,
        video_url: str,
        language: Optional[str] = None
    ) -> Tuple[List[SubtitleLine], str]:
        """
        Complete pipeline: extract audio and generate subtitles.
        
        Args:
            video_url: YouTube video URL
            language: Optional language hint
            
        Returns:
            Tuple of (subtitle_lines, detected_language)
            
        Raises:
            RuntimeError: If generation fails
        """
        with PerformanceMetrics(logger, "AI subtitle generation") as metrics:
            temp_audio = None
            
            try:
                # Create temporary file for audio
                with tempfile.NamedTemporaryFile(
                    suffix='.wav',
                    delete=False
                ) as tmp:
                    temp_audio = Path(tmp.name)
                
                # Extract audio
                audio_path, duration = self.extract_audio(video_url, temp_audio)
                metrics.add_metric("extraction", "success")
                
                # Transcribe
                lines, detected_lang, _ = self.transcribe(audio_path, language)
                metrics.add_metric("transcription", "success")
                metrics.add_metric("lines", len(lines))
                
                return lines, detected_lang
                
            finally:
                # Clean up temporary audio file
                if temp_audio and temp_audio.exists():
                    try:
                        temp_audio.unlink()
                        logger.debug(f"Cleaned up temp audio: {temp_audio}")
                    except Exception as e:
                        logger.warning(f"Failed to clean up {temp_audio}: {e}")
    
    def check_ffmpeg(self) -> bool:
        """Check if FFmpeg is available."""
        try:
            result = subprocess.run(
                ['ffmpeg', '-version'],
                capture_output=True,
                timeout=5
            )
            return result.returncode == 0
        except Exception:
            return False
    
    def get_available_models(self) -> List[str]:
        """Get list of available Whisper models."""
        return [
            "tiny",      # ~39M params, fastest
            "base",      # ~74M params
            "small",     # ~244M params
            "medium",    # ~769M params
            "large",     # ~1550M params
            "large-v2",  # Improved large
            "large-v3",  # Latest large model (best accuracy)
        ]


# Global Whisper service instance
whisper_service = WhisperService()
