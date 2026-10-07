const $ = (id) => document.getElementById(id);
const root = document.documentElement;
const bg = $('bg'), music = $('music'), player = $('player');
const TARGET_VOLUME = 0.6;

/* ---------- Background video: respect reduced motion and data saver ---------- */
const conn = navigator.connection;
const calm = matchMedia('(prefers-reduced-motion: reduce)').matches || conn?.saveData || ['slow-2g', '2g'].includes(conn?.effectiveType);
if (calm) bg.pause();
document.addEventListener('visibilitychange', () => {
  if (document.hidden || calm) bg.pause(); else bg.play().catch(() => {});
});

/* ---------- Entry gate (needed so the browser lets the music start) ---------- */
const gate = $('enter');
gate.focus();
gate.addEventListener('click', () => {
  gate.classList.add('gone');
  root.classList.add('entered');
  music.volume = 0;
  music.play().then(() => { setupEq(); fadeIn(); }).catch(() => setPlaying(false));
  fetchPresence();
}, { once: true });

function fadeIn() {
  let v = 0;
  const t = setInterval(() => {
    v = Math.min(v + 0.05, +$('vol').value / 100);
    music.volume = v;
    if (v >= +$('vol').value / 100) clearInterval(t);
  }, 50);
}

/* ---------- Music player ---------- */
const PAUSE = 'M7 5h3.5v14H7zM13.5 5H17v14h-3.5z', PLAY = 'M8 5v14l11-7z';
const seek = $('seek'), vol = $('vol');
const fmt = (s) => isFinite(s) ? `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}` : '0:00';
const paint = (el) => el.style.setProperty('--p', (el.value / el.max * 100) + '%');

function setPlaying(on) {
  player.classList.toggle('paused', !on);
  $('ppIcon').setAttribute('d', on ? PAUSE : PLAY);
  $('pp').setAttribute('aria-label', on ? 'Pause music' : 'Play music');
}
$('pp').addEventListener('click', () => {
  if (music.paused) music.play().then(() => setPlaying(true)).catch(() => {});
  else { music.pause(); setPlaying(false); }
});
music.addEventListener('loadedmetadata', () => { $('dur').textContent = fmt(music.duration); });
music.addEventListener('timeupdate', () => {
  if (!music.duration) return;
  seek.value = music.currentTime / music.duration * 100;
  paint(seek);
  $('cur').textContent = fmt(music.currentTime);
});
seek.addEventListener('input', () => { if (music.duration) music.currentTime = seek.value / 100 * music.duration; paint(seek); });

vol.value = TARGET_VOLUME * 100; paint(vol);
vol.addEventListener('input', () => { music.volume = vol.value / 100; music.muted = false; paint(vol); });
$('mute').addEventListener('click', () => {
  music.muted = !music.muted;
  $('wave').style.display = music.muted ? 'none' : '';
  $('mute').setAttribute('aria-label', music.muted ? 'Unmute' : 'Mute');
});

/* Equaliser follows the actual audio */
let analyser, data;
function setupEq() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const src = ctx.createMediaElementSource(music);
    analyser = ctx.createAnalyser(); analyser.fftSize = 64; analyser.smoothingTimeConstant = 0.75;
    src.connect(analyser); analyser.connect(ctx.destination);
    data = new Uint8Array(analyser.frequencyBinCount);
    const bars = [...$('eq').children], size = Math.floor(data.length / bars.length);
    (function draw() {
      requestAnimationFrame(draw);
      if (player.classList.contains('paused')) return;
      analyser.getByteFrequencyData(data);
      bars.forEach((b, i) => {
        let sum = 0; for (let j = i * size; j < (i + 1) * size; j++) sum += data[j];
        b.style.height = Math.max(20, Math.min(100, sum / size / 255 * 130)) + '%';
      });
    })();
  } catch { /* no Web Audio: bars stay at rest */ }
}

/* ---------- Discord presence (Lanyard) ---------- */
function fetchPresence() {
  const labels = { online: 'Online on Discord', idle: 'Idle on Discord', dnd: 'Busy on Discord', offline: 'Offline on Discord' };
  fetch('https://api.lanyard.rest/v1/users/1354472117646786763')
    .then((r) => r.json())
    .then((d) => {
      const s = d.success && d.data.discord_status;
      if (!s) return;
      $('dot').dataset.s = s;
      $('presence').textContent = labels[s] || '';
      $('presence').hidden = false;
    })
    .catch(() => {});
}

/* ---------- Hire dialog ---------- */
const dlg = $('hire'), form = $('hireForm'), status = $('hireStatus'), submit = $('hireSubmit');
document.querySelectorAll('[data-open]').forEach((b) => b.addEventListener('click', () => dlg.showModal()));
dlg.querySelector('[data-close]').addEventListener('click', () => dlg.close());
dlg.addEventListener('click', (e) => { if (e.target === dlg) dlg.close(); });

function say(text, kind) { status.textContent = text; status.className = kind || ''; }

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const contact = $('hireContact').value.trim(), details = $('hireDetails').value.trim();
  if (!contact || !details) return say('Add how to reach you and what you need built.', 'error');

  submit.disabled = true; submit.textContent = 'Sending…'; say('');
  try {
    const res = await fetch('/api/hire', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectType: $('hireType').value, contact, details, hp: $('hireHp').value })
    });
    const out = await res.json().catch(() => ({}));
    if (!res.ok || !out.ok) throw new Error(out.error);
    say('Sent. I\u2019ll get back to you soon.', 'ok');
    form.reset();
    setTimeout(() => { dlg.close(); say(''); }, 1800);
  } catch {
    say('Couldn\u2019t send that. Try again, or message me on Discord.', 'error');
  } finally {
    submit.disabled = false; submit.textContent = 'Send request';
  }
});

/* ---------- Scroll: progress line, hero drift, dimming video, reveals ---------- */
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
let queued = false;
function onScroll() {
  if (queued) return; queued = true;
  requestAnimationFrame(() => {
    const y = scrollY, max = root.scrollHeight - innerHeight;
    $('progress').style.setProperty('--sp', max > 0 ? y / max : 0);
    if (!reduce) {
      root.style.setProperty('--sy', Math.min(y, innerHeight * 1.2));
      root.style.setProperty('--dim', Math.min(0.5, y / innerHeight * 0.55));
    }
    queued = false;
  });
}
addEventListener('scroll', onScroll, { passive: true });
onScroll();

if (!reduce && 'IntersectionObserver' in window) {
  const items = [...document.querySelectorAll('.sec h2, dl > div, .project > *, .sec > div > *')];
  items.forEach((el) => { el.classList.add('rv'); el.style.setProperty('--i', [...el.parentNode.children].indexOf(el)); });
  const io = new IntersectionObserver((entries) => entries.forEach((e) => {
    if (!e.isIntersecting) return;
    e.target.classList.add('in'); io.unobserve(e.target);
    setTimeout(() => e.target.style.setProperty('--i', 0), 1600); /* hover shouldn't inherit the stagger */
  }), { threshold: 0.2, rootMargin: '0px 0px -8% 0px' });
  items.forEach((el) => io.observe(el));
}
