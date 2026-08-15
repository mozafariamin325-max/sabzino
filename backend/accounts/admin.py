from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import User, UserRole, Address, OTPRequest


class UserRoleInline(admin.TabularInline):
    model = UserRole
    extra = 0


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display = ("username", "phone_number", "first_name", "last_name", "is_suspended", "date_joined")
    search_fields = ("username", "phone_number", "first_name", "last_name", "email")
    inlines = [UserRoleInline]
    fieldsets = BaseUserAdmin.fieldsets + (
        ("سبزینو", {"fields": ("phone_number", "phone_verified", "avatar", "referral_code", "referred_by", "is_suspended")}),
    )


@admin.register(Address)
class AddressAdmin(admin.ModelAdmin):
    list_display = ("user", "title", "city", "district", "is_default")
    search_fields = ("user__username", "full_address")


@admin.register(OTPRequest)
class OTPRequestAdmin(admin.ModelAdmin):
    list_display = ("phone_number", "code", "is_used", "expires_at", "created_at")
