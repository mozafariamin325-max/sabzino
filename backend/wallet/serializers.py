from rest_framework import serializers
from .models import Wallet, WalletTransaction, WithdrawalRequest


class WalletTransactionSerializer(serializers.ModelSerializer):
    class Meta:
        model = WalletTransaction
        fields = ("uid", "type", "amount", "balance_after", "description", "reference", "created_at")


class WalletSerializer(serializers.ModelSerializer):
    class Meta:
        model = Wallet
        fields = ("balance", "pending_balance", "withdrawable_balance", "updated_at")


class WithdrawalRequestSerializer(serializers.ModelSerializer):
    class Meta:
        model = WithdrawalRequest
        fields = ("uid", "amount", "sheba_number", "status", "note", "created_at")
        read_only_fields = ("uid", "status", "note", "created_at")


class AdminWithdrawalRequestSerializer(serializers.ModelSerializer):
    """Admin-facing view of a withdrawal request — includes who it belongs to."""

    user_name = serializers.SerializerMethodField()
    user_phone = serializers.CharField(source="wallet.user.phone_number", read_only=True)
    processed_by_name = serializers.SerializerMethodField()

    class Meta:
        model = WithdrawalRequest
        fields = (
            "uid", "amount", "sheba_number", "status", "note", "created_at", "updated_at",
            "user_name", "user_phone", "processed_by_name",
        )
        read_only_fields = fields

    def get_user_name(self, obj):
        u = obj.wallet.user
        return u.get_full_name() or u.username

    def get_processed_by_name(self, obj):
        if not obj.processed_by:
            return None
        return obj.processed_by.get_full_name() or obj.processed_by.username
