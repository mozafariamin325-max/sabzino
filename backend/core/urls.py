from django.urls import path
from .views import AdminDashboardView, ChartsView, VerificationCenterView

urlpatterns = [
    path("admin-dashboard/", AdminDashboardView.as_view(), name="admin-dashboard"),
    path("charts/", ChartsView.as_view(), name="admin-charts"),
    path("verification-center/", VerificationCenterView.as_view(), name="verification-center"),
]
