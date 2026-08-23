/**
 * فاز ۱۵: اعتبارسنجی سمت کلاینت کد ملی ایران با الگوریتم رسمی چک‌سام —
 * دقیقاً همان منطق backend/core/validators.py، برای بازخورد فوری به کاربر
 * پیش از ارسال درخواست به سرور (سرور هم مستقل همین قانون را دوباره چک
 * می‌کند، این فقط برای UX سریع‌تر است).
 */
export function isValidIranianNationalId(value: string): boolean {
  if (!value || !/^\d{10}$/.test(value)) return false;
  if (new Set(value.split("")).size === 1) return false;

  const digits = value.split("").map(Number);
  const checksum = digits.slice(0, 9).reduce((acc, d, i) => acc + d * (10 - i), 0) % 11;
  const checkDigit = digits[9];
  return checksum < 2 ? checkDigit === checksum : checkDigit === 11 - checksum;
}
