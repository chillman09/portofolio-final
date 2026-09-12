// ---------- Entry & Boot ----------
const site = document.getElementById('site');
const bgAudio = document.getElementById('bgAudio');
const bgVideo = document.getElementById('backgroundVideo');
const presenceDot = document.getElementById('presenceDot');
const musicPlayer = document.getElementById('musicPlayer');
const mpToggle = document.getElementById('mpToggle');
const mpFill = document.getElementById('mpFill');
const mpTrack = document.getElementById('mpTrack');
const mpCurrent = document.getElementById('mpCurrent');
const mpDuration = document.getElementById('mpDuration');
const mpDisc = document.getElementById('mpDisc');
const mpEq = document.getElementById('mpEq');
const mpVolBtn = document.getElementById('mpVolBtn');
const mpVolPop = document.getElementById('mpVolPop');
const mpVolSlider = document.getElementById('mpVolSlider');
const TARGET_VOLUME = 0.6;

document.addEventListener('portfolio:enter', enterSite, { once: true });

function enterSite() {
  bgVideo.play().catch(() => {});
  bgAudio.volume = 0;
  bgAudio.play().catch(() => {});
  setupAudioReactivity();

  let vol = 0;
  const fadeIn = setInterval(() => {
    vol += 0.05;
    if (vol >= TARGET_VOLUME) {
      vol = TARGET_VOLUME;
      clearInterval(fadeIn);
    }
    bgAudio.volume = vol;
  }, 50);

  setTimeout(() => {
    site.style.display = 'block';
    musicPlayer.style.display = 'flex';
    musicPlayer.classList.add('reveal-in');
    runBootSequence();
    fetchDiscordPresence();
    bumpViewCounter();
  }, 400);
}

function runBootSequence() {
  document.getElementById('avatarCol').classList.add('reveal-in');
  stampInName();
  document.getElementById('roleText').classList.add('reveal-in');
  document.querySelector('.socials').classList.add('reveal-in');
  document.getElementById('hud').classList.add('reveal-in');
  document.getElementById('viewCounter').classList.add('reveal-in');
  startHud();
  document.getElementById('scrollCue').classList.add('reveal-in');
}

function stampInName() {
  const nameEl = document.getElementById('nameText');
  const text = nameEl.textContent.trim();
  nameEl.textContent = '';
  nameEl.classList.add('lettered');

  [...text].forEach((ch, i) => {
    const span = document.createElement('span');
    span.className = 'ch';
    span.textContent = ch === ' ' ? '\u00A0' : ch;
    span.style.setProperty('--d', (i * 0.045) + 's');
    span.style.setProperty('--r', (Math.random() * 16 - 8) + 'deg');
    nameEl.appendChild(span);
  });

  const chars = nameEl.querySelectorAll('.ch');
  const hasFine = window.matchMedia('(pointer: fine)').matches;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (hasFine && !reducedMotion) {
    window.addEventListener('mousemove', (e) => {
      chars.forEach(span => {
        const rect = span.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        const dist = Math.hypot(e.clientX - cx, e.clientY - cy);
        const radius = 120;
        if (dist < radius) {
          const pull = (1 - dist / radius) * 6;
          const angle = Math.atan2(cy - e.clientY, cx - e.clientX);
          span.style.transform = `translate(${Math.cos(angle) * pull}px, ${Math.sin(angle) * pull}px)`;
        } else {
          span.style.transform = '';
        }
      });
    });
  }

  if (!reducedMotion) {
    setTimeout(() => nameEl.classList.add('glitch-active'), (text.length * 45) + 700);
  }
}

// ---------- HUD ticker ----------
const bootTime = Date.now();
const HUD_LINES = () => [
  'SYSTEMS ONLINE',
  'TARGET: VISITOR.EXE — LOCKED',
  `UPTIME: ${formatUptime(Date.now() - bootTime)}`,
  'SCANNING SKILLSET...',
  'AWAITING INPUT'
];

function formatUptime(ms) {
  const totalSec = Math.floor(ms / 1000);
  const m = Math.floor(totalSec / 60).toString().padStart(2, '0');
  const s = (totalSec % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

function startHud() {
  const hudText = document.getElementById('hudText');
  let i = 0;
  cycleHud();

  function cycleHud() {
    const lines = HUD_LINES();
    const line = lines[i % lines.length];
    i++;
    typeText(hudText, line, () => {
      setTimeout(() => {
        eraseText(hudText, () => setTimeout(cycleHud, 300));
      }, 2200);
    });
  }
}

function eraseText(el, done) {
  function tick() {
    if (el.textContent.length > 0) {
      el.textContent = el.textContent.slice(0, -1);
      setTimeout(tick, 12);
    } else if (done) {
      done();
    }
  }
  tick();
}

document.getElementById('scrollCue').addEventListener('click', () => {
  document.getElementById('skillsSection').scrollIntoView({ behavior: 'smooth' });
});

// ---------- Session view counter ----------
function bumpViewCounter() {
  const key = 'gunpoint_views';
  const sessionKey = 'gunpoint_session_counted';
  let count = parseInt(localStorage.getItem(key) || '0', 10);

  if (!sessionStorage.getItem(sessionKey)) {
    count += 1;
    localStorage.setItem(key, String(count));
    sessionStorage.setItem(sessionKey, '1');
  }

  document.getElementById('vcCount').textContent = count;
}

// ---------- Music Player ----------
let mpPlaying = true;

const mpPlayIcon = document.querySelector('.mp-icon-play');
const mpPauseIcon = document.querySelector('.mp-icon-pause');

function setPlayerState(playing) {
  mpPlaying = playing;
  musicPlayer.classList.toggle('paused', !playing);
  if (mpPlayIcon && mpPauseIcon) {
    mpPlayIcon.hidden = playing;
    mpPauseIcon.hidden = !playing;
  }
}

function togglePlayback() {
  if (mpPlaying) {
    bgAudio.pause();
    setPlayerState(false);
  } else {
    bgAudio.play().catch(() => {});
    setPlayerState(true);
  }
}

mpToggle.addEventListener('click', togglePlayback);
if (mpDisc) mpDisc.addEventListener('click', togglePlayback);

bgAudio.addEventListener('loadedmetadata', () => {
  mpDuration.textContent = formatMMSS(bgAudio.duration);
});

bgAudio.addEventListener('timeupdate', () => {
  if (bgAudio.duration) {
    mpFill.style.width = (bgAudio.currentTime / bgAudio.duration * 100) + '%';
    mpCurrent.textContent = formatMMSS(bgAudio.currentTime);
  }
});

mpTrack.addEventListener('click', (e) => {
  const rect = mpTrack.getBoundingClientRect();
  const ratio = (e.clientX - rect.left) / rect.width;
  if (bgAudio.duration) bgAudio.currentTime = ratio * bgAudio.duration;
});

function formatMMSS(sec) {
  if (!isFinite(sec)) return '0:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

// ---------- Hire Me modal ----------
const hireBtn = document.getElementById('hireBtn');
const hireModal = document.getElementById('hireModal');
const hireClose = document.getElementById('hireClose');
const hireForm = document.getElementById('hireForm');
const hireSubmit = document.getElementById('hireSubmit');
const hireStatus = document.getElementById('hireStatus');
const hireSubmitLabel = hireSubmit ? hireSubmit.querySelector('.hire-submit-label') : null;

let hireLastFocused = null;

function openHireModal() {
  hireLastFocused = document.activeElement;
  hireModal.hidden = false;
  requestAnimationFrame(() => hireModal.classList.add('open'));
  document.body.style.overflow = 'hidden';
  setTimeout(() => document.getElementById('hireType')?.focus(), 260);
  document.addEventListener('keydown', onHireKeydown);
}

function closeHireModal() {
  hireModal.classList.remove('open');
  document.body.style.overflow = '';
  document.removeEventListener('keydown', onHireKeydown);
  setTimeout(() => {
    hireModal.hidden = true;
    if (hireLastFocused) hireLastFocused.focus();
  }, 260);
}

function onHireKeydown(e) {
  if (e.key === 'Escape') closeHireModal();
}

if (hireBtn) hireBtn.addEventListener('click', openHireModal);
if (hireClose) hireClose.addEventListener('click', closeHireModal);
if (hireModal) {
  hireModal.addEventListener('click', (e) => {
    if (e.target === hireModal) closeHireModal();
  });
}

function setHireStatus(text, kind) {
  if (!hireStatus) return;
  hireStatus.textContent = text;
  hireStatus.className = 'hire-status' + (kind ? ' ' + kind : '');
}

if (hireForm) {
  hireForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const contact = document.getElementById('hireContact').value.trim();
    const details = document.getElementById('hireDetails').value.trim();
    const projectType = document.getElementById('hireType').value;
    const hp = document.getElementById('hireHp').value;

    if (!contact || !details) {
      setHireStatus('Fill in your contact info and project details.', 'error');
      return;
    }

    hireSubmit.disabled = true;
    setHireStatus('', '');
    if (hireSubmitLabel) hireSubmitLabel.textContent = 'TRANSMITTING...';

    try {
      const res = await fetch('/api/hire', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectType, contact, details, hp })
      });
      const data = await res.json().catch(() => ({}));

      if (res.ok && data.ok) {
        if (hireSubmitLabel) hireSubmitLabel.textContent = 'REQUEST_SENT ✓';
        setHireStatus('Got it — I\u2019ll get back to you soon.', 'success');
        hireForm.reset();
        setTimeout(closeHireModal, 1800);
      } else {
        throw new Error(data.error || 'Something went wrong');
      }
    } catch (err) {
      if (hireSubmitLabel) hireSubmitLabel.textContent = 'SEND_REQUEST';
      hireSubmit.disabled = false;
      setHireStatus('Failed to send — try again, or hit up a social link above.', 'error');
    }
  });
}

// ---------- Volume popover ----------
const mpVolWrap = document.querySelector('.mp-vol-wrap');

if (mpVolBtn && mpVolWrap && mpVolSlider) {
  mpVolSlider.value = Math.round(TARGET_VOLUME * 100);

  mpVolBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    mpVolWrap.classList.toggle('open');
  });

  document.addEventListener('click', (e) => {
    if (!mpVolWrap.contains(e.target)) mpVolWrap.classList.remove('open');
  });

  mpVolSlider.addEventListener('input', () => {
    bgAudio.volume = mpVolSlider.value / 100;
  });
}

// ---------- Reactive EQ (Web Audio API) ----------
let audioCtx, analyser, freqData, eqBars, reactivityLive = false;

function setupAudioReactivity() {
  if (audioCtx) {
    if (audioCtx.state === 'suspended') audioCtx.resume().catch(() => {});
    return;
  }
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    audioCtx = new Ctx();
    const source = audioCtx.createMediaElementSource(bgAudio);
    analyser = audioCtx.createAnalyser();
    analyser.fftSize = 64;
    analyser.smoothingTimeConstant = 0.75;
    source.connect(analyser);
    analyser.connect(audioCtx.destination);
    freqData = new Uint8Array(analyser.frequencyBinCount);
    eqBars = mpEq ? [...mpEq.querySelectorAll('span')] : [];
    if (mpEq) mpEq.classList.remove('css-fallback');
    reactivityLive = true;
    drawEq();
  } catch (err) {
    // Web Audio unavailable/blocked — fall back to the canned CSS pulse animation
    if (mpEq) mpEq.classList.add('css-fallback');
  }
}

function drawEq() {
  if (!reactivityLive) return;
  requestAnimationFrame(drawEq);
  if (!analyser || musicPlayer.classList.contains('paused')) return;

  analyser.getByteFrequencyData(freqData);
  const bucketSize = Math.floor(freqData.length / eqBars.length);

  eqBars.forEach((bar, i) => {
    let sum = 0;
    const start = i * bucketSize;
    for (let j = start; j < start + bucketSize; j++) sum += freqData[j];
    const avg = sum / bucketSize;
    const pct = Math.max(12, Math.min(100, (avg / 255) * 100 * 1.3));
    bar.style.height = pct + '%';
  });
}

// ---------- Reticle Cursor ----------
const glow = document.getElementById('cursorGlow');
const hasFinePointer = window.matchMedia('(pointer: fine)').matches;
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
const shouldPauseVideo = prefersReducedMotion || connection?.saveData || ['slow-2g', '2g'].includes(connection?.effectiveType);

function updateVideoPlayback() {
  if (document.hidden || shouldPauseVideo) {
    bgVideo.pause();
    return;
  }
  bgVideo.play().catch(() => {});
}

document.addEventListener('visibilitychange', updateVideoPlayback);
if (shouldPauseVideo) bgVideo.pause();

if (hasFinePointer && !prefersReducedMotion && glow) {
  let targetX = window.innerWidth / 2, targetY = window.innerHeight / 2;
  let curX = targetX, curY = targetY;

  window.addEventListener('mousemove', (e) => {
    targetX = e.clientX;
    targetY = e.clientY;
    glow.classList.add('active');
  });
  window.addEventListener('mouseleave', () => glow.classList.remove('active'));

  document.addEventListener('mouseover', (e) => {
    if (e.target.closest('a, button, .social-link')) glow.classList.add('locked');
  });
  document.addEventListener('mouseout', (e) => {
    if (e.target.closest('a, button, .social-link')) glow.classList.remove('locked');
  });

  function animateGlow() {
    curX += (targetX - curX) * 0.18;
    curY += (targetY - curY) * 0.18;
    glow.style.transform = `translate3d(${curX}px, ${curY}px, 0) translate(-50%, -50%)`;
    requestAnimationFrame(animateGlow);
  }
  animateGlow();
}

// ---------- Click Impact Effect ----------
const impactLayer = document.getElementById('impactLayer');

document.addEventListener('click', (e) => {
  if (impactLayer) spawnImpact(e.clientX, e.clientY);
});

function spawnImpact(x, y) {
  const count = 10;
  const fragment = document.createDocumentFragment();
  for (let i = 0; i < count; i++) {
    const line = document.createElement('div');
    line.className = 'impact-line' + (Math.random() < 0.3 ? ' red' : '');
    const angle = (360 / count) * i + (Math.random() * 12 - 6);
    const len = 35 + Math.random() * 35;
    line.style.left = `${x}px`;
    line.style.top = `${y}px`;
    line.style.height = `${len}px`;
    line.style.transform = `rotate(${angle}deg)`;
    fragment.appendChild(line);
    setTimeout(() => line.remove(), 550);
  }
  impactLayer.appendChild(fragment);
}

// ---------- Scroll Reveal ----------
const revealEls = document.querySelectorAll('[data-reveal]');
const sectionObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('in-view');
      if (entry.target.id === 'skillsSection') {
        runTerminal();
        const rect = entry.target.getBoundingClientRect();
        spawnImpact(rect.left + rect.width / 2, rect.top + 60);
        sectionObserver.unobserve(entry.target);
      }
    }
  });
}, { threshold: 0.2 });
revealEls.forEach(el => sectionObserver.observe(el));

// ---------- Terminal Skills Logic ----------
const SKILL_DATA = [
  { type: 'category', text: '[infrastructure]' },
  { type: 'skill', label: 'linux administration', level: 100, tag: 'expert' },
  { type: 'skill', label: 'nginx & reverse proxies', level: 80, tag: 'advanced' },
  { type: 'skill', label: 'cloudflare tunnels & dns', level: 70, tag: 'advanced' },
  { type: 'skill', label: 'systemd services', level: 80, tag: 'advanced' },
  { type: 'blank' },
  { type: 'category', text: '[development]' },
  { type: 'skill', label: 'python', level: 90, tag: 'advanced' },
  { type: 'skill', label: 'javascript', level: 80, tag: 'advanced' },
  { type: 'skill', label: 'bash scripting', level: 100, tag: 'expert' },
  { type: 'skill', label: 'rest apis', level: 80, tag: 'advanced' },
  { type: 'blank' },
  { type: 'category', text: '[hosting & ops]' },
  { type: 'skill', label: 'game server hosting', level: 90, tag: 'advanced' },
  { type: 'skill', label: 'media & streaming servers', level: 100, tag: 'expert' },
  { type: 'skill', label: 'automation pipelines', level: 80, tag: 'advanced' },
  { type: 'skill', label: 'self-hosted infra', level: 100, tag: 'expert' },
];

// ---------- Projects ----------
const PROJECT_DATA = [
  {
    name: 'Minecraft AFK Bot + Web UI',
    desc: 'A Minecraft AFK bot with a full web dashboard to control it — start/stop, view status, and manage settings from the browser instead of the terminal.',
    tags: ['node.js', 'mineflayer', 'web ui'],
    link: 'https://github.com/chillman09/minecraft-afk-bot'
  }
];

const SCRAMBLE_CHARS = '!<>-_\\/[]{}—=+*^?#$%&01';

function scrambleReveal(el, finalText, delayMs) {
  el.setAttribute('data-text', finalText);
  const len = finalText.length;
  const revealFrame = 2; // frames per character lock-in
  const totalFrames = len * revealFrame + 10;
  let frame = 0;

  function tick() {
    let out = '';
    for (let i = 0; i < len; i++) {
      const lockFrame = i * revealFrame;
      if (frame >= lockFrame + 8) {
        out += finalText[i];
      } else if (frame >= lockFrame) {
        out += SCRAMBLE_CHARS[Math.floor(Math.random() * SCRAMBLE_CHARS.length)];
      } else {
        out += '\u00A0';
      }
    }
    el.textContent = out;
    frame++;
    if (frame <= totalFrames) {
      requestAnimationFrame(tick);
    } else {
      el.textContent = finalText;
    }
  }

  setTimeout(() => requestAnimationFrame(tick), delayMs);
}

let projectsRendered = false;

function renderProjects() {
  if (projectsRendered) return;
  projectsRendered = true;

  const grid = document.getElementById('projectsGrid');
  if (!grid) return;
  grid.innerHTML = '';

  PROJECT_DATA.forEach((p, i) => {
    const delay = i * 0.15;
    const entry = document.createElement('div');
    entry.className = 'project-entry';
    entry.style.animationDelay = delay + 's';

    ['tl', 'tr', 'bl', 'br'].forEach(pos => {
      const c = document.createElement('div');
      c.className = 'corner ' + pos;
      entry.appendChild(c);
    });

    const index = document.createElement('div');
    index.className = 'project-index';
    index.textContent = String(i + 1).padStart(2, '0');
    entry.appendChild(index);

    const body = document.createElement('div');
    body.className = 'project-body';

    const title = document.createElement('h3');
    title.className = 'project-title';
    body.appendChild(title);
    scrambleReveal(title, p.name, delay * 1000 + 250);

    const desc = document.createElement('p');
    desc.className = 'project-desc';
    desc.textContent = p.desc;
    body.appendChild(desc);

    const meta = document.createElement('div');
    meta.className = 'project-meta';

    if (p.tags && p.tags.length) {
      const tags = document.createElement('div');
      tags.className = 'project-tags';
      p.tags.forEach(t => {
        const span = document.createElement('span');
        span.textContent = t;
        tags.appendChild(span);
      });
      meta.appendChild(tags);
    }

    if (p.link) {
      const link = document.createElement('a');
      link.className = 'project-link';
      link.href = p.link;
      link.target = '_blank';
      link.rel = 'noopener';
      link.textContent = 'view repo →';
      meta.appendChild(link);
    }

    body.appendChild(meta);
    entry.appendChild(body);
    grid.appendChild(entry);
  });
}

let terminalRan = false;

function runTerminal() {
  if (terminalRan) return;
  terminalRan = true;

  const body = document.getElementById('terminalBody');
  body.innerHTML = '';

  const promptLine = document.createElement('div');
  promptLine.className = 't-line t-prompt';
  body.appendChild(promptLine);

  typeText(promptLine, 'root@asta:~$ cat skills.log', () => {
    setTimeout(renderSkillsOutput, 150);
  });
}

function renderSkillsOutput() {
  const body = document.getElementById('terminalBody');
  let index = 0;

  function printNext() {
    if (index >= SKILL_DATA.length) {
      const cursorLine = document.createElement('div');
      cursorLine.className = 't-line';
      cursorLine.innerHTML = '<span class="cursor"></span>';
      body.appendChild(cursorLine);
      setTimeout(renderProjects, 350);
      return;
    }

    const item = SKILL_DATA[index++];

    if (item.type === 'blank') {
      const el = document.createElement('div');
      el.className = 't-blank';
      body.appendChild(el);
      setTimeout(printNext, 40);
      return;
    }

    if (item.type === 'category') {
      const el = document.createElement('div');
      el.className = 't-line t-category';
      el.textContent = item.text;
      body.appendChild(el);
      setTimeout(printNext, 60);
      return;
    }

    if (item.type === 'skill') {
      const el = document.createElement('div');
      el.className = 't-skill';

      const labelSpan = document.createElement('span');
      labelSpan.className = 't-skill-label';
      labelSpan.textContent = item.label;
      el.appendChild(labelSpan);

      const barTrack = document.createElement('div');
      barTrack.className = 't-bar-track';
      const barFill = document.createElement('div');
      barFill.className = 't-bar-fill';
      barTrack.appendChild(barFill);
      el.appendChild(barTrack);

      const levelSpan = document.createElement('span');
      levelSpan.className = 't-level';
      levelSpan.textContent = item.tag;
      el.appendChild(levelSpan);

      body.appendChild(el);

      requestAnimationFrame(() => {
        setTimeout(() => {
          barFill.style.width = item.level + '%';
        }, 50);
      });

      setTimeout(printNext, 50);
    }
  }

  printNext();
}

function typeText(el, text, done) {
  let idx = 0;
  el.textContent = '';
  function tick() {
    if (idx < text.length) {
      el.textContent += text[idx];
      idx++;
      setTimeout(tick, 20 + Math.random() * 15);
    } else if (done) {
      done();
    }
  }
  tick();
}

// ---------- Live Discord Status (Lanyard) ----------
function fetchDiscordPresence() {
  const DISCORD_ID = '1354472117646786763';
  if (!DISCORD_ID) {
    if (presenceDot) presenceDot.className = 'presence idle';
    return;
  }

  fetch(`https://api.lanyard.rest/v1/users/${DISCORD_ID}`)
    .then(res => res.json())
    .then(data => {
      if (data.success && presenceDot) {
        const status = data.data.discord_status;
        presenceDot.className = `presence ${status}`;
      }
    })
    .catch(() => {});
}

// ---------- Ambient particles (ash/ember drift) ----------
const pCanvas = document.getElementById('particles');
const pCtx = pCanvas.getContext('2d');
let pw, ph;

function resizeParticles() {
  pw = pCanvas.width = window.innerWidth;
  ph = pCanvas.height = window.innerHeight;
}
window.addEventListener('resize', resizeParticles);
resizeParticles();

const flecks = [];
const FLECK_COUNT = window.innerWidth < 640 ? 25 : 45;
for (let i = 0; i < FLECK_COUNT; i++) {
  flecks.push({
    x: Math.random() * pw,
    y: Math.random() * ph,
    r: 0.6 + Math.random() * 1.6,
    speed: 0.15 + Math.random() * 0.35,
    drift: (Math.random() - 0.5) * 0.25,
    flicker: Math.random() * Math.PI * 2,
    isEmber: Math.random() < 0.25
  });
}

function drawParticles() {
  pCtx.clearRect(0, 0, pw, ph);

  flecks.forEach(f => {
    f.y -= f.speed;
    f.x += f.drift + Math.sin((Date.now() / 1000) + f.flicker) * 0.2;
    if (f.y < -6) { f.y = ph + 6; f.x = Math.random() * pw; }
    if (f.x < -6) f.x = pw + 6;
    if (f.x > pw + 6) f.x = -6;

    const flick = 0.5 + Math.sin((Date.now() / 400) + f.flicker) * 0.5;
    pCtx.globalAlpha = 0.25 + flick * 0.35;
    pCtx.fillStyle = f.isEmber ? '#C81E2C' : '#F2EFE6';
    pCtx.beginPath();
    pCtx.arc(f.x, f.y, f.r, 0, Math.PI * 2);
    pCtx.fill();
  });
  pCtx.globalAlpha = 1;

  requestAnimationFrame(drawParticles);
}

if (!prefersReducedMotion) drawParticles();