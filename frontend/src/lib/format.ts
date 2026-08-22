const PERSIAN_DIGITS = ["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"];

export function toPersianDigits(input: string | number): string {
  return String(input).replace(/[0-9]/g, (d) => PERSIAN_DIGITS[Number(d)]);
}

export function formatToman(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "۰";
  const num = Math.round(Number(value));
  return toPersianDigits(num.toLocaleString("en-US"));
}

export function formatNumber(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "۰";
  return toPersianDigits(Number(value).toLocaleString("en-US"));
}

export function formatKg(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "۰";
  return toPersianDigits(Number(value).toLocaleString("en-US", { maximumFractionDigits: 1 }));
}

const JALALI_MONTHS = [
  "فروردین", "اردیبهشت", "خرداد", "تیر", "مرداد", "شهریور",
  "مهر", "آبان", "آذر", "دی", "بهمن", "اسفند",
];

// Lightweight Gregorian -> Jalali conversion (no external dep) for display-only dates.
export function toJalali(dateInput: string | Date): string {
  const d = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
  const gy = d.getFullYear();
  const gm = d.getMonth() + 1;
  const gd = d.getDate();

  const g_d_m = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
  let jy: number;
  const gy2 = gm > 2 ? gy + 1 : gy;
  let days =
    355666 +
    365 * gy +
    Math.floor((gy2 + 3) / 4) -
    Math.floor((gy2 + 99) / 100) +
    Math.floor((gy2 + 399) / 400) +
    gd +
    g_d_m[gm - 1];
  jy = -1595 + 33 * Math.floor(days / 12053);
  days %= 12053;
  jy += 4 * Math.floor(days / 1461);
  days %= 1461;
  if (days > 365) {
    jy += Math.floor((days - 1) / 365);
    days = (days - 1) % 365;
  }
  let jm: number;
  let jd: number;
  if (days < 186) {
    jm = 1 + Math.floor(days / 31);
    jd = 1 + (days % 31);
  } else {
    jm = 7 + Math.floor((days - 186) / 30);
    jd = 1 + ((days - 186) % 30);
  }
  return `${toPersianDigits(jd)} ${JALALI_MONTHS[jm - 1]} ${toPersianDigits(jy)}`;
}

export function toJalaliTime(dateInput: string | Date): string {
  const d = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
  const h = d.getHours().toString().padStart(2, "0");
  const m = d.getMinutes().toString().padStart(2, "0");
  return `${toJalali(d)} - ساعت ${toPersianDigits(h)}:${toPersianDigits(m)}`;
}
