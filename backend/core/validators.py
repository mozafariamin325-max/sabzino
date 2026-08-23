"""
اعتبارسنجی‌های مشترک — فعلاً فقط چک‌سام استاندارد کد ملی ایران (۱۰ رقمی)،
طبق الگوریتم رسمی سازمان ثبت احوال: ۹ رقم اول در وزن‌های ۱۰ تا ۲ ضرب می‌شوند،
باقیماندهٔ تقسیم بر ۱۱ با رقم دهم مقایسه می‌شود.
"""
from django.core.exceptions import ValidationError


def is_valid_iranian_national_id(value: str) -> bool:
    if not value or not value.isdigit() or len(value) != 10:
        return False
    # کدهای تکراری (۰۰۰۰۰۰۰۰۰۰، ۱۱۱۱۱۱۱۱۱۱ و ...) از نظر ریاضی معتبرند ولی
    # هرگز کد ملی واقعی نیستند.
    if len(set(value)) == 1:
        return False
    digits = [int(d) for d in value]
    checksum = sum(digits[i] * (10 - i) for i in range(9)) % 11
    check_digit = digits[9]
    if checksum < 2:
        return check_digit == checksum
    return check_digit == 11 - checksum


def validate_iranian_national_id(value: str) -> None:
    if not is_valid_iranian_national_id(value):
        raise ValidationError("کد ملی وارد شده معتبر نیست.")
