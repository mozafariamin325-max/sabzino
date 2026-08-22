from rest_framework import viewsets, permissions
from .models import Material, MaterialCategory
from .serializers import MaterialSerializer, MaterialCategorySerializer


class ReadOnlyOrAdmin(permissions.BasePermission):
    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return True
        return request.user and request.user.is_authenticated and request.user.is_staff


class MaterialCategoryViewSet(viewsets.ModelViewSet):
    queryset = MaterialCategory.objects.prefetch_related("materials")
    serializer_class = MaterialCategorySerializer
    permission_classes = [ReadOnlyOrAdmin]
    permission_classes_by_action = {}

    def get_permissions(self):
        return [permissions.AllowAny()] if self.request.method in permissions.SAFE_METHODS else [permissions.IsAdminUser()]


class MaterialViewSet(viewsets.ModelViewSet):
    queryset = Material.objects.filter(is_active=True).select_related("category")
    serializer_class = MaterialSerializer
    filterset_fields = ["category", "is_active"]
    search_fields = ["name"]

    def get_permissions(self):
        return [permissions.AllowAny()] if self.request.method in permissions.SAFE_METHODS else [permissions.IsAdminUser()]
