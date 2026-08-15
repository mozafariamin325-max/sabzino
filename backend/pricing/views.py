from rest_framework import viewsets, permissions
from .models import MaterialPrice
from .serializers import MaterialPriceSerializer


class MaterialPriceViewSet(viewsets.ModelViewSet):
    """
    GET is public (citizens need to see today's prices on the homepage).
    Only Admins can create new price rows (price-setting is an Admin/Price-Engine
    action per spec section 18 — never hard-coded).
    """

    queryset = MaterialPrice.objects.select_related("material").all()
    serializer_class = MaterialPriceSerializer
    filterset_fields = ["material", "active"]

    def get_permissions(self):
        return [permissions.AllowAny()] if self.request.method in permissions.SAFE_METHODS else [permissions.IsAdminUser()]

    def perform_create(self, serializer):
        serializer.save(set_by=self.request.user, active=True)
