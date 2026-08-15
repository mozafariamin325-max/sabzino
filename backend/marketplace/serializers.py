from rest_framework import serializers
from materials.serializers import MaterialSerializer
from .models import (
    RecyclingCenter, Factory, Wholesaler, Business, Listing, ListingImage, PurchaseRequest, Offer,
    InventoryMovement,
)


class RecyclingCenterSerializer(serializers.ModelSerializer):
    class Meta:
        model = RecyclingCenter
        fields = "__all__"
        read_only_fields = ("user", "verification_status")


class FactorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Factory
        fields = "__all__"
        read_only_fields = ("user", "verification_status")


class WholesalerSerializer(serializers.ModelSerializer):
    class Meta:
        model = Wholesaler
        fields = "__all__"
        read_only_fields = ("user", "verification_status")


class BusinessSerializer(serializers.ModelSerializer):
    class Meta:
        model = Business
        fields = "__all__"
        read_only_fields = ("user", "verification_status")


class ListingImageSerializer(serializers.ModelSerializer):
    class Meta:
        model = ListingImage
        fields = ("id", "image")


class ListingSerializer(serializers.ModelSerializer):
    material_detail = MaterialSerializer(source="material", read_only=True)
    images = ListingImageSerializer(many=True, read_only=True)
    seller_name = serializers.CharField(source="seller.get_full_name", read_only=True)

    class Meta:
        model = Listing
        fields = (
            "uid", "seller", "seller_name", "material", "material_detail", "quantity_kg", "price_per_kg",
            "minimum_order_kg", "quality", "location", "description", "status", "images", "created_at",
        )
        read_only_fields = ("seller",)


class PurchaseRequestSerializer(serializers.ModelSerializer):
    material_detail = MaterialSerializer(source="material", read_only=True)
    buyer_name = serializers.CharField(source="buyer.get_full_name", read_only=True)
    offers_count = serializers.IntegerField(source="offers.count", read_only=True)

    class Meta:
        model = PurchaseRequest
        fields = (
            "uid", "buyer", "buyer_name", "material", "material_detail", "quantity_kg",
            "target_price_per_kg", "coverage_area", "description", "status", "offers_count", "created_at",
        )
        read_only_fields = ("buyer",)


class OfferSerializer(serializers.ModelSerializer):
    seller_name = serializers.CharField(source="seller.get_full_name", read_only=True)

    class Meta:
        model = Offer
        fields = ("uid", "purchase_request", "seller", "seller_name", "quantity_kg", "price_per_kg", "message", "status", "created_at")
        read_only_fields = ("seller", "status")


class InventoryMovementSerializer(serializers.ModelSerializer):
    material_detail = MaterialSerializer(source="material", read_only=True)
    direction_display = serializers.CharField(source="get_direction_display", read_only=True)

    class Meta:
        model = InventoryMovement
        fields = (
            "uid", "material", "material_detail", "direction", "direction_display", "weight_kg",
            "unit_price_snapshot", "total_value", "counterparty_name", "note", "created_at",
        )
        read_only_fields = ("uid", "created_at")

    def create(self, validated_data):
        material = validated_data["material"]
        weight_kg = validated_data["weight_kg"]
        if not validated_data.get("unit_price_snapshot"):
            validated_data["unit_price_snapshot"] = material.current_price
        if not validated_data.get("total_value") and validated_data.get("unit_price_snapshot"):
            validated_data["total_value"] = validated_data["unit_price_snapshot"] * weight_kg
        return super().create(validated_data)
