"""
SABZINO (سبزینو) — API root. Versioned under /api/v1/ per spec section 56.
"""

from django.contrib import admin
from django.conf import settings
from django.conf.urls.static import static
from django.urls import path, include
from django.http import JsonResponse
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView


def health(request):
    return JsonResponse({"success": True, "service": "sabzino-api", "status": "ok"})


urlpatterns = [
    path("admin/", admin.site.urls),
    path("health/", health, name="health"),
    path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
    path("api/docs/", SpectacularSwaggerView.as_view(url_name="schema"), name="swagger-ui"),

    path("api/v1/auth/", include("accounts.urls")),
    path("api/v1/locations/", include("locations.urls")),
    path("api/v1/materials/", include("materials.urls")),
    path("api/v1/pricing/", include("pricing.urls")),
    path("api/v1/collections/", include("collection_requests.urls")),
    path("api/v1/collectors/", include("collectors.urls")),
    path("api/v1/stations/", include("stations.urls")),
    path("api/v1/wallet/", include("wallet.urls")),
    path("api/v1/rewards/", include("rewards.urls")),
    path("api/v1/marketplace/", include("marketplace.urls")),
    path("api/v1/orders/", include("orders.urls")),
    path("api/v1/municipality/", include("municipality.urls")),
    path("api/v1/notifications/", include("notifications.urls")),
    path("api/v1/audit/", include("audit.urls")),
    path("api/v1/green-impact/", include("green_impact.urls")),
    path("api/v1/", include("core.urls")),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
