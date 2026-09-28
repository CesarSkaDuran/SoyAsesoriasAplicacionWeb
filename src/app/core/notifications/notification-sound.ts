/**
 * Sonido de notificación sintetizado con Web Audio API.
 * No requiere archivos de audio. Tono y volumen configurables
 * (persistidos en localStorage).
 */

const SOUND_KEY = 'notificaciones.sonido';
const VOLUME_KEY = 'notificaciones.volumen';
const TONE_KEY = 'notificaciones.tono';

export type NotificationTone = 'campana' | 'ding' | 'suave' | 'pop';

export const NOTIFICATION_TONES: { value: NotificationTone; label: string }[] = [
  { value: 'campana', label: 'Campana' },
  { value: 'ding', label: 'Ding' },
  { value: 'suave', label: 'Suave' },
  { value: 'pop', label: 'Pop' },
];

export function notificationsSoundEnabled(): boolean {
  if (typeof localStorage === 'undefined') return true;
  return localStorage.getItem(SOUND_KEY) !== 'false';
}

export function setNotificationsSoundEnabled(enabled: boolean) {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(SOUND_KEY, String(enabled));
}

/** Volumen 0..1 (default 0.32) */
export function notificationsVolume(): number {
  if (typeof localStorage === 'undefined') return 0.32;
  const v = Number(localStorage.getItem(VOLUME_KEY));
  return Number.isFinite(v) && v >= 0 && v <= 1 ? v : 0.32;
}

export function setNotificationsVolume(volume: number) {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(VOLUME_KEY, String(Math.min(1, Math.max(0, volume))));
}

export function notificationsTone(): NotificationTone {
  if (typeof localStorage === 'undefined') return 'campana';
  const t = localStorage.getItem(TONE_KEY);
  return NOTIFICATION_TONES.some((x) => x.value === t) ? (t as NotificationTone) : 'campana';
}

export function setNotificationsTone(tone: NotificationTone) {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(TONE_KEY, tone);
}

let audioContext: AudioContext | null = null;

function context(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  if (!audioContext) audioContext = new Ctor();
  if (audioContext.state === 'suspended') void audioContext.resume();
  return audioContext;
}

function tone(
  ctx: AudioContext,
  dest: AudioNode,
  frequency: number,
  startAt: number,
  duration: number,
  volume: number,
  type: OscillatorType = 'sine',
) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.value = frequency;
  gain.gain.setValueAtTime(0, startAt);
  gain.gain.linearRampToValueAtTime(volume, startAt + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, startAt + duration);
  osc.connect(gain);
  gain.connect(dest);
  osc.start(startAt);
  osc.stop(startAt + duration + 0.05);
}

export function playNotificationSound(toneName?: NotificationTone, volume?: number) {
  if (!notificationsSoundEnabled()) return;
  const ctx = context();
  if (!ctx) return;
  const now = ctx.currentTime;
  const master = ctx.createGain();
  master.gain.value = volume ?? notificationsVolume();
  master.connect(ctx.destination);

  switch (toneName ?? notificationsTone()) {
    case 'ding':
      // Una sola nota alta, corta
      tone(ctx, master, 1318.51, now, 0.35, 0.8);
      tone(ctx, master, 2637.02, now, 0.25, 0.15);
      break;
    case 'suave':
      // Nota grave y blanda, decaimiento largo
      tone(ctx, master, 523.25, now, 0.5, 0.45);
      tone(ctx, master, 1046.5, now, 0.4, 0.1);
      break;
    case 'pop':
      // Blip corto tipo burbuja (dos golpes rápidos)
      tone(ctx, master, 880, now, 0.09, 0.5, 'triangle');
      tone(ctx, master, 1174.66, now + 0.07, 0.1, 0.4, 'triangle');
      break;
    case 'campana':
    default:
      // Dos tonos tipo campana: B5 -> E6
      tone(ctx, master, 987.77, now, 0.28, 0.7);
      tone(ctx, master, 1975.54, now, 0.22, 0.18);
      tone(ctx, master, 1318.51, now + 0.1, 0.42, 0.7);
      tone(ctx, master, 2637.02, now + 0.1, 0.3, 0.14);
      break;
  }
}
