from rest_framework import viewsets, permissions
from .models import Province, City, District, Neighborhood
from .serializers import ProvinceSerializer, CitySerializer, DistrictSerializer, NeighborhoodSerializer


class ReadOnlyOrAdmin(permissions.BasePermission):
    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return True
        return request.user and request.user.is_staff


class ProvinceViewSet(viewsets.ModelViewSet):
    queryset = Province.objects.all()
    serializer_class = ProvinceSerializer
    permission_classes = [ReadOnlyOrAdmin]


class CityViewSet(viewsets.ModelViewSet):
    queryset = City.objects.all()
    serializer_class = CitySerializer
    permission_classes = [ReadOnlyOrAdmin]
    filterset_fields = ["province", "has_identity"]


class DistrictViewSet(viewsets.ModelViewSet):
    queryset = District.objects.all()
    serializer_class = DistrictSerializer
    permission_classes = [ReadOnlyOrAdmin]
    filterset_fields = ["city"]


class NeighborhoodViewSet(viewsets.ModelViewSet):
    queryset = Neighborhood.objects.all()
    serializer_class = NeighborhoodSerializer
    permission_classes = [ReadOnlyOrAdmin]
    filterset_fields = ["district"]
