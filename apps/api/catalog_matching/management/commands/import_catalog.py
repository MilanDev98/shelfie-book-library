from pathlib import Path

from django.core.management.base import BaseCommand, CommandError, CommandParser
from django.db import transaction

from catalog_matching.catalog import CatalogValidationError, read_catalog_csv
from catalog_matching.models import CatalogBook


class Command(BaseCommand):
    help = "Validate catalog.csv and import its books into the catalog database table."

    def add_arguments(self, parser: CommandParser) -> None:
        parser.add_argument(
            "--path",
            type=Path,
            default=None,
            help="Optional catalog CSV path; defaults to the repository-root catalog.csv.",
        )
        parser.add_argument(
            "--prune",
            action="store_true",
            help=(
                "Delete database books that are not present in the imported CSV. "
                "This also deletes their saved-library entries through the database cascade."
            ),
        )

    def handle(self, *args: object, **options: object) -> None:
        path_option = options.get("path")
        if path_option is not None and not isinstance(path_option, Path):
            raise CommandError("Catalog path must be a filesystem path")

        try:
            records = read_catalog_csv(path_option)
        except CatalogValidationError as error:
            raise CommandError(str(error)) from error

        created = 0
        updated = 0
        unchanged = 0
        deleted = 0

        with transaction.atomic():
            for record in records:
                values = {
                    "title": record.title,
                    "author": record.author,
                    "alternate_titles": list(record.alternate_titles),
                    "author_aliases": list(record.author_aliases),
                    "edition": record.edition,
                    "contained_titles": list(record.contained_titles),
                    "source_images": list(record.source_images),
                }
                book, was_created = CatalogBook.objects.get_or_create(
                    catalog_id=record.catalog_id,
                    defaults=values,
                )
                if was_created:
                    created += 1
                    continue

                changed_fields = [
                    field_name
                    for field_name, field_value in values.items()
                    if getattr(book, field_name) != field_value
                ]
                if not changed_fields:
                    unchanged += 1
                    continue

                for field_name in changed_fields:
                    setattr(book, field_name, values[field_name])
                book.save(update_fields=changed_fields)
                updated += 1

            if options.get("prune"):
                imported_ids = {record.catalog_id for record in records}
                _, deleted_by_model = CatalogBook.objects.exclude(
                    catalog_id__in=imported_ids
                ).delete()
                deleted = deleted_by_model.get("catalog_matching.CatalogBook", 0)

        self.stdout.write(
            self.style.SUCCESS(
                "Catalog import complete: "
                f"created={created} updated={updated} unchanged={unchanged} deleted={deleted}"
            )
        )
