from django.contrib import admin
from .models import Order, OrderItem, CommissionRule, CommissionTransaction


class OrderItemInline(admin.TabularInline):
    model = OrderItem
    extra = 0


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = ("code", "buyer", "seller", "total", "payment_status", "status", "created_at")
    list_filter = ("status", "payment_status")
    search_fields = ("code", "buyer__username", "seller__username")
    inlines = [OrderItemInline]


@admin.register(CommissionRule)
class CommissionRuleAdmin(admin.ModelAdmin):
    list_display = ("order_type", "role", "material", "city", "percent", "is_active")
    list_filter = ("order_type", "is_active")


admin.site.register(CommissionTransaction)
