from django.contrib import admin
from .models import Wallet, WalletTransaction, WithdrawalRequest


@admin.register(Wallet)
class WalletAdmin(admin.ModelAdmin):
    list_display = ("user", "balance", "pending_balance")
    search_fields = ("user__username", "user__phone_number")


@admin.register(WalletTransaction)
class WalletTransactionAdmin(admin.ModelAdmin):
    list_display = ("wallet", "type", "amount", "balance_after", "created_at")
    list_filter = ("type",)


@admin.register(WithdrawalRequest)
class WithdrawalRequestAdmin(admin.ModelAdmin):
    list_display = ("wallet", "amount", "status", "created_at")
    list_filter = ("status",)
