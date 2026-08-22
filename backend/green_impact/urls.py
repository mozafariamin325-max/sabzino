from django.urls import path
from rest_framework.routers import DefaultRouter
from .views import (
    ImpactProjectViewSet, ContributeView, MyContributionsView, MyGreenImpactView, ImpactDashboardView,
    MyPendingDonationsView,
)

router = DefaultRouter()
router.register("projects", ImpactProjectViewSet, basename="impact-project")

urlpatterns = [
    path("contribute/", ContributeView.as_view(), name="green-impact-contribute"),
    path("contributions/", MyContributionsView.as_view(), name="green-impact-contributions"),
    path("pending-donations/", MyPendingDonationsView.as_view(), name="green-impact-pending-donations"),
    path("my-impact/", MyGreenImpactView.as_view(), name="green-impact-my-impact"),
    path("dashboard/", ImpactDashboardView.as_view(), name="green-impact-dashboard"),
] + router.urls
