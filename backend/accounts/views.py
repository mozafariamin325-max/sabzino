from rest_framework import generics, status, viewsets, permissions
from rest_framework.response import Response
from rest_framework.views import APIView
from .models import Address
from .serializers import (
    RegisterSerializer, LoginSerializer, UserSerializer, AddressSerializer, tokens_for_user,
)


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
        serializer = UserSerializer(request.user, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response({"success": True, "user": serializer.data})


class AddressViewSet(viewsets.ModelViewSet):
    serializer_class = AddressSerializer

    def get_queryset(self):
        return Address.objects.filter(user=self.request.user).order_by("-is_default", "-created_at")

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)
