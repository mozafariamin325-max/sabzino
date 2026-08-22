from decimal import Decimal

from django.db import transaction
from django.utils import timezone

from wallet.services import debit_wallet
from wallet.models import WalletTransactionType
from .models import ImpactProject, ImpactContribution, ImpactProjectStatus, PendingDonation


@transaction.atomic
def contribute(user, project: ImpactProject, amount: Decimal, request_obj=None) -> ImpactContribution:
    """
    Debits `amount` (Toman) from the user's wallet through the SAME ledger
    used everywhere else in Sabzino (wallet.services.debit_wallet — raises
    ValueError on insufficient balance) and records an ImpactContribution
    receipt row. No parallel financial system.
    """
    if amount is None or amount <= 0:
        raise ValueError("مبلغ مشارکت باید بیشتر از صفر باشد.")
    if project.status != ImpactProjectStatus.ACTIVE:
        raise ValueError("این طرح در حال حاضر فعال نیست.")

    tx = debit_wallet(
        user, amount, WalletTransactionType.GREEN_IMPACT,
        description=f"مشارکت در «{project.title}»",
        reference=request_obj.code if request_obj else "",
    )

    project.raised_amount = project.raised_amount + amount
    project.save(update_fields=["raised_amount", "updated_at"])

    contribution = ImpactContribution.objects.create(
        user=user, project=project, request=request_obj, amount=amount,
        waste_value_snapshot=request_obj.estimated_value if request_obj else None,
        wallet_transaction=tx,
    )

    # اگر این تحویل یک مهلت تخصیص باز داشت، حالا که شهروند دستی تخصیص داد
    # دیگر لازم نیست خودکار انجام شود.
    if request_obj is not None:
        PendingDonation.objects.filter(request=request_obj, resolved=False).update(resolved=True)

    return contribution


def create_pending_donation(request_obj, amount: Decimal, days: int = 7) -> "PendingDonation | None":
    """
    بلافاصله بعد از وزن‌کشیِ یک درخواست با green_intent=DONATE فراخوانی
    می‌شود (از collection_requests.services.complete_weighing). مبلغ طبق
    روال عادی همان لحظه به کیف‌پول شهروند واریز شده — این فقط یک مهلت
    یادآوری/تخصیص می‌سازد، هیچ پولی جدا یا مسدود نمی‌شود.
    """
    from datetime import timedelta

    if amount is None or amount <= 0:
        return None
    return PendingDonation.objects.create(request=request_obj, amount=amount, deadline=timezone.now() + timedelta(days=days))


def auto_allocate_expired_donations():
    """
    اجرای روزانه (دستور مدیریتی auto_allocate_donations، مشابه الگوی
    generate_recurring_requests — روی یک Scheduled Task رایگان
    PythonAnywhere قابل تنظیم است). هر مهلتی که گذشته و شهروند خودش تخصیص
    نداده را به طرح پیش‌فرض (is_default_allocation=True) هدایت می‌کند.
    اگر هیچ طرحی پیش‌فرض نشده باشد، هیچ اقدامی نمی‌کند (تا مدیر یکی تعیین کند).
    """
    default_project = ImpactProject.objects.filter(
        is_default_allocation=True, status=ImpactProjectStatus.ACTIVE,
    ).first()
    if not default_project:
        return []

    expired = PendingDonation.objects.filter(resolved=False, deadline__lte=timezone.now()).select_related(
        "request", "request__citizen",
    )
    results = []
    for pending in expired:
        already = ImpactContribution.objects.filter(request=pending.request).exists()
        if already:
            pending.resolved = True
            pending.save(update_fields=["resolved"])
            continue
        contribution = contribute(pending.request.citizen, default_project, pending.amount, request_obj=pending.request)
        pending.resolved = True
        pending.save(update_fields=["resolved"])
        results.append(contribution)
    return results
