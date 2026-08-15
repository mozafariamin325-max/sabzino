from .models import Notification


def notify(user, title: str, body: str, link: str = "", channel: str = "IN_APP") -> Notification:
    """Central place to create a notification; every real event (spec section 52) routes through here."""
    return Notification.objects.create(user=user, title=title, body=body, link=link, channel=channel)
