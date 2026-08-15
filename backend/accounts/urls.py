from django.urls import path
from rest_framework.routers import DefaultRouter
from .views import RegisterView, LoginView, MeView, AddressViewSet

router = DefaultRouter()
router.register("addresses", AddressViewSet, basename="address")

urlpatterns = [
    path("register/", RegisterView.as_view(), name="register"),
    path("login/", LoginView.as_view(), name="login"),
    path("me/", MeView.as_view(), name="me"),
] + router.urls
