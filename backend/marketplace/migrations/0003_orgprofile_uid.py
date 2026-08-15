import uuid
from django.db import migrations, models


def populate_uids(apps, schema_editor):
    for model_name in ["RecyclingCenter", "Factory", "Wholesaler", "Business"]:
        Model = apps.get_model("marketplace", model_name)
        for obj in Model.objects.all():
            obj.uid = uuid.uuid4()
            obj.save(update_fields=["uid"])


class Migration(migrations.Migration):

    dependencies = [
        ("marketplace", "0002_inventorymovement"),
    ]

    operations = [
        migrations.AddField(
            model_name="recyclingcenter",
            name="uid",
            field=models.UUIDField(default=uuid.uuid4, editable=False, null=True),
        ),
        migrations.AddField(
            model_name="factory",
            name="uid",
            field=models.UUIDField(default=uuid.uuid4, editable=False, null=True),
        ),
        migrations.AddField(
            model_name="wholesaler",
            name="uid",
            field=models.UUIDField(default=uuid.uuid4, editable=False, null=True),
        ),
        migrations.AddField(
            model_name="business",
            name="uid",
            field=models.UUIDField(default=uuid.uuid4, editable=False, null=True),
        ),
        migrations.RunPython(populate_uids, migrations.RunPython.noop),
        migrations.AlterField(
            model_name="recyclingcenter",
            name="uid",
            field=models.UUIDField(default=uuid.uuid4, editable=False, unique=True, db_index=True),
        ),
        migrations.AlterField(
            model_name="factory",
            name="uid",
            field=models.UUIDField(default=uuid.uuid4, editable=False, unique=True, db_index=True),
        ),
        migrations.AlterField(
            model_name="wholesaler",
            name="uid",
            field=models.UUIDField(default=uuid.uuid4, editable=False, unique=True, db_index=True),
        ),
        migrations.AlterField(
            model_name="business",
            name="uid",
            field=models.UUIDField(default=uuid.uuid4, editable=False, unique=True, db_index=True),
        ),
    ]
