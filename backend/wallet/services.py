from decimal import Decimal
from django.db import transaction
from .models import Wallet, WalletTransaction, WalletTransactionType


def ensure_wallet(user) -> Wallet:
    wallet, _ = Wallet.objects.get_or_create(user=user)
    return wallet


@transaction.atomic
def credit_wallet(user, amount: Decimal, tx_type: str, description: str = "", reference: str = "") -> WalletTransaction:
    """Adds money to a user's wallet and writes an immutable ledger row. Uses select_for_update to avoid races."""
    wallet = Wallet.objects.select_for_update().get(user=user)
    wallet.balance = wallet.balance + amount
    wallet.save(update_fields=["balance", "updated_at"])
    return WalletTransaction.objects.create(
        wallet=wallet, type=tx_type, amount=amount, balance_after=wallet.balance,
        description=description, reference=reference,
    )


@transaction.atomic
def debit_wallet(user, amount: Decimal, tx_type: str, description: str = "", reference: str = "") -> WalletTransaction:
    wallet = Wallet.objects.select_for_update().get(user=user)
    if wallet.balance < amount:
        raise ValueError("موجودی کیف پول کافی نیست.")
    wallet.balance = wallet.balance - amount
    wallet.save(update_fields=["balance", "updated_at"])
    return WalletTransaction.objects.create(
        wallet=wallet, type=tx_type, amount=-amount, balance_after=wallet.balance,
        description=description, reference=reference,
    )
