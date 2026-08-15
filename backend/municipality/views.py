from django.db.models import Sum, Count, Avg
from django.utils import timezone
from datetime import timedelta
from rest_framework import views, permissions
from rest_framework.response import Response
from accounts.models import User
from collection_requests.models import CollectionRequest, WeighingRecord, RequestStatus
from stations.models import RecyclingStation, StationTransaction
from collectors.models import CollectorProfile


class IsMunicipalityOrAdmin(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and (
            request.user.is_staff or hasattr(request.user, "municipality_profile")
        )


class MunicipalityDashboardView(views.APIView):
    """City-wide participation dashboard (spec sections 46-48)."""

    permission_classes = [IsMunicipalityOrAdmin]

    def get(self, request):
        days = int(request.query_params.get("days", 30))
        since = timezone.now() - timedelta(days=days)

        total_collection_waste = WeighingRecord.objects.filter(created_at__gte=since).aggregate(w=Sum("weight_kg"))["w"] or 0
        total_station_waste = StationTransaction.objects.filter(created_at__gte=since).aggregate(w=Sum("weight_kg"))["w"] or 0
        active_citizens = CollectionRequest.objects.filter(created_at__gte=since).values("citizen").distinct().count()

        data = {
            "period_days": days,
            "total_waste_kg": float(total_collection_waste) + float(total_station_waste),
            "collection_requests": CollectionRequest.objects.filter(created_at__gte=since).count(),
            "completed_requests": CollectionRequest.objects.filter(created_at__gte=since, status=RequestStatus.COMPLETED).count(),
            "active_participating_citizens": active_citizens,
            "active_stations": RecyclingStation.objects.filter(is_active=True).count(),
            "approved_collectors": CollectorProfile.objects.filter(verification_status="APPROVED").count(),
            "total_citizens": User.objects.filter(roles__role="CITIZEN").distinct().count(),
        }
        return Response({"success": True, "dashboard": data, "note": "برخی داده‌ها نمونه (Demo) هستند."})


class MunicipalityMapView(views.APIView):
    """Points for the heatmap/map layer (spec section 47): requests + stations with coordinates."""

    permission_classes = [IsMunicipalityOrAdmin]

    def get(self, request):
        requests_points = list(
            CollectionRequest.objects.exclude(lat__isnull=True).values("lat", "lng", "status")[:500]
        )
        station_points = list(RecyclingStation.objects.filter(is_active=True).exclude(lat__isnull=True).values("lat", "lng", "name"))
        return Response({"success": True, "requests": requests_points, "stations": station_points})
