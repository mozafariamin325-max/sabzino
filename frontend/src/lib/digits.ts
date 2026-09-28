const MAP: Record<string, string> = {
  "۰": "0", "۱": "1", "۲": "2", "۳": "3", "۴": "4", "۵": "5", "۶": "6", "۷": "7", "۸": "8", "۹": "9",
  "٠": "0", "١": "1", "٢": "2", "٣": "3", "٤": "4", "٥": "5", "٦": "6", "٧": "7", "٨": "8", "٩": "9",
};

/** ارقام فارسی/عربی → انگلیسی. */
export function toAsciiDigits(value: string): string {
  return (value || "").replace(/[۰-۹٠-٩]/g, (d) => MAP[d] ?? d);
}

/** فقط رقم نگه می‌دارد (حرف/فاصله/علامت حذف می‌شود) و طول را به max محدود می‌کند. */
export function digitsOnly(value: string, max: number): string {
  return toAsciiDigits(value).replace(/\D/g, "").slice(0, max);
}

export const isValidMobile = (v: string) => /^09\d{9}$/.test(v);
