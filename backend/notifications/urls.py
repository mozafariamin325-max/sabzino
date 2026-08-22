from django.urls import path
from .views import MyNotificationsView, MarkNotificationReadView, MarkAllReadView

urlpatterns = [
    path("", MyNotificationsView.as_view(), name="notifications"),
    path("<uuid:uid>/read/", MarkNotificationReadView.as_view(), name="notification-read"),
    path("read-all/", MarkAllReadView.as_view(), name="notification-read-all"),
]
