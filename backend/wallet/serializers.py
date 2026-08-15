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
