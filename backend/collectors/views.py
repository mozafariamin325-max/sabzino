from rest_framework import generics, views, viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from accounts.models import UserRole, Role
from .models import CollectorProfile, Vehicle, CollectorDocument
from .serializers import (
    CollectorProfileSerializer, CollectorRegisterSerializer, VehicleSerializer, CollectorDocumentSerializer,
)


class CollectorRegisterView(views.APIView):
    """Citizen -> Collector self-registration (spec section 7). Starts PENDING until Admin verifies (section 8)."""

    def post(self, request):
        if hasattr(request.user, "collector_profile"):
            return Response({"success": False, "message": "شما قبلاً به‌عنوان جمع‌آور ثبت‌نام کرده‌اید."}, status=400)
        serializer = CollectorRegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        profile = serializer.save(user=request.user)
        UserRole.objects.get_or_create(user=request.user, role=Role.COLLECTOR)
        return Response(
            {"success": True, "message": "درخواست ثبت‌نام جمع‌آور ثبت شد و در انتظار تأیید مدیر است.",
             "collector": CollectorProfileSerializer(profile).data},
            status=status.HTTP_201_CREATED,
        )


class MyCollectorProfileView(views.APIView):
    def get(self, request):
        profile = getattr(request.user, "collector_profile", None)
        if not profile:
            return Response({"success": False, "message": "پروفایل جمع‌آور یافت نشد."}, status=404)
        return Response({"success": True, "collector": CollectorProfileSerializer(profile).data})

    def patch(self, request):
        profile = getattr(request.user, "collector_profile", None)
        if not profile:
            return Response({"success": False, "message": "پروفایل جمع‌آور یافت نشد."}, status=404)
        serializer = CollectorProfileSerializer(profile, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response({"success": True, "collector": serializer.data})


class NearbyCollectorsView(views.APIView):
    """
    Public list of online, approved collectors with a location — feeds the
    citizen-facing "smart map" (spec section 9) alongside stations. Only
    exposes coarse identity (first name + rating), never phone/national ID.
    """

    permission_classes = [permissions.AllowAny]

    def get(self, request):
        from collection_requests.services import haversine_km

        lat, lng = request.query_params.get("lat"), request.query_params.get("lng")
        qs = CollectorProfile.objects.filter(
            is_online=True, verification_status="APPROVED",
            current_lat__isnull=False, current_lng__isnull=False,
        ).select_related("user")
        collectors = list(qs)
        if lat and lng:
            for c in collectors:
                c.distance_km = round(haversine_km(lat, lng, c.current_lat, c.current_lng), 2)
            collectors.sort(key=lambda c: c.distance_km)

        data = [
            {
                "id": c.id,
                "name": c.user.first_name or "جمع‌آور سبزینو",
                "lat": c.current_lat,
                "lng": c.current_lng,
                "rating_avg": c.rating_avg,
                "distance_km": getattr(c, "distance_km", None),
            }
            for c in collectors
        ]
        return Response({"success": True, "collectors": data})


class ToggleOnlineView(views.APIView):
    def post(self, request):
        profile = getattr(request.user, "collector_profile", None)
        if not profile:
            return Response({"success": False, "message": "پروفایل جمع‌آور یافت نشد."}, status=404)
        if not profile.is_approved:
            return Response({"success": False, "message": "پروفایل شما هنوز تأیید نشده است."}, status=403)
        profile.is_online = not profile.is_online
        lat, lng = request.data.get("lat"), request.data.get("lng")
        if lat is not None:
            profile.current_lat = lat
        if lng is not None:
            profile.current_lng = lng
        profile.save(update_fields=["is_online", "current_lat", "current_lng", "updated_at"])
        return Response({"success": True, "is_online": profile.is_online})


class VehicleViewSet(viewsets.ModelViewSet):
    serializer_class = VehicleSerializer

    def get_queryset(self):
        profile = getattr(self.request.user, "collector_profile", None)
        return Vehicle.objects.filter(collector=profile) if profile else Vehicle.objects.none()

    def perform_create(self, serializer):
        serializer.save(collector=self.request.user.collector_profile)


class CollectorDocumentViewSet(viewsets.ModelViewSet):
    serializer_class = CollectorDocumentSerializer

    def get_queryset(self):
        profile = getattr(self.request.user, "collector_profile", None)
        return CollectorDocument.objects.filter(collector=profile) if profile else CollectorDocument.objects.none()

    def perform_create(self, serializer):
        serializer.save(collector=self.request.user.collector_profile)


class AdminCollectorViewSet(viewsets.ModelViewSet):
    """Verification Center (spec section 37) for admins: list/approve/reject collectors."""

    queryset = CollectorProfile.objects.select_related("user").all()
    serializer_class = CollectorProfileSerializer
    permission_classes = [permissions.IsAdminUser]
    filterset_fields = ["verification_status", "city"]
    search_fields = ["user__first_name", "user__last_name", "user__phone_number"]

    @action(detail=True, methods=["post"])
    def approve(self, request, pk=None):
        profile = self.get_object()
        profile.verification_status = "APPROVED"
        profile.verification_note = request.data.get("note", "")
        profile.save(update_fields=["verification_status", "verification_note", "updated_at"])
        return Response({"success": True, "message": "جمع‌آور تأیید شد."})

    @action(detail=True, methods=["post"])
    def reject(self, request, pk=None):
        profile = self.get_object()
        profile.verification_status = "REJECTED"
        profile.verification_note = request.data.get("note", "")
        profile.save(update_fields=["verification_status", "verification_note", "updated_at"])
        return Response({"success": True, "message": "جمع‌آور رد شد."})

    @action(detail=True, methods=["post"])
    def suspend(self, request, pk=None):
        """
        Admin can close/suspend a collector's account at any time (e.g. for
        misconduct or a customer complaint) — required by the "بستن حساب
        راننده" capability. Immediately forces them offline so an
        already-online collector can't keep receiving/accepting requests,
        and accept_request() also re-checks status server-side as a
        defense-in-depth measure against a client that ignores this.
        """
        profile = self.get_object()
        note = request.data.get("note", "")
        if not note:
            return Response({"success": False, "message": "برای تعلیق حساب، ذکر دلیل الزامی است."}, status=400)
        profile.verification_status = "SUSPENDED"
        profile.verification_note = note
        profile.is_online = False
        profile.save(update_fields=["verification_status", "verification_note", "is_online", "updated_at"])
        return Response({"success": True, "message": "حساب جمع‌آور تعلیق شد."})

    @action(detail=True, methods=["post"])
    def reactivate(self, request, pk=None):
        """Restore a SUSPENDED (or previously REJECTED) collector back to APPROVED."""
        profile = self.get_object()
        profile.verification_status = "APPROVED"
        profile.verification_note = request.data.get("note", "")
        profile.save(update_fields=["verification_status", "verification_note", "updated_at"])
        return Response({"success": True, "message": "حساب جمع‌آور فعال شد."})
