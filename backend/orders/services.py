from decimal import Decimal
from django.db import transaction
from core.services import get_commission_percent
from .models import Order, OrderItem, CommissionRule, CommissionTransaction, OrderStatus


def resolve_commission_percent(order_type: str, material=None, city: str = "", role: str = "") -> tuple[Decimal, CommissionRule | None]:
    """Most-specific active CommissionRule wins; falls back to the global admin-tunable default."""
    qs = CommissionRule.objects.filter(order_type=order_type, is_active=True)
    candidates = list(qs)
    scored = []
    for rule in candidates:
        if rule.material_id and material and rule.material_id != material.id:
            continue
        if rule.material_id and not material:
            continue
        if rule.city and rule.city != city:
            continue
        if rule.role and rule.role != role:
            continue
        specificity = sum([bool(rule.material_id), bool(rule.city), bool(rule.role)])
        scored.append((specificity, rule))
    if scored:
        scored.sort(key=lambda x: -x[0])
        best = scored[0][1]
        return best.percent, best
    return get_commission_percent(), None


@transaction.atomic
def create_order_from_listing(buyer, listing, quantity_kg: Decimal) -> Order:
    if quantity_kg < listing.minimum_order_kg:
        raise ValueError(f"حداقل سفارش {listing.minimum_order_kg} کیلوگرم است.")
    if quantity_kg > listing.quantity_kg:
        raise ValueError("موجودی کافی نیست.")

    subtotal = (listing.price_per_kg * quantity_kg).quantize(Decimal("1"))
    percent, rule = resolve_commission_percent("MARKETPLACE", material=listing.material)
    commission_amount = (subtotal * percent / 100).quantize(Decimal("1"))
    total = subtotal + commission_amount

    order = Order.objects.create(
        buyer=buyer, seller=listing.seller, listing=listing,
        subtotal=subtotal, commission_percent=percent, commission_amount=commission_amount,
        total=total, status=OrderStatus.PENDING,
    )
    OrderItem.objects.create(
        order=order, material=listing.material, quantity_kg=quantity_kg,
        unit_price=listing.price_per_kg, line_total=subtotal,
    )
    CommissionTransaction.objects.create(order=order, rule=rule, percent_applied=percent, amount=commission_amount)

    listing.quantity_kg -= quantity_kg
    if listing.quantity_kg <= 0:
        listing.status = "SOLD"
    else:
        listing.status = "RESERVED"
    listing.save(update_fields=["quantity_kg", "status", "updated_at"])
    return order


@transaction.atomic
def create_order_from_offer(offer) -> Order:
    purchase_request = offer.purchase_request
    subtotal = (offer.price_per_kg * offer.quantity_kg).quantize(Decimal("1"))
    percent, rule = resolve_commission_percent("MARKETPLACE", material=purchase_request.material)
    commission_amount = (subtotal * percent / 100).quantize(Decimal("1"))
    total = subtotal + commission_amount

    order = Order.objects.create(
        buyer=purchase_request.buyer, seller=offer.seller, offer=offer,
        subtotal=subtotal, commission_percent=percent, commission_amount=commission_amount,
        total=total, status=OrderStatus.PENDING,
    )
    OrderItem.objects.create(
        order=order, material=purchase_request.material, quantity_kg=offer.quantity_kg,
        unit_price=offer.price_per_kg, line_total=subtotal,
    )
    CommissionTransaction.objects.create(order=order, rule=rule, percent_applied=percent, amount=commission_amount)
    purchase_request.status = "FULFILLED"
    purchase_request.save(update_fields=["status", "updated_at"])
    return order
