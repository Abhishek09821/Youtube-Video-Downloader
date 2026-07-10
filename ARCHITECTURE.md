# VDOWN v5.0 Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         VDOWN v5.0                              │
│              Production Subtitle System                         │
└─────────────────────────────────────────────────────────────────┘

┌──────────────┐
│   Frontend   │  React + Vite
│  (Unchanged) │  
└──────┬───────┘
       │
       │ HTTP POST /api/subtitles/view
       │
       ▼
┌──────────────────────────────────────────────────────────────────┐
│                      Flask Server (server.py)                     │
├──────────────────────────────────────────────────────────────────┤
│  Routes:                                                          │
│  • /api/subtitles/view      ← Main subtitle endpoint            │
│  • /api/subtitles/download  ← Download subtitle file            │
│  • /api/health              ← System health check               │
│  • /api/subtitles/cache/*   ← Cache management                  │
└────────────────────┬─────────────────────────────────────────────┘
                     │
                     ▼
┌──────────────────────────────────────────────────────────────────┐
│              SubtitleService (Orchestrator)                       │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│  get_subtitles(url, lang):                                       │
│                                                                   │
│    Step 1: Cache Check                                           │
│       │                                                           │
│       ├─→ subtitle_cache.get() ──→ Found? Return ✓              │
│       │                                                           │
│    Step 2: YouTube Manual                                        │
│       │                                                           │
│       ├─→ _try_youtube_subtitles(manual=True)                   │
│       │      │                                                    │
│       │      ├─→ yt-dlp.extract_info()                          │
│       │      ├─→ Download caption URL                           │
│       │      ├─→ Parse (JSON3/VTT/SRT)                          │
│       │      └─→ Found? Cache & Return ✓                        │
│       │                                                           │
│    Step 3: YouTube Auto                                          │
│       │                                                           │
│       ├─→ _try_youtube_subtitles(manual=False)                  │
│       │      │                                                    │
│       │      ├─→ Same as Step 2                                  │
│       │      └─→ Found? Cache & Return ✓                        │
│       │                                                           │
│    Step 4: AI Generation                                         │
│       │                                                           │
│       └─→ _generate_ai_subtitles()                              │
│              │                                                    │
│              ├─→ whisper_service.generate_subtitles()           │
│              │      │                                             │
│              │      ├─→ Extract audio (FFmpeg)                   │
│              │      ├─→ Transcribe (Whisper)                     │
│              │      ├─→ Auto-detect language                     │
│              │      └─→ Return lines + language                  │
│              │                                                    │
│              ├─→ Create SubtitleResult                           │
│              ├─→ Cache result                                    │
│              └─→ Return ✓                                        │
│                                                                   │
└───────────────────────┬───────────────────────────────────────────┘
                        │
         ┌──────────────┴──────────────┐
         │                             │
         ▼                             ▼
┌─────────────────┐           ┌────────────────────┐
│  SubtitleCache  │           │  WhisperService    │
├─────────────────┤           ├────────────────────┤
│                 │           │                    │
│ • File-based    │           │ • Load model once  │
│ • Thread-safe   │           │ • GPU/CPU auto     │
│ • TTL support   │           │ • Extract audio    │
│ • SHA256 keys   │           │ • Transcribe       │
│                 │           │ • Language detect  │
└─────────────────┘           └────────────────────┘
         │                             │
         │                             │
         ▼                             ▼
┌─────────────────┐           ┌────────────────────┐
│  File System    │           │  OpenAI Whisper    │
│  ./cache/       │           │  + FFmpeg          │
│  subtitles/     │           │  + yt-dlp          │
└─────────────────┘           └────────────────────┘
```

---

## Data Flow

### 1. Fast Path (Cache Hit)

```
User Request
    ↓
SubtitleService.get_subtitles()
    ↓
SubtitleCache.get()
    ↓
Read from disk (./cache/subtitles/)
    ↓
Return SubtitleResult
    ↓
Convert to JSON
    ↓
Return to Frontend
    
⏱️ Time: < 1 second
```

### 2. YouTube Path

```
User Request
    ↓
SubtitleService.get_subtitles()
    ↓
Cache MISS
    ↓
_get_caption_map() → yt-dlp
    ↓
_resolve_language() → Find best match
    ↓
_download_caption_content() → HTTP GET
    ↓
_parse_caption_content() → Parse JSON3/VTT/SRT
    ↓
Create SubtitleResult
    ↓
SubtitleCache.set() → Save to disk
    ↓
Return to Frontend

⏱️ Time: 2-5 seconds
```

### 3. AI Generation Path

```
User Request
    ↓
SubtitleService.get_subtitles()
    ↓
Cache MISS + YouTube FAIL
    ↓
_generate_ai_subtitles()
    ↓
WhisperService.extract_audio()
    ├─→ yt-dlp download audio
    └─→ FFmpeg convert to WAV
    ↓
    ⏱️ 5-15 seconds
    ↓
WhisperService.transcribe()
    ├─→ Load Whisper model (once)
    ├─→ model.transcribe(audio)
    └─→ Parse segments
    ↓
    ⏱️ 20-60 seconds (CPU) or 5-15 seconds (GPU)
    ↓
Create SubtitleResult
    ├─→ lines: List[SubtitleLine]
    ├─→ metadata: language, source, count
    └─→ detected_language
    ↓
SubtitleCache.set() → Save to disk
    ↓
Return to Frontend

⏱️ Total Time: 25-75 seconds (CPU) or 10-30 seconds (GPU)
```

---

## Component Diagram

```
┌────────────────────────────────────────────────────────────────┐
│                        Configuration                            │
├────────────────────────────────────────────────────────────────┤
│  config.py                                                      │
│  • Load .env file                                              │
│  • Parse environment variables                                 │
│  • Export constants (WHISPER_MODEL, CACHE_DIR, etc.)          │
└────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────┐
│                          Models                                 │
├────────────────────────────────────────────────────────────────┤
│  models/__init__.py                                            │
│  • SubtitleLine      ─ Single subtitle with text + time       │
│  • SubtitleMetadata  ─ Language, source, count, timestamp     │
│  • SubtitleResult    ─ Lines + Metadata                       │
│  • SubtitleSource    ─ Enum (manual, auto, ai_generated)      │
│  • SubtitleFormat    ─ Enum (SRT, VTT, TXT)                   │
│  • ProgressUpdate    ─ Stage, progress %, message             │
└────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────┐
│                          Services                               │
├────────────────────────────────────────────────────────────────┤
│                                                                 │
│  subtitle_service.py  ─ Main orchestrator                      │
│  ├─ get_subtitles()       ─ 4-step pipeline                   │
│  ├─ _try_youtube_subtitles()                                  │
│  ├─ _generate_ai_subtitles()                                  │
│  ├─ _get_caption_map()                                        │
│  ├─ _resolve_language()                                       │
│  ├─ _download_caption_content()                               │
│  └─ _parse_caption_content()                                  │
│                                                                 │
│  whisper_service.py   ─ AI subtitle generation                │
│  ├─ __init__()            ─ Load model (lazy)                 │
│  ├─ extract_audio()       ─ yt-dlp + FFmpeg                   │
│  ├─ transcribe()          ─ Whisper inference                 │
│  ├─ generate_subtitles()  ─ Full pipeline                     │
│  └─ check_ffmpeg()        ─ Verify FFmpeg                     │
│                                                                 │
│  subtitle_cache.py    ─ File-based caching                    │
│  ├─ get()                 ─ Read from cache                    │
│  ├─ set()                 ─ Write to cache                     │
│  ├─ _get_cache_key()      ─ SHA256 hash                       │
│  ├─ clear_expired()       ─ Remove old entries                │
│  └─ get_stats()           ─ Cache metrics                      │
│                                                                 │
│  subtitle_formatter.py ─ Format conversion                     │
│  ├─ to_srt()              ─ SubRip format                      │
│  ├─ to_vtt()              ─ WebVTT format                      │
│  ├─ to_txt()              ─ Plain text                         │
│  └─ format()              ─ Unified interface                  │
│                                                                 │
└────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────┐
│                          Utilities                              │
├────────────────────────────────────────────────────────────────┤
│  video_utils.py                                                │
│  ├─ extract_video_id()    ─ Parse YouTube URL                 │
│  ├─ is_youtube_url()                                          │
│  ├─ format_duration()     ─ Seconds → MM:SS                   │
│  └─ format_bytes()        ─ Bytes → MB/GB                     │
│                                                                 │
│  logging_utils.py                                              │
│  ├─ get_logger()          ─ Create logger                      │
│  ├─ log_performance()     ─ Decorator                         │
│  └─ PerformanceMetrics    ─ Context manager                    │
└────────────────────────────────────────────────────────────────┘
```

---

## State Diagram

```
┌─────────────┐
│   Request   │
│  Subtitles  │
└──────┬──────┘
       │
       ▼
   ┌────────┐
   │ Cache? │──YES──→ [Return Cached] ──→ ✓ Done
   └───┬────┘
       │ NO
       ▼
 ┌──────────────┐
 │ YouTube      │──YES──→ [Parse & Cache] ──→ ✓ Done
 │ Manual Subs? │
 └───┬──────────┘
     │ NO
     ▼
 ┌──────────────┐
 │ YouTube      │──YES──→ [Parse & Cache] ──→ ✓ Done
 │ Auto Subs?   │
 └───┬──────────┘
     │ NO
     ▼
 ┌──────────────┐
 │ AI Enabled?  │──NO──→ [Return Error] ──→ ✗ Fail
 └───┬──────────┘
     │ YES
     ▼
 ┌──────────────┐
 │ Extract      │
 │ Audio        │
 └───┬──────────┘
     │
     ▼
 ┌──────────────┐
 │ Transcribe   │
 │ (Whisper)    │
 └───┬──────────┘
     │
     ▼
 ┌──────────────┐
 │ Parse Lines  │
 │ & Detect Lang│
 └───┬──────────┘
     │
     ▼
 ┌──────────────┐
 │ Cache Result │
 └───┬──────────┘
     │
     ▼
   ✓ Done
```

---

## Threading Model

```
┌─────────────────────────────────────────────────────────────┐
│                     Main Flask Thread                        │
├─────────────────────────────────────────────────────────────┤
│  • Receives HTTP request                                     │
│  • For /api/subtitles/view:                                 │
│      └─ Calls subtitle_service.get_subtitles() DIRECTLY    │
│         (blocks until complete, typically < 60s)            │
│                                                              │
│  • For /api/subtitles/download:                            │
│      ├─ Creates job_id                                      │
│      ├─ Spawns background thread                           │
│      └─ Returns job_id immediately                          │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                  Background Thread (Download)                │
├─────────────────────────────────────────────────────────────┤
│  • Runs subtitle_service.get_subtitles()                    │
│  • Updates jobs[job_id] with progress                       │
│  • Formats subtitles (SRT/VTT/TXT)                         │
│  • Saves to file                                            │
│  • Updates job status to "done"                             │
└─────────────────────────────────────────────────────────────┘

Thread Safety:
  • SubtitleCache uses FileLock for thread-safe file I/O
  • Whisper model loaded once (thread-safe after init)
  • jobs{} dict is thread-safe (GIL protection for dict ops)
```

---

## Error Handling Flow

```
┌──────────────────────────────────────────────────────────────┐
│                      Error Handling                           │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│  Try YouTube Manual                                          │
│    │                                                          │
│    ├─→ Success? → Return                                     │
│    └─→ Fail? → Log warning, continue to next step           │
│                                                               │
│  Try YouTube Auto                                            │
│    │                                                          │
│    ├─→ Success? → Return                                     │
│    └─→ Fail? → Log warning, continue to AI                  │
│                                                               │
│  Try AI Generation                                           │
│    │                                                          │
│    ├─→ Video too long? → Return user-friendly error         │
│    ├─→ FFmpeg missing? → Return installation instructions   │
│    ├─→ CUDA OOM? → Suggest smaller model or CPU            │
│    ├─→ Whisper fails? → Log error, return structured error  │
│    └─→ Success? → Cache & return                            │
│                                                               │
│  All failed? → Return final error with helpful message      │
│                                                               │
└──────────────────────────────────────────────────────────────┘
```

---

## Cache Architecture

```
File Structure:
  ./cache/subtitles/
    ├── a1b2c3d4e5f6.json      ← video1, en, manual
    ├── a1b2c3d4e5f6.lock      ← Lock file
    ├── f6e5d4c3b2a1.json      ← video2, hi, ai_generated
    └── f6e5d4c3b2a1.lock

Cache Key Generation:
  SHA256(f"{video_id}_{language}_{source}")[:16]
  Example: SHA256("dQw4w9WgXcQ_en_youtube_manual")[:16]
           → "a1b2c3d4e5f6"

JSON Structure:
  {
    "lines": [
      {"text": "...", "time": "00:00", "start_ms": 0, "end_ms": 2000}
    ],
    "metadata": {
      "language": "en",
      "source": "ai_generated",
      "line_count": 123,
      "video_id": "dQw4w9WgXcQ",
      "generated_at": "2024-12-13T10:30:00",
      "model_used": "base"
    },
    "raw_content": "..."
  }

Thread Safety:
  FileLock ensures only one thread writes at a time
  Read operations are safe (files are immutable after write)
```

---

## Performance Optimization

```
┌────────────────────────────────────────────────────────────┐
│                    Optimization Strategies                  │
├────────────────────────────────────────────────────────────┤
│                                                             │
│  1. Model Loading (Whisper)                                │
│     • Load once on startup (lazy)                          │
│     • Reuse for all requests                               │
│     • Saves ~5-10 seconds per request                      │
│                                                             │
│  2. Caching                                                 │
│     • Cache all subtitle sources                           │
│     • 30-day TTL (configurable)                            │
│     • ~90%+ hit rate after warm-up                         │
│     • Saves 25-75 seconds per cached request               │
│                                                             │
│  3. GPU Acceleration                                        │
│     • Auto-detect CUDA/MPS                                 │
│     • 3-5x faster than CPU                                 │
│     • Whisper time: 60s → 15s                              │
│                                                             │
│  4. Audio Optimization                                      │
│     • 16kHz sampling (Whisper requirement)                 │
│     • WAV format (fastest)                                 │
│     • Temporary files cleaned up                           │
│                                                             │
│  5. YouTube Caption Caching                                 │
│     • Cache caption URLs (5-minute TTL)                    │
│     • Avoid repeated yt-dlp calls                          │
│     • Saves 2-5 seconds per request                        │
│                                                             │
└────────────────────────────────────────────────────────────┘
```

---

This architecture ensures maximum reliability and performance while maintaining clean separation of concerns.
