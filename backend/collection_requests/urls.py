from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    CollectionRequestViewSet, NearbyOpenRequestsView, MyAssignmentsView,
    AcceptRequestView, UpdateAssignmentStatusView, WeighInView, RecurringScheduleViewSet,
)

recurring_router = DefaultRouter()
recurring_router.register("", RecurringScheduleViewSet, basename="recurring-schedule")

router = DefaultRouter()
router.register("", CollectionRequestViewSet, basename="collection-request")

urlpatterns = [
    path("collector/nearby/", NearbyOpenRequestsView.as_view(), name="collector-nearby"),
    path("collector/my-assignments/", MyAssignmentsView.as_view(), name="collector-my-assignments"),
    path("<uuid:uid>/accept/", AcceptRequestView.as_view(), name="collection-accept"),
    path("<uuid:uid>/advance/", UpdateAssignmentStatusView.as_view(), name="collection-advance"),
    path("<uuid:uid>/weigh-in/", WeighInView.as_view(), name="collection-weigh-in"),
    path("recurring-schedules/", include(recurring_router.urls)),
] + router.urls
