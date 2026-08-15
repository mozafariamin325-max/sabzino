import random
import string
from django.contrib.auth import authenticate
from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers
from rest_framework_simplejwt.tokens import RefreshToken
from .models import User, UserRole, Address, Role


def generate_referral_code():
    while True:
        code = "SZ" + "".join(random.choices(string.ascii_uppercase + string.digits, k=6))
        if not User.objects.filter(referral_code=code).exists():
            return code


class RoleSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserRole
        fields = ("role", "is_primary")


class UserSerializer(serializers.ModelSerializer):
    roles = RoleSerializer(many=True, read_only=True)

    class Meta:
        model = User
        fields = (
            "id", "uid", "username", "first_name", "last_name", "email",
            "phone_number", "phone_verified", "avatar", "referral_code",
            "roles", "date_joined",
        )
        read_only_fields = ("id", "uid", "referral_code", "date_joined")


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, validators=[validate_password])
    role = serializers.ChoiceField(choices=Role.choices, default=Role.CITIZEN)
    referral_code = serializers.CharField(required=False, allow_blank=True, write_only=True)

    class Meta:
        model = User
        fields = ("first_name", "last_name", "email", "phone_number", "password", "role", "referral_code")

    def validate(self, attrs):
        if not attrs.get("email") and not attrs.get("phone_number"):
            raise serializers.ValidationError("حداقل ایمیل یا شماره موبایل را وارد کنید.")
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
        )
        user.set_password(password)
        user.save()
        UserRole.objects.create(user=user, role=role, is_primary=True)

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
