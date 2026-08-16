from rest_framework import serializers
from .models import MaterialPrice


class MaterialPriceSerializer(serializers.ModelSerializer):
    material_name = serializers.CharField(source="material.name", read_only=True)
    material_icon = serializers.CharField(source="material.icon", read_only=True)
    material_slug = serializers.CharField(source="material.slug", read_only=True)
    unit = serializers.CharField(source="material.unit", read_only=True)
    unit_display = serializers.CharField(source="material.get_unit_display", read_only=True)
    category_name = serializers.CharField(source="material.category.name", read_only=True)

    class Meta:
        model = MaterialPrice
        fields = (
            "id", "material", "material_name", "material_icon", "material_slug",
            "category_name", "unit", "unit_display",
            "price_per_unit", "market_price", "min_price", "max_price",
            "active", "effective_from", "effective_to",
        )
        read_only_fields = ("effective_from", "effective_to", "active")
