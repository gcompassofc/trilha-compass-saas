// Parse free-form estimates like "1h30", "45min", "2h", "1d", or bare number → minutes.
export function parseTimeText(raw: string): number | null {
  const s = raw.trim().toLowerCase().replace(/\s+/g, '');
  if (!s) return null;
  if (/^\d+$/.test(s)) return parseInt(s, 10);
  let total = 0;
  let matched = false;
  const dMatch = s.match(/(\d+)d/);
  if (dMatch) { total += parseInt(dMatch[1], 10) * 480; matched = true; }
  const hMatch = s.match(/(\d+)h/);
  if (hMatch) { total += parseInt(hMatch[1], 10) * 60; matched = true; }
  const mMatch = s.match(/(\d+)(min|m)(?!\d)/);
  if (mMatch) { total += parseInt(mMatch[1], 10); matched = true; }
  return matched ? total : null;
}

export function fmtMinutes(m: number): string {
  if (!m) return '0min';
  const h = Math.floor(m / 60);
  const mm = m % 60;
  if (h && mm) return `${h}h${mm}min`;
  if (h) return `${h}h`;
  return `${mm}min`;
}

// Floating +XP indicator near the checkbox (DOM side-effect).
export function spawnXPFloater(rect: DOMRect, amount = 10) {
  const el = document.createElement('div');
  el.className = 'xp-float';
  el.textContent = `+${amount}`;
  el.style.left = `${rect.left + window.scrollX}px`;
  el.style.top = `${rect.top + window.scrollY - 6}px`;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 1200);
}

// Level math: each level needs 500 XP. Tunable.
export const XP_PER_LEVEL = 500;
export function levelFromXp(xp: number) {
  const level = Math.floor(xp / XP_PER_LEVEL) + 1;
  const intoLevel = xp % XP_PER_LEVEL;
  return { level, intoLevel, needed: XP_PER_LEVEL };
}

export function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function daysBetween(a: string, b: string): number {
  const [ay, am, ad] = a.split('-').map(Number);
  const [by, bm, bd] = b.split('-').map(Number);
  const da = new Date(ay, am - 1, ad).getTime();
  const db = new Date(by, bm - 1, bd).getTime();
  return Math.round((db - da) / 86400000);
}

// Subtle ping using WebAudio (optional).
let __audioCtx: AudioContext | null = null;
export function playPing(freq = 880) {
  try {
    const Ctx = (window.AudioContext || (window as any).webkitAudioContext);
    if (!Ctx) return;
    if (!__audioCtx) __audioCtx = new Ctx();
    const ctx = __audioCtx!;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = 'sine';
    o.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.06, ctx.currentTime + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.25);
    o.connect(g); g.connect(ctx.destination);
    o.start();
    o.stop(ctx.currentTime + 0.28);
  } catch {
    /* noop */
  }
}
