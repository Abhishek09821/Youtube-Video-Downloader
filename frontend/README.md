# VIDown frontend

A multipage React (Vite) app for the VIDown YouTube downloader. Minimalist,
TradingView-inspired dark UI.

## Pages

- `/` — Home / landing
- `/download` — The downloader app (video, audio, subtitles)
- `/features` — Feature overview
- `/about` — About

## Development

```bash
cd frontend
npm install
cp .env.example .env   # adjust VITE_API_BASE if your backend is not on :8080
npm run dev
```

The dev server runs on http://localhost:5173 and talks to the Flask backend
at `VITE_API_BASE` (default `http://localhost:8080`).

## Build

```bash
npm run build      # outputs static files to dist/
npm run preview    # preview the production build
```

## Backend

The Flask backend lives in the repository root (`server.py`). Run it with:

```bash
pip install -r requirements.txt
python3 server.py
```

The frontend uses these endpoints unchanged: `/api/health`, `/api/info`,
`/api/download/video`, `/api/download/audio`, `/api/subtitles/view`,
`/api/subtitles/download`, `/api/status/<job_id>`, `/api/file/<job_id>`.
