from decimal import Decimal, InvalidOperation
from rest_framework import generics, views, viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils import timezone
from .models import CollectionRequest, RequestStatus, RecurringSchedule
from .serializers import CollectionRequestSerializer, CreateCollectionRequestSerializer, WeighInSerializer, RecurringScheduleSerializer
from .services import (
    log_status, find_nearby_open_requests, accept_request, complete_weighing,
    admin_edit_request, admin_override_weighing, dismiss_request,
)


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
        from django.db.models import Sum
        from decimal import Decimal
        from core.services import get_points_per_kg

        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        obj = serializer.save()

        # فاز ۱۴: تخمین امتیازی که پس از وزن‌کشی نهایی به این درخواست تعلق
        # می‌گیرد (بر پایه همان وزن تخمینی که خود شهروند وارد کرده) — فقط
        # برای نمایش در صفحه موفقیت بلافاصله بعد از ثبت؛ عدد قطعی همچنان
        # پس از وزن‌کشی واقعی محاسبه و اعطا می‌شود.
        total_weight = obj.items.aggregate(total=Sum("weight_kg"))["total"] or Decimal("0")
        estimated_points = int((get_points_per_kg() * total_weight).quantize(Decimal("1")))

        return Response(
            {
                "success": True, "message": "درخواست جمع‌آوری ثبت شد.",
                "request": CollectionRequestSerializer(obj).data,
                "estimated_points": estimated_points,
            },
            status=status.HTTP_201_CREATED,
        )

    def destroy(self, request, *args, **kwargs):
        obj = self.get_object()
        if obj.status in (RequestStatus.COMPLETED, RequestStatus.CANCELLED):
            return Response({"success": False, "message": "این درخواست قابل لغو نیست."}, status=400)
        log_status(obj, RequestStatus.CANCELLED, note="لغو توسط شهروند", changed_by=request.user)
        return Response({"success": True, "message": "درخواست لغو شد."})


class RecurringScheduleViewSet(viewsets.ModelViewSet):
    """Citizen: manage recurring pickups (spec ask: هفتگی/ماهانه)."""

    serializer_class = RecurringScheduleSerializer
    lookup_field = "uid"

    def get_queryset(self):
        return RecurringSchedule.objects.filter(citizen=self.request.user).prefetch_related("materials").select_related("address")


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


class DismissRequestView(views.APIView):
    """
    فاز ۱۰: دکمه «رد کردن» برای جمع‌آور — فقط از لیست «نزدیک من» خودش پنهان
    می‌شود؛ برای بقیه‌ی جمع‌آورهای آنلاین همچنان قابل مشاهده و پذیرش است.
    """

    def post(self, request, uid):
        profile = getattr(request.user, "collector_profile", None)
        if not profile:
            return Response({"success": False, "message": "پروفایل جمع‌آور یافت نشد."}, status=404)
        req_obj = generics.get_object_or_404(CollectionRequest, uid=uid)
        dismiss_request(profile, req_obj)
        return Response({"success": True})


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


class AdminCollectionRequestViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Admin oversight of the whole request pipeline (spec ask: "رصد" + "اصلاح"
    از داشبورد مدیر). Read-only list/retrieve for monitoring, plus three
    narrow, fully-audited write actions — never a raw PATCH/PUT/DELETE, so
    an admin can never silently bypass the normal citizen/collector flow.
    """

    queryset = CollectionRequest.objects.select_related("citizen", "assignment__collector__user").prefetch_related(
        "materials", "status_logs", "weighing"
    ).all()
    serializer_class = CollectionRequestSerializer
    permission_classes = [permissions.IsAdminUser]
    lookup_field = "uid"
    filterset_fields = ["status"]
    search_fields = ["code", "citizen__first_name", "citizen__last_name", "citizen__phone_number"]

    @action(detail=True, methods=["post"])
    def edit(self, request, uid=None):
        obj = self.get_object()
        reason = request.data.get("reason", "")
        changes = {k: v for k, v in request.data.items() if k in ("address_text_snapshot", "description")}
        try:
            admin_edit_request(obj, changes, reason, changed_by=request.user)
        except ValueError as e:
            return Response({"success": False, "message": str(e)}, status=400)
        return Response({"success": True, "message": "درخواست ویرایش شد.", "request": CollectionRequestSerializer(obj).data})

    @action(detail=True, methods=["post"])
    def override_weighing(self, request, uid=None):
        obj = self.get_object()
        reason = request.data.get("reason", "")
        try:
            weight_kg = Decimal(str(request.data.get("weight_kg")))
        except (InvalidOperation, TypeError):
            return Response({"success": False, "message": "وزن نامعتبر است."}, status=400)
        raw_total = request.data.get("total_value")
        try:
            total_value = Decimal(str(raw_total)) if raw_total not in (None, "") else None
        except InvalidOperation:
            return Response({"success": False, "message": "مبلغ نامعتبر است."}, status=400)
        try:
            admin_override_weighing(obj, weight_kg, reason, changed_by=request.user, total_value=total_value)
        except ValueError as e:
            return Response({"success": False, "message": str(e)}, status=400)
        return Response({"success": True, "message": "وزن‌کشی اصلاح شد.", "request": CollectionRequestSerializer(obj).data})

    @action(detail=True, methods=["post"])
    def cancel(self, request, uid=None):
        obj = self.get_object()
        reason = request.data.get("reason", "")
        if not reason:
            return Response({"success": False, "message": "ذکر دلیل لغو الزامی است."}, status=400)
        if obj.status in (RequestStatus.COMPLETED, RequestStatus.CANCELLED):
            return Response({"success": False, "message": "این درخواست قابل لغو نیست."}, status=400)
        log_status(obj, RequestStatus.CANCELLED, note=f"لغو توسط مدیر — دلیل: {reason}", changed_by=request.user)
        obj.cancelled_reason = reason
        obj.save(update_fields=["cancelled_reason", "updated_at"])
        return Response({"success": True, "message": "درخواست لغو شد.", "request": CollectionRequestSerializer(obj).data})
