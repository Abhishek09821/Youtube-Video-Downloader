"""
VDOWN Data Models
Type-safe data structures for subtitle processing.
"""

from dataclasses import dataclass, field
from typing import Optional, List, Dict, Any
from enum import Enum
from datetime import datetime


class SubtitleSource(str, Enum):
    """Source of subtitle generation."""
    YOUTUBE_MANUAL = "youtube_manual"
    YOUTUBE_AUTO = "youtube_auto"
    AI_GENERATED = "ai_generated"
    CACHED = "cached"


class SubtitleFormat(str, Enum):
    """Supported subtitle file formats."""
    SRT = "srt"
    VTT = "vtt"
    TXT = "txt"


class JobStatus(str, Enum):
    """Background job status."""
    QUEUED = "queued"
    STARTING = "starting"
    PROCESSING = "processing"
    DOWNLOADING = "downloading"
    EXTRACTING_AUDIO = "extracting_audio"
    GENERATING_AI = "generating_ai"
    COMPLETED = "completed"
    FAILED = "failed"


@dataclass
class SubtitleLine:
    """A single subtitle line with timing."""
    text: str
    time: str = ""
    start_ms: int = 0
    end_ms: int = 0

    def to_dict(self) -> Dict[str, Any]:
        return {
            "text": self.text,
            "time": self.time,
        }


@dataclass
class SubtitleMetadata:
    """Metadata about generated subtitles."""
    language: str
    source: SubtitleSource
    line_count: int
    video_id: str
    generated_at: datetime = field(default_factory=datetime.now)
    duration_seconds: Optional[float] = None
    model_used: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        return {
            "lang": self.language,
            "kind": self.source.value,
            "count": self.line_count,
            "source": self.source.value,
            "generated_at": self.generated_at.isoformat(),
            "model": self.model_used,
        }


@dataclass
class SubtitleResult:
    """Complete subtitle result with lines and metadata."""
    lines: List[SubtitleLine]
    metadata: SubtitleMetadata
    raw_content: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        return {
            "lines": [line.to_dict() for line in self.lines],
            **self.metadata.to_dict(),
        }


@dataclass
class SubtitleJob:
    """Background subtitle generation job."""
    job_id: str
    video_id: str
    url: str
    language: str
    status: JobStatus
    progress: int = 0
    error: Optional[str] = None
    result: Optional[SubtitleResult] = None
    created_at: datetime = field(default_factory=datetime.now)
    updated_at: datetime = field(default_factory=datetime.now)

    def to_dict(self) -> Dict[str, Any]:
        data = {
            "job_id": self.job_id,
            "status": self.status.value,
            "progress": self.progress,
            "created_at": self.created_at.isoformat(),
            "updated_at": self.updated_at.isoformat(),
        }
        if self.error:
            data["error"] = self.error
        if self.result:
            data["result"] = self.result.to_dict()
        return data


@dataclass
class CaptionInfo:
    """YouTube caption availability info."""
    url: str
    kind: str  # "manual" or "auto"
    language: str


@dataclass
class ProgressUpdate:
    """Progress update for streaming to frontend."""
    stage: str
    progress: int
    message: str
    timestamp: datetime = field(default_factory=datetime.now)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "stage": self.stage,
            "progress": self.progress,
            "message": self.message,
            "timestamp": self.timestamp.isoformat(),
        }
