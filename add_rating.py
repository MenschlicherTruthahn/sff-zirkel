from issue_ingestion import (
    BOOKS_FILE,
    extract_issue_fields,
    load_issue,
    post_summary,
    validate_book,
    validate_reviewer,
)
from utilities import load_books, save_books, warn


def validate_rating(rating: str, warnings: list[str]) -> int | None:
    if not (rating.isdigit() and 1 <= int(rating) <= 15):
        warnings.append(warn(f"Rating '{rating}' is not an integer between 1 and 15."))
        return None

    return int(rating)


def build_summary(
    *,
    book_id: str,
    reviewer: str,
    rating: str,
    warnings: list[str],
    notices: list[str],
    success: bool,
) -> str:
    lines = ["# SUMMARY"]
    lines.append("✅ **Rating saved**" if success else "❌ **Rating not saved**")
    lines.append(f"book id: {book_id}")
    lines.append(f"reviewer: {reviewer}")
    lines.append(f"rating: {rating}")

    if warnings:
        lines.append("### Warnings")
        lines.append("\n> [!WARNING]\n>")

        for warning in warnings:
            lines.append(f"> - {warning}")

    if notices:
        lines.append("### Notes")
        lines.append("\n> [!NOTE]\n>")

        for notice in notices:
            lines.append(f"> - {notice}")

    return "\n".join(lines)


def parse_issue():
    """
    Parse GitHub issue payload and add a rating.
    Extracts book_id, reviewer, and rating from issue.
    """
    warnings = []
    notices = []

    event = load_issue()
    body = event.get("issue", {}).get("body", "")

    fields = extract_issue_fields(body, "book id", "reviewer", "rating")
    book_id = fields["book id"]
    reviewer = fields["reviewer"]
    rating = fields["rating"]

    books = load_books(BOOKS_FILE)
    book, failed = validate_book(
        books=books,
        book_id=book_id,
        warnings=warnings,
    )

    if book:
        failed = validate_reviewer(
            book=book,
            reviewer=reviewer,
            participant_field="ratings",
            warnings=warnings,
        ) or failed

    parsed_rating = validate_rating(rating, warnings)

    success = not failed and parsed_rating is not None

    summary = build_summary(
        book_id=book_id,
        reviewer=reviewer,
        rating=rating,
        warnings=warnings,
        notices=notices,
        success=success,
    )

    post_summary(summary)

    if not success:
        return False

    book["ratings"][reviewer] = parsed_rating

    save_books(BOOKS_FILE, books)

    return True


if __name__ == "__main__":
    title_added = parse_issue()
    # Exit code 1 if nothing was added (optional)
    exit(0 if title_added else 1)