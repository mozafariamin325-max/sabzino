from decimal import Decimal, InvalidOperation
from django.db import transaction
from rest_framework import views, generics, viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import Wallet, WalletTransaction, WithdrawalRequest, WalletTransactionType
from .serializers import (
    WalletSerializer, WalletTransactionSerializer, WithdrawalRequestSerializer, AdminWithdrawalRequestSerializer,
)
from .services import ensure_wallet, debit_wallet, credit_wallet


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


class AdminWithdrawalViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Admin panel for the "برداشت وجه" queue (citizen + collector withdrawal
    requests both land here — same Wallet/WithdrawalRequest model for both).
    Money movement itself (the actual bank transfer) stays a manual,
    human step outside this app — this workflow only tracks and audits the
    decision (per product decision: semi-manual withdrawals, no live
    payment-gateway integration in this MVP).
    """

    queryset = WithdrawalRequest.objects.select_related("wallet__user", "processed_by").all().order_by("-created_at")
    serializer_class = AdminWithdrawalRequestSerializer
    permission_classes = [permissions.IsAdminUser]
    filterset_fields = ["status"]
    lookup_field = "uid"
    pagination_class = None

    @action(detail=True, methods=["post"])
    @transaction.atomic
    def approve(self, request, uid=None):
        wr = self.get_object()
        if wr.status != "PENDING":
            return Response({"success": False, "message": "این درخواست دیگر در وضعیت «در انتظار بررسی» نیست."}, status=400)
        wr.status = "APPROVED"
        wr.note = request.data.get("note", "")
        wr.processed_by = request.user
        wr.save(update_fields=["status", "note", "processed_by", "updated_at"])
        return Response({"success": True, "message": "درخواست برداشت تأیید شد. لطفاً مبلغ را به شماره شبا واریز و سپس «پرداخت‌شد» را ثبت کنید."})

    @action(detail=True, methods=["post"])
    @transaction.atomic
    def reject(self, request, uid=None):
        wr = self.get_object()
        if wr.status != "PENDING":
            return Response({"success": False, "message": "این درخواست دیگر در وضعیت «در انتظار بررسی» نیست."}, status=400)
        # the amount was reserved (debited) the moment the withdrawal was requested — refund it now
        credit_wallet(
            wr.wallet.user, wr.amount, WalletTransactionType.REFUND,
            description="بازگشت وجه درخواست برداشت ردشده", reference=str(wr.uid),
        )
        wr.status = "REJECTED"
        wr.note = request.data.get("note", "")
        wr.processed_by = request.user
        wr.save(update_fields=["status", "note", "processed_by", "updated_at"])
        return Response({"success": True, "message": "درخواست برداشت رد شد و مبلغ به کیف پول کاربر بازگشت داده شد."})

    @action(detail=True, methods=["post"])
    @transaction.atomic
    def mark_paid(self, request, uid=None):
        wr = self.get_object()
        if wr.status != "APPROVED":
            return Response({"success": False, "message": "ابتدا باید درخواست تأیید شده باشد."}, status=400)
        wr.status = "PAID"
        note = request.data.get("note", "")
        if note:
            wr.note = note
        wr.processed_by = request.user
        wr.save(update_fields=["status", "note", "processed_by", "updated_at"])
        return Response({"success": True, "message": "پرداخت ثبت شد."})
