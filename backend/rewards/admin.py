from django.contrib import admin
from .models import (
    GreenPointAccount, GreenPointTransaction, Badge, UserBadge,
    Challenge, ChallengeParticipation, Referral,
)

admin.site.register(GreenPointAccount)
admin.site.register(GreenPointTransaction)
admin.site.register(Badge)
admin.site.register(UserBadge)
admin.site.register(Challenge)
admin.site.register(ChallengeParticipation)
admin.site.register(Referral)
