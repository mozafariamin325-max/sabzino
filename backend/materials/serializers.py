from rest_framework import serializers
from .models import Material, MaterialCategory


class MaterialSerializer(serializers.ModelSerializer):
    current_price = serializers.DecimalField(max_digits=12, decimal_places=0, read_only=True)
    category_name = serializers.CharField(source="category.name", read_only=True)

    class Meta:
        model = Material
        fields = (
            "id", "name", "slug", "category", "category_name", "unit", "description",
            "icon", "is_active", "accepted_at_stations", "co2_kg_saved_per_kg", "current_price",
        )


class MaterialCategorySerializer(serializers.ModelSerializer):
    materials = MaterialSerializer(many=True, read_only=True)

    class Meta:
        model = MaterialCategory
        fields = ("id", "name", "icon", "order", "materials")
