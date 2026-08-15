from django.db import transaction
from django.utils import timezone
from core.services import get_setting
from .models import GreenPointAccount, GreenPointTransaction, Referral


def ensure_points_account(user) -> GreenPointAccount:
    account, _ = GreenPointAccount.objects.get_or_create(user=user)
    return account


@transaction.atomic
def award_points(user, amount: int, reason: str, description: str = "", reference: str = "") -> GreenPointTransaction:
    account = GreenPointAccount.objects.select_for_update().get_or_create(user=user)[0]
    account.points += amount
    account.xp += amount
    # simple level curve: every 500 xp = +1 level, admin-tunable later
    xp_per_level = int(get_setting("xp_per_level", 500))
    account.level = max(1, account.xp // xp_per_level + 1)
    account.save(update_fields=["points", "xp", "level", "updated_at"])
    return GreenPointTransaction.objects.create(
        account=account, amount=amount, reason=reason, description=description, reference=reference
    )


def apply_referral_bonus(referrer, referee):
    reward = int(get_setting("referral_reward_points", 100))
    Referral.objects.get_or_create(
        referrer=referrer, referee=referee, defaults={"reward_points": reward, "rewarded": True}
    )
    award_points(referrer, reward, "REFERRAL", description=f"دعوت {referee.get_full_name() or referee.username}")
    award_points(referee, reward // 2, "REFERRAL", description="پاداش خوش‌آمدگویی سبزینو")
