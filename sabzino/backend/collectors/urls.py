from django.urls import path
from rest_framework.routers import DefaultRouter
from .views import (
    CollectorRegisterView, MyCollectorProfileView, ToggleOnlineView, NearbyCollectorsView,
    VehicleViewSet, CollectorDocumentViewSet, AdminCollectorViewSet,
)

router = DefaultRouter()
router.register("vehicles", VehicleViewSet, basename="vehicle")
router.register("documents", CollectorDocumentViewSet, basename="collector-document")
router.register("admin", AdminCollectorViewSet, basename="admin-collector")

urlpatterns = [
    path("register/", CollectorRegisterView.as_view(), name="collector-register"),
    path("me/", MyCollectorProfileView.as_view(), name="collector-me"),
    path("me/toggle-online/", ToggleOnlineView.as_view(), name="collector-toggle-online"),
    path("nearby/", NearbyCollectorsView.as_view(), name="collector-nearby"),
] + router.urls
