from decimal import Decimal, InvalidOperation
from rest_framework import views, generics, permissions, status
from rest_framework.response import Response
from .models import Wallet, WalletTransaction, WithdrawalRequest, WalletTransactionType
from .serializers import WalletSerializer, WalletTransactionSerializer, WithdrawalRequestSerializer
from .services import ensure_wallet, debit_wallet


class MyWalletView(views.APIView):
    def get(self, request):
        wallet = ensure_wallet(request.user)
        return Response({"success": True, "wallet": WalletSerializer(wallet).data})


class MyTransactionsView(generics.ListAPIView):
    serializer_class = WalletTransactionSerializer

    def get_queryset(self):
        wallet = ensure_wallet(self.request.user)
        return wallet.transactions.all()


class RequestWithdrawalView(views.APIView):
    def post(self, request):
        wallet = ensure_wallet(request.user)
        try:
            amount = Decimal(str(request.data.get("amount")))
        except (InvalidOperation, TypeError):
            return Response({"success": False, "message": "مبلغ نامعتبر است."}, status=400)
        if amount <= 0 or amount > wallet.balance:
            return Response({"success": False, "message": "موجودی کافی نیست."}, status=400)
        sheba = request.data.get("sheba_number", "")
        # reserve funds immediately so balance can't be double-spent while pending review
        debit_wallet(request.user, amount, WalletTransactionType.WITHDRAWAL, description="درخواست برداشت وجه")
        wr = WithdrawalRequest.objects.create(wallet=wallet, amount=amount, sheba_number=sheba)
        return Response(
            {"success": True, "message": "درخواست برداشت ثبت شد.", "withdrawal": WithdrawalRequestSerializer(wr).data},
            status=status.HTTP_201_CREATED,
        )


class MyWithdrawalsView(generics.ListAPIView):
    serializer_class = WithdrawalRequestSerializer

    def get_queryset(self):
        wallet = ensure_wallet(self.request.user)
        return wallet.withdrawal_requests.all()
