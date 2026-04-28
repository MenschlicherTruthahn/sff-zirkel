---
name: Rate book
about: Issue to add a rating to a book existing in the books database.
title: "Add rating to book: enter-book-title-here"
labels: rating
assignees: ''

---

Upon finding a book with the provided ID in the books database and if the provided reviewer is a participant for this book, the rating is inserted accordingly.

> [!WARNING]
> Submitting a rating for a reviewer who has already rated this book will **overwrite** the existing rating without warning.

---

# Rating

- book id: `enter-book-id-here` (OpenLibrary key: begins with `OL` and ends with `W`, you find it on the right, below the cover of the book at https://rue-a.github.io/sff-zirkel/)
- reviewer: `enter-reviewer-name-here`
- rating: `enter-rating-here` (a value according to your rating scheme)