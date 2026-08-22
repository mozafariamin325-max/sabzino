def check_area_capacity(area_name: str) -> None:
    """
    زیرساخت محدودیت منطقه‌ای راننده (فاز ۱۴). اگر مدیر برای این منطقه در
    ServiceAreaQuota سقفی تعریف کرده و آن سقف پر شده باشد، ValueError
    می‌دهد (پیام فارسی، مستقیم قابل نمایش به کاربر). اگر منطقه ثبت نشده یا
    max_collectors خالی باشد، هیچ محدودیتی اعمال نمی‌شود — یعنی رفتار
    پیش‌فرض دقیقاً همان چیزی است که پیش از این فاز بود (بدون محدودیت)، تا
    وقتی مدیر عددهای واقعی را از پنل ادمین تنظیم کند.
    """
    from .models import CollectorProfile, ServiceAreaQuota

    if not area_name:
        return
    quota = ServiceAreaQuota.objects.filter(area_name=area_name, is_active=True).first()
    if not quota or quota.max_collectors is None:
        return
    current = CollectorProfile.objects.filter(
        city=area_name, verification_status__in=["PENDING", "UNDER_REVIEW", "APPROVED"],
    ).count()
    if current >= quota.max_collectors:
        raise ValueError(f"ظرفیت ثبت‌نام راننده برای «{area_name}» در حال حاضر تکمیل است.")
