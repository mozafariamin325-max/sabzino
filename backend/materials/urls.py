from rest_framework.routers import DefaultRouter
from .views import MaterialCategoryViewSet, MaterialViewSet

router = DefaultRouter()
router.register("categories", MaterialCategoryViewSet)
router.register("", MaterialViewSet)

urlpatterns = router.urls
