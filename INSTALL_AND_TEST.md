# Installation & Testing Guide

## 📦 Step-by-Step Installation

### Step 1: Install FFmpeg (Required)

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
- Download from https://ffmpeg.org/download.html
- Add to PATH

**Verify:**
```bash
ffmpeg -version
```

---

### Step 2: Install Python Dependencies

```bash
# Recommended: Use virtual environment
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install all dependencies
pip install -r requirements.txt
```

**This will install:**
- Flask & Flask-CORS (web server)
- yt-dlp (YouTube download)
- openai-whisper (AI subtitles)
- torch (deep learning)
- ffmpeg-python (audio processing)
- python-dotenv (config)
- filelock (thread safety)

**Note:** First install may take 5-10 minutes (downloading PyTorch, Whisper models, etc.)

---

### Step 3: Configuration

```bash
# Copy example config
cp .env.example .env

# Edit if needed (defaults are good)
nano .env
```

**Minimal config for testing:**
```bash
WHISPER_MODEL=base
ENABLE_AI_SUBTITLES=True
```

---

### Step 4: Verify Installation

```bash
# Run automated setup checker
python setup_system.py
```

**Expected output:**
```
============================================================
Step 1: Checking Python Version
============================================================

✓ Python 3.10.x

============================================================
Step 2: Checking FFmpeg
============================================================

✓ FFmpeg found: ffmpeg version 6.0

...

Result: 7/7 checks passed

✓ System ready for production!
```

---

### Step 5: Run Component Tests

```bash
# Test individual components
python test_subtitle_system.py
```

**Expected output:**
```
============================================================
VDOWN v5.0 Subtitle System Test Suite
============================================================

Testing imports...
  ✓ Config loaded (Whisper: base, AI: True)
  ✓ Models imported
  ✓ Subtitle cache imported
  ✓ Whisper service imported (device: cpu)
  ✓ Subtitle service imported
  ✓ Subtitle formatter imported

Testing cache system...
  ✓ Cache stats: 0 entries, 0.00MB

...

Result: 5/5 tests passed

✓ All tests passed! System ready.
```

---

### Step 6: Start Backend

```bash
python server.py
```

**Expected output:**
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

 * Serving Flask app 'server'
 * Running on http://0.0.0.0:8080
```

---

### Step 7: Build Frontend (if not already built)

**In a new terminal:**

```bash
cd frontend
npm install
npm run build
cd ..
```

---

### Step 8: Test in Browser

1. Open: **http://localhost:8080**
2. Paste a YouTube URL
3. Click "Analyse"
4. Go to "Subtitles" tab
5. Click "View captions"

**To test AI generation:** Find a video WITHOUT subtitles and try viewing captions.

---

## 🧪 Testing the AI Subtitle System

### Test 1: System Health Check

```bash
curl http://localhost:8080/api/health
```

**Expected response:**
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

---

### Test 2: Test with YouTube Subtitles (Fast)

```bash
# Use a video you know has subtitles
curl -X POST http://localhost:8080/api/subtitles/view \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    "lang": "en"
  }'
```

**Expected:** Response in 2-5 seconds with `"kind": "youtube_manual"` or `"kind": "youtube_auto"`

---

### Test 3: Test AI Generation (Slow first time)

```bash
# Find a video WITHOUT subtitles (or use a test video)
curl -X POST http://localhost:8080/api/subtitles/view \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://www.youtube.com/watch?v=YOUR_VIDEO_WITHOUT_SUBS",
    "lang": "en"
  }'
```

**Expected:** 
- Response in 30-90 seconds (first time)
- Response includes `"source": "ai_generated"`
- Response includes `"model": "base"`

**Watch the server logs:**
```
[INFO] View subtitles (AI-enabled): url=..., lang=en
[INFO] Cache MISS: VIDEO_ID (en)
[WARNING] Manual subtitle attempt failed
[WARNING] Auto subtitle attempt failed
[INFO] YouTube subtitles unavailable, generating with AI
[INFO] Extracting audio...
[INFO] Audio extraction completed in 4.82s (duration=180s, size=12.3MB)
[INFO] Transcribing with Whisper
[INFO] Whisper transcription completed in 36.12s (segments=85, language=en)
[INFO] Cached: VIDEO_ID (en, ai_generated) - 85 lines
[INFO] Subtitles delivered: 85 lines, source=ai_generated
```

---

### Test 4: Test Caching

**Request the same video again:**

```bash
# Same URL as Test 3
curl -X POST http://localhost:8080/api/subtitles/view \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://www.youtube.com/watch?v=YOUR_VIDEO_WITHOUT_SUBS",
    "lang": "en"
  }'
```

**Expected:**
- Response in < 1 second ⚡
- Same subtitles returned
- Logs show: `[INFO] Cache HIT: VIDEO_ID (en, ai_generated)`

---

### Test 5: Check Cache Stats

```bash
curl http://localhost:8080/api/subtitles/cache/stats
```

**Expected response:**
```json
{
  "total_entries": 1,
  "total_size_mb": 0.05,
  "cache_dir": "./cache/subtitles",
  "ttl_days": 30
}
```

---

### Test 6: Download Subtitle File

```bash
# Start download job
curl -X POST http://localhost:8080/api/subtitles/download \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    "lang": "en",
    "format": "srt"
  }'
```

**Response:**
```json
{
  "job_id": "abc12345"
}
```

**Check job status:**
```bash
curl http://localhost:8080/api/status/abc12345
```

**Response:**
```json
{
  "status": "done",
  "progress": 100,
  "filepath": "./downloads/abc12345_subs_en.srt",
  "filename": "subtitles_en.srt",
  "source": "youtube_manual",
  "line_count": 245
}
```

**Download file:**
```bash
curl -O http://localhost:8080/api/file/abc12345
```

---

## 🐛 Troubleshooting Tests

### Test Fails: "Production modules not found"

**Problem:** Python dependencies not installed

**Fix:**
```bash
pip install -r requirements.txt
```

---

### Test Fails: "FFmpeg not found"

**Problem:** FFmpeg not installed or not in PATH

**Fix:**
```bash
# macOS
brew install ffmpeg

# Linux
sudo apt install ffmpeg

# Windows
# Download from ffmpeg.org and add to PATH
```

**Verify:**
```bash
ffmpeg -version
which ffmpeg  # Should show path
```

---

### Test Fails: "CUDA out of memory"

**Problem:** GPU doesn't have enough VRAM

**Fix:** Use CPU or smaller model:
```bash
# Edit .env
WHISPER_MODEL=base  # or tiny
WHISPER_DEVICE=cpu
```

**Restart server:**
```bash
python server.py
```

---

### AI Generation is Very Slow

**Problem:** Using CPU with large model

**Solutions:**

**Option 1: Use GPU (if available)**
```bash
# Edit .env
WHISPER_DEVICE=cuda  # or auto
```

**Option 2: Use smaller model**
```bash
# Edit .env
WHISPER_MODEL=tiny  # Very fast, basic accuracy
```

**Option 3: Increase timeout**
```bash
# Edit .env
AI_SUBTITLE_TIMEOUT_SECONDS=1200  # 20 minutes
```

---

### Server Shows "Using legacy subtitle system"

**Problem:** Production modules can't be imported

**Check:**
```bash
python -c "from services.subtitle_service import subtitle_service"
```

**If error:** Module structure issue

**Fix:**
```bash
# Check all files exist
ls -R models/ services/ utils/

# Reinstall if needed
pip install -r requirements.txt --force-reinstall
```

---

### Import Errors

**Problem:** Module not found

**Common causes:**
1. Virtual environment not activated
2. Dependencies not installed
3. Python path issues

**Fix:**
```bash
# Activate venv
source venv/bin/activate  # Linux/Mac
venv\Scripts\activate     # Windows

# Reinstall
pip install -r requirements.txt

# Verify
python -c "import whisper; print('OK')"
python -c "import torch; print('OK')"
```

---

## ✅ Success Criteria

After installation, you should be able to:

- [x] `python setup_system.py` shows all ✓
- [x] `python test_subtitle_system.py` all tests pass
- [x] `python server.py` starts without errors
- [x] `/api/health` returns status "ok"
- [x] Test YouTube subtitles work (2-5 seconds)
- [x] Test AI generation works (30-90 seconds first time)
- [x] Test caching works (< 1 second second time)
- [x] Frontend shows subtitles correctly

---

## 🚀 Next Steps

Once all tests pass:

1. **Configure for your environment** (edit `.env`)
2. **Test with real videos** (with and without subtitles)
3. **Monitor logs** for performance and errors
4. **Adjust settings** based on your hardware
5. **Deploy to production** (if ready)

---

## 📊 Performance Benchmarks

After testing, you should see:

| Scenario | Expected Time |
|----------|---------------|
| Cache hit | < 1 second |
| YouTube download | 2-5 seconds |
| AI generation (CPU, base model) | 30-60 seconds |
| AI generation (GPU, base model) | 10-20 seconds |
| Cached AI request | < 1 second |

**If your times are significantly different, check:**
- CPU/GPU usage
- Network speed
- Disk I/O
- Model size configuration

---

## 🆘 Getting Help

If you encounter issues:

1. **Check logs** — Most detailed info in console
2. **Run setup checker** — `python setup_system.py`
3. **Run tests** — `python test_subtitle_system.py`
4. **Check health** — `curl http://localhost:8080/api/health`
5. **Read docs** — See `SUBTITLE_SYSTEM.md` and `SETUP.md`

---

**Installation complete! Your AI subtitle system is ready.** 🎉
