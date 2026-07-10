"""
Subtitle Formatter Service
Converts subtitle data to different file formats (SRT, VTT, TXT).
"""

from typing import List
from models import SubtitleLine, SubtitleFormat
from utils.logging_utils import get_logger

logger = get_logger(__name__)


class SubtitleFormatter:
    """Formats subtitles to various output formats."""
    
    @staticmethod
    def to_srt(lines: List[SubtitleLine]) -> str:
        """
        Convert to SRT format.
        
        Format:
        1
        00:00:00,000 --> 00:00:02,000
        First subtitle line
        
        2
        00:00:02,000 --> 00:00:04,000
        Second subtitle line
        """
        parts = []
        
        for i, line in enumerate(lines, 1):
            # Convert MM:SS to HH:MM:SS,mmm
            start_time = SubtitleFormatter._format_srt_time(line.start_ms)
            end_time = SubtitleFormatter._format_srt_time(line.end_ms)
            
            # If no timing info, estimate based on text length
            if line.start_ms == 0 and line.end_ms == 0:
                # Estimate: ~150 words per minute, 10 chars per word
                duration_ms = max(2000, len(line.text) * 60)  # Min 2 seconds
                start_time = SubtitleFormatter._format_srt_time((i - 1) * duration_ms)
                end_time = SubtitleFormatter._format_srt_time(i * duration_ms)
            
            parts.append(str(i))
            parts.append(f"{start_time} --> {end_time}")
            parts.append(line.text)
            parts.append("")  # Blank line between entries
        
        return "\n".join(parts)
    
    @staticmethod
    def to_vtt(lines: List[SubtitleLine]) -> str:
        """
        Convert to WebVTT format.
        
        Format:
        WEBVTT
        
        00:00:00.000 --> 00:00:02.000
        First subtitle line
        
        00:00:02.000 --> 00:00:04.000
        Second subtitle line
        """
        parts = ["WEBVTT", ""]
        
        for i, line in enumerate(lines):
            start_time = SubtitleFormatter._format_vtt_time(line.start_ms)
            end_time = SubtitleFormatter._format_vtt_time(line.end_ms)
            
            # If no timing info, estimate
            if line.start_ms == 0 and line.end_ms == 0:
                duration_ms = max(2000, len(line.text) * 60)
                start_time = SubtitleFormatter._format_vtt_time(i * duration_ms)
                end_time = SubtitleFormatter._format_vtt_time((i + 1) * duration_ms)
            
            parts.append(f"{start_time} --> {end_time}")
            parts.append(line.text)
            parts.append("")  # Blank line
        
        return "\n".join(parts)
    
    @staticmethod
    def to_txt(lines: List[SubtitleLine]) -> str:
        """
        Convert to plain text format with timestamps.
        
        Format:
        [00:00] First subtitle line
        [00:02] Second subtitle line
        """
        parts = []
        
        for line in lines:
            if line.time:
                parts.append(f"[{line.time}] {line.text}")
            else:
                parts.append(line.text)
        
        return "\n".join(parts)
    
    @staticmethod
    def _format_srt_time(milliseconds: int) -> str:
        """Format milliseconds to SRT time format (HH:MM:SS,mmm)."""
        total_seconds = milliseconds // 1000
        ms = milliseconds % 1000
        
        hours = total_seconds // 3600
        minutes = (total_seconds % 3600) // 60
        seconds = total_seconds % 60
        
        return f"{hours:02d}:{minutes:02d}:{seconds:02d},{ms:03d}"
    
    @staticmethod
    def _format_vtt_time(milliseconds: int) -> str:
        """Format milliseconds to VTT time format (HH:MM:SS.mmm)."""
        total_seconds = milliseconds // 1000
        ms = milliseconds % 1000
        
        hours = total_seconds // 3600
        minutes = (total_seconds % 3600) // 60
        seconds = total_seconds % 60
        
        return f"{hours:02d}:{minutes:02d}:{seconds:02d}.{ms:03d}"
    
    @staticmethod
    def format(lines: List[SubtitleLine], format: SubtitleFormat) -> str:
        """
        Format subtitle lines to specified format.
        
        Args:
            lines: List of SubtitleLine objects
            format: Target format (SRT, VTT, TXT)
            
        Returns:
            Formatted subtitle string
        """
        if format == SubtitleFormat.SRT:
            return SubtitleFormatter.to_srt(lines)
        elif format == SubtitleFormat.VTT:
            return SubtitleFormatter.to_vtt(lines)
        elif format == SubtitleFormat.TXT:
            return SubtitleFormatter.to_txt(lines)
        else:
            raise ValueError(f"Unsupported format: {format}")


# Global formatter instance
subtitle_formatter = SubtitleFormatter()
