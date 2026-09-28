"""
Shared geo helpers. Kept separate from collection_requests/services.py (which
has its own local haversine_km for dispatch-radius matching) so that apps
which must NOT depend on collection_requests — accounts (Address) and
locations (City) itself — can validate a point without a circular import.
"""

from math import radians, sin, cos, sqrt, atan2

DEFAULT_SERVICE_RADIUS_KM = 30


def service_city_name(user_city):
    """شهر مبنای محدودهٔ سرویس: شهر کاربر اگر راه‌اندازی شده، وگرنه اولین شهر راه‌اندازی‌شده."""
    from django.conf import settings

    launched = list(settings.LAUNCHED_CITIES) or ["یاسوج"]
    return user_city if user_city in launched else launched[0]


def haversine_km(lat1, lng1, lat2, lng2):
    if None in (lat1, lng1, lat2, lng2):
        return None
    r = 6371
    lat1, lng1, lat2, lng2 = map(radians, [float(lat1), float(lng1), float(lat2), float(lng2)])
    dlat, dlng = lat2 - lat1, lng2 - lng1
    a = sin(dlat / 2) ** 2 + cos(lat1) * cos(lat2) * sin(dlng / 2) ** 2
    return r * 2 * atan2(sqrt(a), sqrt(1 - a))


def out_of_service_area(lat, lng, city):
    """
    Returns (is_out_of_area: bool, distance_km: float | None).

    فرض: اگر مختصات شهر در دیتابیس ثبت نشده باشد (city.lat/lng خالی) یا نقطهٔ
    ورودی مختصات نداشته باشد، اعتبارسنجی نادیده گرفته می‌شود (fail-open) —
    نبود داده به‌معنای رد درخواست نیست، فقط یعنی نمی‌توان بررسی کرد.
    """
    if city is None or city.lat is None or city.lng is None or lat is None or lng is None:
        return False, None
    distance = haversine_km(lat, lng, city.lat, city.lng)
    radius = city.service_radius_km or DEFAULT_SERVICE_RADIUS_KM
    return distance > radius, distance
