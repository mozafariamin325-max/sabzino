"""
فاز ۱۵: منطق ورود با کد پیامکی (OTP).

طبق تصمیم صریح کاربر (به‌جای مصرف واقعی اعتبار sms.ir به‌ازای هر ورود)، در
حالت OTP_TEST_MODE=True (پیش‌فرض فعلی) کد همیشه یک مقدار ثابت
(settings.OTP_TEST_FIXED_CODE) است و هیچ پیامکی ارسال نمی‌شود — کل زیرساخت
(مدل OTPRequest، ویوها، فرانت‌اند) کامل و آماده است؛ روز رفتن به حالت واقعی
فقط یک متغیر محیطی (OTP_TEST_MODE=False) لازم است، هیچ تغییر کد دیگری نه.
"""
import random
from datetime import timedelta

from django.conf import settings
from django.core import signing
from django.utils import timezone

from .models import OTPRequest, User

REGISTRATION_TOKEN_SALT = "sabzino.otp.registration"
REGISTRATION_TOKEN_MAX_AGE_SECONDS = 600  # ۱۰ دقیقه فرصت برای تکمیل پروفایل بعد از تأیید کد


def generate_otp_code() -> str:
    if settings.OTP_TEST_MODE:
        return settings.OTP_TEST_FIXED_CODE
    return "".join(random.choices("0123456789", k=6))


def request_otp(phone_number: str) -> OTPRequest:
    recent = (
        OTPRequest.objects.filter(phone_number=phone_number, is_used=False, expires_at__gt=timezone.now())
        .order_by("-created_at")
        .first()
    )
    if recent and (timezone.now() - recent.created_at).total_seconds() < 30:
        raise ValueError("همین الان یک کد برایت ارسال شده — کمی صبر کن و دوباره تلاش کن.")

    code = generate_otp_code()
    expires_at = timezone.now() + timedelta(minutes=settings.OTP_EXPIRY_MINUTES)
    otp = OTPRequest.objects.create(phone_number=phone_number, code=code, expires_at=expires_at)

    if not settings.OTP_TEST_MODE:
        from core.sms_service import send_sms_text

        send_sms_text(
            phone_number,
            f"سبزینو: کد ورود شما {code} است. اعتبار {settings.OTP_EXPIRY_MINUTES} دقیقه.",
        )
    return otp


def verify_otp(phone_number: str, code: str) -> OTPRequest:
    otp = (
        OTPRequest.objects.filter(phone_number=phone_number, is_used=False)
        .order_by("-created_at")
        .first()
    )
    if not otp:
        raise ValueError("کدی برای این شماره درخواست نشده است.")
    if otp.expires_at < timezone.now():
        raise ValueError("کد منقضی شده است — دوباره درخواست بده.")
    if otp.attempt_count >= settings.OTP_MAX_VERIFY_ATTEMPTS:
        raise ValueError("تعداد تلاش مجاز تمام شد — یک کد جدید درخواست بده.")
    if otp.code != code:
        otp.attempt_count += 1
        otp.save(update_fields=["attempt_count"])
        raise ValueError("کد وارد شده اشتباه است.")
    otp.is_used = True
    otp.save(update_fields=["is_used"])
    return otp


def make_registration_token(phone_number: str) -> str:
    """کاربر جدید بعد از تأیید موفق OTP یک توکن کوتاه‌عمر می‌گیرد که ثابت می‌کند
    واقعاً مالک این شماره است — بدون این، هرکسی می‌توانست مستقیم به
    complete-profile درخواست بزند و برای یک شماره دلخواه حساب بسازد."""
    return signing.dumps({"phone_number": phone_number}, salt=REGISTRATION_TOKEN_SALT)


def read_registration_token(token: str) -> str:
    try:
        data = signing.loads(token, salt=REGISTRATION_TOKEN_SALT, max_age=REGISTRATION_TOKEN_MAX_AGE_SECONDS)
    except signing.SignatureExpired:
        raise ValueError("مهلت تکمیل ثبت‌نام تمام شده — دوباره با شماره موبایل وارد شو.")
    except signing.BadSignature:
        raise ValueError("توکن ثبت‌نام نامعتبر است.")
    return data["phone_number"]


def find_user_by_phone(phone_number: str):
    return User.objects.filter(phone_number=phone_number).first()
