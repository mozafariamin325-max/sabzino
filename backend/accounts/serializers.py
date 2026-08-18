import random
import string
from django.contrib.auth import authenticate
from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers
from rest_framework_simplejwt.tokens import RefreshToken
from .models import (
    User, UserRole, Address, Role, OrganizationDetail, ProfileChangeRequest,
    ProfileChangeField, ProfileChangeStatus,
)


def generate_referral_code():
    while True:
        code = "SZ" + "".join(random.choices(string.ascii_uppercase + string.digits, k=6))
        if not User.objects.filter(referral_code=code).exists():
            return code


class RoleSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserRole
        fields = ("role", "is_primary")


class OrganizationDetailSerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(source="user.get_full_name", read_only=True)
    user_phone = serializers.CharField(source="user.phone_number", read_only=True)

    class Meta:
        model = OrganizationDetail
        fields = (
            "id", "user", "user_name", "user_phone", "center_name", "manager_name", "manager_phone",
            "verification_status", "verification_note",
        )
        read_only_fields = ("id", "user", "verification_status", "verification_note")


class UserSerializer(serializers.ModelSerializer):
    roles = RoleSerializer(many=True, read_only=True)
    organization_detail = OrganizationDetailSerializer(read_only=True)

    class Meta:
        model = User
        fields = (
            "id", "uid", "username", "first_name", "last_name", "email",
            "phone_number", "phone_verified", "avatar", "referral_code", "customer_type", "city",
            "roles", "organization_detail", "is_staff", "date_joined",
        )
        read_only_fields = ("id", "uid", "referral_code", "date_joined", "is_staff")


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, validators=[validate_password])
    role = serializers.ChoiceField(choices=Role.choices, default=Role.CITIZEN)
    referral_code = serializers.CharField(required=False, allow_blank=True, write_only=True)
    customer_type = serializers.ChoiceField(choices=["INDIVIDUAL", "ORGANIZATION"], default="INDIVIDUAL")
    center_name = serializers.CharField(required=False, allow_blank=True, write_only=True)
    manager_name = serializers.CharField(required=False, allow_blank=True, write_only=True)
    manager_phone = serializers.CharField(required=False, allow_blank=True, write_only=True)
    city = serializers.CharField(required=True, help_text="شهر کاربر — برای نمایش هویت محلی صفحه اصلی، هنگام ثبت‌نام پرسیده می‌شود")

    class Meta:
        model = User
        fields = (
            "first_name", "last_name", "email", "phone_number", "password", "role", "referral_code",
            "customer_type", "center_name", "manager_name", "manager_phone", "city",
        )

    def validate_city(self, value):
        from locations.models import City

        if not City.objects.filter(name=value).exists():
            raise serializers.ValidationError("شهر انتخاب‌شده معتبر نیست.")
        return value

    def validate(self, attrs):
        if not attrs.get("email") and not attrs.get("phone_number"):
            raise serializers.ValidationError("حداقل ایمیل یا شماره موبایل را وارد کنید.")
        if attrs.get("customer_type") == "ORGANIZATION":
            if not attrs.get("center_name") or not attrs.get("manager_name") or not attrs.get("manager_phone"):
                raise serializers.ValidationError(
                    "برای حساب سازمانی، نام مرکز، نام مدیر و شماره مدیریت الزامی است."
                )
        return attrs

    def validate_email(self, value):
        if value and User.objects.filter(email=value).exists():
            raise serializers.ValidationError("این ایمیل قبلاً ثبت شده است.")
        return value

    def validate_phone_number(self, value):
        if value and User.objects.filter(phone_number=value).exists():
            raise serializers.ValidationError("این شماره موبایل قبلاً ثبت شده است.")
        return value

    def create(self, validated_data):
        role = validated_data.pop("role", Role.CITIZEN)
        referral_code = validated_data.pop("referral_code", "")
        password = validated_data.pop("password")
        customer_type = validated_data.pop("customer_type", "INDIVIDUAL")
        center_name = validated_data.pop("center_name", "")
        manager_name = validated_data.pop("manager_name", "")
        manager_phone = validated_data.pop("manager_phone", "")
        email = validated_data.get("email") or ""
        username_base = email.split("@")[0] if email else validated_data.get("phone_number", "user")
        username = username_base
        n = 1
        while User.objects.filter(username=username).exists():
            n += 1
            username = f"{username_base}{n}"

        referred_by = None
        if referral_code:
            referred_by = User.objects.filter(referral_code=referral_code.upper()).first()

        user = User(
            username=username,
            email=email,
            phone_number=validated_data.get("phone_number") or None,
            first_name=validated_data.get("first_name", ""),
            last_name=validated_data.get("last_name", ""),
            referral_code=generate_referral_code(),
            referred_by=referred_by,
            customer_type=customer_type,
            city=validated_data.get("city") or "یاسوج",
        )
        user.set_password(password)
        user.save()
        UserRole.objects.create(user=user, role=role, is_primary=True)

        if customer_type == "ORGANIZATION":
            OrganizationDetail.objects.create(
                user=user, center_name=center_name, manager_name=manager_name, manager_phone=manager_phone
            )

        # bootstrap related domain objects + welcome bonuses (wired to real apps, not mocked)
        from wallet.services import ensure_wallet
        from rewards.services import ensure_points_account, award_points, apply_referral_bonus

        ensure_wallet(user)
        ensure_points_account(user)
        if referred_by:
            apply_referral_bonus(referred_by, user)

        return user


class LoginSerializer(serializers.Serializer):
    identifier = serializers.CharField(help_text="ایمیل یا شماره موبایل")
    password = serializers.CharField(write_only=True)

    def validate(self, attrs):
        identifier = attrs["identifier"]
        password = attrs["password"]
        user_obj = User.objects.filter(email=identifier).first() or User.objects.filter(phone_number=identifier).first()
        if not user_obj:
            raise serializers.ValidationError("کاربری با این مشخصات یافت نشد.")
        user = authenticate(username=user_obj.username, password=password)
        if not user:
            raise serializers.ValidationError("رمز عبور اشتباه است.")
        if user.is_suspended:
            raise serializers.ValidationError("حساب کاربری شما مسدود شده است.")
        attrs["user"] = user
        return attrs


def tokens_for_user(user):
    refresh = RefreshToken.for_user(user)
    return {"access": str(refresh.access_token), "refresh": str(refresh)}


class AddressSerializer(serializers.ModelSerializer):
    class Meta:
        model = Address
        fields = "__all__"
        read_only_fields = ("id", "user", "created_at", "updated_at")


class ProfileChangeRequestSerializer(serializers.ModelSerializer):
    field_display = serializers.CharField(source="get_field_name_display", read_only=True)
    reviewer_name = serializers.CharField(source="reviewed_by.get_full_name", read_only=True)
    user_name = serializers.CharField(source="user.get_full_name", read_only=True)

    class Meta:
        model = ProfileChangeRequest
        fields = (
            "uid", "user_name", "field_name", "field_display", "old_value", "new_value",
            "status", "review_note", "reviewer_name", "created_at", "reviewed_at",
        )
        read_only_fields = ("uid", "old_value", "status", "review_note", "reviewer_name", "created_at", "reviewed_at")

    def validate_field_name(self, value):
        if value not in ProfileChangeField.values:
            raise serializers.ValidationError("این فیلد قابل تغییر با تأیید نیست.")
        return value

    def create(self, validated_data):
        user = self.context["request"].user
        field_name = validated_data["field_name"]
        old_value = getattr(user, field_name, "") or ""
        return ProfileChangeRequest.objects.create(
            user=user, field_name=field_name, old_value=old_value, new_value=validated_data["new_value"],
        )


def apply_profile_change_decision(change_request: ProfileChangeRequest, decision: str, reviewer, note: str = ""):
    from django.utils import timezone

    if change_request.status != ProfileChangeStatus.PENDING:
        raise ValueError("این درخواست قبلاً بررسی شده است.")
    change_request.status = decision
    change_request.reviewed_by = reviewer
    change_request.review_note = note
    change_request.reviewed_at = timezone.now()
    change_request.save(update_fields=["status", "reviewed_by", "review_note", "reviewed_at", "updated_at"])
    if decision == ProfileChangeStatus.APPROVED:
        setattr(change_request.user, change_request.field_name, change_request.new_value)
        change_request.user.save(update_fields=[change_request.field_name])
    return change_request
