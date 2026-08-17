from django.db.models import Q
from rest_framework import viewsets, permissions, views
from rest_framework.response import Response
from .models import Order, OrderStatus, CommissionRule
from .serializers import OrderSerializer, CommissionRuleSerializer


class OrderViewSet(viewsets.ReadOnlyModelViewSet):
    """Buyer and seller can both see their own orders; Admin sees/manages all (spec section 43)."""

    serializer_class = OrderSerializer
    lookup_field = "uid"

    def get_queryset(self):
        user = self.request.user
        if user.is_staff:
            return Order.objects.all().prefetch_related("items")
        return Order.objects.filter(Q(buyer=user) | Q(seller=user)).prefetch_related("items")


class AdminOrderActionView(views.APIView):
    permission_classes = [permissions.IsAdminUser]

    def post(self, request, uid):
        action = request.data.get("action")
        order = Order.objects.get(uid=uid)
        if action == "cancel":
            order.status = OrderStatus.CANCELLED
        elif action == "refund":
            order.status = OrderStatus.REFUNDED
            order.payment_status = "REFUNDED"
        elif action in dict(OrderStatus.choices):
            order.status = action
        else:
            return Response({"success": False, "message": "عملیات نامعتبر."}, status=400)
        order.save(update_fields=["status", "payment_status", "updated_at"])
        return Response({"success": True, "order": OrderSerializer(order).data})


class CommissionRuleViewSet(viewsets.ModelViewSet):
    """Admin-only Commission Engine (spec section 44-45)."""

    queryset = CommissionRule.objects.all()
    serializer_class = CommissionRuleSerializer
    permission_classes = [permissions.IsAdminUser]
