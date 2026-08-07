export const DEFAULT_TIMEZONE = 'America/Los_Angeles';

export const TIMEZONE_OPTIONS = [
  ['America/Los_Angeles', 'Pacific Time (Los Angeles)'],
  ['America/Denver', 'Mountain Time (Denver)'],
  ['America/Chicago', 'Central Time (Chicago)'],
  ['America/New_York', 'Eastern Time (New York)'],
  ['America/Toronto', 'Eastern Time (Toronto)'],
  ['America/Vancouver', 'Pacific Time (Vancouver)'],
  ['Europe/London', 'United Kingdom (London)'],
  ['Europe/Paris', 'Central Europe (Paris)'],
  ['Asia/Shanghai', 'China (Shanghai / Beijing)'],
  ['Asia/Tokyo', 'Japan (Tokyo)'],
  ['Australia/Sydney', 'Australia (Sydney)'],
] as const;

export function dateInTimezone(now: Date, timeZone: string): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
}

export function partsInTimezone(now: Date, timeZone: string) {
  const p = new Intl.DateTimeFormat('en-US', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now);
  return { year: Number(p.find(x => x.type === 'year')?.value), month: Number(p.find(x => x.type === 'month')?.value), day: Number(p.find(x => x.type === 'day')?.value) };
}
