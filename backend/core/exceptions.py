from rest_framework.views import exception_handler


def standard_exception_handler(exc, context):
    """
    Normalizes every DRF error response to:
    {"success": false, "message": "...", "errors": {...}}
    per the project's API contract (spec section 86).
    """
    response = exception_handler(exc, context)
    if response is not None:
        errors = response.data if isinstance(response.data, dict) else {"detail": response.data}
        message = errors.get("detail") if isinstance(errors, dict) else str(errors)
        if not message:
            message = "خطایی رخ داد."
        response.data = {"success": False, "message": str(message), "errors": errors}
    return response
