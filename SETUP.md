# VDOWN v5.0 Setup Guide

## Quick Start (5 minutes)

### 1. Install System Dependencies

**macOS:**
```bash
# Install FFmpeg
brew install ffmpeg
```

**Ubuntu/Debian:**
```bash
sudo apt update
sudo apt install ffmpeg python3-dev
```

**Windows:**
- Download FFmpeg from [ffmpeg.org](https://ffmpeg.org/download.html)
- Add to PATH

### 2. Install Python Dependencies

```bash
# Create virtual environment (recommended)
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
```

**Note:** Initial install may take 5-10 minutes (downloading Whisper models, PyTorch, etc.)

### 3. Configure Environment

```bash
# Copy example config
cp .env.example .env

# Edit .env (optional - defaults are good)
nano .env  # or vim, code, etc.
```

**Minimal config for testing:**
```bash
WHISPER_MODEL=base
ENABLE_AI_SUBTITLES=True
```

### 4. Build Frontend (if not already built)

```bash
cd frontend
npm install
npm run build
cd ..
```

### 5. Start Backend

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
  • Device: cpu
  • AI fallback: ACTIVE
  • FFmpeg: FOUND

✓ Serving built frontend from frontend/dist
  Access at: http://0.0.0.0:8080

============================================================
```

### 6. Test It!

Open browser: **http://localhost:8080**

Try a video **without** subtitles — the system will auto-generate them! 🎉

---

## Configuration Guide

### Whisper Model Selection

Edit `.env`:

```bash
# For fastest (testing, short videos):
WHISPER_MODEL=tiny

# For production (recommended):
WHISPER_MODEL=base

# For better accuracy (requires more RAM):
WHISPER_MODEL=small

# For best accuracy (requires GPU):
WHISPER_MODEL=large-v3
```

### GPU Configuration

**If you have NVIDIA GPU:**

```bash
# Install CUDA version of PyTorch first
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu118

# Enable GPU in .env
WHISPER_DEVICE=cuda
```

**If you have Apple Silicon (M1/M2/M3):**

```bash
# PyTorch with Metal support (auto-detected)
WHISPER_DEVICE=auto
```

**For CPU-only:**

```bash
WHISPER_DEVICE=cpu
```

### Cache Configuration

```bash
# Cache directory (subtitles stored here)
SUBTITLE_CACHE_DIR=./cache/subtitles

# How long to keep cached subtitles
SUBTITLE_CACHE_TTL_DAYS=30
```

### Processing Limits

```bash
# Max video length (2 hours)
MAX_VIDEO_DURATION_SECONDS=7200

# Max audio file size (500 MB)
MAX_AUDIO_SIZE_MB=500

# AI generation timeout (10 minutes)
AI_SUBTITLE_TIMEOUT_SECONDS=600
```

---

## Verification Checklist

### ✅ Check 1: Python Dependencies

```bash
python -c "import whisper; print('Whisper:', whisper.__version__)"
python -c "import torch; print('PyTorch:', torch.__version__)"
python -c "import yt_dlp; print('yt-dlp:', yt_dlp.version.__version__)"
```

### ✅ Check 2: FFmpeg

```bash
ffmpeg -version
```

Should show FFmpeg version info.

### ✅ Check 3: Backend Health

```bash
curl http://localhost:8080/api/health
```

Should return:
```json
{
  "status": "ok",
  "version": "5.0.0",
  "subtitle_system": "production_ai",
  "features": {
    "ai_subtitles": true,
    "subtitle_cache": true,
    "auto_fallback": true
  }
}
```

### ✅ Check 4: Cache Stats

```bash
curl http://localhost:8080/api/subtitles/cache/stats
```

Should return cache information.

### ✅ Check 5: Test Subtitle Generation

Find a YouTube video **without** subtitles and test:

```bash
curl -X POST http://localhost:8080/api/subtitles/view \
  -H "Content-Type: application/json" \
  -d '{"url": "https://youtube.com/watch?v=YOUR_VIDEO_ID", "lang": "en"}'
```

Look for `"source": "ai_generated"` in the response.

---

## Common Issues

### Issue: "Production modules not found"

**Problem:** Python dependencies not installed

**Solution:**
```bash
pip install -r requirements.txt
```

### Issue: "FFmpeg not found"

**Problem:** FFmpeg not installed or not in PATH

**Solution:**
```bash
# macOS
brew install ffmpeg

# Ubuntu/Debian
sudo apt install ffmpeg

# Windows
# Download from ffmpeg.org and add to PATH
```

### Issue: "CUDA out of memory"

**Problem:** GPU doesn't have enough VRAM for the model

**Solution:** Use smaller model or CPU:
```bash
# In .env
WHISPER_MODEL=base  # or tiny
WHISPER_DEVICE=cpu
```

### Issue: "Slow subtitle generation"

**Problem:** Using CPU or large model

**Solutions:**
1. Use GPU if available
2. Use smaller model (`tiny` or `base`)
3. Increase timeout in `.env`

### Issue: "Module not found" errors

**Problem:** Virtual environment not activated

**Solution:**
```bash
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

---

## Development Setup

### Running Frontend in Dev Mode

```bash
# Terminal 1: Backend
python server.py

# Terminal 2: Frontend dev server
cd frontend
npm run dev
```

Frontend will be at: **http://localhost:5173**  
Backend API at: **http://localhost:8080**

### Testing AI Subtitle Generation

```python
# test_whisper.py
from services.whisper_service import whisper_service

# Test audio extraction
audio_path, duration = whisper_service.extract_audio(
    "https://youtube.com/watch?v=...",
    Path("test_audio.wav")
)
print(f"Audio extracted: {duration}s")

# Test transcription
lines, lang, result = whisper_service.transcribe(audio_path)
print(f"Transcribed {len(lines)} lines in {lang}")
for line in lines[:5]:
    print(f"[{line.time}] {line.text}")
```

### Manual Cache Management

```python
from services.subtitle_cache import subtitle_cache

# Check stats
stats = subtitle_cache.get_stats()
print(stats)

# Clear expired entries
cleared = subtitle_cache.clear_expired()
print(f"Cleared {cleared} entries")
```

---

## Production Deployment

### Using Gunicorn (Recommended)

```bash
# Install gunicorn (already in requirements.txt)
pip install gunicorn

# Run with multiple workers
gunicorn server:app \
  --workers 4 \
  --bind 0.0.0.0:8080 \
  --timeout 300 \
  --access-logfile - \
  --error-logfile -
```

### Using Docker (Future)

```dockerfile
# Dockerfile (example)
FROM python:3.10-slim

RUN apt-get update && apt-get install -y ffmpeg
WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY . .

CMD ["gunicorn", "server:app", "--bind", "0.0.0.0:8080"]
```

### Environment Variables (Production)

```bash
# .env for production
WHISPER_MODEL=base
WHISPER_DEVICE=cuda  # if GPU available
ENABLE_AI_SUBTITLES=True
SUBTITLE_CACHE_TTL_DAYS=60
MAX_VIDEO_DURATION_SECONDS=3600  # 1 hour
MAX_AUDIO_SIZE_MB=300
DEBUG=False
```

### Monitoring

Check logs for performance:

```bash
tail -f /var/log/vdown/app.log | grep "subtitle"
```

Key metrics to monitor:
- Cache hit ratio
- AI generation time
- Error rates
- Cache size

---

## Upgrading from v4.1

The v5.0 system is **backward compatible**. To upgrade:

1. **Pull latest code**
2. **Install new dependencies:**
   ```bash
   pip install -r requirements.txt
   ```
3. **Create `.env` file:**
   ```bash
   cp .env.example .env
   ```
4. **Restart backend:**
   ```bash
   python server.py
   ```

**No frontend changes needed!** The API remains the same.

If anything fails, the system automatically falls back to v4.1 logic.

---

## Next Steps

1. ✅ Read [SUBTITLE_SYSTEM.md](SUBTITLE_SYSTEM.md) for full architecture details
2. ✅ Configure `.env` for your environment
3. ✅ Test with videos without subtitles
4. ✅ Monitor logs and cache performance
5. ✅ Consider GPU acceleration for production

---

## Support

**Logs:** Check console output for detailed logs  
**Health:** http://localhost:8080/api/health  
**Cache:** http://localhost:8080/api/subtitles/cache/stats  

**Need help?** Check the logs first — they're very detailed!

🎉 **Enjoy production-grade subtitles with AI fallback!**
