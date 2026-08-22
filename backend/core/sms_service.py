"""
فاز ۱۱: پیامک واقعی (sms.ir) — فقط برای اعلان‌های متنی به کاربران (نه ورود/OTP؛
آن تصمیم صریح کاربر بود که برای الان دست‌نخورده بماند).

چرا sms.ir: مستندات REST تمیز و عمومی دارد (بدون نیاز به SOAP)، احراز هویت با
یک هدر ساده `X-API-KEY`، و متد `send/bulk` دقیقاً همان چیزی است که برای متن
دلخواه (نه فقط کد یک‌بارمصرفِ قالب‌محور) لازم داریم.

پیکربندی لازم (در backend/.env یا env‌varهای هاست):
    SMS_IR_API_KEY=<کلید API از پنل sms.ir>
    SMS_IR_LINE_NUMBER=<شماره خط اختصاصی/اشتراکی که در پنل sms.ir گرفته‌اید>

اگر این دو مقدار خالی باشند (مثلاً روی سندباکس توسعه)، send_sms_text() فقط
لاگ می‌کند و False برمی‌گرداند — هرگز استثنا پرتاب نمی‌کند، چون این تابع همیشه
از داخل یک جریان مهم‌تر (تکمیل درخواست، واریز کیف‌پول) صدا زده می‌شود و نباید
با قطعی/عدم‌تنظیم سرویس پیامک آن جریان اصلی را خراب کند.
"""

import logging

import requests
from django.conf import settings

logger = logging.getLogger(__name__)

SMS_IR_BULK_URL = "https://api.sms.ir/v1/send/bulk"
REQUEST_TIMEOUT_SECONDS = 8


def is_configured() -> bool:
    return bool(settings.SMS_IR_API_KEY and settings.SMS_IR_LINE_NUMBER)


def send_sms_text(phone_number: str, message: str) -> bool:
    """
    ارسال یک پیامک متنی دلخواه (نه قالب‌محور) به یک شماره. True یعنی sms.ir
    درخواست را با موفقیت پذیرفت (نه لزوماً تحویل نهایی به گوشی — آن را باید
    از پنل sms.ir یا endpoint وضعیت پیام رصد کرد).
    """
    if not phone_number:
        return False
    if not is_configured():
        logger.info("SMS not sent (sms.ir تنظیم نشده): %s -> %s", phone_number, message[:40])
        return False

    try:
        response = requests.post(
            SMS_IR_BULK_URL,
            json={
                "lineNumber": int(settings.SMS_IR_LINE_NUMBER),
                "messageText": message,
                "mobiles": [phone_number],
            },
            headers={
                "X-API-KEY": settings.SMS_IR_API_KEY,
                "Content-Type": "application/json",
                "Accept": "text/plain",
            },
            timeout=REQUEST_TIMEOUT_SECONDS,
        )
        data = response.json()
    except (requests.RequestException, ValueError):
        logger.exception("خطا در ارتباط با sms.ir برای شماره %s", phone_number)
        return False

    if data.get("status") != 1:
        logger.warning("sms.ir ارسال را رد کرد (%s): %s", phone_number, data.get("message"))
        return False
    return True
