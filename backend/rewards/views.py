from rest_framework import views, generics, viewsets, permissions
from rest_framework.response import Response
from .models import Challenge
from .services import ensure_points_account
from .serializers import (
    GreenPointAccountSerializer, GreenPointTransactionSerializer, ChallengeSerializer,
    UserBadgeSerializer,
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


class ChallengeViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Challenge.objects.filter(is_active=True)
    serializer_class = ChallengeSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]


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
