"""
Django settings for SABZINO (سبزینو) project.
"""

from pathlib import Path
from datetime import timedelta
from decouple import config, Csv

BASE_DIR = Path(__file__).resolve().parent.parent

SECRET_KEY = config("SECRET_KEY", default="django-insecure-dev-key-change-in-production-sabzino")
DEBUG = config("DEBUG", default=True, cast=bool)
ALLOWED_HOSTS = config("ALLOWED_HOSTS", default="*", cast=Csv())

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    # third party
    "rest_framework",
    "rest_framework_simplejwt",
    "corsheaders",
    "django_filters",
    "drf_spectacular",
    # sabzino apps
    "core",
    "accounts",
    "locations",
    "materials",
    "pricing",
    "collection_requests",
    "collectors",
    "stations",
    "wallet",
    "rewards",
    "marketplace",
    "orders",
    "municipality",
    "notifications",
    "audit",
    "green_impact",
    "store",
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "whitenoise.middleware.WhiteNoiseMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
    "audit.middleware.AuditLogMiddleware",
]

ROOT_URLCONF = "config.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "config.wsgi.application"

# Database: sqlite by default (works with zero setup); set DATABASE_URL env for postgres in prod
DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": BASE_DIR / "db.sqlite3",
    }
}

if config("DATABASE_URL", default=""):
    import dj_database_url  # noqa
    DATABASES["default"] = dj_database_url.parse(config("DATABASE_URL"))

AUTH_USER_MODEL = "accounts.User"

AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator", "OPTIONS": {"min_length": 6}},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

LANGUAGE_CODE = "fa-ir"
TIME_ZONE = "Asia/Tehran"
USE_I18N = True
USE_TZ = True

STATIC_URL = "static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
STORAGES = {
    "staticfiles": {"BACKEND": "whitenoise.storage.CompressedManifestStaticFilesStorage"},
}
MEDIA_URL = "media/"
# On Liara, mount a persistent Disk (see deployment guide) and point this at
# its path via MEDIA_ROOT env var — otherwise uploaded files (collector
# documents, request photos) are lost on every redeploy since the container
# filesystem itself is ephemeral.
MEDIA_ROOT = config("MEDIA_ROOT", default=str(BASE_DIR / "media"))

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# ---- REST FRAMEWORK ----
REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": (
        "rest_framework_simplejwt.authentication.JWTAuthentication",
    ),
    "DEFAULT_PERMISSION_CLASSES": (
        "rest_framework.permissions.IsAuthenticated",
    ),
    "DEFAULT_PAGINATION_CLASS": "rest_framework.pagination.PageNumberPagination",
    "PAGE_SIZE": 20,
    "DEFAULT_FILTER_BACKENDS": (
        "django_filters.rest_framework.DjangoFilterBackend",
        "rest_framework.filters.SearchFilter",
        "rest_framework.filters.OrderingFilter",
    ),
    "EXCEPTION_HANDLER": "core.exceptions.standard_exception_handler",
    "DEFAULT_SCHEMA_CLASS": "drf_spectacular.openapi.AutoSchema",
}

SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(days=7),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=30),
    "ROTATE_REFRESH_TOKENS": True,
    "AUTH_HEADER_TYPES": ("Bearer",),
}

SPECTACULAR_SETTINGS = {
    "TITLE": "Sabzino API",
    "DESCRIPTION": "Smart Recycling Marketplace & Circular Economy Platform — سبزینو",
    "VERSION": "0.1.0",
}

CORS_ALLOW_ALL_ORIGINS = config("CORS_ALLOW_ALL", default=True, cast=bool)
CORS_ALLOWED_ORIGINS = config("CORS_ALLOWED_ORIGINS", default="", cast=Csv())
CSRF_TRUSTED_ORIGINS = config("CSRF_TRUSTED_ORIGINS", default="", cast=Csv())

# ---- Production hosting (Liara / Arvan / any PaaS behind a TLS-terminating proxy) ----
# The platform's load balancer talks HTTPS to the outside world but plain HTTP to
# the container; without this, Django can't tell a request was actually secure
# (breaks request.is_secure(), SECURE_SSL_REDIRECT, and CSRF origin checks).
SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")

if not DEBUG:
    SECURE_SSL_REDIRECT = config("SECURE_SSL_REDIRECT", default=True, cast=bool)
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True
    SECURE_HSTS_SECONDS = config("SECURE_HSTS_SECONDS", default=0, cast=int)  # opt-in once HTTPS is confirmed stable

# ---- Logging: plain stdout so `liara logs` / any PaaS log viewer shows real errors ----
LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "handlers": {"console": {"class": "logging.StreamHandler"}},
    "root": {"handlers": ["console"], "level": config("DJANGO_LOG_LEVEL", default="INFO")},
}

# ---- SABZINO business config (Admin-tunable defaults; overridable via PlatformSetting model) ----
SABZINO_DEFAULT_COMMISSION_PERCENT = config("SABZINO_DEFAULT_COMMISSION_PERCENT", default=10, cast=float)
SABZINO_DEFAULT_POINTS_PER_KG = config("SABZINO_DEFAULT_POINTS_PER_KG", default=2, cast=float)

# ---- فاز ۱۱: پیامک واقعی (sms.ir) — فقط برای اعلان‌های متنی، بدون تغییر در ورود/OTP ----
# خالی‌بودن این سه مقدار یعنی «پیامک هنوز پیکربندی نشده» — core.sms_service در این
# حالت فقط لاگ می‌کند و هیچ خطایی روی جریان اصلی (تکمیل درخواست/کیف‌پول) نمی‌اندازد.
SMS_IR_API_KEY = config("SMS_IR_API_KEY", default="")
SMS_IR_LINE_NUMBER = config("SMS_IR_LINE_NUMBER", default="")
