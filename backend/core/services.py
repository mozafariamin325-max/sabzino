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
