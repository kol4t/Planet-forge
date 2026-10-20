// Kolory i typografia HUD — „kosmiczny dziennik ekspedycji”.

export const COLORS = {
  panel: 0x0a1417,
  panelAlpha: 0.8,
  panelBorder: 0x2b4846,
  divider: 0x1f3534,
  text: '#dfe7e1',
  muted: '#8ea6a0',
  faint: '#5f7873',
  teal: '#72c4b6',
  tealHex: 0x72c4b6,
  gold: '#d8b463',
  goldHex: 0xd8b463,
  stone: '#b3a58b',
  stoneHex: 0xb3a58b,
  antimatter: '#b9a8f0',
  antimatterHex: 0xb9a8f0,
  danger: '#e08a6d',
  dangerHex: 0xe08a6d,
  buttonIdle: 0x1a2b2d,
  buttonText: '#0c1513',
} as const;

export const FONTS = {
  body: '"Avenir Next", Avenir, "Segoe UI", system-ui, -apple-system, sans-serif',
  serif: '"Iowan Old Style", "Palatino Linotype", Palatino, Georgia, serif',
  mono: '"SF Mono", Menlo, Consolas, monospace',
} as const;

const whole = new Intl.NumberFormat('pl-PL', { maximumFractionDigits: 0 });
const oneDecimal = new Intl.NumberFormat('pl-PL', { maximumFractionDigits: 1, minimumFractionDigits: 1 });

/** Liczba całkowita (zaokrąglona w dół), z separatorem tysięcy. */
export const formatInt = (value: number) => whole.format(Math.floor(value));
/** Małe liczby z jednym miejscem po przecinku, duże bez. */
export const formatRate = (value: number) => (Math.abs(value) < 10 ? oneDecimal.format(value) : whole.format(value));

/** Czas w formacie m:ss albo h:mm:ss. */
export function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds)) return '—';
  const total = Math.ceil(seconds);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}
