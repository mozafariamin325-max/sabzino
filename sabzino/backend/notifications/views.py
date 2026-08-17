from rest_framework import generics, views
from rest_framework.response import Response
from .models import Notification
from .serializers import NotificationSerializer


class MyNotificationsView(generics.ListAPIView):
    serializer_class = NotificationSerializer

    def get_queryset(self):
        return Notification.objects.filter(user=self.request.user)


class MarkNotificationReadView(views.APIView):
    def post(self, request, uid):
        Notification.objects.filter(user=request.user, uid=uid).update(is_read=True)
        return Response({"success": True})


class MarkAllReadView(views.APIView):
    def post(self, request):
        Notification.objects.filter(user=request.user, is_read=False).update(is_read=True)
        return Response({"success": True})
