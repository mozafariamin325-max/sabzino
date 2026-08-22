from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import MyWalletView, MyTransactionsView, RequestWithdrawalView, MyWithdrawalsView, AdminWithdrawalViewSet

router = DefaultRouter()
router.register("admin/withdrawals", AdminWithdrawalViewSet, basename="admin-withdrawal")

urlpatterns = [
    path("me/", MyWalletView.as_view(), name="wallet-me"),
    path("transactions/", MyTransactionsView.as_view(), name="wallet-transactions"),
    path("withdrawals/", MyWithdrawalsView.as_view(), name="wallet-withdrawals"),
    path("withdrawals/request/", RequestWithdrawalView.as_view(), name="wallet-withdraw-request"),
    path("", include(router.urls)),
]
