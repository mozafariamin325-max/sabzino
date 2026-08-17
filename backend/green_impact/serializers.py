from rest_framework import serializers
from .models import ImpactProject, ImpactContribution


class ImpactProjectSerializer(serializers.ModelSerializer):
    category_display = serializers.CharField(source="get_category_display", read_only=True)
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    progress_percent = serializers.SerializerMethodField()
    city_name = serializers.SerializerMethodField()

    class Meta:
        model = ImpactProject
        fields = (
            "uid", "title", "category", "category_display", "icon", "summary", "description",
            "operator_name", "city", "city_name", "goal_amount", "raised_amount", "progress_percent",
            "status", "status_display", "progress_report", "impact_report", "is_demo", "order", "created_at",
        )
        read_only_fields = ("uid", "raised_amount", "created_at")

    def get_progress_percent(self, obj):
        return obj.progress_percent

    def get_city_name(self, obj):
        return obj.city.name if obj.city_id else None


class ImpactContributionSerializer(serializers.ModelSerializer):
    project_title = serializers.CharField(source="project.title", read_only=True)
    project_icon = serializers.CharField(source="project.icon", read_only=True)
    project_category = serializers.CharField(source="project.category", read_only=True)
    project_category_display = serializers.CharField(source="project.get_category_display", read_only=True)
    request_code = serializers.SerializerMethodField()
    user_name = serializers.SerializerMethodField()

    class Meta:
        model = ImpactContribution
        fields = (
            "uid", "tracking_code", "user", "user_name", "project", "project_title", "project_icon",
            "project_category", "project_category_display", "request", "request_code",
            "amount", "waste_value_snapshot", "created_at",
        )
        read_only_fields = fields

    def get_request_code(self, obj):
        return obj.request.code if obj.request_id else None

    def get_user_name(self, obj):
        full = f"{obj.user.first_name} {obj.user.last_name}".strip()
        return full or obj.user.username
