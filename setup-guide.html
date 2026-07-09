<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Video Bloom — Setup Guide</title>
<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;900&family=DM+Sans:wght@300;400;500;600&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
<style>
  :root {
    --rose:#FF2D6B;--rose-light:#FF6FA3;--petal:#FFB3CC;
    --violet:#7B2FBE;--violet-light:#A855F7;
    --blue:#1E40AF;--blue-light:#60A5FA;
    --green:#10B981;--green-light:#34D399;
    --yellow:#F59E0B;--yellow-light:#FCD34D;
    --deep:#0F0A1E;--surface:#1A1030;--surface2:#221542;
    --text:#F8F0FF;--muted:#C4B5D4;--code-bg:#0D0820;
  }
  *{margin:0;padding:0;box-sizing:border-box;}
  body{font-family:'DM Sans',sans-serif;background:var(--deep);color:var(--text);line-height:1.7;}

  /* Sidebar layout */
  .layout{display:flex;min-height:100vh;}
  .sidebar{width:260px;flex-shrink:0;background:rgba(26,16,48,0.98);border-right:1px solid rgba(255,180,220,0.1);padding:32px 0;position:sticky;top:0;height:100vh;overflow-y:auto;}
  .sidebar-logo{padding:0 24px 28px;border-bottom:1px solid rgba(255,180,220,0.1);margin-bottom:20px;}
  .sidebar-logo .brand{font-family:'Playfair Display',serif;font-size:22px;font-weight:900;background:linear-gradient(135deg,var(--petal),var(--rose-light),var(--violet-light));-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;}
  .sidebar-logo .tagline{font-size:11px;color:var(--muted);letter-spacing:1px;margin-top:2px;}
  .nav-section{padding:0 16px;margin-bottom:8px;}
  .nav-label{font-size:10px;letter-spacing:2px;text-transform:uppercase;color:rgba(196,181,212,0.4);padding:0 8px;margin-bottom:6px;}
  .nav-item{display:flex;align-items:center;gap:10px;padding:9px 12px;border-radius:10px;font-size:13px;color:var(--muted);cursor:pointer;transition:all 0.2s;text-decoration:none;border:none;background:none;width:100%;text-align:left;}
  .nav-item:hover{background:rgba(255,45,107,0.08);color:var(--text);}
  .nav-item.active{background:linear-gradient(135deg,rgba(255,45,107,0.15),rgba(123,47,190,0.15));color:var(--text);border:1px solid rgba(255,107,163,0.2);}
  .nav-num{width:20px;height:20px;border-radius:6px;background:rgba(255,45,107,0.2);color:var(--rose-light);font-size:11px;font-weight:700;display:flex;align-items:center;justify-content:center;flex-shrink:0;}
  .nav-item.active .nav-num{background:linear-gradient(135deg,var(--rose),var(--violet));color:white;}

  /* Main content */
  .main{flex:1;max-width:860px;padding:48px 56px;overflow-x:hidden;}

  /* Page header */
  .page-header{margin-bottom:52px;padding-bottom:32px;border-bottom:1px solid rgba(255,180,220,0.1);}
  .page-header .eyebrow{font-size:12px;letter-spacing:3px;text-transform:uppercase;color:var(--petal);font-weight:500;margin-bottom:12px;}
  .page-header h1{font-family:'Playfair Display',serif;font-size:48px;font-weight:900;line-height:1.05;background:linear-gradient(135deg,#fff 0%,var(--petal) 40%,var(--violet-light) 80%);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;margin-bottom:16px;}
  .page-header p{font-size:16px;color:var(--muted);max-width:600px;line-height:1.7;}

  /* Sections */
  .section{margin-bottom:60px;scroll-margin-top:40px;}
  .section-header{display:flex;align-items:center;gap:16px;margin-bottom:28px;}
  .step-circle{width:44px;height:44px;border-radius:50%;background:linear-gradient(135deg,var(--rose),var(--violet));display:flex;align-items:center;justify-content:center;font-size:18px;font-weight:700;flex-shrink:0;box-shadow:0 4px 20px rgba(255,45,107,0.35);}
  .section-title{font-family:'Playfair Display',serif;font-size:26px;font-weight:700;color:var(--text);}
  .section-desc{font-size:14px;color:var(--muted);margin-top:3px;}

  /* Cards */
  .card{background:linear-gradient(145deg,rgba(255,255,255,0.06),rgba(255,255,255,0.02));border:1px solid rgba(255,180,220,0.12);border-radius:20px;padding:28px;margin-bottom:16px;position:relative;overflow:hidden;}
  .card::before{content:'';position:absolute;top:0;left:0;right:0;height:1px;background:linear-gradient(90deg,transparent,rgba(255,107,163,0.4),rgba(168,85,247,0.4),transparent);}
  .card-title{font-size:15px;font-weight:600;color:var(--text);margin-bottom:6px;display:flex;align-items:center;gap:8px;}
  .card-body{font-size:14px;color:var(--muted);line-height:1.7;}

  /* OS tabs */
  .os-tabs{display:flex;gap:8px;margin-bottom:20px;}
  .os-tab{padding:8px 20px;border-radius:10px;font-size:13px;font-weight:500;cursor:pointer;border:1px solid rgba(255,180,220,0.15);background:rgba(255,255,255,0.03);color:var(--muted);transition:all 0.2s;font-family:'DM Sans',sans-serif;}
  .os-tab.active{background:linear-gradient(135deg,rgba(255,45,107,0.15),rgba(123,47,190,0.15));border-color:rgba(255,107,163,0.3);color:var(--text);}
  .os-panel{display:none;}.os-panel.active{display:block;}

  /* Code blocks */
  .code-block{background:var(--code-bg);border:1px solid rgba(255,180,220,0.1);border-radius:14px;overflow:hidden;margin-bottom:12px;}
  .code-header{display:flex;align-items:center;justify-content:space-between;padding:10px 18px;background:rgba(255,255,255,0.03);border-bottom:1px solid rgba(255,180,220,0.08);}
  .code-lang{font-size:11px;letter-spacing:2px;text-transform:uppercase;color:var(--petal);font-weight:500;}
  .code-dots{display:flex;gap:6px;}
  .code-dot{width:10px;height:10px;border-radius:50%;}
  .code-dot:nth-child(1){background:#FF5F57;}
  .code-dot:nth-child(2){background:#FEBC2E;}
  .code-dot:nth-child(3){background:#28C840;}
  .code-body{padding:18px 20px;overflow-x:auto;}
  .code-body pre{font-family:'JetBrains Mono',monospace;font-size:13px;line-height:1.7;color:#e2d9f3;}
  .cm{color:#6b7280;font-style:italic;}
  .ck{color:#FF6FA3;}
  .cv{color:#A5B4FC;}
  .cs{color:#86EFAC;}
  .cn{color:#FCD34D;}
  .copy-btn{background:rgba(255,45,107,0.12);border:1px solid rgba(255,45,107,0.2);color:var(--rose-light);border-radius:8px;padding:4px 12px;font-size:12px;cursor:pointer;font-family:'DM Sans',sans-serif;transition:all 0.2s;}
  .copy-btn:hover{background:rgba(255,45,107,0.22);}

  /* Step list */
  .step-list{list-style:none;display:flex;flex-direction:column;gap:4px;}
  .step-item{display:flex;gap:14px;padding:14px 16px;border-radius:12px;background:rgba(255,255,255,0.02);border:1px solid rgba(255,180,220,0.07);transition:all 0.2s;}
  .step-item:hover{background:rgba(255,45,107,0.04);border-color:rgba(255,107,163,0.15);}
  .step-num{width:26px;height:26px;border-radius:8px;background:linear-gradient(135deg,rgba(255,45,107,0.2),rgba(123,47,190,0.2));color:var(--rose-light);font-size:12px;font-weight:700;display:flex;align-items:center;justify-content:center;flex-shrink:0;margin-top:1px;}
  .step-text{font-size:14px;color:var(--muted);line-height:1.6;}
  .step-text strong{color:var(--text);}

  /* Alert boxes */
  .alert{display:flex;gap:14px;padding:16px 20px;border-radius:14px;margin-bottom:16px;}
  .alert.info{background:rgba(96,165,250,0.08);border:1px solid rgba(96,165,250,0.2);}
  .alert.warn{background:rgba(245,158,11,0.08);border:1px solid rgba(245,158,11,0.2);}
  .alert.success{background:rgba(16,185,129,0.08);border:1px solid rgba(16,185,129,0.2);}
  .alert.danger{background:rgba(239,68,68,0.08);border:1px solid rgba(239,68,68,0.2);}
  .alert-icon{font-size:20px;flex-shrink:0;line-height:1.4;}
  .alert-body{font-size:13px;line-height:1.6;}
  .alert.info .alert-body{color:#93C5FD;}
  .alert.warn .alert-body{color:#FCD34D;}
  .alert.success .alert-body{color:#6EE7B7;}
  .alert.danger .alert-body{color:#FCA5A5;}
  .alert-body strong{font-weight:600;}

  /* File tree */
  .file-tree{background:var(--code-bg);border:1px solid rgba(255,180,220,0.1);border-radius:14px;padding:20px 24px;font-family:'JetBrains Mono',monospace;font-size:13px;line-height:1.9;}
  .ft-dir{color:#A5B4FC;}
  .ft-file{color:#86EFAC;}
  .ft-comment{color:#6b7280;font-style:italic;}
  .ft-indent{margin-left:20px;}
  .ft-indent2{margin-left:40px;}

  /* Badge */
  .badge{display:inline-flex;align-items:center;gap:5px;padding:3px 10px;border-radius:20px;font-size:11px;font-weight:600;letter-spacing:0.5px;}
  .badge.required{background:rgba(239,68,68,0.15);color:#FCA5A5;border:1px solid rgba(239,68,68,0.2);}
  .badge.optional{background:rgba(16,185,129,0.12);color:#6EE7B7;border:1px solid rgba(16,185,129,0.2);}
  .badge.win{background:rgba(96,165,250,0.12);color:#93C5FD;}
  .badge.mac{background:rgba(168,85,247,0.12);color:#C4B5FD;}
  .badge.linux{background:rgba(245,158,11,0.12);color:#FCD34D;}

  /* API table */
  .api-table{width:100%;border-collapse:collapse;margin-bottom:16px;}
  .api-table th{text-align:left;padding:10px 14px;font-size:11px;letter-spacing:1.5px;text-transform:uppercase;color:var(--petal);border-bottom:1px solid rgba(255,180,220,0.15);font-weight:500;}
  .api-table td{padding:12px 14px;font-size:13px;color:var(--muted);border-bottom:1px solid rgba(255,180,220,0.06);vertical-align:top;}
  .api-table tr:hover td{background:rgba(255,45,107,0.04);}
  .method{display:inline-block;padding:2px 10px;border-radius:6px;font-size:11px;font-weight:700;font-family:'JetBrains Mono',monospace;}
  .method.post{background:rgba(16,185,129,0.15);color:#34D399;}
  .method.get{background:rgba(96,165,250,0.15);color:#60A5FA;}
  .endpoint-path{font-family:'JetBrains Mono',monospace;font-size:12px;color:var(--text);}

  /* Troubleshoot */
  .trouble-item{border:1px solid rgba(255,180,220,0.1);border-radius:14px;overflow:hidden;margin-bottom:10px;}
  .trouble-q{display:flex;align-items:center;justify-content:space-between;padding:14px 18px;cursor:pointer;font-size:14px;font-weight:500;color:var(--text);background:rgba(255,255,255,0.03);}
  .trouble-q:hover{background:rgba(255,45,107,0.05);}
  .trouble-a{padding:14px 18px;font-size:13px;color:var(--muted);line-height:1.7;background:rgba(0,0,0,0.2);display:none;}
  .trouble-a.open{display:block;}
  .chevron{transition:transform 0.2s;color:var(--petal);}
  .chevron.open{transform:rotate(180deg);}

  @media(max-width:768px){
    .sidebar{display:none;}
    .main{padding:24px 20px;}
    .page-header h1{font-size:32px;}
  }
</style>
</head>
<body>
<div class="layout">

<!-- Sidebar -->
<nav class="sidebar">
  <div class="sidebar-logo">
    <div class="brand">Video Bloom</div>
    <div class="tagline">SETUP GUIDE · v1.0</div>
  </div>

  <div class="nav-section">
    <div class="nav-label">Getting Started</div>
    <a class="nav-item active" href="#prereq" onclick="scrollTo('prereq',this)">
      <div class="nav-num">1</div>Prerequisites
    </a>
    <a class="nav-item" href="#structure" onclick="scrollTo('structure',this)">
      <div class="nav-num">2</div>Project Structure
    </a>
    <a class="nav-item" href="#install" onclick="scrollTo('install',this)">
      <div class="nav-num">3</div>Installation
    </a>
    <a class="nav-item" href="#run" onclick="scrollTo('run',this)">
      <div class="nav-num">4</div>Running the App
    </a>
  </div>

  <div class="nav-section" style="margin-top:12px">
    <div class="nav-label">Advanced</div>
    <a class="nav-item" href="#api" onclick="scrollTo('api',this)">
      <div class="nav-num">5</div>API Reference
    </a>
    <a class="nav-item" href="#cors" onclick="scrollTo('cors',this)">
      <div class="nav-num">6</div>CORS & Security
    </a>
    <a class="nav-item" href="#trouble" onclick="scrollTo('trouble',this)">
      <div class="nav-num">7</div>Troubleshooting
    </a>
    <a class="nav-item" href="#legal" onclick="scrollTo('legal',this)">
      <div class="nav-num">8</div>Legal Notes
    </a>
  </div>
</nav>

<!-- Main -->
<main class="main">

  <div class="page-header">
    <div class="eyebrow">🌸 Complete Installation Manual</div>
    <h1>Setup Guide</h1>
    <p>Everything you need to get Video Bloom running on your machine — from zero to downloading in under 10 minutes.</p>
  </div>

  <!-- STEP 1: PREREQUISITES -->
  <section class="section" id="prereq">
    <div class="section-header">
      <div class="step-circle">1</div>
      <div>
        <div class="section-title">Prerequisites</div>
        <div class="section-desc">Software you need installed before anything else</div>
      </div>
    </div>

    <div class="alert info">
      <div class="alert-icon">💡</div>
      <div class="alert-body">All three tools below are <strong>free and open-source</strong>. If you already have them, skip ahead to Step 3.</div>
    </div>

    <!-- Python -->
    <div class="card">
      <div class="card-title">🐍 Python 3.8+ <span class="badge required">Required</span></div>
      <div class="card-body" style="margin-bottom:16px">The backend server runs on Python. Version 3.8 or higher is needed.</div>
      <div class="os-tabs" id="py-os">
        <button class="os-tab active" onclick="switchOS('py','win',this)">🪟 Windows</button>
        <button class="os-tab" onclick="switchOS('py','mac',this)">🍎 macOS</button>
        <button class="os-tab" onclick="switchOS('py','linux',this)">🐧 Linux</button>
      </div>
      <div class="os-panel active" id="py-win">
        <div class="code-block">
          <div class="code-header"><span class="code-lang">PowerShell / CMD</span><div class="code-dots"><div class="code-dot"></div><div class="code-dot"></div><div class="code-dot"></div></div></div>
          <div class="code-body"><pre><span class="cm"># Check if already installed</span>
python --version

<span class="cm"># If not installed, download from:</span>
<span class="cs">https://www.python.org/downloads/</span>
<span class="cm"># ✅ Tick "Add Python to PATH" during install!</span></pre></div>
        </div>
      </div>
      <div class="os-panel" id="py-mac">
        <div class="code-block">
          <div class="code-header"><span class="code-lang">Terminal</span><div class="code-dots"><div class="code-dot"></div><div class="code-dot"></div><div class="code-dot"></div></div></div>
          <div class="code-body"><pre><span class="cm"># Check if already installed</span>
python3 --version

<span class="cm"># Install via Homebrew (recommended)</span>
brew install python3

<span class="cm"># Or download from python.org</span></pre></div>
        </div>
      </div>
      <div class="os-panel" id="py-linux">
        <div class="code-block">
          <div class="code-header"><span class="code-lang">Terminal</span><div class="code-dots"><div class="code-dot"></div><div class="code-dot"></div><div class="code-dot"></div></div></div>
          <div class="code-body"><pre><span class="cm"># Ubuntu / Debian</span>
sudo apt update && sudo apt install python3 python3-pip -y

<span class="cm"># Fedora / RHEL</span>
sudo dnf install python3 python3-pip -y</pre></div>
        </div>
      </div>
    </div>

    <!-- FFmpeg -->
    <div class="card">
      <div class="card-title">🎬 FFmpeg <span class="badge required">Required</span></div>
      <div class="card-body" style="margin-bottom:16px">FFmpeg handles merging video+audio streams and format conversion. Without it, only pre-merged streams download.</div>
      <div class="os-tabs" id="ff-os">
        <button class="os-tab active" onclick="switchOS('ff','win',this)">🪟 Windows</button>
        <button class="os-tab" onclick="switchOS('ff','mac',this)">🍎 macOS</button>
        <button class="os-tab" onclick="switchOS('ff','linux',this)">🐧 Linux</button>
      </div>
      <div class="os-panel active" id="ff-win">
        <div class="code-block">
          <div class="code-header"><span class="code-lang">PowerShell (Admin)</span><div class="code-dots"><div class="code-dot"></div><div class="code-dot"></div><div class="code-dot"></div></div></div>
          <div class="code-body"><pre><span class="cm"># Option 1 — via winget (easiest)</span>
winget install ffmpeg

<span class="cm"># Option 2 — via Chocolatey</span>
choco install ffmpeg

<span class="cm"># Option 3 — Manual:
# Download from https://ffmpeg.org/download.html
# Extract zip → add bin\ folder to System PATH</span>

<span class="cm"># Verify install</span>
ffmpeg -version</pre></div>
        </div>
      </div>
      <div class="os-panel" id="ff-mac">
        <div class="code-block">
          <div class="code-header"><span class="code-lang">Terminal</span><div class="code-dots"><div class="code-dot"></div><div class="code-dot"></div><div class="code-dot"></div></div></div>
          <div class="code-body"><pre><span class="cm"># Via Homebrew (easiest)</span>
brew install ffmpeg

<span class="cm"># Verify</span>
ffmpeg -version</pre></div>
        </div>
      </div>
      <div class="os-panel" id="ff-linux">
        <div class="code-block">
          <div class="code-header"><span class="code-lang">Terminal</span><div class="code-dots"><div class="code-dot"></div><div class="code-dot"></div><div class="code-dot"></div></div></div>
          <div class="code-body"><pre><span class="cm"># Ubuntu / Debian</span>
sudo apt install ffmpeg -y

<span class="cm"># Fedora</span>
sudo dnf install ffmpeg -y

<span class="cm"># Verify</span>
ffmpeg -version</pre></div>
        </div>
      </div>
    </div>

    <!-- pip -->
    <div class="card">
      <div class="card-title">📦 pip (Python package manager) <span class="badge optional">Usually pre-installed</span></div>
      <div class="card-body" style="margin-bottom:16px">pip comes with Python 3.4+. Just make sure it's up to date.</div>
      <div class="code-block">
        <div class="code-header"><span class="code-lang">Any Terminal</span><div class="code-dots"><div class="code-dot"></div><div class="code-dot"></div><div class="code-dot"></div></div></div>
        <div class="code-body"><pre><span class="cm"># Upgrade pip to latest</span>
python -m pip install --upgrade pip

<span class="cm"># On macOS/Linux you may need</span>
python3 -m pip install --upgrade pip</pre></div>
      </div>
    </div>
  </section>

  <!-- STEP 2: STRUCTURE -->
  <section class="section" id="structure">
    <div class="section-header">
      <div class="step-circle">2</div>
      <div>
        <div class="section-title">Project Structure</div>
        <div class="section-desc">How to organise the files on your machine</div>
      </div>
    </div>

    <div class="card-body" style="margin-bottom:16px;font-size:14px;color:var(--muted)">Create a folder called <strong style="color:var(--text)">videobloom</strong> anywhere (Desktop, Documents, etc.) and place the files like this:</div>

    <div class="file-tree">
<span class="ft-dir">videobloom/</span>
<span class="ft-indent"><span class="ft-dir">backend/</span></span>
<span class="ft-indent2"><span class="ft-file">server.py</span>         <span class="ft-comment"># ← Flask backend (provided)</span></span>
<span class="ft-indent2"><span class="ft-file">requirements.txt</span>  <span class="ft-comment"># ← Python dependencies (provided)</span></span>
<span class="ft-indent2"><span class="ft-dir">downloads/</span>        <span class="ft-comment"># ← Auto-created on first run</span></span>
<span class="ft-indent"><span class="ft-dir">frontend/</span></span>
<span class="ft-indent2"><span class="ft-file">index.html</span>        <span class="ft-comment"># ← The UI you downloaded</span></span>
    </div>

    <div class="alert warn" style="margin-top:16px">
      <div class="alert-icon">⚠️</div>
      <div class="alert-body"><strong>Save the files exactly as shown.</strong> The frontend connects to <code style="background:rgba(255,255,255,0.08);padding:1px 6px;border-radius:4px;font-family:monospace">localhost:5000</code> — if you rename files, the paths still work fine.</div>
    </div>
  </section>

  <!-- STEP 3: INSTALL -->
  <section class="section" id="install">
    <div class="section-header">
      <div class="step-circle">3</div>
      <div>
        <div class="section-title">Installation</div>
        <div class="section-desc">Install Python packages for the backend</div>
      </div>
    </div>

    <ul class="step-list">
      <li class="step-item">
        <div class="step-num">1</div>
        <div class="step-text">Open your terminal (CMD / PowerShell on Windows, Terminal on Mac/Linux)</div>
      </li>
      <li class="step-item">
        <div class="step-num">2</div>
        <div class="step-text"><strong>Navigate into the backend folder:</strong></div>
      </li>
    </ul>

    <div class="code-block" style="margin:10px 0 16px">
      <div class="code-header"><span class="code-lang">Terminal</span><div class="code-dots"><div class="code-dot"></div><div class="code-dot"></div><div class="code-dot"></div></div></div>
      <div class="code-body"><pre><span class="cm"># Windows</span>
cd Desktop\videobloom\backend

<span class="cm"># macOS / Linux</span>
cd ~/Desktop/videobloom/backend</pre></div>
    </div>

    <ul class="step-list">
      <li class="step-item">
        <div class="step-num">3</div>
        <div class="step-text"><strong>(Recommended)</strong> Create a virtual environment to keep packages isolated:</div>
      </li>
    </ul>

    <div class="code-block" style="margin:10px 0 16px">
      <div class="code-header"><span class="code-lang">Terminal</span><div class="code-dots"><div class="code-dot"></div><div class="code-dot"></div><div class="code-dot"></div></div></div>
      <div class="code-body"><pre><span class="cm"># Create venv</span>
python -m venv venv

<span class="cm"># Activate — Windows</span>
venv\Scripts\activate

<span class="cm"># Activate — macOS / Linux</span>
source venv/bin/activate

<span class="cm"># You'll see (venv) in your prompt when active</span></pre></div>
    </div>

    <ul class="step-list">
      <li class="step-item">
        <div class="step-num">4</div>
        <div class="step-text"><strong>Install all dependencies</strong> from requirements.txt:</div>
      </li>
    </ul>

    <div class="code-block" style="margin:10px 0 16px">
      <div class="code-header"><span class="code-lang">Terminal</span><div class="code-dots"><div class="code-dot"></div><div class="code-dot"></div><div class="code-dot"></div></div></div>
      <div class="code-body"><pre>pip install -r requirements.txt

<span class="cm"># This installs:</span>
<span class="cm">#   flask        — web server framework</span>
<span class="cm">#   flask-cors   — allow frontend to call backend</span>
<span class="cm">#   yt-dlp       — the actual YouTube downloader engine</span>

<span class="cm"># Takes about 30–60 seconds on first run</span></pre></div>
    </div>

    <div class="alert success">
      <div class="alert-icon">✅</div>
      <div class="alert-body">You should see <strong>"Successfully installed flask yt-dlp flask-cors..."</strong> — that means it worked!</div>
    </div>
  </section>

  <!-- STEP 4: RUNNING -->
  <section class="section" id="run">
    <div class="section-header">
      <div class="step-circle">4</div>
      <div>
        <div class="section-title">Running the App</div>
        <div class="section-desc">Start the backend then open the frontend</div>
      </div>
    </div>

    <div class="card">
      <div class="card-title">🖥️ Terminal Window 1 — Start the Backend</div>
      <div class="card-body" style="margin-bottom:16px">Make sure you're in the <code style="background:rgba(255,255,255,0.08);padding:1px 6px;border-radius:4px;font-family:monospace">backend/</code> folder with venv activated, then run:</div>
      <div class="code-block">
        <div class="code-header"><span class="code-lang">Terminal</span><div class="code-dots"><div class="code-dot"></div><div class="code-dot"></div><div class="code-dot"></div></div></div>
        <div class="code-body"><pre>python server.py

<span class="cm"># You should see:</span>
<span class="cs"> 🌸 Video Bloom Backend starting on http://localhost:5000</span>
<span class="cs"> * Running on http://0.0.0.0:5000</span>
<span class="cs"> * Press CTRL+C to quit</span></pre></div>
      </div>
    </div>

    <div class="card">
      <div class="card-title">🌐 Open the Frontend</div>
      <div class="card-body" style="margin-bottom:16px">No second terminal needed. Just open the HTML file in your browser:</div>
      <ul class="step-list">
        <li class="step-item">
          <div class="step-num">A</div>
          <div class="step-text">Navigate to your <strong>frontend/</strong> folder in File Explorer / Finder</div>
        </li>
        <li class="step-item">
          <div class="step-num">B</div>
          <div class="step-text">Double-click <strong>index.html</strong> — it opens in your default browser</div>
        </li>
        <li class="step-item">
          <div class="step-num">C</div>
          <div class="step-text">The status dot at the top of the card turns <strong style="color:#4ade80">green</strong> when connected to the backend</div>
        </li>
      </ul>
    </div>

    <div class="card">
      <div class="card-title">🎬 Download Your First Video</div>
      <ul class="step-list" style="margin-top:8px">
        <li class="step-item"><div class="step-num">1</div><div class="step-text">Paste a YouTube URL into the input field</div></li>
        <li class="step-item"><div class="step-num">2</div><div class="step-text">Click <strong>Analyse ✦</strong> — the video title, duration and views will appear</div></li>
        <li class="step-item"><div class="step-num">3</div><div class="step-text">Choose your tab: <strong>Video</strong>, <strong>Audio Only</strong>, or <strong>Subtitles</strong></div></li>
        <li class="step-item"><div class="step-num">4</div><div class="step-text">Pick quality and format, then click <strong>Download Now</strong></div></li>
        <li class="step-item"><div class="step-num">5</div><div class="step-text">Watch the progress bar fill — when done, click <strong>💾 Save File</strong></div></li>
      </ul>
    </div>

    <div class="alert warn">
      <div class="alert-icon">⚠️</div>
      <div class="alert-body"><strong>Keep the terminal open</strong> while using the app. Closing it stops the backend server. Files are saved in <code style="background:rgba(0,0,0,0.3);padding:1px 6px;border-radius:4px;font-family:monospace">backend/downloads/</code> and auto-deleted after 5 minutes.</div>
    </div>
  </section>

  <!-- STEP 5: API -->
  <section class="section" id="api">
    <div class="section-header">
      <div class="step-circle">5</div>
      <div>
        <div class="section-title">API Reference</div>
        <div class="section-desc">All backend endpoints and their parameters</div>
      </div>
    </div>

    <table class="api-table">
      <thead>
        <tr><th>Method</th><th>Endpoint</th><th>Description</th></tr>
      </thead>
      <tbody>
        <tr><td><span class="method get">GET</span></td><td class="endpoint-path">/api/health</td><td>Server health check</td></tr>
        <tr><td><span class="method post">POST</span></td><td class="endpoint-path">/api/info</td><td>Fetch video metadata (no download)</td></tr>
        <tr><td><span class="method post">POST</span></td><td class="endpoint-path">/api/download/video</td><td>Start video download job</td></tr>
        <tr><td><span class="method post">POST</span></td><td class="endpoint-path">/api/download/audio</td><td>Start audio-only download job</td></tr>
        <tr><td><span class="method post">POST</span></td><td class="endpoint-path">/api/download/subtitle</td><td>Extract subtitles/captions</td></tr>
        <tr><td><span class="method get">GET</span></td><td class="endpoint-path">/api/status/&lt;job_id&gt;</td><td>Poll download progress</td></tr>
        <tr><td><span class="method get">GET</span></td><td class="endpoint-path">/api/file/&lt;job_id&gt;</td><td>Download completed file</td></tr>
      </tbody>
    </table>

    <div class="card">
      <div class="card-title">POST /api/download/video — Body Parameters</div>
      <div class="code-block" style="margin-top:12px">
        <div class="code-header"><span class="code-lang">JSON</span><div class="code-dots"><div class="code-dot"></div><div class="code-dot"></div><div class="code-dot"></div></div></div>
        <div class="code-body"><pre>{
  <span class="ck">"url"</span>:     <span class="cs">"https://www.youtube.com/watch?v=..."</span>,  <span class="cm">// required</span>
  <span class="ck">"quality"</span>: <span class="cs">"1080p"</span>,  <span class="cm">// 144p|240p|360p|480p|720p|1080p|1440p|2160p</span>
  <span class="ck">"format"</span>:  <span class="cs">"mp4"</span>     <span class="cm">// mp4|mkv|webm</span>
}</pre></div>
      </div>
    </div>

    <div class="card">
      <div class="card-title">POST /api/download/audio — Body Parameters</div>
      <div class="code-block" style="margin-top:12px">
        <div class="code-header"><span class="code-lang">JSON</span><div class="code-dots"><div class="code-dot"></div><div class="code-dot"></div><div class="code-dot"></div></div></div>
        <div class="code-body"><pre>{
  <span class="ck">"url"</span>:    <span class="cs">"https://www.youtube.com/watch?v=..."</span>,  <span class="cm">// required</span>
  <span class="ck">"kbps"</span>:   <span class="cs">"320"</span>,  <span class="cm">// 64|96|128|192|256|320</span>
  <span class="ck">"format"</span>: <span class="cs">"mp3"</span>   <span class="cm">// mp3|flac|wav|aac|ogg</span>
}</pre></div>
      </div>
    </div>

    <div class="card">
      <div class="card-title">POST /api/download/subtitle — Body Parameters</div>
      <div class="code-block" style="margin-top:12px">
        <div class="code-header"><span class="code-lang">JSON</span><div class="code-dots"><div class="code-dot"></div><div class="code-dot"></div><div class="code-dot"></div></div></div>
        <div class="code-body"><pre>{
  <span class="ck">"url"</span>:            <span class="cs">"https://www.youtube.com/watch?v=..."</span>,
  <span class="ck">"langs"</span>:          [<span class="cs">"en"</span>, <span class="cs">"hi"</span>],  <span class="cm">// language codes array</span>
  <span class="ck">"format"</span>:         <span class="cs">"srt"</span>,          <span class="cm">// srt|vtt|ass|txt</span>
  <span class="ck">"auto_generated"</span>: <span class="cn">true</span>           <span class="cm">// use AI captions as fallback</span>
}</pre></div>
      </div>
    </div>
  </section>

  <!-- STEP 6: CORS -->
  <section class="section" id="cors">
    <div class="section-header">
      <div class="step-circle">6</div>
      <div>
        <div class="section-title">CORS & Security</div>
        <div class="section-desc">Keeping your local server safe</div>
      </div>
    </div>

    <div class="alert danger">
      <div class="alert-icon">🔒</div>
      <div class="alert-body"><strong>The default config allows all origins (*) for local use only.</strong> Never expose port 5000 to the internet without adding authentication. This tool is for personal, local use.</div>
    </div>

    <div class="card">
      <div class="card-title">Restrict to localhost only (recommended)</div>
      <div class="card-body" style="margin-bottom:14px">In <code style="background:rgba(255,255,255,0.08);padding:1px 6px;border-radius:4px;font-family:monospace">server.py</code>, line 13, change to:</div>
      <div class="code-block">
        <div class="code-header"><span class="code-lang">Python</span><div class="code-dots"><div class="code-dot"></div><div class="code-dot"></div><div class="code-dot"></div></div></div>
        <div class="code-body"><pre><span class="cm"># Replace this line:</span>
CORS(app, origins=[<span class="cs">"*"</span>])

<span class="cm"># With this (localhost only):</span>
CORS(app, origins=[<span class="cs">"null"</span>, <span class="cs">"http://localhost"</span>, <span class="cs">"http://127.0.0.1"</span>])</pre></div>
      </div>
    </div>

    <div class="card">
      <div class="card-title">Change the download port</div>
      <div class="card-body" style="margin-bottom:14px">If port 5000 is taken, change it in <code style="background:rgba(255,255,255,0.08);padding:1px 6px;border-radius:4px;font-family:monospace">server.py</code> (last line) and in <code style="background:rgba(255,255,255,0.08);padding:1px 6px;border-radius:4px;font-family:monospace">index.html</code> (top of script, <code style="background:rgba(255,255,255,0.08);padding:1px 6px;border-radius:4px;font-family:monospace">const API</code>):</div>
      <div class="code-block">
        <div class="code-header"><span class="code-lang">Python — server.py last line</span><div class="code-dots"><div class="code-dot"></div><div class="code-dot"></div><div class="code-dot"></div></div></div>
        <div class="code-body"><pre>app.run(host=<span class="cs">"0.0.0.0"</span>, port=<span class="cn">8080</span>, ...)</pre></div>
      </div>
      <div class="code-block">
        <div class="code-header"><span class="code-lang">JS — index.html</span><div class="code-dots"><div class="code-dot"></div><div class="code-dot"></div><div class="code-dot"></div></div></div>
        <div class="code-body"><pre><span class="ck">const</span> API = <span class="cs">"http://localhost:8080/api"</span>;</pre></div>
      </div>
    </div>
  </section>

  <!-- STEP 7: TROUBLESHOOT -->
  <section class="section" id="trouble">
    <div class="section-header">
      <div class="step-circle">7</div>
      <div>
        <div class="section-title">Troubleshooting</div>
        <div class="section-desc">Common issues and how to fix them</div>
      </div>
    </div>

    <div class="trouble-item">
      <div class="trouble-q" onclick="toggleTrouble(this)">
        <span>🔴 Status dot stays red / "Backend offline"</span>
        <span class="chevron">▼</span>
      </div>
      <div class="trouble-a">
        The backend isn't running. Make sure you ran <code>python server.py</code> in the <strong>backend/</strong> folder and the terminal shows "Running on http://0.0.0.0:5000". Also check your firewall isn't blocking port 5000.
      </div>
    </div>

    <div class="trouble-item">
      <div class="trouble-q" onclick="toggleTrouble(this)">
        <span>❌ "ModuleNotFoundError: No module named 'flask'"</span>
        <span class="chevron">▼</span>
      </div>
      <div class="trouble-a">
        You forgot to install requirements or your venv isn't activated. Run: <code>pip install -r requirements.txt</code> inside the backend folder with venv activated.
      </div>
    </div>

    <div class="trouble-item">
      <div class="trouble-q" onclick="toggleTrouble(this)">
        <span>❌ "ffmpeg not found" or merging fails</span>
        <span class="chevron">▼</span>
      </div>
      <div class="trouble-a">
        FFmpeg isn't installed or isn't in your PATH. Run <code>ffmpeg -version</code> in a new terminal. If it fails, re-install FFmpeg and restart your terminal. On Windows, make sure the <code>bin\</code> folder is in your System PATH environment variable.
      </div>
    </div>

    <div class="trouble-item">
      <div class="trouble-q" onclick="toggleTrouble(this)">
        <span>⚠️ Download fails for 4K / 1440p quality</span>
        <span class="chevron">▼</span>
      </div>
      <div class="trouble-a">
        High-resolution streams require FFmpeg to merge separate video and audio tracks. Confirm <code>ffmpeg -version</code> works. Also, some videos don't have 4K available — the downloader will fall back to the best available quality automatically.
      </div>
    </div>

    <div class="trouble-item">
      <div class="trouble-q" onclick="toggleTrouble(this)">
        <span>⚠️ "No subtitles found" error</span>
        <span class="chevron">▼</span>
      </div>
      <div class="trouble-a">
        Not all videos have subtitles. Enable <strong>Auto-generated</strong> toggle in the Subtitles tab — this uses YouTube's AI transcription as a fallback. Music videos and foreign-language content may have limited caption availability.
      </div>
    </div>

    <div class="trouble-item">
      <div class="trouble-q" onclick="toggleTrouble(this)">
        <span>🐍 "python" not found on macOS/Linux</span>
        <span class="chevron">▼</span>
      </div>
      <div class="trouble-a">
        On macOS/Linux, use <code>python3</code> and <code>pip3</code> instead of <code>python</code> and <code>pip</code>. Or create an alias: <code>alias python=python3</code>
      </div>
    </div>

    <div class="trouble-item">
      <div class="trouble-q" onclick="toggleTrouble(this)">
        <span>🔄 yt-dlp fails / "Sign in" errors</span>
        <span class="chevron">▼</span>
      </div>
      <div class="trouble-a">
        YouTube frequently changes its API. Update yt-dlp: <code>pip install --upgrade yt-dlp</code>. This usually fixes most download failures within minutes of them being reported.
      </div>
    </div>

    <div class="trouble-item">
      <div class="trouble-q" onclick="toggleTrouble(this)">
        <span>🌐 CORS error in browser console</span>
        <span class="chevron">▼</span>
      </div>
      <div class="trouble-a">
        Open <code>index.html</code> directly as a file (file:// protocol), not from a web server. The backend CORS config already allows file:// origins. If you serve the frontend with a local HTTP server, add that origin to the CORS list in server.py.
      </div>
    </div>
  </section>

  <!-- STEP 8: LEGAL -->
  <section class="section" id="legal">
    <div class="section-header">
      <div class="step-circle">8</div>
      <div>
        <div class="section-title">Legal Notes</div>
        <div class="section-desc">Please read before using</div>
      </div>
    </div>

    <div class="alert danger">
      <div class="alert-icon">⚖️</div>
      <div class="alert-body">
        <strong>This tool is for personal, educational use only.</strong><br><br>
        • Only download videos you have permission to download<br>
        • Downloading copyrighted content for redistribution is illegal<br>
        • YouTube's Terms of Service prohibit downloading without explicit permission<br>
        • Use this only for content you own, content with Creative Commons licenses, or content where the creator has granted permission<br><br>
        <strong>The developers are not responsible for misuse of this software.</strong>
      </div>
    </div>

    <div class="card">
      <div class="card-title">✅ Safe uses</div>
      <div class="card-body">Downloading your own uploaded videos, CC-licensed content, videos from creators who explicitly allow downloads, offline viewing of content you are subscribed to.</div>
    </div>
  </section>

</main>
</div>

<script>
function switchOS(group, os, btn){
  const panels = document.querySelectorAll(`[id^="${group}-"]`);
  const tabs = btn.parentElement.querySelectorAll('.os-tab');
  panels.forEach(p => p.classList.remove('active'));
  tabs.forEach(t => t.classList.remove('active'));
  document.getElementById(`${group}-${os}`).classList.add('active');
  btn.classList.add('active');
}

function scrollTo(id, el){
  event.preventDefault();
  document.getElementById(id).scrollIntoView({behavior:'smooth'});
  document.querySelectorAll('.nav-item').forEach(n=>n.classList.remove('active'));
  el.classList.add('active');
}

function toggleTrouble(el){
  const answer = el.nextElementSibling;
  const chevron = el.querySelector('.chevron');
  answer.classList.toggle('open');
  chevron.classList.toggle('open');
}

// Active section highlighting on scroll
const sections = ['prereq','structure','install','run','api','cors','trouble','legal'];
const navItems = document.querySelectorAll('.nav-item');
window.addEventListener('scroll', () => {
  let current = '';
  sections.forEach(id => {
    const el = document.getElementById(id);
    if(el && el.getBoundingClientRect().top < 120) current = id;
  });
  if(current){
    navItems.forEach(n => {
      n.classList.toggle('active', n.getAttribute('href') === '#'+current);
    });
  }
});
</script>
</body>
</html>
