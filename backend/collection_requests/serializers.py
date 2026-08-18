import json
from decimal import Decimal, InvalidOperation
from rest_framework import serializers
from materials.serializers import MaterialSerializer
from materials.models import Material
from accounts.models import Address
from .models import (
    CollectionRequest, CollectionAssignment, CollectionStatusLog, WeighingRecord,
    CollectionRequestItem, RecurringSchedule,
)
from .services import estimate_value, estimate_value_for_items


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


class CollectionRequestItemSerializer(serializers.ModelSerializer):
    material_name = serializers.CharField(source="material.name", read_only=True)
    material_detail = MaterialSerializer(source="material", read_only=True)

    class Meta:
        model = CollectionRequestItem
        fields = ("material", "material_name", "material_detail", "weight_kg", "is_exact")


class CollectionRequestSerializer(serializers.ModelSerializer):
    materials = MaterialSerializer(many=True, read_only=True)
    items = CollectionRequestItemSerializer(many=True, read_only=True)
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    amount_range_display = serializers.CharField(source="get_amount_range_display", read_only=True)
    status_logs = StatusLogSerializer(many=True, read_only=True)
    assignment = AssignmentSerializer(read_only=True)
    weighing = WeighingRecordSerializer(read_only=True)

    class Meta:
        model = CollectionRequest
        fields = (
            "uid", "code", "materials", "items", "amount_range", "amount_range_display", "address_text_snapshot",
            "lat", "lng", "preferred_time", "green_intent", "description", "photo", "estimated_value",
            "status", "status_display", "status_logs", "assignment", "weighing", "created_at",
        )


class CreateCollectionRequestSerializer(serializers.ModelSerializer):
    """
    Two ways to specify what's being collected:
    1. New multi-material flow: `items_json` = JSON list of
       [{"material": <id>, "weight_kg": <number>, "is_exact": <bool>}], one
       entry per waste type in a single order (spec ask: چند نوع زباله در یک درخواست).
    2. Legacy single-range flow: `material_ids` + `amount_range` (still
       supported for API backward-compatibility).
    """

    material_ids = serializers.PrimaryKeyRelatedField(
        source="materials", queryset=Material.objects.filter(is_active=True), many=True, required=False
    )
    amount_range = serializers.CharField(required=False, allow_blank=True)
    items_json = serializers.CharField(required=False, allow_blank=True, write_only=True)

    class Meta:
        model = CollectionRequest
        fields = (
            "material_ids", "amount_range", "items_json", "address", "address_text_snapshot",
            "lat", "lng", "preferred_time", "green_intent", "description", "photo",
        )

    def validate_items_json(self, value):
        if not value:
            return value
        try:
            items = json.loads(value)
        except (json.JSONDecodeError, TypeError):
            raise serializers.ValidationError("قالب لیست مواد نامعتبر است.")
        if not isinstance(items, list) or not items:
            raise serializers.ValidationError("حداقل یک نوع زباله را انتخاب کنید.")
        material_ids = {int(i["material"]) for i in items}
        valid_materials = {m.id: m for m in Material.objects.filter(id__in=material_ids, is_active=True)}
        parsed = []
        for i in items:
            mat_id = int(i["material"])
            if mat_id not in valid_materials:
                raise serializers.ValidationError(f"ماده با شناسه {mat_id} یافت نشد.")
            try:
                weight = Decimal(str(i["weight_kg"]))
            except (InvalidOperation, KeyError, TypeError):
                raise serializers.ValidationError("وزن نامعتبر است.")
            if weight <= 0:
                raise serializers.ValidationError("وزن باید بیشتر از صفر باشد.")
            parsed.append({"material": valid_materials[mat_id], "weight_kg": weight, "is_exact": bool(i.get("is_exact"))})
        return parsed

    def validate(self, attrs):
        if not attrs.get("items_json") and not attrs.get("materials"):
            raise serializers.ValidationError("حداقل یک نوع زباله را انتخاب کنید.")
        return attrs

    def create(self, validated_data):
        items = validated_data.pop("items_json", None)
        materials = validated_data.pop("materials", [])
        address = validated_data.get("address")
        if address and not validated_data.get("address_text_snapshot"):
            validated_data["address_text_snapshot"] = address.full_address
            validated_data["lat"] = validated_data.get("lat") or address.lat
            validated_data["lng"] = validated_data.get("lng") or address.lng
        validated_data.setdefault("amount_range", "")
        request_obj = CollectionRequest.objects.create(citizen=self.context["request"].user, **validated_data)

        if items:
            request_obj.materials.set([i["material"] for i in items])
            for i in items:
                CollectionRequestItem.objects.create(
                    request=request_obj, material=i["material"], weight_kg=i["weight_kg"], is_exact=i["is_exact"]
                )
            request_obj.estimated_value = estimate_value_for_items([(i["material"], i["weight_kg"]) for i in items])
        else:
            request_obj.materials.set(materials)
            request_obj.estimated_value = estimate_value(materials, request_obj.amount_range)
        request_obj.save(update_fields=["estimated_value"])

        from .services import log_status
        from .models import RequestStatus
        log_status(request_obj, RequestStatus.SEARCHING_COLLECTOR, note="در انتظار پذیرش جمع‌آور", changed_by=self.context["request"].user)
        return request_obj


class RecurringScheduleSerializer(serializers.ModelSerializer):
    material_ids = serializers.PrimaryKeyRelatedField(
        source="materials", queryset=Material.objects.filter(is_active=True), many=True
    )
    materials_detail = MaterialSerializer(source="materials", many=True, read_only=True)
    frequency_display = serializers.CharField(source="get_frequency_display", read_only=True)
    address_text = serializers.CharField(source="address.full_address", read_only=True)

    class Meta:
        model = RecurringSchedule
        fields = (
            "uid", "address", "address_text", "material_ids", "materials_detail", "frequency", "frequency_display",
            "day_of_week", "day_of_month", "preferred_hour", "is_active", "next_run_date", "created_at",
        )
        read_only_fields = ("uid", "next_run_date", "created_at")

    def validate(self, attrs):
        freq = attrs.get("frequency") or getattr(self.instance, "frequency", None)
        if freq in ("WEEKLY", "BIWEEKLY") and attrs.get("day_of_week") is None and not getattr(self.instance, "day_of_week", None):
            raise serializers.ValidationError("برای دوره هفتگی، روز هفته را انتخاب کنید.")
        if freq == "MONTHLY" and attrs.get("day_of_month") is None and not getattr(self.instance, "day_of_month", None):
            raise serializers.ValidationError("برای دوره ماهانه، روز ماه را انتخاب کنید.")
        return attrs

    def create(self, validated_data):
        from django.utils import timezone
        from datetime import timedelta

        materials = validated_data.pop("materials")
        validated_data["next_run_date"] = timezone.localdate() + timedelta(days=1)
        schedule = RecurringSchedule.objects.create(citizen=self.context["request"].user, **validated_data)
        schedule.materials.set(materials)
        return schedule


class WeighInSerializer(serializers.Serializer):
    material = serializers.PrimaryKeyRelatedField(queryset=Material.objects.filter(is_active=True))
    weight_kg = serializers.DecimalField(max_digits=8, decimal_places=2, min_value=Decimal("0.01"))
