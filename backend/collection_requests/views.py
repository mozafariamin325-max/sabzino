from rest_framework import generics, views, viewsets, permissions, status
from rest_framework.response import Response
from django.utils import timezone
from .models import CollectionRequest, RequestStatus
from .serializers import CollectionRequestSerializer, CreateCollectionRequestSerializer, WeighInSerializer
from .services import log_status, find_nearby_open_requests, accept_request, complete_weighing


class CollectionRequestViewSet(viewsets.ModelViewSet):
    """Citizen-facing: create + list/track own collection requests (spec section 6)."""

    lookup_field = "uid"

    def get_queryset(self):
        return CollectionRequest.objects.filter(citizen=self.request.user).prefetch_related(
            "materials", "status_logs", "weighing"
        ).select_related("assignment")

    def get_serializer_class(self):
        return CreateCollectionRequestSerializer if self.action == "create" else CollectionRequestSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        obj = serializer.save()
        return Response(
            {"success": True, "message": "درخواست جمع‌آوری ثبت شد.", "request": CollectionRequestSerializer(obj).data},
            status=status.HTTP_201_CREATED,
        )

    def destroy(self, request, *args, **kwargs):
        obj = self.get_object()
        if obj.status in (RequestStatus.COMPLETED, RequestStatus.CANCELLED):
            return Response({"success": False, "message": "این درخواست قابل لغو نیست."}, status=400)
        log_status(obj, RequestStatus.CANCELLED, note="لغو توسط شهروند", changed_by=request.user)
        return Response({"success": True, "message": "درخواست لغو شد."})


class NearbyOpenRequestsView(views.APIView):
    """Collector job-board (spec section 10/12): open requests ranked by distance."""

    def get(self, request):
        profile = getattr(request.user, "collector_profile", None)
        if not profile or not profile.is_approved:
            return Response({"success": False, "message": "پروفایل جمع‌آور تأیید نشده است."}, status=403)
        requests = find_nearby_open_requests(profile)
        return Response({"success": True, "requests": CollectionRequestSerializer(requests, many=True).data})


class MyAssignmentsView(generics.ListAPIView):
    serializer_class = CollectionRequestSerializer

    def get_queryset(self):
        profile = getattr(self.request.user, "collector_profile", None)
        if not profile:
            return CollectionRequest.objects.none()
        return CollectionRequest.objects.filter(assignment__collector=profile).prefetch_related(
            "materials", "status_logs", "weighing"
        ).select_related("assignment")


class AcceptRequestView(views.APIView):
    def post(self, request, uid):
        profile = getattr(request.user, "collector_profile", None)
        if not profile or not profile.is_approved:
            return Response({"success": False, "message": "پروفایل جمع‌آور تأیید نشده است."}, status=403)
        req_obj = generics.get_object_or_404(CollectionRequest, uid=uid)
        try:
            accept_request(profile, req_obj)
        except ValueError as e:
            return Response({"success": False, "message": str(e)}, status=400)
        return Response({"success": True, "message": "درخواست پذیرفته شد.", "request": CollectionRequestSerializer(req_obj).data})


class UpdateAssignmentStatusView(views.APIView):
    """ON_THE_WAY -> ARRIVED -> COLLECTED, driven by the collector app."""

    ALLOWED_NEXT = {
        RequestStatus.ACCEPTED: RequestStatus.ON_THE_WAY,
        RequestStatus.ON_THE_WAY: RequestStatus.ARRIVED,
        RequestStatus.ARRIVED: RequestStatus.COLLECTED,
    }
    TIMESTAMP_FIELD = {
        RequestStatus.ON_THE_WAY: "on_the_way_at",
        RequestStatus.ARRIVED: "arrived_at",
        RequestStatus.COLLECTED: "collected_at",
    }

    def post(self, request, uid):
        profile = getattr(request.user, "collector_profile", None)
        req_obj = generics.get_object_or_404(CollectionRequest, uid=uid)
        assignment = getattr(req_obj, "assignment", None)
        if not profile or not assignment or assignment.collector_id != profile.id:
            return Response({"success": False, "message": "شما مجاز به تغییر این درخواست نیستید."}, status=403)
        next_status = self.ALLOWED_NEXT.get(req_obj.status)
        if not next_status:
            return Response({"success": False, "message": "امکان تغییر وضعیت از این مرحله وجود ندارد."}, status=400)
        field = self.TIMESTAMP_FIELD[next_status]
        setattr(assignment, field, timezone.now())
        assignment.save(update_fields=[field])
        log_status(req_obj, next_status, changed_by=request.user)
        return Response({"success": True, "request": CollectionRequestSerializer(req_obj).data})


class WeighInView(views.APIView):
    """Weigh-in + settlement (spec sections 16-18): credits wallet + green points."""

    def post(self, request, uid):
        req_obj = generics.get_object_or_404(CollectionRequest, uid=uid)
        profile = getattr(request.user, "collector_profile", None)
        assignment = getattr(req_obj, "assignment", None)
        is_owner_collector = profile and assignment and assignment.collector_id == profile.id
        if not (is_owner_collector or request.user.is_staff):
            return Response({"success": False, "message": "غیرمجاز."}, status=403)
        if req_obj.status not in (RequestStatus.COLLECTED, RequestStatus.ARRIVED):
            return Response({"success": False, "message": "درخواست هنوز آماده وزن‌کشی نیست."}, status=400)
        serializer = WeighInSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        record = complete_weighing(
            req_obj, serializer.validated_data["material"], serializer.validated_data["weight_kg"], weighed_by=request.user
        )
        return Response({
            "success": True, "message": "وزن‌کشی و تسویه با موفقیت انجام شد.",
            "weighing": {"weight_kg": str(record.weight_kg), "total_value": str(record.total_value), "points_awarded": record.points_awarded},
        })
