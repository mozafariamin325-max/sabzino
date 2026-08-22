from decimal import Decimal, InvalidOperation
import random
import string

from django.db import transaction
from rest_framework import viewsets, generics, views, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response

from wallet.models import WalletTransactionType
from wallet.services import ensure_wallet, debit_wallet, credit_wallet
from .models import StorePartner, StoreRedemption, StoreRedemptionStatus
from .serializers import StorePartnerSerializer, StoreRedemptionSerializer, AdminStoreRedemptionSerializer


class ReadOnlyOrAdmin(permissions.BasePermission):
    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return True
        return bool(request.user and request.user.is_authenticated and request.user.is_staff)


class StorePartnerViewSet(viewsets.ModelViewSet):
    """
    Catalog of real local businesses that accept a citizen's wallet
    balance. Browsing is open to any logged-in citizen; creating/editing
    partners is admin-only. Citizens only ever see active partners.
    """

    serializer_class = StorePartnerSerializer
    permission_classes = [ReadOnlyOrAdmin]
    filterset_fields = ["category", "is_active"]
    lookup_field = "uid"
    pagination_class = None

    def get_queryset(self):
        qs = StorePartner.objects.all()
        if not (self.request.user and self.request.user.is_authenticated and self.request.user.is_staff):
            qs = qs.filter(is_active=True)
        return qs


def _generate_redemption_code() -> str:
    return "".join(random.choices(string.ascii_uppercase + string.digits, k=6))


class RequestRedemptionView(views.APIView):
    def post(self, request):
        wallet = ensure_wallet(request.user)
        partner_uid = request.data.get("partner")
        try:
            partner = StorePartner.objects.get(uid=partner_uid, is_active=True)
        except (StorePartner.DoesNotExist, ValueError, TypeError):
            return Response({"success": False, "message": "فروشگاه یافت نشد."}, status=404)
        try:
            amount = Decimal(str(request.data.get("amount")))
        except (InvalidOperation, TypeError):
            return Response({"success": False, "message": "مبلغ نامعتبر است."}, status=400)
        if amount <= 0 or amount > wallet.balance:
            return Response({"success": False, "message": "موجودی کیف‌پول کافی نیست."}, status=400)
        # reserve funds immediately so balance can't be double-spent while pending review
        debit_wallet(
            request.user, amount, WalletTransactionType.PURCHASE,
            description=f"درخواست خرید از {partner.name}", reference=str(partner.uid),
        )
        red = StoreRedemption.objects.create(wallet=wallet, partner=partner, amount=amount)
        return Response(
            {"success": True, "message": "درخواست خرید ثبت شد و در انتظار بررسی است.", "redemption": StoreRedemptionSerializer(red).data},
            status=status.HTTP_201_CREATED,
        )


class MyRedemptionsView(generics.ListAPIView):
    serializer_class = StoreRedemptionSerializer

    def get_queryset(self):
        wallet = ensure_wallet(self.request.user)
        return wallet.store_redemptions.select_related("partner").all()


class AdminStoreRedemptionViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Admin queue for reviewing "spend my wallet at a real store" requests —
    same semi-manual review pattern as AdminWithdrawalViewSet (Task G):
    money itself never moves automatically; this only tracks the decision
    and issues a redemption code the citizen shows in person.
    """

    queryset = StoreRedemption.objects.select_related("wallet__user", "partner", "processed_by").all().order_by("-created_at")
    serializer_class = AdminStoreRedemptionSerializer
    permission_classes = [permissions.IsAdminUser]
    filterset_fields = ["status", "partner"]
    lookup_field = "uid"
    pagination_class = None

    @action(detail=True, methods=["post"])
    @transaction.atomic
    def approve(self, request, uid=None):
        red = self.get_object()
        if red.status != StoreRedemptionStatus.PENDING:
            return Response({"success": False, "message": "این درخواست دیگر در وضعیت «در انتظار بررسی» نیست."}, status=400)
        red.status = StoreRedemptionStatus.APPROVED
        red.redemption_code = _generate_redemption_code()
        red.note = request.data.get("note", "")
        red.processed_by = request.user
        red.save(update_fields=["status", "redemption_code", "note", "processed_by", "updated_at"])
        return Response({"success": True, "message": "درخواست تأیید شد و کد استفاده صادر شد.", "redemption_code": red.redemption_code})

    @action(detail=True, methods=["post"])
    @transaction.atomic
    def reject(self, request, uid=None):
        red = self.get_object()
        if red.status != StoreRedemptionStatus.PENDING:
            return Response({"success": False, "message": "این درخواست دیگر در وضعیت «در انتظار بررسی» نیست."}, status=400)
        # the amount was reserved (debited) the moment the redemption was requested — refund it now
        credit_wallet(
            red.wallet.user, red.amount, WalletTransactionType.REFUND,
            description="بازگشت وجه درخواست خرید ردشده", reference=str(red.uid),
        )
        red.status = StoreRedemptionStatus.REJECTED
        red.note = request.data.get("note", "")
        red.processed_by = request.user
        red.save(update_fields=["status", "note", "processed_by", "updated_at"])
        return Response({"success": True, "message": "درخواست رد شد و مبلغ به کیف‌پول کاربر بازگشت داده شد."})

    @action(detail=True, methods=["post"])
    @transaction.atomic
    def mark_fulfilled(self, request, uid=None):
        red = self.get_object()
        if red.status != StoreRedemptionStatus.APPROVED:
            return Response({"success": False, "message": "ابتدا باید درخواست تأیید شده باشد."}, status=400)
        red.status = StoreRedemptionStatus.FULFILLED
        note = request.data.get("note", "")
        if note:
            red.note = note
        red.processed_by = request.user
        red.save(update_fields=["status", "note", "processed_by", "updated_at"])
        return Response({"success": True, "message": "استفاده از کد ثبت شد."})
