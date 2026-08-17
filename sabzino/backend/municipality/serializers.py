from rest_framework import serializers
from .models import Municipality


class MunicipalitySerializer(serializers.ModelSerializer):
    class Meta:
        model = Municipality
        fields = "__all__"
        read_only_fields = ("user",)
