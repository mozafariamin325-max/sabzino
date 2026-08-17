import random
from decimal import Decimal
from django.db import transaction
from accounts.models import User
from materials.models import Material
from core.services import get_points_per_kg
from wallet.services import credit_wallet
from wallet.models import WalletTransactionType
from rewards.services import award_points
from .models import StationTransaction


def generate_transaction_code():
    while True:
        code = f"TXN-{random.randint(100000, 999999)}"
        if not StationTransaction.objects.filter(transaction_code=code).exists():
            return code


def find_citizen(identifier: str) -> User:
    user = User.objects.filter(phone_number=identifier).first() or User.objects.filter(uid=identifier).first()
    if not user:
        raise ValueError("شهروندی با این مشخصات یافت نشد.")
    return user


@transaction.atomic
def create_station_transaction(station, operator, citizen: User, material: Material, weight_kg: Decimal) -> StationTransaction:
    unit_price = material.current_price or Decimal("0")
    total_value = (unit_price * weight_kg).quantize(Decimal("1"))
    points = int((get_points_per_kg() * weight_kg).quantize(Decimal("1")))

    txn = StationTransaction.objects.create(
        station=station, operator=operator, citizen=citizen, material=material,
        weight_kg=weight_kg, unit_price_snapshot=unit_price, total_value=total_value,
        points_awarded=points, transaction_code=generate_transaction_code(),
    )
    credit_wallet(
        citizen, total_value, WalletTransactionType.CREDIT,
        description=f"تحویل حضوری {weight_kg} کیلوگرم {material.name} در {station.name}", reference=txn.transaction_code,
    )
    award_points(citizen, points, "COLLECTION", description=f"تحویل حضوری در {station.name}", reference=txn.transaction_code)
    return txn
