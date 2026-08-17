from decimal import Decimal, InvalidOperation

from django.db import transaction
from django.db.models import Sum, Count
from rest_framework import viewsets, permissions, views, generics
from rest_framework.response import Response

from accounts.models import User
from collection_requests.models import CollectionRequest, RequestStatus
from wallet.models import Wallet

from .models import ImpactProject, ImpactContribution, ImpactCategory, tier_for_deliveries
from .serializers import ImpactProjectSerializer, ImpactContributionSerializer
from .services import contribute


class ImpactProjectViewSet(viewsets.ModelViewSet):
    """
    GET is public (the "پروژه‌های اثر سبز" page is browsable without login on
    the frontend too, though the app still requires auth to actually
    contribute). Only Admins can create/edit/activate/deactivate projects —
    project management stays entirely in the Admin panel, never hard-coded.
    """

    queryset = ImpactProject.objects.select_related("city").all()
    serializer_class = ImpactProjectSerializer
    filterset_fields = ["category", "status"]
    pagination_class = None

    def get_permissions(self):
        return [permissions.AllowAny()] if self.request.method in permissions.SAFE_METHODS else [permissions.IsAdminUser()]


class ContributeView(views.APIView):
    """
    POST { request: "<collection-request-uid>" | null, allocations: [{project: "<uid>", amount: number}, ...] }

    Splits (voluntarily) part of the citizen's ALREADY-CREDITED wallet balance
    across one or more green-impact projects in a single atomic operation —
    "دریافت کامل / مشارکت / ترکیبی" from the product spec. If `request` is
    given, the contribution is tied to that specific completed delivery (for
    the digital receipt); if omitted, it's a general contribution from the
    citizen's wallet balance (used from the standalone "پروژه‌های اثر سبز" page).
    """

    permission_classes = [permissions.IsAuthenticated]

    @transaction.atomic
    def post(self, request):
        allocations = request.data.get("allocations") or []
        if not isinstance(allocations, list) or not allocations:
            return Response({"success": False, "message": "حداقل یک مورد تخصیص لازم است."}, status=400)

        collection_request = None
        request_uid = request.data.get("request")
        if request_uid:
            collection_request = CollectionRequest.objects.filter(uid=request_uid, citizen=request.user).first()
            if not collection_request:
                return Response({"success": False, "message": "درخواست جمع‌آوری یافت نشد."}, status=404)

        created = []
        for item in allocations:
            project_uid = item.get("project")
            project = ImpactProject.objects.filter(uid=project_uid).first()
            if not project:
                return Response({"success": False, "message": "طرح اثر سبز یافت نشد."}, status=404)
            try:
                amount = Decimal(str(item.get("amount")))
            except (InvalidOperation, TypeError):
                return Response({"success": False, "message": "مبلغ نامعتبر است."}, status=400)
            try:
                contribution = contribute(request.user, project, amount, request_obj=collection_request)
            except ValueError as exc:
                return Response({"success": False, "message": str(exc)}, status=400)
            created.append(contribution)

        data = ImpactContributionSerializer(created, many=True).data
        return Response({"success": True, "contributions": data})


class MyContributionsView(generics.ListAPIView):
    serializer_class = ImpactContributionSerializer
    pagination_class = None
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ["request", "project"]

    def get_queryset(self):
        return (
            ImpactContribution.objects.filter(user=self.request.user)
            .select_related("project", "request", "user")
            .order_by("-created_at")
        )


class MyGreenImpactView(views.APIView):
    """
    Aggregate for the "اثر سبز من" card — social/economic contribution data
    that lives only in this module (kept separate from core.MyImpactView's
    environmental CO2/kg estimate, which is unrelated and untouched).
    """

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        contributions = ImpactContribution.objects.filter(user=user)
        total_contributed = contributions.aggregate(t=Sum("amount"))["t"] or 0
        contributions_count = contributions.count()

        category_totals = {c.value: 0 for c in ImpactCategory}
        for row in contributions.values("project__category").annotate(t=Sum("amount")):
            if row["project__category"] in category_totals:
                category_totals[row["project__category"]] = float(row["t"] or 0)

        deliveries = CollectionRequest.objects.filter(citizen=user, status=RequestStatus.COMPLETED).count()
        tier = tier_for_deliveries(deliveries)

        wallet = Wallet.objects.filter(user=user).first()

        return Response({
            "success": True,
            "green_impact": {
                "total_contributed": float(total_contributed),
                "contributions_count": contributions_count,
                "category_totals": category_totals,
                "tier": tier,
                "wallet_balance": float(wallet.balance) if wallet else 0,
                "note": "این آمار بر پایه تراکنش‌های واقعی مشارکت شما در سبزینو محاسبه شده است.",
            },
        })


class ImpactDashboardView(views.APIView):
    """Admin-only aggregate stats for the «داشبورد اثر سبز» panel."""

    permission_classes = [permissions.IsAdminUser]

    def get(self, request):
        contributions = ImpactContribution.objects.all()
        total_contributed = contributions.aggregate(t=Sum("amount"))["t"] or 0
        participants = contributions.values("user").distinct().count()

        category_totals = {c.value: 0 for c in ImpactCategory}
        for row in contributions.values("project__category").annotate(t=Sum("amount")):
            if row["project__category"] in category_totals:
                category_totals[row["project__category"]] = float(row["t"] or 0)

        by_project = list(
            contributions.values("project__uid", "project__title", "project__icon", "project__category")
            .annotate(total=Sum("amount"), contributors=Count("user", distinct=True))
            .order_by("-total")
        )
        for row in by_project:
            row["project_uid"] = str(row.pop("project__uid"))
            row["project_title"] = row.pop("project__title")
            row["project_icon"] = row.pop("project__icon")
            row["project_category"] = row.pop("project__category")
            row["total"] = float(row["total"] or 0)

        by_city = list(
            contributions.filter(user__addresses__is_default=True)
            .values("user__addresses__city")
            .annotate(total=Sum("amount"), contributors=Count("user", distinct=True))
            .order_by("-total")[:15]
        )
        for row in by_city:
            row["city"] = row.pop("user__addresses__city") or "نامشخص"
            row["total"] = float(row["total"] or 0)

        monthly = list(
            contributions.extra(select={"month": "strftime('%%Y-%%m', created_at)"})
            .values("month").annotate(total=Sum("amount")).order_by("month")
        )
        for row in monthly:
            row["total"] = float(row["total"] or 0)

        total_waste_value = CollectionRequest.objects.filter(status=RequestStatus.COMPLETED).aggregate(
            t=Sum("weighing__total_value")
        )["t"] or 0

        return Response({
            "success": True,
            "dashboard": {
                "total_waste_value": float(total_waste_value),
                "total_contributed": float(total_contributed),
                "category_totals": category_totals,
                "participants": participants,
                "active_projects": ImpactProject.objects.filter(status="ACTIVE").count(),
                "total_projects": ImpactProject.objects.count(),
                "by_project": by_project,
                "by_city": by_city,
                "monthly": monthly,
            },
            "note": "برخی داده‌ها بر پایه داده نمونه (Demo Seed) محاسبه شده‌اند.",
        })
