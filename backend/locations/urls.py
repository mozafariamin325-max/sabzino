from rest_framework.routers import DefaultRouter
from .views import ProvinceViewSet, CityViewSet, DistrictViewSet, NeighborhoodViewSet

router = DefaultRouter()
router.register("provinces", ProvinceViewSet)
router.register("cities", CityViewSet)
router.register("districts", DistrictViewSet)
router.register("neighborhoods", NeighborhoodViewSet)

urlpatterns = router.urls
