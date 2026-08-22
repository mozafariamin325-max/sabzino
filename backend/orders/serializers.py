from rest_framework import serializers
from .models import Order, OrderItem, CommissionRule


class OrderItemSerializer(serializers.ModelSerializer):
    material_name = serializers.CharField(source="material.name", read_only=True)

    class Meta:
        model = OrderItem
        fields = ("material", "material_name", "quantity_kg", "unit_price", "line_total")


class OrderSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True, read_only=True)
    buyer_name = serializers.CharField(source="buyer.get_full_name", read_only=True)
    seller_name = serializers.CharField(source="seller.get_full_name", read_only=True)
    status_display = serializers.CharField(source="get_status_display", read_only=True)

    class Meta:
        model = Order
        fields = (
            "uid", "code", "buyer", "buyer_name", "seller", "seller_name", "listing", "offer",
            "items", "subtotal", "commission_percent", "commission_amount", "shipping_cost", "total",
            "payment_status", "status", "status_display", "created_at",
        )


class CommissionRuleSerializer(serializers.ModelSerializer):
    class Meta:
        model = CommissionRule
        fields = "__all__"
