# Production Subtitle System v5.0

## Overview

VDown v5.0 features a **production-grade subtitle system** with **automatic AI fallback**. Users should almost never see "Subtitles unavailable."

### Key Features

✅ **4-Step Intelligent Fallback Pipeline**  
✅ **Automatic AI Generation** (OpenAI Whisper)  
✅ **Aggressive Caching** (no repeated AI generation)  
✅ **Language Auto-Detection**  
✅ **Progress Updates** (real-time feedback)  
✅ **Multiple Export Formats** (SRT, VTT, TXT)  
✅ **Production-Grade Architecture** (modular, typed, logged)  
✅ **Backward Compatible** (frontend unchanged)

---

## Subtitle Pipeline

The system follows a 4-step fallback chain:

```
1. Check Cache
   └─ Hit? → Return cached subtitles
   └─ Miss? → Continue

2. Try Manual YouTube Subtitles
   └─ Available? → Download, parse, cache, return
   └─ Unavailable? → Continue

3. Try Auto-Generated YouTube Subtitles
   └─ Available? → Download, parse, cache, return
   └─ Unavailable/Failed? → Continue

4. Generate with AI (Whisper)
   └─ Extract audio with FFmpeg
   └─ Transcribe with Whisper
   └─ Auto-detect language
   └─ Cache result
   └─ Return subtitles
```

### User Experience

The frontend receives subtitles **exactly the same way** regardless of source:

```json
{
  "lines": [
    {"text": "Hello world", "time": "00:00"},
    {"text": "Welcome to the video", "time": "00:02"}
  ],
  "lang": "en",
  "kind": "youtube_manual",      // or "youtube_auto" or "ai_generated"
  "source": "youtube_manual",
  "count": 123,
  "model": "base"                // only for AI-generated
}
```

**No frontend changes required.** The system transparently falls back to AI if YouTube subtitles fail.

---

## Architecture

### Modular Structure

```
├── config.py                    # Centralized configuration
├── models/
│   └── __init__.py             # Type-safe data models
├── services/
│   ├── subtitle_service.py     # Main subtitle orchestration
│   ├── whisper_service.py      # AI generation (Whisper)
│   ├── subtitle_cache.py       # File-based caching
│   └── subtitle_formatter.py   # SRT/VTT/TXT formatting
├── utils/
│   ├── video_utils.py          # Video ID extraction, formatting
│   └── logging_utils.py        # Structured logging
└── server.py                   # Flask routes (integrated)
```

### Key Components

#### 1. **SubtitleService** (`services/subtitle_service.py`)
- Orchestrates the 4-step fallback pipeline
- Manages YouTube subtitle download
- Delegates to Whisper for AI generation
- Handles caching automatically

#### 2. **WhisperService** (`services/whisper_service.py`)
- Loads OpenAI Whisper model once (reuses for performance)
- Extracts audio using FFmpeg + yt-dlp
- Transcribes with GPU/CPU auto-detection
- Auto-detects spoken language
- Generates accurate timestamps

#### 3. **SubtitleCache** (`services/subtitle_cache.py`)
- File-based cache with TTL (default: 30 days)
- Thread-safe with file locks
- Prevents repeated AI generation
- Tracks cache hit/miss metrics

#### 4. **SubtitleFormatter** (`services/subtitle_formatter.py`)
- Converts to SRT, VTT, TXT formats
- Handles timing edge cases
- Produces standards-compliant output

---

## Configuration

All settings are in **`.env`** (see `.env.example`):

### Whisper Configuration

```bash
# Model size (tiny, base, small, medium, large, large-v2, large-v3)
WHISPER_MODEL=base

# Device (auto, cuda, cpu)
WHISPER_DEVICE=auto

# For smaller/faster models: tiny, base
# For better accuracy: medium, large-v3
# GPU recommended for large models
```

### Cache Configuration

```bash
# Cache directory
SUBTITLE_CACHE_DIR=./cache/subtitles

# Cache TTL (days)
SUBTITLE_CACHE_TTL_DAYS=30
```

### Processing Limits

```bash
# Maximum video duration (seconds)
MAX_VIDEO_DURATION_SECONDS=7200  # 2 hours

# Maximum audio file size (MB)
MAX_AUDIO_SIZE_MB=500

# AI generation timeout (seconds)
AI_SUBTITLE_TIMEOUT_SECONDS=600  # 10 minutes
```

### Feature Flags

```bash
# Enable/disable AI fallback
ENABLE_AI_SUBTITLES=True

# Supported export formats
SUPPORTED_SUBTITLE_FORMATS=srt,vtt,txt
```

---

## Installation

### 1. Install Python Dependencies

```bash
pip install -r requirements.txt
```

**Key dependencies:**
- `openai-whisper` — AI transcription
- `torch` — Deep learning framework
- `ffmpeg-python` — Audio processing
- `filelock` — Thread-safe caching

### 2. Install FFmpeg

**macOS:**
```bash
brew install ffmpeg
```

**Ubuntu/Debian:**
```bash
sudo apt update
sudo apt install ffmpeg
```

**Windows:**
Download from [ffmpeg.org](https://ffmpeg.org/download.html)

### 3. Configure Environment

```bash
cp .env.example .env
# Edit .env with your preferred settings
```

### 4. Test the System

```bash
python server.py
```

You should see:

```
============================================================
VIDown Backend v5.0 — Production Subtitle System
============================================================

✓ Production subtitle system with AI fallback ENABLED
  • Whisper model: base
  • Device: cuda
  • AI fallback: ACTIVE
  • FFmpeg: FOUND

✓ Serving built frontend from /path/to/frontend/dist
  Access at: http://0.0.0.0:8080

============================================================
```

---

## API Endpoints

### View Subtitles (with AI Fallback)

**POST** `/api/subtitles/view`

```json
{
  "url": "https://youtube.com/watch?v=...",
  "lang": "en"  // optional, defaults to "en"
}
```

**Response:**

```json
{
  "lines": [
    {"text": "Subtitle line", "time": "00:12"}
  ],
  "lang": "en",
  "kind": "ai_generated",
  "source": "ai_generated",
  "count": 245,
  "model": "base"
}
```

**Pipeline:**  
Cache → Manual → Auto → **AI Generation** → Return

---

### Download Subtitle File (with AI Fallback)

**POST** `/api/subtitles/download`

```json
{
  "url": "https://youtube.com/watch?v=...",
  "lang": "en",
  "format": "srt"  // or "vtt", "txt"
}
```

**Response:**

```json
{
  "job_id": "abc123"
}
```

Then poll `/api/status/abc123` for progress.

---

### Cache Management

**GET** `/api/subtitles/cache/stats`

Returns cache statistics:

```json
{
  "total_entries": 42,
  "total_size_mb": 12.5,
  "cache_dir": "/path/to/cache/subtitles",
  "ttl_days": 30
}
```

**POST** `/api/subtitles/cache/clear`

Clears expired cache entries:

```json
{
  "cleared": 5,
  "message": "Cleared 5 expired cache entries"
}
```

---

## Performance

### Whisper Model Comparison

| Model      | Size   | Speed       | Accuracy | Use Case                     |
|------------|--------|-------------|----------|------------------------------|
| `tiny`     | 39M    | Very Fast   | Basic    | Testing, short videos        |
| `base`     | 74M    | **Fast**    | **Good** | **Production default** ⭐    |
| `small`    | 244M   | Moderate    | Better   | Better accuracy needed       |
| `medium`   | 769M   | Slow        | Great    | High accuracy, GPU available |
| `large-v3` | 1550M  | Very Slow   | Best     | Maximum accuracy, GPU only   |

**Recommendation:** Use `base` for production (good balance), upgrade to `medium` or `large-v3` if you have GPU.

### Performance Metrics

**Typical timings** (base model, CPU):

- Audio extraction: **5-15 seconds**
- Whisper transcription: **20-60 seconds** (for 5-minute video)
- Total (cache miss): **25-75 seconds**
- Total (cache hit): **< 1 second** ⚡

**GPU acceleration** reduces Whisper time by **3-5x**.

---

## Logging

The system uses structured logging with performance metrics:

```
2024-12-13 10:23:45 [INFO] subtitle_service: Subtitle retrieval for dQw4w9WgXcQ
2024-12-13 10:23:45 [INFO] subtitle_service: Checking cache...
2024-12-13 10:23:45 [INFO] subtitle_cache: Cache MISS: dQw4w9WgXcQ (en)
2024-12-13 10:23:46 [WARNING] subtitle_service: Manual subtitle attempt failed: No manual subs
2024-12-13 10:23:47 [WARNING] subtitle_service: Auto subtitle attempt failed: Rate limited
2024-12-13 10:23:47 [INFO] subtitle_service: YouTube subtitles unavailable, generating with AI
2024-12-13 10:23:47 [INFO] whisper_service: Extracting audio...
2024-12-13 10:23:52 [INFO] Audio extraction completed in 4.82s (duration=180s, size=12.3MB)
2024-12-13 10:23:52 [INFO] whisper_service: Transcribing with Whisper
2024-12-13 10:24:28 [INFO] Whisper transcription completed in 36.12s (segments=85, language=en)
2024-12-13 10:24:28 [INFO] subtitle_cache: Cached: dQw4w9WgXcQ (en, ai_generated) - 85 lines
2024-12-13 10:24:28 [INFO] Subtitle retrieval completed in 43.21s (source=ai_generated)
```

---

## Error Handling

All errors are structured and user-friendly:

```json
{
  "error": "Video too long for AI generation. Try shorter videos."
}
```

**Common errors:**

| Error | Cause | Solution |
|-------|-------|----------|
| "FFmpeg not found" | FFmpeg not installed | Install FFmpeg |
| "Video too long" | Exceeds `MAX_VIDEO_DURATION` | Increase limit or use shorter video |
| "Audio file too large" | Exceeds `MAX_AUDIO_SIZE_MB` | Increase limit |
| "Transcription failed" | Whisper error | Check logs, try smaller model |

---

## Backward Compatibility

The v5.0 system is **100% backward compatible**:

1. **Frontend unchanged** — Same API response format
2. **Gradual adoption** — Falls back to legacy system if modules missing
3. **Same endpoints** — `/api/subtitles/view` and `/api/subtitles/download`

If production modules fail to load, the system automatically falls back to the v4.1 logic.

---

## Testing

### Test AI Subtitle Generation

```bash
# Find a video WITHOUT subtitles
curl -X POST http://localhost:8080/api/subtitles/view \
  -H "Content-Type: application/json" \
  -d '{"url": "https://youtube.com/watch?v=...", "lang": "en"}'
```

Look for `"source": "ai_generated"` in the response.

### Test Caching

Request the same video twice:

```bash
# First request (slow, generates)
time curl -X POST http://localhost:8080/api/subtitles/view \
  -H "Content-Type: application/json" \
  -d '{"url": "https://youtube.com/watch?v=...", "lang": "en"}'

# Second request (fast, cached)
time curl -X POST http://localhost:8080/api/subtitles/view \
  -H "Content-Type: application/json" \
  -d '{"url": "https://youtube.com/watch?v=...", "lang": "en"}'
```

The second request should be **instant** (< 1 second).

### Check Cache Stats

```bash
curl http://localhost:8080/api/subtitles/cache/stats
```

---

## Troubleshooting

### "Production modules not found"

**Cause:** Dependencies not installed

**Fix:**
```bash
pip install -r requirements.txt
```

### "FFmpeg not found"

**Cause:** FFmpeg not in PATH

**Fix:**
```bash
# macOS
brew install ffmpeg

# Ubuntu/Debian
sudo apt install ffmpeg
```

### "CUDA out of memory"

**Cause:** GPU doesn't have enough VRAM for large model

**Fix:** Use smaller model or switch to CPU:
```bash
WHISPER_MODEL=base
WHISPER_DEVICE=cpu
```

### Slow AI generation

**Cause:** Using CPU or large model

**Fix:**
- Use GPU if available (`WHISPER_DEVICE=cuda`)
- Use smaller model (`WHISPER_MODEL=tiny` or `base`)
- Increase `AI_SUBTITLE_TIMEOUT_SECONDS`

---

## Production Deployment

### Recommendations

1. **Use GPU** for faster AI generation
2. **Use base or small model** for good balance
3. **Enable caching** (already default)
4. **Set reasonable limits** (`MAX_VIDEO_DURATION`, `MAX_AUDIO_SIZE_MB`)
5. **Monitor logs** for performance and errors
6. **Regular cache cleanup** (or increase TTL)

### Scaling

For high-traffic deployments:

1. **Pre-warm Whisper model** on startup (already done)
2. **Use Redis** for distributed caching (future enhancement)
3. **Background workers** with Celery (future enhancement)
4. **Load balancer** for multiple instances

---

## Future Enhancements

- [ ] WebSocket progress streaming
- [ ] Redis cache backend
- [ ] Celery background workers
- [ ] Multiple Whisper models (auto-select based on duration)
- [ ] Translation support (transcribe + translate)
- [ ] Custom vocabulary/terminology
- [ ] Subtitle editing API

---

## License

Same as main project (check LICENSE file).

---

## Support

For issues or questions:
- Check logs in console output
- Review configuration in `.env`
- Verify FFmpeg installation
- Check cache stats at `/api/subtitles/cache/stats`

**Enjoy never seeing "Subtitles unavailable" again! 🎉**
