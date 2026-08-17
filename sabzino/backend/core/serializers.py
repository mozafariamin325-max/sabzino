from rest_framework import serializers
from .models import Rating


class RatingSerializer(serializers.ModelSerializer):
    from_user_name = serializers.CharField(source="from_user.get_full_name", read_only=True)
    context_type_display = serializers.CharField(source="get_context_type_display", read_only=True)

    class Meta:
        model = Rating
        fields = (
            "uid", "from_user_name", "to_user", "context_type", "context_type_display",
            "reference", "score", "comment", "created_at",
        )
        read_only_fields = ("uid", "created_at")
