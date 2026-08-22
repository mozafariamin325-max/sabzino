from django.urls import path, include
from rest_framework.routers import DefaultRouter, SimpleRouter
from .views import (
    CollectionRequestViewSet, NearbyOpenRequestsView, MyAssignmentsView,
    AcceptRequestView, DismissRequestView, UpdateAssignmentStatusView, WeighInView, RecurringScheduleViewSet,
    AdminCollectionRequestViewSet,
)

# SimpleRouter (not DefaultRouter) for these two nested routers: DefaultRouter
# auto-adds its own browsable-API "root" view at pattern ^$, and since each of
# these is mounted with include() at a bare prefix, that decoy root view sits
# earlier in collection_requests.urls' pattern list than the outer `router`
# below — it was silently shadowing CollectionRequestViewSet's real list/create
# endpoint (GET/POST /api/v1/collections/), making it impossible for a citizen
# to submit a new collection request. SimpleRouter has no root view, so no collision.
recurring_router = SimpleRouter()
recurring_router.register("", RecurringScheduleViewSet, basename="recurring-schedule")

admin_router = SimpleRouter()
admin_router.register("admin", AdminCollectionRequestViewSet, basename="admin-collection-request")

router = DefaultRouter()
router.register("", CollectionRequestViewSet, basename="collection-request")

urlpatterns = [
    path("collector/nearby/", NearbyOpenRequestsView.as_view(), name="collector-nearby"),
    path("collector/my-assignments/", MyAssignmentsView.as_view(), name="collector-my-assignments"),
    path("<uuid:uid>/accept/", AcceptRequestView.as_view(), name="collection-accept"),
    path("<uuid:uid>/dismiss/", DismissRequestView.as_view(), name="collection-dismiss"),
    path("<uuid:uid>/advance/", UpdateAssignmentStatusView.as_view(), name="collection-advance"),
    path("<uuid:uid>/weigh-in/", WeighInView.as_view(), name="collection-weigh-in"),
    path("recurring-schedules/", include(recurring_router.urls)),
    path("", include(admin_router.urls)),
] + router.urls
