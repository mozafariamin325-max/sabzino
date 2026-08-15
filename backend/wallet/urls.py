from django.urls import path
from .views import MyWalletView, MyTransactionsView, RequestWithdrawalView, MyWithdrawalsView

urlpatterns = [
    path("me/", MyWalletView.as_view(), name="wallet-me"),
    path("transactions/", MyTransactionsView.as_view(), name="wallet-transactions"),
    path("withdrawals/", MyWithdrawalsView.as_view(), name="wallet-withdrawals"),
    path("withdrawals/request/", RequestWithdrawalView.as_view(), name="wallet-withdraw-request"),
]
