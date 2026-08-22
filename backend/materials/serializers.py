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
            "requires_appraisal",
        )


class MaterialCategorySerializer(serializers.ModelSerializer):
    # SerializerMethodField (not a plain nested serializer) so retired/superseded
    # materials (is_active=False) never leak into the catalog shown to citizens.
    materials = serializers.SerializerMethodField()

    class Meta:
        model = MaterialCategory
        fields = ("id", "name", "icon", "order", "materials")

    def get_materials(self, obj):
        active_materials = obj.materials.filter(is_active=True).order_by("name")
        return MaterialSerializer(active_materials, many=True).data
