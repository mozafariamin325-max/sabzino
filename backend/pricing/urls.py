from rest_framework.routers import DefaultRouter
from .views import MaterialPriceViewSet

router = DefaultRouter()
router.register("", MaterialPriceViewSet)

urlpatterns = router.urls
