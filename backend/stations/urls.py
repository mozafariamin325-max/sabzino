from django.urls import path
from rest_framework.routers import DefaultRouter
from .views import RecyclingStationViewSet, StationOperatorTransactionView, MyStationTransactionsView

router = DefaultRouter()
router.register("", RecyclingStationViewSet, basename="station")

urlpatterns = [
    path("operator/transaction/", StationOperatorTransactionView.as_view(), name="station-operator-transaction"),
    path("operator/transactions/", MyStationTransactionsView.as_view(), name="station-operator-transactions"),
] + router.urls
