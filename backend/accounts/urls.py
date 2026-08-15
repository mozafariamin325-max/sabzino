from django.urls import path
from rest_framework.routers import DefaultRouter
from .views import (
    RegisterView, LoginView, MeView, AddressViewSet, ProfileChangeRequestViewSet,
    AdminProfileChangeRequestViewSet, OrganizationDetailView, AdminOrganizationViewSet,
)

router = DefaultRouter()
router.register("addresses", AddressViewSet, basename="address")
router.register("profile-change-requests", ProfileChangeRequestViewSet, basename="profile-change-request")
router.register("admin/profile-change-requests", AdminProfileChangeRequestViewSet, basename="admin-profile-change-request")
router.register("admin/organizations", AdminOrganizationViewSet, basename="admin-organization")

urlpatterns = [
    path("register/", RegisterView.as_view(), name="register"),
    path("login/", LoginView.as_view(), name="login"),
    path("me/", MeView.as_view(), name="me"),
    path("organization/", OrganizationDetailView.as_view(), name="organization-detail"),
] + router.urls
