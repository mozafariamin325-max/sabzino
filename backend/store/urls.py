from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    StorePartnerViewSet, RequestRedemptionView, MyRedemptionsView, AdminStoreRedemptionViewSet,
)

router = DefaultRouter()
router.register("partners", StorePartnerViewSet, basename="store-partner")
router.register("admin/redemptions", AdminStoreRedemptionViewSet, basename="admin-store-redemption")

urlpatterns = [
    path("redemptions/", MyRedemptionsView.as_view(), name="store-redemptions"),
    path("redemptions/request/", RequestRedemptionView.as_view(), name="store-redeem-request"),
    path("", include(router.urls)),
]
