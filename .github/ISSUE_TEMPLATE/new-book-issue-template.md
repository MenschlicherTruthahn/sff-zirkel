---
name: Add new book
about: Issue to create a new database record for the book database.
title: "Add new book: enter-book-title-here"
labels: book
assignees: ''

---

Upon finding a valid **ISBN**, opening this issue will generate a new database entry for the according book by querying https://openlibrary.org/ for metadata. You may insert values for the review-related metadata fields below, if you don't, they are created empty and have to be filled later.

> [!IMPORTANT]
> Before opening this issue, use the [Query Test page](https://rue-a.github.io/sff-zirkel/test_query.html) to preview which book OpenLibrary would select for your ISBN or title query.

---

# ISBN

- ISBN: `enter-isbn-here` (or title; although for title it's very recommended to use the test query page beforehand)

# Metadata

- review date: `YYYY-MM-DD`
- proposer: `namehere`
- guests: `namehere, namehere, namehere` (guests are participants that are not permanent members, see `data/club.json` for a list of permanent members)