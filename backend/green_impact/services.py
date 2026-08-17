from decimal import Decimal

from django.db import transaction

from wallet.services import debit_wallet
from wallet.models import WalletTransactionType
from .models import ImpactProject, ImpactContribution, ImpactProjectStatus


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

    return ImpactContribution.objects.create(
        user=user, project=project, request=request_obj, amount=amount,
        waste_value_snapshot=request_obj.estimated_value if request_obj else None,
        wallet_transaction=tx,
    )
