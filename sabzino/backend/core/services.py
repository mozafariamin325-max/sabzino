"""
Small shared services used across apps. Keeping business-rule lookups here
means Admin-tunable numbers (commission %, points-per-kg, referral reward...)
never get hard-coded in view/serializer logic.
"""
from decimal import Decimal
from django.conf import settings
from django.core.cache import cache


def get_setting(key: str, default=None):
    """Fetch a PlatformSetting value with a tiny in-process cache fallback to settings.py default."""
    from core.models import PlatformSetting

    cache_key = f"platform_setting:{key}"
    cached = cache.get(cache_key)
    if cached is not None:
        return cached
    try:
        value = PlatformSetting.objects.get(key=key).value
    except PlatformSetting.DoesNotExist:
        value = default
    cache.set(cache_key, value, timeout=60)
    return value


def get_decimal_setting(key: str, default: Decimal) -> Decimal:
    value = get_setting(key, str(default))
    try:
        return Decimal(str(value))
    except Exception:
        return default


def get_commission_percent() -> Decimal:
    return get_decimal_setting("commission_percent", Decimal(str(settings.SABZINO_DEFAULT_COMMISSION_PERCENT)))


def get_points_per_kg() -> Decimal:
    return get_decimal_setting("points_per_kg", Decimal(str(settings.SABZINO_DEFAULT_POINTS_PER_KG)))


def create_rating(from_user, to_user, context_type: str, reference: str, score: int, comment: str = ""):
    """Creates a Rating and, for collection-context ratings, recomputes the collector's rating_avg."""
    from django.db.models import Avg
    from core.models import Rating, RatingContext

    if from_user.id == to_user.id:
        raise ValueError("نمی‌توانید به خودتان امتیاز بدهید.")
    if not (1 <= score <= 5):
        raise ValueError("امتیاز باید بین ۱ تا ۵ باشد.")

    rating, created = Rating.objects.get_or_create(
        from_user=from_user, context_type=context_type, reference=reference,
        defaults={"to_user": to_user, "score": score, "comment": comment},
    )
    if not created:
        raise ValueError("قبلاً برای این مورد امتیاز ثبت کرده‌اید.")

    if context_type == RatingContext.COLLECTION:
        collector_profile = getattr(to_user, "collector_profile", None)
        if collector_profile:
            avg = Rating.objects.filter(to_user=to_user, context_type=RatingContext.COLLECTION).aggregate(a=Avg("score"))["a"]
            collector_profile.rating_avg = round(avg or 5, 2)
            collector_profile.save(update_fields=["rating_avg"])
    return rating


def qr_data_url(value: str) -> str:
    """
    Renders `value` (a uid, transaction code, etc.) as a QR PNG and returns it
    as a base64 data: URL — no file storage needed, the frontend can drop it
    straight into an <img src=...>. Used for user/collector/station/transaction
    QR codes (spec section 64).
    """
    import base64
    import io
    import qrcode

    img = qrcode.make(value, box_size=8, border=2)
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    encoded = base64.b64encode(buf.getvalue()).decode("ascii")
    return f"data:image/png;base64,{encoded}"
