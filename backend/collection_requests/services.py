from decimal import Decimal
from datetime import timedelta
from math import radians, sin, cos, sqrt, atan2
from django.db import transaction
from django.utils import timezone
from .models import CollectionRequest, CollectionStatusLog, CollectionAssignment, RequestStatus, WeighingRecord, RequestDismissal

# rough midpoint (kg) used only for the "estimated value" shown to the citizen before weighing
AMOUNT_RANGE_MIDPOINT = {
    "UNDER_5": Decimal("3"), "R5_10": Decimal("7.5"), "R10_20": Decimal("15"),
    "R20_50": Decimal("35"), "R50_100": Decimal("75"), "OVER_100": Decimal("120"),
}

# فاز ۱۰: دیسپچ هدفمند — شعاع (کیلومتر) و سقف تعداد جمع‌آورهایی که برای یک
# درخواست جدید نوتیفیکیشن هدفمند می‌گیرند، جدا از لیست «نزدیک من» که همه‌ی
# جمع‌آورهای آنلاین در هر لحظه می‌توانند خودشان مرور کنند.
DISPATCH_RADIUS_KM = 15
DISPATCH_MAX_COLLECTORS = 8


def estimate_value(materials_qs, amount_range: str) -> Decimal:
    prices = [m.current_price for m in materials_qs if m.current_price]
    if not prices:
        return Decimal("0")
    avg_price = sum(prices) / len(prices)
    kg = AMOUNT_RANGE_MIDPOINT.get(amount_range, Decimal("5"))
    return (avg_price * kg).quantize(Decimal("1"))


def estimate_value_for_items(items) -> Decimal:
    """items: iterable of (material, weight_kg) — used by the multi-material wizard."""
    total = Decimal("0")
    for material, weight_kg in items:
        price = material.current_price or Decimal("0")
        total += price * Decimal(str(weight_kg))
    return total.quantize(Decimal("1"))


def log_status(request: CollectionRequest, status: str, note: str = "", changed_by=None):
    request.status = status
    request.save(update_fields=["status", "updated_at"])
    CollectionStatusLog.objects.create(request=request, status=status, note=note, changed_by=changed_by)


def haversine_km(lat1, lng1, lat2, lng2):
    if None in (lat1, lng1, lat2, lng2):
        return 9999
    r = 6371
    lat1, lng1, lat2, lng2 = map(radians, [float(lat1), float(lng1), float(lat2), float(lng2)])
    dlat, dlng = lat2 - lat1, lng2 - lng1
    a = sin(dlat / 2) ** 2 + cos(lat1) * cos(lat2) * sin(dlng / 2) ** 2
    return r * 2 * atan2(sqrt(a), sqrt(1 - a))


def find_nearby_open_requests(collector_profile, limit=20):
    """
    Collector job-board (spec section 11): online + approved collectors see
    open (SEARCHING_COLLECTOR) requests ranked by distance, minus any request
    this specific collector already dismissed (فاز ۱۰). Distance is attached
    to each object (`_distance_km`) so the serializer can expose it — the
    active push notification for the nearest candidates lives separately in
    `dispatch_new_request()` below.
    """
    dismissed_ids = RequestDismissal.objects.filter(collector=collector_profile).values_list("request_id", flat=True)
    open_requests = (
        CollectionRequest.objects.filter(status=RequestStatus.SEARCHING_COLLECTOR)
        .exclude(id__in=dismissed_ids)
        .select_related("citizen")
    )
    scored = []
    for req in open_requests:
        dist = haversine_km(collector_profile.current_lat, collector_profile.current_lng, req.lat, req.lng)
        req._distance_km = round(dist, 1) if dist < 9999 else None
        scored.append((dist, req))
    scored.sort(key=lambda x: x[0])
    return [req for _, req in scored[:limit]]


def dismiss_request(collector_profile, request_obj: CollectionRequest):
    """Hide a request from this collector's own nearby list only (فاز ۱۰: دکمه رد کردن)."""
    RequestDismissal.objects.get_or_create(request=request_obj, collector=collector_profile)


def dispatch_new_request(request_obj: CollectionRequest):
    """
    Push-style targeted dispatch (فاز ۱۰ — قدم اول به‌سمت موتور تطبیق واقعی
    مثل اسنپ): به‌جای منتظرماندن تا جمع‌آورها خودشان صفحه‌ی «نزدیک من» را باز
    کنند، بلافاصله بعد از ثبت یک درخواست، به نزدیک‌ترین جمع‌آورهای آنلاین و
    تأییدشده در شعاع DISPATCH_RADIUS_KM نوتیفیکیشن هدفمند فرستاده می‌شود.
    هنوز صف مشترک (اولین قبول‌کننده می‌برد) دست‌نخورده می‌ماند — این فقط
    آگاه‌سازی است، نه قفل‌کردن درخواست برای یک جمع‌آور خاص.
    """
    from notifications.services import notify
    from collectors.models import CollectorProfile

    if request_obj.lat is None or request_obj.lng is None:
        return
    candidates = CollectorProfile.objects.filter(
        is_online=True, verification_status="APPROVED",
        current_lat__isnull=False, current_lng__isnull=False,
    ).select_related("user")
    scored = []
    for c in candidates:
        dist = haversine_km(c.current_lat, c.current_lng, request_obj.lat, request_obj.lng)
        if dist <= DISPATCH_RADIUS_KM:
            scored.append((dist, c))
    scored.sort(key=lambda x: x[0])
    for dist, collector in scored[:DISPATCH_MAX_COLLECTORS]:
        notify(
            collector.user,
            "درخواست جمع‌آوری جدید نزدیک شما",
            f"یک درخواست جدید حدود {dist:.1f} کیلومتر با شماست — همین حالا در دسترس است.",
            link="/collector",
        )


@transaction.atomic
def accept_request(collector_profile, request_obj: CollectionRequest):
    if request_obj.status != RequestStatus.SEARCHING_COLLECTOR:
        raise ValueError("این درخواست دیگر در دسترس نیست.")
    if collector_profile.verification_status != "APPROVED":
        # Defense-in-depth: ToggleOnlineView already blocks a non-approved
        # collector from going online, but this guards direct API calls too
        # (e.g. a collector suspended mid-session, or a stale client).
        raise ValueError("حساب شما تأیید نشده یا تعلیق شده است و امکان پذیرش درخواست را ندارید.")
    assignment = CollectionAssignment.objects.create(
        request=request_obj, collector=collector_profile, accepted_at=timezone.now()
    )
    log_status(request_obj, RequestStatus.ACCEPTED, note="جمع‌آور پذیرفت", changed_by=collector_profile.user)

    # فاز ۱۱: پیامک واقعی به شهروند — یک‌بار در طول عمر درخواست، پس حجم/هزینهٔ
    # پیامک محدود می‌ماند (برخلاف دیسپچ به جمع‌آورها که عمداً فقط درون‌برنامه‌ای
    # ماند تا هزینهٔ پیامک به چند گیرنده به‌ازای هر درخواست باز نشود).
    from notifications.services import notify

    notify(
        request_obj.citizen,
        "درخواست شما پذیرفته شد",
        f"جمع‌آور درخواست #{request_obj.code} شما را پذیرفت و به‌زودی مراجعه می‌کند.",
        link=f"/requests/{request_obj.uid}",
        channel="SMS",
    )
    return assignment


@transaction.atomic
def complete_weighing(request_obj: CollectionRequest, material, weight_kg: Decimal, weighed_by=None) -> WeighingRecord:
    from core.services import get_points_per_kg
    from wallet.services import credit_wallet
    from rewards.services import award_points
    from wallet.models import WalletTransactionType

    unit_price = material.current_price or Decimal("0")
    total_value = (unit_price * weight_kg).quantize(Decimal("1"))
    points = int((get_points_per_kg() * weight_kg).quantize(Decimal("1")))

    record = WeighingRecord.objects.create(
        request=request_obj, material=material, weight_kg=weight_kg,
        unit_price_snapshot=unit_price, total_value=total_value,
        points_awarded=points, weighed_by=weighed_by,
    )
    credit_wallet(
        request_obj.citizen, total_value, WalletTransactionType.CREDIT,
        description=f"بابت تحویل {weight_kg} کیلوگرم {material.name}", reference=request_obj.code,
    )
    award_points(request_obj.citizen, points, "COLLECTION", description=f"تحویل پسماند {request_obj.code}", reference=request_obj.code)

    assignment = getattr(request_obj, "assignment", None)
    if assignment:
        assignment.collected_at = assignment.collected_at or timezone.now()
        assignment.save(update_fields=["collected_at"])
        collector = assignment.collector
        collector.completed_jobs += 1
        collector.save(update_fields=["completed_jobs"])

    log_status(request_obj, RequestStatus.COMPLETED, note="وزن‌کشی و تسویه انجام شد", changed_by=weighed_by)

    # فاز ۱۱: پیامک تأیید واریز — رویدادی که کاربران ایرانی فرهنگاً انتظار
    # پیامک بانکی‌مانند برایش دارند؛ یک‌بار در طول عمر درخواست.
    from notifications.services import notify

    notify(
        request_obj.citizen,
        "تسویه انجام شد",
        f"وزن‌کشی درخواست #{request_obj.code} انجام شد و {int(total_value):,} تومان به کیف‌پولت واریز شد.",
        link=f"/requests/{request_obj.uid}",
        channel="SMS",
    )
    return record


@transaction.atomic
def admin_edit_request(request_obj: CollectionRequest, changes: dict, reason: str, changed_by=None):
    """
    Admin corrects request details (address/description) — spec ask: "اصلاح"
    from the admin dashboard. Deliberately limited to non-financial,
    non-status fields so this can never be used to silently move a request
    through the pipeline; every edit is logged with a mandatory reason.
    """
    if not reason:
        raise ValueError("ذکر دلیل اصلاح الزامی است.")
    allowed_fields = {"address_text_snapshot", "description"}
    applied = {}
    for field, value in (changes or {}).items():
        if field in allowed_fields:
            setattr(request_obj, field, value)
            applied[field] = value
    if not applied:
        raise ValueError("هیچ فیلد قابل‌ویرایشی ارسال نشده است.")
    request_obj.save(update_fields=list(applied.keys()) + ["updated_at"])
    CollectionStatusLog.objects.create(
        request=request_obj, status=request_obj.status,
        note=f"ویرایش توسط مدیر ({'، '.join(applied.keys())}) — دلیل: {reason}",
        changed_by=changed_by,
    )
    return request_obj


@transaction.atomic
def admin_override_weighing(request_obj: CollectionRequest, weight_kg: Decimal, reason: str, changed_by=None, total_value: Decimal = None):
    """
    Admin corrects an already-settled weighing (spec ask: "اصلاح" a
    completed request). Reverses/reissues the wallet credit and the green
    points delta so the citizen's balance always reflects the corrected
    numbers, never a stale duplicate — with a mandatory reason logged both
    on the request timeline and as its own wallet ledger row.
    """
    from wallet.services import adjust_wallet
    from wallet.models import WalletTransactionType
    from rewards.services import award_points
    from core.services import get_points_per_kg

    if not reason:
        raise ValueError("ذکر دلیل اصلاح الزامی است.")
    record = getattr(request_obj, "weighing", None)
    if not record:
        raise ValueError("این درخواست هنوز وزن‌کشی نشده است.")
    if weight_kg <= 0:
        raise ValueError("وزن باید بزرگ‌تر از صفر باشد.")

    old_total, old_points = record.total_value, record.points_awarded
    new_total = total_value if total_value is not None else (record.unit_price_snapshot * weight_kg).quantize(Decimal("1"))
    new_points = int((get_points_per_kg() * weight_kg).quantize(Decimal("1")))
    value_diff, points_diff = new_total - old_total, new_points - old_points

    record.weight_kg = weight_kg
    record.total_value = new_total
    record.points_awarded = new_points
    record.save(update_fields=["weight_kg", "total_value", "points_awarded"])

    if value_diff != 0:
        adjust_wallet(
            request_obj.citizen, value_diff,
            WalletTransactionType.REFUND if value_diff > 0 else WalletTransactionType.DEBIT,
            description=f"اصلاح ادمین وزن‌کشی {request_obj.code} — دلیل: {reason}", reference=request_obj.code,
        )
    if points_diff != 0:
        award_points(
            request_obj.citizen, points_diff, "ADMIN_ADJUST",
            description=f"اصلاح ادمین وزن‌کشی {request_obj.code}", reference=request_obj.code,
        )

    CollectionStatusLog.objects.create(
        request=request_obj, status=request_obj.status,
        note=f"اصلاح وزن‌کشی توسط مدیر ({old_total} ← {new_total} تومان) — دلیل: {reason}",
        changed_by=changed_by,
    )
    return record


def _advance_next_run_date(schedule, today):
    from .models import RecurrenceFrequency

    if schedule.frequency == RecurrenceFrequency.WEEKLY:
        return today + timedelta(days=7)
    if schedule.frequency == RecurrenceFrequency.BIWEEKLY:
        return today + timedelta(days=14)
    # MONTHLY: jump ~1 month, clamped to a valid day
    year = today.year + (1 if today.month == 12 else 0)
    month = 1 if today.month == 12 else today.month + 1
    day = min(schedule.day_of_month or today.day, 28)
    from datetime import date

    return date(year, month, day)


@transaction.atomic
def generate_due_recurring_requests(today=None):
    """
    Run daily (management command generate_recurring_requests, wired to a free
    PythonAnywhere scheduled task). Creates a real CollectionRequest + items
    for every active RecurringSchedule whose next_run_date has arrived, then
    advances the schedule (spec ask: جمع‌آوری هفتگی/ماهانه خودکار).
    """
    from datetime import datetime, time
    from .models import RecurringSchedule, CollectionRequestItem

    today = today or timezone.localdate()
    due = RecurringSchedule.objects.filter(is_active=True, next_run_date__lte=today).select_related("citizen", "address")
    created = []
    for schedule in due:
        materials = list(schedule.materials.all())
        if not materials:
            schedule.next_run_date = _advance_next_run_date(schedule, today)
            schedule.save(update_fields=["next_run_date", "updated_at"])
            continue
        preferred_dt = timezone.make_aware(datetime.combine(today, time(hour=schedule.preferred_hour or 9)))
        req = CollectionRequest.objects.create(
            citizen=schedule.citizen,
            address=schedule.address,
            address_text_snapshot=schedule.address.full_address,
            lat=schedule.address.lat,
            lng=schedule.address.lng,
            preferred_time=preferred_dt,
            description="ایجاد خودکار از جمع‌آوری دوره‌ای",
        )
        req.materials.set(materials)
        default_weight = Decimal("5")
        for m in materials:
            CollectionRequestItem.objects.create(request=req, material=m, weight_kg=default_weight, is_exact=False)
        req.estimated_value = estimate_value_for_items([(m, default_weight) for m in materials])
        req.save(update_fields=["estimated_value"])
        log_status(req, RequestStatus.SEARCHING_COLLECTOR, note="درخواست دوره‌ای خودکار", changed_by=schedule.citizen)
        dispatch_new_request(req)

        schedule.last_generated_request = req
        schedule.next_run_date = _advance_next_run_date(schedule, today)
        schedule.save(update_fields=["last_generated_request", "next_run_date", "updated_at"])
        created.append(req)
    return created
