from datetime import timedelta
from django.db.models import Sum, Count, Case, When, F, DecimalField
from django.utils import timezone
from rest_framework import views, permissions
from rest_framework.response import Response

from accounts.models import User, OrganizationDetail, ProfileChangeRequest
from collection_requests.models import CollectionRequest, WeighingRecord, RequestStatus
from collectors.models import CollectorProfile
from stations.models import RecyclingStation, StationTransaction
from marketplace.models import RecyclingCenter, Factory, Wholesaler, Business, InventoryMovement
from orders.models import Order
from wallet.models import Wallet
from rewards.models import Challenge


class AdminDashboardView(views.APIView):
    """Central Admin KPI dashboard (spec sections 33-34)."""

    permission_classes = [permissions.IsAdminUser]

    def get(self, request):
        days = int(request.query_params.get("days", 30))
        since = timezone.now() - timedelta(days=days)

        total_waste_collection = WeighingRecord.objects.aggregate(w=Sum("weight_kg"))["w"] or 0
        total_waste_station = StationTransaction.objects.aggregate(w=Sum("weight_kg"))["w"] or 0
        gmv = Order.objects.exclude(status="CANCELLED").aggregate(t=Sum("total"))["t"] or 0
        revenue = Order.objects.exclude(status="CANCELLED").aggregate(c=Sum("commission_amount"))["c"] or 0

        pending_breakdown = {
            "collectors": CollectorProfile.objects.filter(verification_status="PENDING").count(),
            "recycling_centers": RecyclingCenter.objects.filter(verification_status="PENDING").count(),
            "factories": Factory.objects.filter(verification_status="PENDING").count(),
            "wholesalers": Wholesaler.objects.filter(verification_status="PENDING").count(),
            "businesses": Business.objects.filter(verification_status="PENDING").count(),
            "organizations": OrganizationDetail.objects.filter(verification_status="PENDING").count(),
            "profile_changes": ProfileChangeRequest.objects.filter(status="PENDING").count(),
        }

        data = {
            "total_users": User.objects.count(),
            "active_users_period": User.objects.filter(last_login__gte=since).count(),
            "collectors_total": CollectorProfile.objects.count(),
            "collectors_pending_verification": pending_breakdown["collectors"],
            "stations_total": RecyclingStation.objects.filter(is_active=True).count(),
            "recycling_centers_total": RecyclingCenter.objects.count(),
            "factories_total": Factory.objects.count(),
            "wholesalers_total": Wholesaler.objects.count(),
            "collection_requests_total": CollectionRequest.objects.count(),
            "collection_requests_period": CollectionRequest.objects.filter(created_at__gte=since).count(),
            "completed_collections_period": CollectionRequest.objects.filter(created_at__gte=since, status=RequestStatus.COMPLETED).count(),
            "total_waste_kg": float(total_waste_collection) + float(total_waste_station),
            "orders_total": Order.objects.count(),
            "gmv_total": float(gmv),
            "platform_revenue_total": float(revenue),
            "wallet_total_balance": float(Wallet.objects.aggregate(b=Sum("balance"))["b"] or 0),
            "pending_verifications": sum(pending_breakdown.values()),
            "pending_verifications_breakdown": pending_breakdown,
            "active_challenges": Challenge.objects.filter(is_active=True).count(),
        }
        return Response({"success": True, "dashboard": data, "note": "برخی داده‌ها بر پایه داده نمونه (Demo Seed) محاسبه شده‌اند."})


class VerificationCenterView(views.APIView):
    """
    Unified list of everything awaiting Admin approval (spec section 37):
    collectors, organizational customers, and org seller/buyer profiles
    (recycling centers / factories / wholesalers / businesses) + pending
    profile-change requests. Each row carries its own approve/reject API path
    so the frontend can act without knowing per-type endpoint shapes.
    """

    permission_classes = [permissions.IsAdminUser]

    def get(self, request):
        items = []

        for c in CollectorProfile.objects.filter(verification_status="PENDING").select_related("user"):
            items.append({
                "type": "collector", "id": c.id, "label": c.user.get_full_name() or c.user.username,
                "detail": f"جمع‌آور — {c.city}", "created_at": c.created_at,
                "approve_url": f"/api/v1/collectors/admin/{c.id}/approve/",
                "reject_url": f"/api/v1/collectors/admin/{c.id}/reject/", "action": "post",
            })
        for org in OrganizationDetail.objects.filter(verification_status="PENDING").select_related("user"):
            items.append({
                "type": "organization", "id": org.id, "label": org.center_name,
                "detail": f"مشتری سازمانی — مدیر: {org.manager_name}", "created_at": org.created_at,
                "approve_url": f"/api/v1/auth/admin/organizations/{org.id}/approve/",
                "reject_url": f"/api/v1/auth/admin/organizations/{org.id}/reject/", "action": "post",
            })
        for model, type_name, url_prefix in [
            (RecyclingCenter, "recycling_center", "recycling-centers"),
            (Factory, "factory", "factories"),
            (Wholesaler, "wholesaler", "wholesalers"),
            (Business, "business", "businesses"),
        ]:
            for obj in model.objects.filter(verification_status="PENDING").select_related("user"):
                items.append({
                    "type": type_name, "id": obj.id, "label": obj.name,
                    "detail": f"{obj._meta.verbose_name} — {obj.city}", "created_at": obj.created_at,
                    "approve_url": f"/api/v1/marketplace/{url_prefix}/{obj.uid}/approve/",
                    "reject_url": f"/api/v1/marketplace/{url_prefix}/{obj.uid}/reject/", "action": "post",
                })
        for change in ProfileChangeRequest.objects.filter(status="PENDING").select_related("user"):
            items.append({
                "type": "profile_change", "id": change.id, "label": change.user.get_full_name() or change.user.username,
                "detail": f"تغییر {change.get_field_name_display()}: «{change.old_value}» ← «{change.new_value}»",
                "created_at": change.created_at,
                "approve_url": f"/api/v1/auth/admin/profile-change-requests/{change.id}/approve/",
                "reject_url": f"/api/v1/auth/admin/profile-change-requests/{change.id}/reject/", "action": "post",
            })

        items.sort(key=lambda i: i["created_at"], reverse=True)
        return Response({"success": True, "count": len(items), "items": items})


class ChartsView(views.APIView):
    """Time-series for admin dashboard charts (spec section 34): requests, waste, sales, in/out."""

    permission_classes = [permissions.IsAdminUser]

    def get(self, request):
        days = int(request.query_params.get("days", 30))
        since = (timezone.now() - timedelta(days=days)).date()

        requests_by_day = (
            CollectionRequest.objects.filter(created_at__date__gte=since)
            .extra(select={"day": "date(created_at)"})
            .values("day")
            .annotate(count=Count("id"))
            .order_by("day")
        )
        weight_by_day = (
            WeighingRecord.objects.filter(created_at__date__gte=since)
            .extra(select={"day": "date(created_at)"})
            .values("day")
            .annotate(total=Sum("weight_kg"))
            .order_by("day")
        )
        sales_by_day = (
            Order.objects.exclude(status="CANCELLED").filter(created_at__date__gte=since)
            .extra(select={"day": "date(created_at)"})
            .values("day")
            .annotate(total=Sum("total"), count=Count("id"))
            .order_by("day")
        )
        inventory_by_day = (
            InventoryMovement.objects.filter(created_at__date__gte=since)
            .extra(select={"day": "date(created_at)"})
            .values("day")
            .annotate(
                in_kg=Sum(Case(When(direction="IN", then=F("weight_kg")), default=0, output_field=DecimalField())),
                out_kg=Sum(Case(When(direction="OUT", then=F("weight_kg")), default=0, output_field=DecimalField())),
            )
            .order_by("day")
        )
        return Response({
            "success": True,
            "requests_by_day": list(requests_by_day),
            "weight_by_day": list(weight_by_day),
            "sales_by_day": list(sales_by_day),
            "inventory_by_day": list(inventory_by_day),
        })
