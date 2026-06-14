import { API_BASE } from '../config.js'

async function postJson(path, body, signal) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal,
  })
  return res.json()
}

export const api = {
  base: API_BASE,
  health: () => fetch(`${API_BASE}/api/health`, { signal: AbortSignal.timeout(10000) }),
  info: (url) => postJson('/api/info', { url }),
  downloadVideo: (url, quality, format) => postJson('/api/download/video', { url, quality, format }),
  downloadAudio: (url, kbps, format) => postJson('/api/download/audio', { url, kbps, format }),
  viewSubtitles: (url, lang, signal) => postJson('/api/subtitles/view', { url, lang }, signal),
  downloadSubtitle: (url, lang, format) => postJson('/api/subtitles/download', { url, lang, format }),
  status: (jobId) => fetch(`${API_BASE}/api/status/${jobId}`).then((r) => (r.ok ? r.json() : Promise.reject(r))),
  fileUrl: (jobId) => `${API_BASE}/api/file/${jobId}`,
}
