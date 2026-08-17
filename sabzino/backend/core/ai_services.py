"""
Interface layer for future AI features (spec sections 77-78). The image
classifier below is a FUNCTIONAL MOCK (spec ask: "اگر AI واقعی وجود ندارد،
یک Mock intelligent classification بساز که بتوان بعداً API هوش مصنوعی را
به آن متصل کرد") — it does not actually look at pixel data, it returns a
plausible, real-catalog classification so the UI flow (camera → result →
add to request) is fully wired end to end. Swapping in a real model later
means only rewriting the body of classify(); every caller stays the same.
"""

import hashlib
import random


class WasteClassificationService:
    def classify(self, image_bytes: bytes | None = None, hint: str = "") -> dict:
        from materials.models import Material

        candidates = list(
            Material.objects.filter(is_active=True).select_related("category").prefetch_related("prices")
        )
        if not candidates:
            return {
                "success": False,
                "message": "هیچ مادهٔ فعالی برای تشخیص در سیستم ثبت نشده است.",
            }

        # Deterministic-but-varied pick: hash whatever bytes/hint we got so the
        # same photo tends to return the same mock result during a session,
        # without needing any real image understanding.
        seed_source = (hint or "").encode() + (image_bytes[:4096] if image_bytes else b"")
        if seed_source:
            seed = int(hashlib.sha256(seed_source).hexdigest(), 16)
        else:
            seed = random.randint(0, 2**32)
        rng = random.Random(seed)
        material = rng.choice(candidates)
        confidence = round(rng.uniform(0.78, 0.97), 2)

        price = material.current_price

        return {
            "success": True,
            "is_mock": True,
            "material_id": material.id,
            "material_name": material.name,
            "material_slug": material.slug,
            "material_icon": material.icon,
            "category_name": material.category.name,
            "recyclable": material.accepted_at_stations,
            "confidence": confidence,
            "unit": material.unit,
            "approx_price_per_unit": float(price) if price is not None else None,
            "note": "این نتیجه با یک مدل نمونه (Mock) تولید شده و باید توسط کاربر تأیید شود؛ در نسخهٔ بعدی به API واقعی تشخیص تصویر متصل می‌شود.",
        }


class RouteOptimizationService:
    def optimize(self, collector_location, stop_locations: list) -> list:
        raise NotImplementedError("بهینه‌سازی مسیر در فاز بعدی پروژه پیاده‌سازی می‌شود.")


class DemandPredictionService:
    def predict(self, material_id: int, city: str) -> dict:
        raise NotImplementedError("پیش‌بینی تقاضا در فاز بعدی پروژه پیاده‌سازی می‌شود.")
