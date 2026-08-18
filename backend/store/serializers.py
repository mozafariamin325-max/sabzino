from rest_framework import serializers
from .models import StorePartner, StoreRedemption


class StorePartnerSerializer(serializers.ModelSerializer):
    class Meta:
        model = StorePartner
        fields = (
            "uid", "name", "category", "logo", "description", "address",
            "contact_phone", "redeem_instructions", "is_active", "created_at",
        )
        read_only_fields = ("uid", "created_at")


class StoreRedemptionSerializer(serializers.ModelSerializer):
    partner_name = serializers.CharField(source="partner.name", read_only=True)
    partner_logo = serializers.ImageField(source="partner.logo", read_only=True)

    class Meta:
        model = StoreRedemption
        fields = (
            "uid", "partner", "partner_name", "partner_logo", "amount",
            "status", "redemption_code", "note", "created_at",
        )
        read_only_fields = ("uid", "status", "redemption_code", "note", "created_at")


class AdminStoreRedemptionSerializer(serializers.ModelSerializer):
    """Admin-facing view of a store redemption request — includes who it belongs to."""

    user_name = serializers.SerializerMethodField()
    user_phone = serializers.CharField(source="wallet.user.phone_number", read_only=True)
    partner_name = serializers.CharField(source="partner.name", read_only=True)
    processed_by_name = serializers.SerializerMethodField()

    class Meta:
        model = StoreRedemption
        fields = (
            "uid", "partner", "partner_name", "amount", "status", "redemption_code",
            "note", "created_at", "updated_at", "user_name", "user_phone", "processed_by_name",
        )
        read_only_fields = fields

    def get_user_name(self, obj):
        u = obj.wallet.user
        return u.get_full_name() or u.username

    def get_processed_by_name(self, obj):
        if not obj.processed_by:
            return None
        return obj.processed_by.get_full_name() or obj.processed_by.username
