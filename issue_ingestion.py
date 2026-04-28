import json
import os
from pathlib import Path


from utilities import extract_field, join_and, post_issue_comment, warn


BOOKS_FILE = Path("data/books.json")


def load_issue() -> dict:
    event_path = Path(os.environ.get("GITHUB_EVENT_PATH", ""))

    if not event_path.exists():
        raise RuntimeError(
            "GITHUB_EVENT_PATH not found. Are you running in GitHub Actions?"
        )

    with event_path.open("r", encoding="utf-8") as file:
        return json.load(file)


def extract_issue_fields(body: str, *field_names: str) -> dict[str, str]:
    return {field_name: extract_field(body, field_name) for field_name in field_names}


def validate_book(
    *,
    books: dict,
    book_id: str,
    warnings: list[str],
) -> tuple[dict | None, bool]:
    book = books.get(book_id)

    if not book:
        warnings.append(warn(f"Book id '{book_id}' not found! Exiting."))
        return None, True

    return book, False


def validate_reviewer(
    *,
    book: dict,
    reviewer: str,
    participant_field: str,
    warnings: list[str],
) -> bool:
    participants = list(book[participant_field].keys())

    if reviewer not in participants:
        warnings.append(
            warn(
                f"Reviewer '{reviewer}' was no participant ({join_and(participants)})."
            )
        )
        return True

    return False


def post_summary(summary: str) -> None:
    post_issue_comment(summary)
    print(f"::notice::{summary}")