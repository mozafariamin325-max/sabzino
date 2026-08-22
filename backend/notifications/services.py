from .models import Notification


def notify(user, title: str, body: str, link: str = "", channel: str = "IN_APP") -> Notification:
    """
    Central place to create a notification; every real event (spec section 52) routes through here.

    فاز ۱۱: وقتی channel="SMS" باشد، علاوه‌بر ثبت رکورد درون‌برنامه‌ای (که
    همیشه ثبت می‌شود — تاریخچهٔ اعلان کاربر هرگز فقط پیامکی نیست)، یک پیامک
    واقعی هم از طریق sms.ir ارسال می‌شود. اگر پیامک تنظیم نشده باشد یا ارسال
    شکست بخورد، این تابع همچنان موفق برمی‌گردد — شکست پیامک هرگز نباید
    جریان اصلی (مثلاً واریز کیف‌پول) را که notify() را صدا زده، خراب کند.
    """
    notification = Notification.objects.create(user=user, title=title, body=body, link=link, channel=channel)
    if channel == "SMS" and getattr(user, "phone_number", None):
        from core.sms_service import send_sms_text

        send_sms_text(user.phone_number, f"سبزینو: {body}")
    return notification
