// ── Notification Sound Utility ─────────────────────────────────
// Professional sounds using Web Audio API — no external files needed
// Sounds only play for RECEIVERS, never the sender

let audioCtx = null;

const getCtx = () => {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  // Resume if suspended (browser autoplay policy)
  if (audioCtx.state === 'suspended') audioCtx.resume();
  return audioCtx;
};

const createEnvelopedTone = (ctx, freq, type, startTime, duration, peakGain = 0.3) => {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  // Slight low-pass filter for warmth
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(3000, startTime);

  osc.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);

  osc.type = type;
  osc.frequency.setValueAtTime(freq, startTime);

  // Attack → sustain → release envelope
  gain.gain.setValueAtTime(0, startTime);
  gain.gain.linearRampToValueAtTime(peakGain, startTime + 0.015); // fast attack
  gain.gain.setValueAtTime(peakGain * 0.7, startTime + duration * 0.4); // sustain
  gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration); // smooth release

  osc.start(startTime);
  osc.stop(startTime + duration + 0.01);
};

// ── Chat message: warm two-note chime (C5 → E5) ──────────────
// Professional "message received" feel — like Slack/Teams but softer
export const playChatSound = (senderEmail, currentUserEmail) => {
  // ✅ Receiver-only: don't play if you sent it
  if (senderEmail && currentUserEmail && senderEmail === currentUserEmail) return;
  try {
    const ctx = getCtx();
    const now = ctx.currentTime;
    // Two-note warm chime: C5 (523Hz) then E5 (659Hz)
    createEnvelopedTone(ctx, 523, 'sine', now,         0.35, 0.18);
    createEnvelopedTone(ctx, 659, 'sine', now + 0.12,  0.45, 0.14);
  } catch (e) { /* browser blocked audio */ }
};

// ── Task assigned: single confident ding (A4 → C5) ───────────
// "Action needed" feel — slightly more attention-grabbing than chat
export const playTaskSound = (assignerEmail, currentUserEmail) => {
  // ✅ Receiver-only: don't play if you created the task yourself
  if (assignerEmail && currentUserEmail && assignerEmail === currentUserEmail) return;
  try {
    const ctx = getCtx();
    const now = ctx.currentTime;
    // Harmonic stack for richness: fundamental + soft overtone
    createEnvelopedTone(ctx, 440, 'sine',     now,        0.55, 0.20);
    createEnvelopedTone(ctx, 880, 'sine',     now,        0.40, 0.06); // octave, very soft
    createEnvelopedTone(ctx, 523, 'triangle', now + 0.18, 0.45, 0.12); // resolution note
  } catch (e) { /* browser blocked audio */ }
};