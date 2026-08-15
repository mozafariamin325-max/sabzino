from decimal import Decimal
from rest_framework import serializers
from materials.serializers import MaterialSerializer
from materials.models import Material
from .models import CollectionRequest, CollectionAssignment, CollectionStatusLog, WeighingRecord
from .services import estimate_value


class StatusLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = CollectionStatusLog
        fields = ("status", "note", "created_at")


class WeighingRecordSerializer(serializers.ModelSerializer):
    material_name = serializers.CharField(source="material.name", read_only=True)

    class Meta:
        model = WeighingRecord
        fields = ("uid", "material", "material_name", "weight_kg", "unit_price_snapshot", "total_value", "points_awarded", "created_at")


class AssignmentSerializer(serializers.ModelSerializer):
    collector_name = serializers.CharField(source="collector.user.get_full_name", read_only=True)
    collector_phone = serializers.CharField(source="collector.user.phone_number", read_only=True)
    collector_rating = serializers.DecimalField(source="collector.rating_avg", max_digits=3, decimal_places=2, read_only=True)

    class Meta:
        model = CollectionAssignment
        fields = ("collector", "collector_name", "collector_phone", "collector_rating", "accepted_at", "on_the_way_at", "arrived_at", "collected_at")


class CollectionRequestSerializer(serializers.ModelSerializer):
    materials = MaterialSerializer(many=True, read_only=True)
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    amount_range_display = serializers.CharField(source="get_amount_range_display", read_only=True)
    status_logs = StatusLogSerializer(many=True, read_only=True)
    assignment = AssignmentSerializer(read_only=True)
    weighing = WeighingRecordSerializer(read_only=True)

    class Meta:
        model = CollectionRequest
        fields = (
            "uid", "code", "materials", "amount_range", "amount_range_display", "address_text_snapshot",
            "lat", "lng", "preferred_time", "description", "photo", "estimated_value",
            "status", "status_display", "status_logs", "assignment", "weighing", "created_at",
        )


class CreateCollectionRequestSerializer(serializers.ModelSerializer):
    material_ids = serializers.PrimaryKeyRelatedField(
        source="materials", queryset=Material.objects.filter(is_active=True), many=True
    )

    class Meta:
        model = CollectionRequest
        fields = (
            "material_ids", "amount_range", "address", "address_text_snapshot",
            "lat", "lng", "preferred_time", "description", "photo",
        )

    def create(self, validated_data):
        materials = validated_data.pop("materials")
        address = validated_data.get("address")
        if address and not validated_data.get("address_text_snapshot"):
            validated_data["address_text_snapshot"] = address.full_address
            validated_data["lat"] = validated_data.get("lat") or address.lat
            validated_data["lng"] = validated_data.get("lng") or address.lng
        request_obj = CollectionRequest.objects.create(citizen=self.context["request"].user, **validated_data)
        request_obj.materials.set(materials)
        request_obj.estimated_value = estimate_value(materials, request_obj.amount_range)
        request_obj.save(update_fields=["estimated_value"])
        from .services import log_status
        from .models import RequestStatus
        log_status(request_obj, RequestStatus.SEARCHING_COLLECTOR, note="در انتظار پذیرش جمع‌آور", changed_by=self.context["request"].user)
        return request_obj


class WeighInSerializer(serializers.Serializer):
    material = serializers.PrimaryKeyRelatedField(queryset=Material.objects.filter(is_active=True))
    weight_kg = serializers.DecimalField(max_digits=8, decimal_places=2, min_value=Decimal("0.01"))
