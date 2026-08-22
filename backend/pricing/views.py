from rest_framework import viewsets, permissions
from .models import MaterialPrice
from .serializers import MaterialPriceSerializer


class MaterialPriceViewSet(viewsets.ModelViewSet):
    """
    GET is public (citizens need to see today's prices on the homepage).
    Only Admins can create new price rows (price-setting is an Admin/Price-Engine
    action per spec section 18 — never hard-coded).
    """

    queryset = MaterialPrice.objects.select_related("material").order_by("material__category__order", "material__name").all()
    serializer_class = MaterialPriceSerializer
    filterset_fields = ["material", "active"]
    # Full catalog is small (well under a thousand rows) and both the citizen
    # calculator and the admin prices tab need the *whole* active price list in
    # one shot — paginating it would silently truncate to the default page size.
    pagination_class = None

    def get_permissions(self):
        return [permissions.AllowAny()] if self.request.method in permissions.SAFE_METHODS else [permissions.IsAdminUser()]

    def perform_create(self, serializer):
        serializer.save(set_by=self.request.user, active=True)
