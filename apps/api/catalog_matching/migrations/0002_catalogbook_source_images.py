from typing import ClassVar

from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies: ClassVar[list[tuple[str, str]]] = [
        ("catalog_matching", "0001_initial")
    ]

    operations = [
        migrations.AddField(
            model_name="catalogbook",
            name="source_images",
            field=models.JSONField(blank=True, default=list),
        ),
    ]
