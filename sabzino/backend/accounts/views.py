from rest_framework import generics, status, viewsets, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from .models import Address, ProfileChangeRequest, ProfileChangeField, ProfileChangeStatus, OrganizationDetail
from .serializers import (
    RegisterSerializer, LoginSerializer, UserSerializer, AddressSerializer, tokens_for_user,
    ProfileChangeRequestSerializer, OrganizationDetailSerializer, apply_profile_change_decision,
)

PROTECTED_PROFILE_FIELDS = set(ProfileChangeField.values)


class RegisterView(generics.CreateAPIView):
    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        tokens = tokens_for_user(user)
        return Response(
            {"success": True, "message": "ثبت‌نام با موفقیت انجام شد.", "user": UserSerializer(user).data, **tokens},
            status=status.HTTP_201_CREATED,
        )


class LoginView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data["user"]
        tokens = tokens_for_user(user)
        return Response({"success": True, "message": "ورود موفقیت‌آمیز بود.", "user": UserSerializer(user).data, **tokens})


class MeView(APIView):
    def get(self, request):
        return Response({"success": True, "user": UserSerializer(request.user).data})

    def patch(self, request):
        """
        Direct edits are allowed for non-sensitive fields (e.g. avatar). Name,
        phone number and email are sensitive per spec section 31: they create a
        pending ProfileChangeRequest instead of being saved immediately, and
        only take effect once an Admin approves them.
        """
        data = dict(request.data)
        pending_created = []
        for field in PROTECTED_PROFILE_FIELDS:
            if field not in data:
                continue
            new_value = data.pop(field)
            new_value = new_value[0] if isinstance(new_value, list) else new_value
            current_value = getattr(request.user, field, "") or ""
            if str(new_value) == str(current_value):
                continue
            already_pending = ProfileChangeRequest.objects.filter(
                user=request.user, field_name=field, status=ProfileChangeStatus.PENDING
            ).exists()
            if already_pending:
                continue
            change = ProfileChangeRequest.objects.create(
                user=request.user, field_name=field, old_value=current_value, new_value=str(new_value)
            )
            pending_created.append(ProfileChangeRequestSerializer(change).data)

        serializer = None
        if data:
            serializer = UserSerializer(request.user, data=data, partial=True)
            serializer.is_valid(raise_exception=True)
            serializer.save()

        response = {"success": True, "user": UserSerializer(request.user).data}
        if pending_created:
            response["message"] = "تغییرات حساس (نام/شماره/ایمیل) ثبت شد و در انتظار تأیید مدیر است."
            response["pending_changes"] = pending_created
        return Response(response)


class ProfileChangeRequestViewSet(viewsets.ModelViewSet):
    """Citizen: create/list my own pending profile-change requests (read-only after creation)."""

    serializer_class = ProfileChangeRequestSerializer
    http_method_names = ["get", "post", "head", "options"]

    def get_queryset(self):
        return ProfileChangeRequest.objects.filter(user=self.request.user)


class AdminProfileChangeRequestViewSet(viewsets.ReadOnlyModelViewSet):
    """Admin: verification-center-style list + approve/reject for profile edits."""

    serializer_class = ProfileChangeRequestSerializer
    permission_classes = [permissions.IsAdminUser]
    filterset_fields = ["status"]

    def get_queryset(self):
        return ProfileChangeRequest.objects.select_related("user").all()

    @action(detail=True, methods=["post"])
    def approve(self, request, pk=None):
        change = self.get_object()
        try:
            apply_profile_change_decision(change, ProfileChangeStatus.APPROVED, request.user, request.data.get("note", ""))
        except ValueError as e:
            return Response({"success": False, "message": str(e)}, status=400)
        return Response({"success": True, "message": "تغییر پروفایل تأیید شد.", "change": ProfileChangeRequestSerializer(change).data})

    @action(detail=True, methods=["post"])
    def reject(self, request, pk=None):
        change = self.get_object()
        try:
            apply_profile_change_decision(change, ProfileChangeStatus.REJECTED, request.user, request.data.get("note", ""))
        except ValueError as e:
            return Response({"success": False, "message": str(e)}, status=400)
        return Response({"success": True, "message": "تغییر پروفایل رد شد.", "change": ProfileChangeRequestSerializer(change).data})


class OrganizationDetailView(APIView):
    """Citizen: view/update my own organization details (center name / manager)."""

    def get(self, request):
        detail = getattr(request.user, "organization_detail", None)
        if not detail:
            return Response({"success": False, "message": "این حساب سازمانی نیست."}, status=404)
        return Response({"success": True, "organization": OrganizationDetailSerializer(detail).data})

    def patch(self, request):
        detail = getattr(request.user, "organization_detail", None)
        if not detail:
            return Response({"success": False, "message": "این حساب سازمانی نیست."}, status=404)
        serializer = OrganizationDetailSerializer(detail, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response({"success": True, "organization": serializer.data})


class AdminOrganizationViewSet(viewsets.ReadOnlyModelViewSet):
    """Admin: verification center for organizational customers (اداره/سازمان)."""

    queryset = OrganizationDetail.objects.select_related("user").all()
    serializer_class = OrganizationDetailSerializer
    permission_classes = [permissions.IsAdminUser]
    filterset_fields = ["verification_status"]

    @action(detail=True, methods=["post"])
    def approve(self, request, pk=None):
        org = self.get_object()
        org.verification_status = "APPROVED"
        org.verification_note = request.data.get("note", "")
        org.save(update_fields=["verification_status", "verification_note", "updated_at"])
        return Response({"success": True, "message": "حساب سازمانی تأیید شد."})

    @action(detail=True, methods=["post"])
    def reject(self, request, pk=None):
        org = self.get_object()
        org.verification_status = "REJECTED"
        org.verification_note = request.data.get("note", "")
        org.save(update_fields=["verification_status", "verification_note", "updated_at"])
        return Response({"success": True, "message": "حساب سازمانی رد شد."})


class AddressViewSet(viewsets.ModelViewSet):
    serializer_class = AddressSerializer

    def get_queryset(self):
        return Address.objects.filter(user=self.request.user).order_by("-is_default", "-created_at")

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)
