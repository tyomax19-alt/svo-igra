// Звуки игры. Всё генерируется в браузере, аудиофайлов нет. Играет только на экране создателя комнаты.
const KEY = 'igra-sound-off';
const NOTE = { C:0, D:2, E:4, F:5, G:7, A:9, B:11 };
const hz = n => 440 * Math.pow(2, (NOTE[n[0]] + (+n[1] + 1) * 12 - 69) / 12);

let ctx = null, master = null, musicBus = null;
let muted = false;
try { muted = localStorage.getItem(KEY) === '1'; } catch (e) {}

function ensure() {
  if (ctx) return true;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return false;
  ctx = new AC();
  master = ctx.createGain();
  master.gain.value = muted ? 0 : 0.6;
  master.connect(ctx.destination);
  musicBus = ctx.createGain();
  musicBus.gain.value = 1;
  musicBus.connect(master);
  return true;
}

// браузер разрешает звук только после действия человека
export function unlock() {
  if (ensure() && ctx.state === 'suspended') ctx.resume();
}

function tone(freq, at, len, vol, type, out) {
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = type; o.frequency.value = freq;
  g.gain.setValueAtTime(0.0001, at);
  g.gain.linearRampToValueAtTime(vol, at + 0.008);
  g.gain.setValueAtTime(vol, at + len * 0.6);
  g.gain.exponentialRampToValueAtTime(0.0001, at + len);
  o.connect(g); g.connect(out);
  o.start(at); o.stop(at + len + 0.02);
}

const SFX = {
  open:   { step: 0.06, len: 0.12, notes: ['C5', 'E5', 'G5', 'C6'] },
  reveal: { step: 0.09, len: 0.16, notes: ['G5', 'C6'] },
  good:   { step: 0.08, len: 0.2,  notes: ['C5', 'E5', 'G5', 'C6', 'E6'] },
  bad:    { step: 0.13, len: 0.24, notes: ['E4', 'C4', 'A3'] },
  mod:    { step: 0.1,  len: 0.16, notes: ['A4', 'E5', 'A4', 'E5', 'A5', 'E6'] },
  win:    { step: 0.14, len: 0.3,  notes: ['G4', 'C5', 'E5', 'G5', 'E5', 'G5', 'C6', 'E6'] },
};

export function play(name) {
  const s = SFX[name];
  if (!s || muted || !ensure() || ctx.state !== 'running') return;
  const t = ctx.currentTime + 0.02;
  s.notes.forEach((n, i) => tone(hz(n), t + i * s.step, s.len, 0.16, 'square', master));
}

// своя мелодия на табло: 8 тактов, по восемь восьмых в такте, ноль значит пауза
const LEAD = [
  'E5',0,'G5',0,'A5','G5','E5',0,   'D5','E5',0,'C5',0,0,'G4',0,
  'A4',0,'C5',0,'E5','D5','C5',0,   'B4','C5',0,'A4',0,0,'E4',0,
  'F4','A4','C5',0,'F5',0,'E5','D5', 'C5',0,'A4',0,'C5','D5',0,0,
  'B4','D5','G5',0,'F5','E5','D5',0, 'D5',0,'B4',0,'G4',0,0,0,
];
const BASS = ['C3','C3','A2','A2','F2','F2','G2','G2'];
const STEP = 60 / 126 / 2;
let timer = null, nextAt = 0, pos = 0;

function schedule() {
  while (nextAt < ctx.currentTime + 0.3) {
    const n = LEAD[pos];
    if (n) tone(hz(n), nextAt, STEP * 0.9, 0.05, 'square', musicBus);
    if (pos % 2 === 0) {
      const b = BASS[Math.floor(pos / 8)];
      const f = hz(b) * (pos % 4 === 2 ? 2 : 1);
      tone(f, nextAt, STEP * 1.6, 0.085, 'triangle', musicBus);
    }
    pos = (pos + 1) % LEAD.length;
    nextAt += STEP;
  }
}

export function startMusic() {
  if (timer || muted || !ensure() || ctx.state !== 'running') return;
  musicBus.gain.cancelScheduledValues(ctx.currentTime);
  musicBus.gain.setValueAtTime(1, ctx.currentTime);
  nextAt = ctx.currentTime + 0.05;
  schedule();
  timer = setInterval(schedule, 100);
}

export function stopMusic() {
  if (!timer) return;
  clearInterval(timer); timer = null;
  musicBus.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.05);
}

export function isMuted() { return muted; }

export function toggleMute() {
  muted = !muted;
  try { localStorage.setItem(KEY, muted ? '1' : '0'); } catch (e) {}
  if (ensure()) {
    if (muted) stopMusic();
    master.gain.setTargetAtTime(muted ? 0 : 0.6, ctx.currentTime, 0.02);
  }
  return muted;
}
