from rest_framework import serializers
from .models import MaterialPrice


class MaterialPriceSerializer(serializers.ModelSerializer):
    material_name = serializers.CharField(source="material.name", read_only=True)

    class Meta:
        model = MaterialPrice
        fields = (
            "id", "material", "material_name", "price_per_unit", "min_price", "max_price",
            "active", "effective_from", "effective_to",
        )
        read_only_fields = ("effective_from", "effective_to", "active")
