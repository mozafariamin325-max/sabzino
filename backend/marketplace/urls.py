from django.urls import path
from rest_framework.routers import DefaultRouter
from .views import (
    RecyclingCenterViewSet, FactoryViewSet, WholesalerViewSet, BusinessViewSet,
    ListingViewSet, PurchaseFromListingView, PurchaseRequestViewSet, OfferViewSet, AcceptOfferView,
    InventoryMovementViewSet, InventoryStockSummaryView,
)

router = DefaultRouter()
router.register("recycling-centers", RecyclingCenterViewSet, basename="recycling-center")
router.register("factories", FactoryViewSet, basename="factory")
router.register("wholesalers", WholesalerViewSet, basename="wholesaler")
router.register("businesses", BusinessViewSet, basename="business")
router.register("listings", ListingViewSet, basename="listing")
router.register("purchase-requests", PurchaseRequestViewSet, basename="purchase-request")
router.register("offers", OfferViewSet, basename="offer")
router.register("inventory", InventoryMovementViewSet, basename="inventory-movement")

urlpatterns = [
    path("listings/<uuid:uid>/purchase/", PurchaseFromListingView.as_view(), name="listing-purchase"),
    path("offers/<uuid:uid>/accept/", AcceptOfferView.as_view(), name="offer-accept"),
    path("inventory/stock-summary/", InventoryStockSummaryView.as_view(), name="inventory-stock-summary"),
] + router.urls
