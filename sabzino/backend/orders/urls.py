from django.urls import path
from rest_framework.routers import DefaultRouter
from .views import OrderViewSet, AdminOrderActionView, CommissionRuleViewSet

router = DefaultRouter()
router.register("commission-rules", CommissionRuleViewSet, basename="commission-rule")
router.register("", OrderViewSet, basename="order")

urlpatterns = [
    path("<uuid:uid>/action/", AdminOrderActionView.as_view(), name="order-admin-action"),
] + router.urls
