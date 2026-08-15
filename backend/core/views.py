from datetime import timedelta
from django.db.models import Sum, Count
from django.utils import timezone
from rest_framework import views, permissions
from rest_framework.response import Response

from accounts.models import User
from collection_requests.models import CollectionRequest, WeighingRecord, RequestStatus
from collectors.models import CollectorProfile
from stations.models import RecyclingStation, StationTransaction
from marketplace.models import RecyclingCenter, Factory, Wholesaler
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

        data = {
            "total_users": User.objects.count(),
            "active_users_period": User.objects.filter(last_login__gte=since).count(),
            "collectors_total": CollectorProfile.objects.count(),
            "collectors_pending_verification": CollectorProfile.objects.filter(verification_status="PENDING").count(),
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
            "pending_verifications": CollectorProfile.objects.filter(verification_status="PENDING").count()
            + RecyclingCenter.objects.filter(verification_status="PENDING").count()
            + Factory.objects.filter(verification_status="PENDING").count()
            + Wholesaler.objects.filter(verification_status="PENDING").count(),
            "active_challenges": Challenge.objects.filter(is_active=True).count(),
        }
        return Response({"success": True, "dashboard": data, "note": "برخی داده‌ها بر پایه داده نمونه (Demo Seed) محاسبه شده‌اند."})


class ChartsView(views.APIView):
    """Time-series for admin dashboard charts (spec section 34): requests + waste per day."""

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
        return Response({
            "success": True,
            "requests_by_day": list(requests_by_day),
            "weight_by_day": list(weight_by_day),
        })
