from django.urls import path
from .views import AdminDashboardView, ChartsView

urlpatterns = [
    path("admin-dashboard/", AdminDashboardView.as_view(), name="admin-dashboard"),
    path("charts/", ChartsView.as_view(), name="admin-charts"),
]
