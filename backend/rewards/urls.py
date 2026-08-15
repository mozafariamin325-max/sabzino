from django.urls import path
from rest_framework.routers import DefaultRouter
from .views import MyPointsView, MyPointTransactionsView, MyBadgesView, ChallengeViewSet, LeaderboardView

router = DefaultRouter()
router.register("challenges", ChallengeViewSet, basename="challenge")

urlpatterns = [
    path("points/me/", MyPointsView.as_view(), name="points-me"),
    path("points/transactions/", MyPointTransactionsView.as_view(), name="points-transactions"),
    path("badges/me/", MyBadgesView.as_view(), name="badges-me"),
    path("leaderboard/", LeaderboardView.as_view(), name="leaderboard"),
] + router.urls
