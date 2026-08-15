"""
Interface layer for future AI features (spec sections 77-78). Not implemented
with real ML in the MVP — kept as clean service boundaries so a real model or
external API can be dropped in later without touching calling code.
"""


class WasteClassificationService:
    def classify(self, image_path: str) -> dict:
        raise NotImplementedError("متصل به مدل تشخیص تصویر در فاز بعدی پروژه.")


class RouteOptimizationService:
    def optimize(self, collector_location, stop_locations: list) -> list:
        raise NotImplementedError("بهینه‌سازی مسیر در فاز بعدی پروژه پیاده‌سازی می‌شود.")


class DemandPredictionService:
    def predict(self, material_id: int, city: str) -> dict:
        raise NotImplementedError("پیش‌بینی تقاضا در فاز بعدی پروژه پیاده‌سازی می‌شود.")
