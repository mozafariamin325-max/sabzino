from decimal import Decimal
from rest_framework import serializers
from materials.serializers import MaterialSerializer
from .models import RecyclingStation, StationTransaction


class RecyclingStationSerializer(serializers.ModelSerializer):
    accepted_materials = MaterialSerializer(many=True, read_only=True)
    distance_km = serializers.FloatField(read_only=True, required=False)

    class Meta:
        model = RecyclingStation
        fields = (
            "uid", "name", "address", "lat", "lng", "working_hours", "accepted_materials",
            "capacity_kg_per_day", "phone_number", "image", "is_active", "distance_km",
        )


class StationTransactionSerializer(serializers.ModelSerializer):
    material_name = serializers.CharField(source="material.name", read_only=True)
    station_name = serializers.CharField(source="station.name", read_only=True)
    citizen_name = serializers.CharField(source="citizen.get_full_name", read_only=True)

    class Meta:
        model = StationTransaction
        fields = (
            "uid", "transaction_code", "station", "station_name", "citizen", "citizen_name",
            "material", "material_name", "weight_kg", "unit_price_snapshot", "total_value",
            "points_awarded", "created_at",
        )
        read_only_fields = (
            "uid", "transaction_code", "station_name", "citizen_name", "material_name",
            "unit_price_snapshot", "total_value", "points_awarded", "created_at",
        )


class CreateStationTransactionSerializer(serializers.Serializer):
    citizen_identifier = serializers.CharField(help_text="شماره موبایل یا کد کاربری شهروند (اسکن QR)")
    material = serializers.IntegerField()
    weight_kg = serializers.DecimalField(max_digits=8, decimal_places=2, min_value=Decimal("0.01"))
