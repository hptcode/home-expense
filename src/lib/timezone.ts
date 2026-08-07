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
  ['Asia/Hong_Kong', 'Hong Kong'],
  ['Asia/Taipei', 'Taiwan (Taipei)'],
  ['Asia/Tokyo', 'Japan (Tokyo)'],
  ['Asia/Seoul', 'South Korea (Seoul)'],
  ['Asia/Ulaanbaatar', 'Mongolia (Ulaanbaatar)'],
  ['Asia/Kolkata', 'India (Kolkata / Mumbai / New Delhi)'],
  ['Asia/Kathmandu', 'Nepal (Kathmandu)'],
  ['Asia/Dhaka', 'Bangladesh (Dhaka)'],
  ['Asia/Karachi', 'Pakistan (Karachi / Islamabad)'],
  ['Asia/Colombo', 'Sri Lanka (Colombo)'],
  ['Asia/Yangon', 'Myanmar (Yangon)'],
  ['Asia/Bangkok', 'Thailand (Bangkok)'],
  ['Asia/Ho_Chi_Minh', 'Vietnam (Ho Chi Minh City / Hanoi)'],
  ['Asia/Manila', 'Philippines (Manila)'],
  ['Asia/Singapore', 'Singapore'],
  ['Asia/Kuala_Lumpur', 'Malaysia (Kuala Lumpur)'],
  ['Asia/Jakarta', 'Indonesia (Jakarta)'],
  ['Asia/Almaty', 'Kazakhstan (Almaty)'],
  ['Asia/Tashkent', 'Uzbekistan (Tashkent)'],
  ['Asia/Tbilisi', 'Georgia (Tbilisi)'],
  ['Asia/Baku', 'Azerbaijan (Baku)'],
  ['Asia/Yerevan', 'Armenia (Yerevan)'],
  ['Asia/Istanbul', 'Turkey (Istanbul)'],
  ['Asia/Jerusalem', 'Israel (Jerusalem)'],
  ['Asia/Amman', 'Jordan (Amman)'],
  ['Asia/Beirut', 'Lebanon (Beirut)'],
  ['Asia/Baghdad', 'Iraq (Baghdad)'],
  ['Asia/Tehran', 'Iran (Tehran)'],
  ['Asia/Riyadh', 'Saudi Arabia (Riyadh)'],
  ['Asia/Dubai', 'United Arab Emirates (Dubai / Abu Dhabi)'],
  ['Asia/Qatar', 'Qatar (Doha)'],
  ['Asia/Kuwait', 'Kuwait (Kuwait City)'],
  ['Asia/Bahrain', 'Bahrain (Manama)'],
  ['Asia/Muscat', 'Oman (Muscat)'],
  ['Australia/Sydney', 'Australia (Sydney)'],
] as const;

export function dateInTimezone(now: Date, timeZone: string): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
}

export function partsInTimezone(now: Date, timeZone: string) {
  const p = new Intl.DateTimeFormat('en-US', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now);
  return { year: Number(p.find(x => x.type === 'year')?.value), month: Number(p.find(x => x.type === 'month')?.value), day: Number(p.find(x => x.type === 'day')?.value) };
}
