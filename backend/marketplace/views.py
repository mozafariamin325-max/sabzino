from decimal import Decimal, InvalidOperation
from rest_framework import viewsets, views, permissions, generics
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Q, Sum, Case, When, F, DecimalField
from .models import RecyclingCenter, Factory, Wholesaler, Business, Listing, PurchaseRequest, Offer, InventoryMovement
from .serializers import (
    RecyclingCenterSerializer, FactorySerializer, WholesalerSerializer, BusinessSerializer,
    ListingSerializer, PurchaseRequestSerializer, OfferSerializer, InventoryMovementSerializer,
)
from orders.services import create_order_from_listing, create_order_from_offer
from orders.serializers import OrderSerializer


class OwnProfileMixin:
    """Generic 'register my org profile / view+edit it' viewset used by RecyclingCenter/Factory/Wholesaler/Business."""

    def get_queryset(self):
        model = self.serializer_class.Meta.model
        if self.request.user.is_staff:
            return model.objects.all()
        return model.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    def get_permissions(self):
        if self.action in ("approve", "reject"):
            return [permissions.IsAdminUser()]
        return super().get_permissions()

    @action(detail=True, methods=["post"])
    def approve(self, request, uid=None):
        obj = self.get_object()
        obj.verification_status = "APPROVED"
        obj.save(update_fields=["verification_status", "updated_at"])
        return Response({"success": True, "message": "پروفایل تأیید شد."})

    @action(detail=True, methods=["post"])
    def reject(self, request, uid=None):
        obj = self.get_object()
        obj.verification_status = "REJECTED"
        obj.save(update_fields=["verification_status", "updated_at"])
        return Response({"success": True, "message": "پروفایل رد شد."})


class RecyclingCenterViewSet(OwnProfileMixin, viewsets.ModelViewSet):
    serializer_class = RecyclingCenterSerializer
    lookup_field = "uid"


class FactoryViewSet(OwnProfileMixin, viewsets.ModelViewSet):
    serializer_class = FactorySerializer
    lookup_field = "uid"


class WholesalerViewSet(OwnProfileMixin, viewsets.ModelViewSet):
    serializer_class = WholesalerSerializer
    lookup_field = "uid"


class BusinessViewSet(OwnProfileMixin, viewsets.ModelViewSet):
    serializer_class = BusinessSerializer
    lookup_field = "uid"


class ListingViewSet(viewsets.ModelViewSet):
    """Browse marketplace listings publicly; sellers manage their own (spec section 20)."""

    serializer_class = ListingSerializer
    lookup_field = "uid"
    filterset_fields = ["material", "status"]
    search_fields = ["description", "location"]

    def get_queryset(self):
        qs = Listing.objects.select_related("material", "seller").prefetch_related("images")
        if self.action in ("list", "retrieve"):
            mine = self.request.query_params.get("mine")
            if mine and self.request.user.is_authenticated:
                return qs.filter(seller=self.request.user)
            return qs.filter(status="ACTIVE")
        return qs.filter(seller=self.request.user)

    def get_permissions(self):
        return [permissions.AllowAny()] if self.request.method in permissions.SAFE_METHODS else [permissions.IsAuthenticated()]

    def perform_create(self, serializer):
        serializer.save(seller=self.request.user)


class PurchaseFromListingView(views.APIView):
    def post(self, request, uid):
        listing = generics.get_object_or_404(Listing, uid=uid)
        try:
            qty = Decimal(str(request.data.get("quantity_kg")))
        except (InvalidOperation, TypeError):
            return Response({"success": False, "message": "مقدار نامعتبر است."}, status=400)
        try:
            order = create_order_from_listing(request.user, listing, qty)
        except ValueError as e:
            return Response({"success": False, "message": str(e)}, status=400)
        return Response({"success": True, "message": "سفارش ثبت شد.", "order": OrderSerializer(order).data}, status=201)


class PurchaseRequestViewSet(viewsets.ModelViewSet):
    """Reverse marketplace: buyers post demand (spec section 24)."""

    serializer_class = PurchaseRequestSerializer
    lookup_field = "uid"
    filterset_fields = ["material", "status"]

    def get_queryset(self):
        qs = PurchaseRequest.objects.select_related("material", "buyer")
        if self.action in ("list", "retrieve"):
            mine = self.request.query_params.get("mine")
            if mine and self.request.user.is_authenticated:
                return qs.filter(buyer=self.request.user)
            return qs.filter(status="OPEN")
        return qs.filter(buyer=self.request.user)

    def get_permissions(self):
        return [permissions.AllowAny()] if self.request.method in permissions.SAFE_METHODS else [permissions.IsAuthenticated()]

    def perform_create(self, serializer):
        serializer.save(buyer=self.request.user)


class OfferViewSet(viewsets.ModelViewSet):
    serializer_class = OfferSerializer
    lookup_field = "uid"

    def get_queryset(self):
        return Offer.objects.filter(Q(seller=self.request.user) | Q(purchase_request__buyer=self.request.user)).select_related(
            "purchase_request", "seller"
        )

    def perform_create(self, serializer):
        serializer.save(seller=self.request.user)


class InventoryMovementViewSet(viewsets.ModelViewSet):
    """Waste in/out ledger for driver/wholesaler/factory/recycling-center dashboards."""

    serializer_class = InventoryMovementSerializer
    lookup_field = "uid"
    filterset_fields = ["material", "direction"]

    def get_queryset(self):
        return InventoryMovement.objects.filter(owner=self.request.user).select_related("material")

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user, recorded_by=self.request.user)


class InventoryStockSummaryView(views.APIView):
    """Current stock per material for the logged-in business account: sum(IN) - sum(OUT)."""

    def get(self, request):
        rows = (
            InventoryMovement.objects.filter(owner=request.user)
            .values("material_id", "material__name", "material__unit")
            .annotate(
                stock_kg=Sum(
                    Case(
                        When(direction="IN", then=F("weight_kg")),
                        When(direction="OUT", then=-F("weight_kg")),
                        output_field=DecimalField(),
                    )
                ),
                total_in=Sum(Case(When(direction="IN", then=F("weight_kg")), default=0, output_field=DecimalField())),
                total_out=Sum(Case(When(direction="OUT", then=F("weight_kg")), default=0, output_field=DecimalField())),
            )
            .order_by("material__name")
        )
        return Response({"success": True, "stock": list(rows)})


class AcceptOfferView(views.APIView):
    def post(self, request, uid):
        offer = generics.get_object_or_404(Offer, uid=uid)
        if offer.purchase_request.buyer_id != request.user.id:
            return Response({"success": False, "message": "غیرمجاز."}, status=403)
        offer.status = "ACCEPTED"
        offer.save(update_fields=["status"])
        order = create_order_from_offer(offer)
        return Response({"success": True, "message": "پیشنهاد پذیرفته شد و سفارش ایجاد شد.", "order": OrderSerializer(order).data})
