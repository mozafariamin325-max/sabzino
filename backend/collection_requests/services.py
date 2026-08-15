from decimal import Decimal
from math import radians, sin, cos, sqrt, atan2
from django.db import transaction
from django.utils import timezone
from .models import CollectionRequest, CollectionStatusLog, CollectionAssignment, RequestStatus, WeighingRecord

# rough midpoint (kg) used only for the "estimated value" shown to the citizen before weighing
AMOUNT_RANGE_MIDPOINT = {
    "UNDER_5": Decimal("3"), "R5_10": Decimal("7.5"), "R10_20": Decimal("15"),
    "R20_50": Decimal("35"), "R50_100": Decimal("75"), "OVER_100": Decimal("120"),
}


def estimate_value(materials_qs, amount_range: str) -> Decimal:
    prices = [m.current_price for m in materials_qs if m.current_price]
    if not prices:
        return Decimal("0")
    avg_price = sum(prices) / len(prices)
    kg = AMOUNT_RANGE_MIDPOINT.get(amount_range, Decimal("5"))
    return (avg_price * kg).quantize(Decimal("1"))


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
    MVP dispatch algorithm (spec section 11): online + approved collectors see
    open (SEARCHING_COLLECTOR) requests ranked by distance. Simple now;
    architecture leaves room for a smarter matching service later.
    """
    open_requests = CollectionRequest.objects.filter(status=RequestStatus.SEARCHING_COLLECTOR).select_related("citizen")
    scored = []
    for req in open_requests:
        dist = haversine_km(collector_profile.current_lat, collector_profile.current_lng, req.lat, req.lng)
        scored.append((dist, req))
    scored.sort(key=lambda x: x[0])
    return [req for _, req in scored[:limit]]


@transaction.atomic
def accept_request(collector_profile, request_obj: CollectionRequest):
    if request_obj.status != RequestStatus.SEARCHING_COLLECTOR:
        raise ValueError("این درخواست دیگر در دسترس نیست.")
    assignment = CollectionAssignment.objects.create(
        request=request_obj, collector=collector_profile, accepted_at=timezone.now()
    )
    log_status(request_obj, RequestStatus.ACCEPTED, note="جمع‌آور پذیرفت", changed_by=collector_profile.user)
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
    return record
