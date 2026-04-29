> work in progress

# Book Club Pages

This repository is used to create a static webpage via GitHub pages for a book club (e.g. for the [SFF Zirkel](https://rue-a.github.io/sff-zirkel/)). The page is generated on the basis of the contents of `data/books.json` and `club.json`. It defines GitHub Actions and GitHub Issue templates to add books, ratings, and reviews without the need to code. The `add-book` action runs a Python script that queries the [Open Library](https://openlibrary.org/) API, which allows to fetch book metadata via ISBN or book-title.

## setup
- update action permissions ("Allow all actions and reusable workflows" and "Allow GitHub Actions to create and approve pull requests")
- all people who want to contribute via issue have to be "Collaborators" (repository settings)
- add book label
- add rating label
- add review label
- make sure you main branch actually has the label `main` (not `master` or something)
- activate GitHub Pages


## Defining a new rating system

A rating system consists of three files, all named after the system's `id`.

### 1. `rating_systems/<id>.js`

Export a `ratingSystem` object with three methods:

```js
export const ratingSystem = {
    // Returns true if `value` is a valid stored rating.
    isValid(value) { ... },

    // Returns an HTML string representing a single rating (e.g. stars or a grade label).
    format(value) { ... },

    // Given an object of { member: value } ratings, returns a single aggregated value
    // in the same format as individual ratings (will be passed back to format()).
    computeAverage(ratingsObj) { ... },
};
```

### 2. `html_snippets/rating_system_popup_<id>.html`

A single root `<div class="popup">` explaining the rating scale to the reader (shown on hover next to the grade).

### 3. `html_snippets/average_popup_<id>.html`

A single root `<div class="popup" id="averagePopup">` containing `<span id="averageGradeValue"></span>` where the computed average will be injected.

### 4. Register in `data/club.json`

```json
"rating_system_id": "<id>"
```

### 5. Register in `add_rating.py`

Add a branch to `validate_rating()` in `add_rating.py` that checks the allowed input range for the new system and returns the correctly typed value (e.g. `int` for integer scales, `float` for half-star).


# References

This software uses the [tufte-css](https://github.com/edwardtufte/tufte-css) classes.