from datetime import datetime
from pathlib import Path

import requests

from issue_ingestion import (
    BOOKS_FILE,
    CLUB_FILE,
    extract_issue_fields,
    join_and,
    load_books,
    load_club,
    load_issue,
    notice,
    post_summary,
    save_books,
    warn,
)

# ---------- Configuration ----------
COVERS_PATH = Path("covers")

OPEN_LIBRARY_URL = "https://openlibrary.org"
LIMIT = 10

BOOK_GENRES = [
    "Arts",
    "Architecture",
    "Art Instruction",
    "Art History",
    "Dance",
    "Design",
    "Fashion",
    "Film",
    "Graphic Design",
    "Music",
    "Music Theory",
    "Painting",
    "Photography",
    "Animals",
    "Bears",
    "Cats",
    "Kittens",
    "Dogs",
    "Puppies",
    "Fiction",
    "Fantasy",
    "Historical Fiction",
    "Horror",
    "Humor",
    "Literature",
    "Magic",
    "Mystery and detective stories",
    "Plays",
    "Poetry",
    "Romance",
    "Science Fiction",
    "Short Stories",
    "Thriller",
    "Young Adult",
    "Science & Mathematics",
    "Biology",
    "Chemistry",
    "Mathematics",
    "Physics",
    "Programming",
    "Business & Finance",
    "Management",
    "Entrepreneurship",
    "Business Economics",
    "Business Success",
    "Finance",
    "Children's",
    "Kids Books",
    "Stories in Rhyme",
    "Baby Books",
    "Bedtime Books",
    "Picture Books",
    "History",
    "Ancient Civilization",
    "Archaeology",
    "Anthropology",
    "World War II",
    "Social Life and Customs",
    "Health & Wellness",
    "Cooking",
    "Cookbooks",
    "Mental Health",
    "Exercise",
    "Nutrition",
    "Self-help",
    "Biography",
    "Autobiographies",
    "History",
    "Politics and Government",
    "World War II",
    "Women",
    "Kings and Rulers",
    "Composers",
    "Artists",
    "Social Sciences",
    "Anthropology",
    "Religion",
    "Political Science",
    "Psychology",
    "Places",
    "Brazil",
    "India",
    "Indonesia",
    "United States",
    "Textbooks",
    "History",
    "Mathematics",
    "Geography",
    "Psychology",
    "Algebra",
    "Education",
    "Business & Economics",
    "Science",
    "Chemistry",
    "English Language",
    "Physics",
    "Computer Science",
]

# -----------------------------------


def download_cover(url: str, out_path: Path):
    out_path.parent.mkdir(parents=True, exist_ok=True)

    resp = requests.get(url, timeout=10)
    resp.raise_for_status()

    with open(out_path, "wb") as f:
        f.write(resp.content)

    print(f"Saved cover to {out_path}")


def fetch_openlibrary_metadata(
    query: str, books: dict, warnings: list, notices: list
) -> dict | None:

    existing_queries = [book["query"] for book in books.values()]
    existing_work_keys = [book["meta"]["key"] for book in books.values()]

    # %%
    fields = [
        "key",
        "type",
        "title",
        "author_name",
        "first_publish_year",
        "first_edition",
        "number_of_pages_median",
        "first_sentence",
        "description",
        "subject",
        "edition_count",
        "id_wikidata",
        "place",
        "time",
        "cover_i",
    ]
    # %%
    params = {"q": query, "limit": LIMIT, "fields": fields}

    # do not run the same query twice
    if query in existing_queries:
        warnings.append(warn(f"The query `{query}` was already queried — skipping."))
        return None

    response = requests.get(
        f"{OPEN_LIBRARY_URL}/search.json",
        params=params,
        timeout=10,
    )
    notices.append(notice(f"Querying: {query} (actual query URL: {response.url})"))

    # raise_for_status() throws exception if request failed
    response.raise_for_status()
    response_data = response.json()

    # check if we found a book (numFound > 0)
    if not response_data.get("numFound", False):
        warnings.append(warn(f"No results found on OpenLibrary for query `{query}`."))
        return None

    if response_data["numFound"] > 1:
        warnings.append(
            warn(
                f"Result is ambigous, {response_data['numFound']} matches found. Selecting match with most editions."
            )
        )

    # data is in the docs attribute (sorted by relevance -> first entry is best match)
    response_data = response_data["docs"][0]

    for field in fields:
        if field not in response_data.keys():
            notices.append(notice(f"The field `{field}` yielded no data"))

    # in open library terms, a work is the sum of all editions
    work_id = response_data["key"]

    # Check for duplicates, stop if book already exists in db
    if work_id in existing_work_keys:
        warnings.append(
            warn(
                f"A work with key `{work_id}` ({next(((item['meta']['title'], item['id']) for item in books.values() if item.get('meta', {}).get('key') == work_id), None)}) already exists — skipping."
            )
        )
        return None

    cover_path = ""
    cover_url = ""
    if "cover_i" in response_data.keys():
        cover_url = (
            f"https://covers.openlibrary.org/b/id/{response_data['cover_i']}-M.jpg"
        )
        cover_path = COVERS_PATH / f"{response_data['cover_i']}.jpg"

        # store cover at covers
        download_cover(cover_url, cover_path)
    else:
        notices.append(notice("The query yielded no cover image"))

    stringified_data = {
        "key": response_data.get("key", ""),
        "type": response_data.get("type", ""),
        "title": response_data.get("title", ""),
        "authors": join_and(response_data.get("author_name", [""])),
        "first_publish_year": response_data.get("first_publish_year", ""),
        "first_edition": response_data.get("first_edition", ""),
        "number_of_pages_median": response_data.get("number_of_pages_median", None),
        "first_sentence": response_data.get("first_sentence", [""])[0],
        "description": response_data.get("description", ""),
        "subjects": ", ".join(
            [
                genre
                for genre in response_data.get("subject", [""])
                if genre in BOOK_GENRES
            ]
        ),
        "edition_count": response_data.get("edition_count", ""),
        "id_wikidata": list(set(response_data.get("id_wikidata", []))),
        "place": response_data.get("place", ""),
        "time": response_data.get("time", ""),
        "cover_path": cover_path.as_posix() if cover_path else None,
        "cover_url": cover_url,
    }

    return stringified_data


def add_book(query, proposer, participants, review_date, warnings, notices):
    books = load_books(BOOKS_FILE)

    meta = fetch_openlibrary_metadata(query, books, warnings, notices)

    if meta:
        ratings = {
            name: None for name in [participant.title() for participant in participants]
        }

        reviews = {
            name: None for name in [participant.title() for participant in participants]
        }

        new_book = {
            "query": query,
            "review_date": review_date,
            "proposer": proposer.title(),
            "ratings": ratings,
            "reviews": reviews,
            "meta": meta,
        }

        # reuse Open Library work key as ID
        books[meta["key"].split("/")[-1]] = new_book
        save_books(BOOKS_FILE, books)
        print(f"✔ Added book {query}")
    return meta


def build_summary(
    *,
    query: str,
    review_date: str,
    proposer: str,
    participants: list[str],
    meta: dict | None,
    warnings: list[str],
    notices: list[str],
    success: bool,
) -> str:
    prepared = requests.Request(
        "GET", f"{OPEN_LIBRARY_URL}/search.json", params={"q": query, "limit": LIMIT}
    ).prepare()
    query_url = prepared.url

    lines = ["# SUMMARY"]
    lines.append(
        "✅ **Book entry created**" if success else "❌ **No book entry created**"
    )
    lines.append(f"**Query:** {query} ({query_url})")

    if meta:
        lines.append("## Metadata")
        lines.append("### Fetched Data")
        for key, val in meta.items():
            lines.append(f"**{key}:** {val}")

        lines.append("### Review Data")
        if review_date:
            lines.append(f"**Review date:** {review_date}")
        if proposer:
            lines.append(f"**Proposed by:** {proposer}")
        if participants:
            lines.append(f"**Participants:** {', '.join(participants)}")

    if warnings:
        lines.append("### Warnings")
        lines.append("\n> [!WARNING]\n>")
        for w in warnings:
            lines.append(f"> - {w}")

    if notices:
        lines.append("### Notes")
        lines.append("\n> [!NOTE]\n>")
        for n in notices:
            lines.append(f"> - {n}")

    return "\n".join(lines)


def parse_issue():
    """
    Parse GitHub issue payload and add a book entry.
    """
    warnings = []
    notices = []

    event = load_issue()
    body = event.get("issue", {}).get("body", "")

    fields = extract_issue_fields(body, "query", "review date", "proposer", "guests")
    query = fields["query"]
    review_date = fields["review date"]
    proposer = fields["proposer"]
    guests_raw = fields["guests"]

    # Date validation (non-fatal)
    if review_date:
        try:
            datetime.strptime(review_date, "%Y-%m-%d")
        except ValueError:
            warnings.append(
                warn(f"Review date `{review_date}` is not in YYYY-MM-DD format.")
            )

    # Participants
    club = load_club(CLUB_FILE)
    participants = club.get("permanent_members", []) + [
        p.strip() for p in guests_raw.split(",") if p.strip()
    ]

    if not participants:
        warnings.append(warn("No participants specified."))

    # Add book
    meta = add_book(
        query=query,
        proposer=proposer,
        participants=participants,
        review_date=review_date,
        warnings=warnings,
        notices=notices,
    )

    success = meta is not None

    summary = build_summary(
        query=query,
        review_date=review_date,
        proposer=proposer,
        participants=participants,
        meta=meta,
        warnings=warnings,
        notices=notices,
        success=success,
    )

    post_summary(summary)

    return success


if __name__ == "__main__":
    success = parse_issue()
    exit(0 if success else 1)
