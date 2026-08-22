from django.urls import path
from .views import MunicipalityDashboardView, MunicipalityMapView

urlpatterns = [
    path("dashboard/", MunicipalityDashboardView.as_view(), name="municipality-dashboard"),
    path("map/", MunicipalityMapView.as_view(), name="municipality-map"),
]
