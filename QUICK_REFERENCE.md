# VDOWN v5.0 Quick Reference

## 🚀 Installation (5 Minutes)

```bash
# 1. Install FFmpeg
brew install ffmpeg  # macOS
# OR sudo apt install ffmpeg  # Linux

# 2. Install Python packages
pip install -r requirements.txt

# 3. Configure (optional, has good defaults)
cp .env.example .env

# 4. Verify setup
./setup_system.py

# 5. Start server
python server.py
```

---

## 📁 File Structure

```
Key Files:
├── server.py                    ← Main Flask server (v5.0 upgraded)
├── config.py                    ← Configuration loader
├── .env                         ← Your settings (create from .env.example)
│
Production System:
├── models/                      ← Data models (SubtitleResult, etc.)
├── services/
│   ├── subtitle_service.py     ← Main pipeline orchestrator
│   ├── whisper_service.py      ← AI subtitle generation
│   ├── subtitle_cache.py       ← Caching system
│   └── subtitle_formatter.py   ← SRT/VTT/TXT export
└── utils/                       ← Helpers (logging, video utils)

Documentation:
├── SUBTITLE_SYSTEM.md          ← Full architecture docs
├── SETUP.md                    ← Detailed setup guide
├── V5_UPGRADE_SUMMARY.md       ← What changed in v5.0
└── QUICK_REFERENCE.md          ← This file

Testing:
├── setup_system.py             ← Dependency checker
└── test_subtitle_system.py     ← Component tests
```

---

## ⚙️ Configuration (.env)

### Essential Settings

```bash
# Whisper model (tiny=fastest, base=recommended, large-v3=best)
WHISPER_MODEL=base

# Device (auto=smart, cuda=GPU, cpu=CPU only)
WHISPER_DEVICE=auto

# Enable/disable AI fallback
ENABLE_AI_SUBTITLES=True
```

### Advanced Settings

```bash
# Cache
SUBTITLE_CACHE_DIR=./cache/subtitles
SUBTITLE_CACHE_TTL_DAYS=30

# Limits
MAX_VIDEO_DURATION_SECONDS=7200  # 2 hours
MAX_AUDIO_SIZE_MB=500
AI_SUBTITLE_TIMEOUT_SECONDS=600  # 10 min
```

---

## 🎯 How It Works

### Subtitle Pipeline

```
User Requests Subtitles
    ↓
1. Cache?           → YES → Return (< 1s)
    ↓ NO
2. YouTube Manual?  → YES → Cache & Return
    ↓ NO
3. YouTube Auto?    → YES → Cache & Return
    ↓ NO
4. AI Generation    → Always succeeds → Cache & Return
   (Whisper)
```

### API Endpoints

```bash
# View subtitles (with AI fallback)
POST /api/subtitles/view
Body: {"url": "...", "lang": "en"}

# Download subtitle file
POST /api/subtitles/download
Body: {"url": "...", "lang": "en", "format": "srt"}

# System health
GET /api/health

# Cache stats
GET /api/subtitles/cache/stats

# Clear expired cache
POST /api/subtitles/cache/clear
```

---

## 🧪 Testing

### Quick Verification

```bash
# 1. Check dependencies
./setup_system.py

# 2. Run component tests
./test_subtitle_system.py

# 3. Check system health
curl http://localhost:8080/api/health

# 4. Test with real video (find one WITHOUT subtitles)
curl -X POST http://localhost:8080/api/subtitles/view \
  -H "Content-Type: application/json" \
  -d '{"url": "https://youtube.com/watch?v=VIDEO_ID", "lang": "en"}'
```

---

## 📊 Performance

| Scenario | Time |
|----------|------|
| Cache hit | < 1 second |
| YouTube download | 2-5 seconds |
| AI generation (CPU, 5min video) | 30-60 seconds |
| AI generation (GPU, 5min video) | 10-20 seconds |

### Whisper Models

| Model | Size | Speed | Quality | Use Case |
|-------|------|-------|---------|----------|
| tiny | 39M | ⚡⚡⚡ | ⭐ | Testing, dev |
| base | 74M | ⚡⚡ | ⭐⭐ | **Production** ✅ |
| small | 244M | ⚡ | ⭐⭐⭐ | Better accuracy |
| large-v3 | 1550M | 🐌 | ⭐⭐⭐⭐⭐ | Maximum quality (GPU) |

---

## 🐛 Troubleshooting

### "Production modules not found"
```bash
pip install -r requirements.txt
```

### "FFmpeg not found"
```bash
brew install ffmpeg  # macOS
sudo apt install ffmpeg  # Linux
```

### "CUDA out of memory"
```bash
# Use smaller model or CPU
echo "WHISPER_MODEL=base" >> .env
echo "WHISPER_DEVICE=cpu" >> .env
```

### Slow AI generation
```bash
# 1. Use GPU if available
echo "WHISPER_DEVICE=cuda" >> .env

# 2. OR use smaller model
echo "WHISPER_MODEL=tiny" >> .env
```

### Check logs
```bash
# Logs show detailed info about what's happening
# Look for lines like:
# [INFO] Subtitle retrieval for VIDEO_ID
# [INFO] Cache HIT/MISS
# [INFO] Generating with AI
# [INFO] Whisper transcription completed in X.XXs
```

---

## 💡 Tips

### Development
- Use `WHISPER_MODEL=tiny` for fast testing
- Cache saves ~30-60s per repeated request
- Check `/api/health` to verify system status

### Production
- Use `WHISPER_MODEL=base` (best balance)
- Enable GPU with `WHISPER_DEVICE=cuda` if available
- Increase cache TTL to reduce regeneration
- Monitor cache stats regularly

### Optimization
- Pre-warm cache by generating common videos
- Use GPU for 3-5x faster transcription
- Adjust `MAX_VIDEO_DURATION` based on needs
- Regular cache cleanup with `/api/subtitles/cache/clear`

---

## 📚 Documentation

- **Full Architecture**: `SUBTITLE_SYSTEM.md`
- **Setup Guide**: `SETUP.md`
- **Upgrade Info**: `V5_UPGRADE_SUMMARY.md`
- **This Reference**: `QUICK_REFERENCE.md`

---

## ✅ Success Checklist

```
□ FFmpeg installed (brew install ffmpeg)
□ Python packages installed (pip install -r requirements.txt)
□ .env file created (cp .env.example .env)
□ Setup verified (./setup_system.py shows all ✓)
□ Tests pass (./test_subtitle_system.py all green)
□ Server starts (python server.py)
□ Health check OK (curl http://localhost:8080/api/health)
□ Test with real video (find one without subtitles)
□ AI generation works (watch logs during generation)
□ Cache working (second request is instant)
```

---

## 🎯 One-Command Check

```bash
# Verify everything at once
./setup_system.py && ./test_subtitle_system.py && curl http://localhost:8080/api/health
```

If all pass → You're ready! 🎉

---

## 🆘 Need Help?

1. **Check logs** — Most detailed info is in console output
2. **Run setup checker** — `./setup_system.py`
3. **Check health** — `curl http://localhost:8080/api/health`
4. **View cache stats** — `curl http://localhost:8080/api/subtitles/cache/stats`
5. **Read docs** — See `SUBTITLE_SYSTEM.md` and `SETUP.md`

---

**That's it! Your subtitle system is production-ready.** 🚀
