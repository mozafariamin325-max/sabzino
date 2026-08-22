"""
Run once a day (e.g. PythonAnywhere free "Scheduled Tasks" tab, 09:00) to turn
due RecurringSchedule rows into real CollectionRequest orders. See
collection_requests/services.py:generate_due_recurring_requests.
"""
from django.core.management.base import BaseCommand
from collection_requests.services import generate_due_recurring_requests


class Command(BaseCommand):
    help = "Generates today's collection requests from active recurring schedules."

    def handle(self, *args, **options):
        created = generate_due_recurring_requests()
        self.stdout.write(self.style.SUCCESS(f"{len(created)} درخواست دوره‌ای ایجاد شد."))
