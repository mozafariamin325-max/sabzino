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
        if response.status_code == 429:
            message = "تعداد درخواست‌ها زیاد بود؛ کمی صبر کن و دوباره تلاش کن."
        if not message and isinstance(errors, dict):
            # پیام دقیق اولین فیلدِ ناموفق (مثلاً «این کد ملی قبلاً ثبت شده») به‌جای پیام کلی
            for value in errors.values():
                if isinstance(value, (list, tuple)) and value:
                    message = str(value[0])
                    break
                if isinstance(value, str) and value:
                    message = value
                    break
        if not message:
            message = "خطایی رخ داد."
        response.data = {"success": False, "message": str(message), "errors": errors}
    return response
