from django.urls import path
from rest_framework.routers import DefaultRouter
from .views import (
    AdminDashboardView, ChartsView, VerificationCenterView, RatingViewSet,
    QRCodeView, GlobalSearchView, AdminExportView, MyImpactView, ClassifyWasteView,
)

router = DefaultRouter()
router.register("ratings", RatingViewSet, basename="rating")

urlpatterns = [
    path("admin-dashboard/", AdminDashboardView.as_view(), name="admin-dashboard"),
    path("charts/", ChartsView.as_view(), name="admin-charts"),
    path("verification-center/", VerificationCenterView.as_view(), name="verification-center"),
    path("qr/", QRCodeView.as_view(), name="qr-code"),
    path("search/", GlobalSearchView.as_view(), name="global-search"),
    path("export/", AdminExportView.as_view(), name="admin-export"),
    path("impact/me/", MyImpactView.as_view(), name="impact-me"),
    path("classify-waste/", ClassifyWasteView.as_view(), name="classify-waste"),
] + router.urls
