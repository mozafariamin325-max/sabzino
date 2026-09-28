from django.db import transaction
from django.utils import timezone
from rest_framework import views, generics, viewsets, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import Challenge, FieldEvent, FieldEventRegistration
from .services import ensure_points_account
from .serializers import (
    GreenPointAccountSerializer, GreenPointTransactionSerializer, ChallengeSerializer,
    UserBadgeSerializer, FieldEventSerializer, FieldEventRegistrationSerializer,
)


class MyPointsView(views.APIView):
    def get(self, request):
        account = ensure_points_account(request.user)
        return Response({"success": True, "points": GreenPointAccountSerializer(account).data})


class MyPointTransactionsView(generics.ListAPIView):
    serializer_class = GreenPointTransactionSerializer

    def get_queryset(self):
        account = ensure_points_account(self.request.user)
        return account.transactions.all()


class MyBadgesView(generics.ListAPIView):
    serializer_class = UserBadgeSerializer

    def get_queryset(self):
        return self.request.user.badges.select_related("badge")


class ChallengeViewSet(viewsets.ModelViewSet):
    """ماموریت‌های امتیازی: خواندن برای همه، ساخت/ویرایش/حذف فقط مدیر (از داشبورد)."""

    queryset = Challenge.objects.filter(is_active=True)
    serializer_class = ChallengeSerializer

    def get_permissions(self):
        return [permissions.AllowAny()] if self.request.method in permissions.SAFE_METHODS else [permissions.IsAdminUser()]

    def get_queryset(self):
        u = self.request.user
        if u.is_authenticated and u.is_staff and (self.request.query_params.get("all") or self.request.method not in permissions.SAFE_METHODS):
            return Challenge.objects.all().order_by("-id")
        return super().get_queryset()


class FieldEventViewSet(viewsets.ModelViewSet):
    """چالش‌های میدانی: فهرست عمومی، ثبت‌نام کاربر واردشده، مدیریت و فهرست شرکت‌کنندگان برای مدیر."""

    queryset = FieldEvent.objects.filter(is_active=True)
    serializer_class = FieldEventSerializer
    lookup_field = "uid"
    pagination_class = None

    def get_permissions(self):
        if self.action == "register":
            return [permissions.IsAuthenticated()]
        if self.request.method in permissions.SAFE_METHODS and self.action != "participants":
            return [permissions.AllowAny()]
        return [permissions.IsAdminUser()]

    def get_queryset(self):
        u = self.request.user
        staff = u.is_authenticated and u.is_staff
        if staff and (self.request.query_params.get("all") or self.request.method not in permissions.SAFE_METHODS or self.action == "participants"):
            return FieldEvent.objects.all()
        # عموم: فقط چالش‌های فعال و پیش‌رو
        return FieldEvent.objects.filter(is_active=True, event_date__gte=timezone.now())

    @action(detail=True, methods=["post", "delete"], url_path="register")
    def register(self, request, uid=None):
        with transaction.atomic():
            event = FieldEvent.objects.select_for_update().filter(uid=uid, is_active=True).first()
            if not event or event.event_date < timezone.now():
                return Response({"success": False, "message": "این چالش دیگر باز نیست."}, status=400)
            existing = FieldEventRegistration.objects.filter(event=event, user=request.user)
            if request.method == "DELETE":
                existing.delete()
            elif not existing.exists():
                if event.registrations.count() >= event.capacity:
                    return Response({"success": False, "message": "ظرفیت این چالش تکمیل شده است."}, status=400)
                u = request.user
                full_name = f"{u.first_name} {u.last_name}".strip() or u.username
                FieldEventRegistration.objects.create(
                    event=event, user=u, full_name=full_name, phone_number=u.phone_number or "",
                    note=str(request.data.get("note", ""))[:200],
                )
        return Response({"success": True, "event": FieldEventSerializer(event, context={"request": request}).data})

    @action(detail=True, methods=["get"], url_path="participants")
    def participants(self, request, uid=None):
        event = self.get_object()
        return Response({
            "success": True,
            "participants": FieldEventRegistrationSerializer(event.registrations.all(), many=True).data,
        })


class LeaderboardView(views.APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        from .models import GreenPointAccount
        top = GreenPointAccount.objects.select_related("user").order_by("-points")[:20]
        data = [
            {
                "rank": i + 1,
                "name": a.user.get_full_name() or a.user.username,
                "points": a.points,
                "level": a.level,
            }
            for i, a in enumerate(top)
        ]
        return Response({"success": True, "leaderboard": data})


class NeighborhoodLeaderboardView(views.APIView):
    """
    "محله سبز" — ranks neighborhoods (Address.district text on the request's
    delivery address) by total recycled weight, to create positive
    competition between neighborhoods (spec section 8). Uses the district
    string already collected on every address rather than requiring a new
    FK, so it works with existing data immediately.
    """

    permission_classes = [permissions.AllowAny]

    def get(self, request):
        from django.db.models import Sum, Count
        from collection_requests.models import WeighingRecord

        rows = (
            WeighingRecord.objects.select_related("request", "request__address")
            .exclude(request__address__district="")
            .exclude(request__address__district__isnull=True)
            .values("request__address__district")
            .annotate(
                total_weight=Sum("weight_kg"),
                active_users=Count("request__citizen", distinct=True),
            )
            .order_by("-total_weight")[:20]
        )
        data = [
            {
                "rank": i + 1,
                "neighborhood": r["request__address__district"],
                "total_weight_kg": r["total_weight"] or 0,
                "active_users": r["active_users"],
            }
            for i, r in enumerate(rows)
        ]
        return Response({"success": True, "leaderboard": data})
