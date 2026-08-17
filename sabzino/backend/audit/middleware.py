SENSITIVE_PREFIXES = (
    "/api/v1/auth/login", "/api/v1/auth/register",
    "/api/v1/collectors/admin", "/api/v1/wallet/withdrawals",
    "/api/v1/pricing", "/api/v1/orders", "/api/v1/marketplace/recycling-centers",
    "/api/v1/marketplace/factories", "/api/v1/marketplace/wholesalers",
)


class AuditLogMiddleware:
    """Lightweight middleware: logs mutating requests on sensitive endpoints. Non-blocking, best-effort."""

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)
        try:
            if request.method in ("POST", "PATCH", "PUT", "DELETE") and request.path.startswith(tuple(SENSITIVE_PREFIXES)):
                self._log(request, response)
        except Exception:
            pass
        return response

    def _log(self, request, response):
        from .models import AuditLog

        user = getattr(request, "user", None)
        if user is not None and not getattr(user, "is_authenticated", False):
            user = None
        AuditLog.objects.create(
            user=user,
            action=f"{request.method} {request.path}",
            method=request.method,
            path=request.path,
            ip_address=request.META.get("REMOTE_ADDR"),
            metadata={"status_code": getattr(response, "status_code", None)},
        )
