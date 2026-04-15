/* ═══════════════════════════════════════════════
   app.js — YTGrab 3D Frontend Logic
   API calls to Flask backend on same origin
═══════════════════════════════════════════════ */
const API = '';

const S = {
  mode: 'video',
  quality: '1080',
  vFmt: 'mp4',
  bitrate: '256',
  aFmt: 'mp3',
  busy: false,
};

/* ── CURSOR ─────────────────────────────────── */
const cur  = document.getElementById('cursor');
const curR = document.getElementById('cursor-ring');
document.addEventListener('mousemove', e => {
  cur.style.left  = e.clientX + 'px';
  cur.style.top   = e.clientY + 'px';
  curR.style.left = e.clientX + 'px';
  curR.style.top  = e.clientY + 'px';
});

/* ── CARD 3D TILT ───────────────────────────── */
const card = document.getElementById('mainCard');
card.addEventListener('mousemove', e => {
  const r  = card.getBoundingClientRect();
  const cx = r.left + r.width  / 2;
  const cy = r.top  + r.height / 2;
  const rx = ((e.clientY - cy) / r.height) * -10;
  const ry = ((e.clientX - cx) / r.width)  *  10;
  card.style.transform = `perspective(1200px) rotateX(${rx}deg) rotateY(${ry}deg) translateZ(6px)`;
});
card.addEventListener('mouseleave', () => {
  card.style.transform = '';
  card.style.transition = 'transform .6s ease';
  setTimeout(() => card.style.transition = '', 600);
});

/* ── MODE ───────────────────────────────────── */
function setMode(m) {
  S.mode = m;
  document.getElementById('panelV').classList.toggle('hidden', m !== 'video');
  document.getElementById('panelA').classList.toggle('hidden', m !== 'audio');
  document.getElementById('tabV').classList.toggle('active', m === 'video');
  document.getElementById('tabA').classList.toggle('active', m === 'audio');
}

/* ── SELECTIONS ─────────────────────────────── */
function selQ(el, q) {
  S.quality = q;
  document.querySelectorAll('.q-card').forEach(c => c.classList.remove('selected'));
  el.classList.add('selected');
}
function selBR(el, b) {
  S.bitrate = b;
  document.querySelectorAll('.br-card').forEach(c => c.classList.remove('selected'));
  el.classList.add('selected');
}
function selFmt(el, f, t) {
  if (t === 'v') S.vFmt = f; else S.aFmt = f;
  el.parentElement.querySelectorAll('.fmt-btn').forEach(b => b.classList.remove('active'));
  el.classList.add('active');
}

/* ── PASTE ──────────────────────────────────── */
async function pasteURL() {
  try {
    const txt = await navigator.clipboard.readText();
    document.getElementById('urlInput').value = txt;
    showToast('⎘', 'URL PASTED');
  } catch {
    document.getElementById('urlInput').focus();
    showToast('⌨', 'PRESS CMD+V TO PASTE');
  }
}

/* ── ANALYZE ────────────────────────────────── */
async function analyzeVideo() {
  const url = document.getElementById('urlInput').value.trim();
  if (!url) { showToast('⚠', 'ENTER A YOUTUBE URL'); return; }
  if (!isYT(url)) { showToast('✕', 'NOT A VALID YOUTUBE URL'); return; }

  const btn = document.getElementById('analyzeTxt');
  btn.innerHTML = '<span class="spinner"></span> &nbsp;ANALYZING…';

  try {
    const res  = await fetch(`${API}/info`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
    });
    const data = await res.json();
    if (data.error) throw new Error(data.error);

    document.getElementById('vThumb').src = data.thumbnail || '';
    document.getElementById('vTitle').textContent = data.title || 'Unknown Title';
    document.getElementById('vDur').textContent   = fmtSec(data.duration);
    document.getElementById('vMeta').textContent  =
      `${data.uploader || '—'} · ${data.view_count ? Number(data.view_count).toLocaleString() + ' views' : ''}`;
    document.getElementById('videoInfo').classList.remove('hidden');

    btn.innerHTML = '✓ &nbsp;VIDEO READY — CHOOSE OPTIONS';
    showToast('🎬', 'VIDEO ANALYZED');
  } catch (e) {
    btn.innerHTML = '▶ &nbsp;ANALYZE VIDEO';
    showToast('✕', e.message.slice(0, 50) || 'ANALYZE FAILED');
  }
}

/* ── DOWNLOAD ───────────────────────────────── */
async function startDL(type) {
  if (S.busy) return;
  const url = document.getElementById('urlInput').value.trim();
  if (!url) { showToast('⚠', 'ENTER A YOUTUBE URL'); return; }
  if (!isYT(url)) { showToast('✕', 'NOT A VALID YOUTUBE URL'); return; }

  S.busy = true;
  showProg(true);

  const params = type === 'video'
    ? { url, type: 'video', quality: S.quality, format: S.vFmt }
    : { url, type: 'audio', bitrate: S.bitrate, format: S.aFmt };

  const label = type === 'video'
    ? `DOWNLOADING ${S.quality}P ${S.vFmt.toUpperCase()}`
    : `EXTRACTING ${S.bitrate}KBPS ${S.aFmt.toUpperCase()}`;

  setProg(5, label, 'CONNECTING…');

  try {
    const es = new EventSource(`${API}/download?${new URLSearchParams(params)}`);

    es.onmessage = e => {
      const d = JSON.parse(e.data);
      if (d.status === 'progress') {
        setProg(d.percent, label, d.info || '');
      } else if (d.status === 'done') {
        es.close();
        setProg(100, 'DOWNLOAD COMPLETE', d.filename || '');
        triggerDL(`${API}/file/${encodeURIComponent(d.filename)}`);
        showToast('🎉', type === 'video' ? 'VIDEO DOWNLOADED!' : 'AUDIO EXTRACTED!');
        setTimeout(resetProg, 4000);
        S.busy = false;
      } else if (d.status === 'error') {
        es.close();
        showToast('✕', d.message.slice(0, 50) || 'DOWNLOAD FAILED');
        showProg(false);
        S.busy = false;
      }
    };

    es.onerror = () => {
      es.close();
      showToast('✕', 'CONNECTION LOST');
      showProg(false);
      S.busy = false;
    };
  } catch (e) {
    showToast('✕', 'DOWNLOAD FAILED');
    showProg(false);
    S.busy = false;
  }
}

/* ── PROGRESS HELPERS ───────────────────────── */
function showProg(v) {
  document.getElementById('progWrap').classList.toggle('hidden', !v);
}
function setProg(pct, label, info) {
  document.getElementById('progFill').style.width  = pct + '%';
  document.getElementById('progPct').textContent   = pct + '%';
  document.getElementById('progLabel').textContent = label;
  document.getElementById('progInfo').textContent  = info;
}
function resetProg() {
  showProg(false);
  setProg(0, '', '');
}

/* ── UTILS ──────────────────────────────────── */
function isYT(u) {
  return /^(https?:\/\/)?(www\.)?(youtube\.com\/(watch\?v=|shorts\/|live\/)|youtu\.be\/)/.test(u);
}
function fmtSec(s) {
  if (!s) return '0:00';
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  return h > 0 ? `${h}:${pad(m)}:${pad(sec)}` : `${m}:${pad(sec)}`;
}
function pad(n) { return String(n).padStart(2, '0'); }
function triggerDL(url) {
  const a = document.createElement('a');
  a.href = url; a.download = '';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

/* ── TOAST ──────────────────────────────────── */
let toastT;
function showToast(ico, msg) {
  document.getElementById('toastIco').textContent = ico;
  document.getElementById('toastMsg').textContent = msg;
  const t = document.getElementById('toast');
  t.classList.add('show');
  clearTimeout(toastT);
  toastT = setTimeout(() => t.classList.remove('show'), 3200);
}
