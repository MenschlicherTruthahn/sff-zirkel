const points2grade = {
	15: "1<sup>+</sup>",
	14: "1",
	13: "1<sup>−</sup>",
	12: "2<sup>+</sup>",
	11: "2",
	10: "2<sup>−</sup>",
	9: "3<sup>+</sup>",
	8: "3",
	7: "3<sup>−</sup>",
	6: "4<sup>+</sup>",
	5: "4",
	4: "4<sup>−</sup>",
	3: "5<sup>+</sup>",
	2: "5",
	1: "5<sup>−</sup>",
	0: "6"
};

// Returns the average of all ratings of all books rated by all readers. It returns a grade between 1+ and 6.
function averageOfAllRatings(books) {
	let sum = 0;
	let count = 0;

	books.forEach(book => {
		const bookRatings = Object.values(book.ratings);
		if (ratings(book.ratings, book.meta.title)) {
			bookRatings.forEach(r => {
				sum += r;
				count++;
			});
		}
	});

	return points2grade[Math.round(sum / count)];
}



Promise.all([
	fetch("data/club.json").then(r => r.json()),
	fetch("data/books.json").then(r => r.json())
])
	.then(async ([club, books]) => {
		const popupRatings = await fetch(club.rating_popup).then(r => r.text());
		const popupAverageGrade = await fetch(club.average_grade_popup).then(r => r.text());
		renderPage(club, Object.values(books), popupRatings, popupAverageGrade);
	});

function renderPage(club, books, popupRatings, popupAverageGrade) {
	const popupRatingsHost = document.createElement("div");
	popupRatingsHost.innerHTML = popupRatings;
	const ratingsPopup = popupRatingsHost.firstElementChild;
	ratingsPopup.hidden = true;
	ratingsPopup.style.position = "absolute";
	document.body.appendChild(ratingsPopup);

	const popupAverageGradeHost = document.createElement("div");
	popupAverageGradeHost.innerHTML = popupAverageGrade;
	const averageGradePopup = popupAverageGradeHost.firstElementChild;
	averageGradePopup.classList.add("popup-auto-size")
	document.body.appendChild(averageGradePopup);

	// Compute the average grade
	const averageGrade = averageOfAllRatings(books);
	// And adapt the .html responsible for the popup which uses the average grade
	const averageGradeValue = document.getElementById("averageGradeValue");
	averageGradeValue.innerHTML = averageGrade;

	const header = document.getElementById("header")
	document.title = club.name
	const title = document.createElement("span")
	title.className = "h1"
	title.textContent = document.title
	header.appendChild(title)

	const article = document.getElementById("works");
	const sortedBooks = sortBooksByReviewDate(books);
	sortedBooks.forEach(book => {
		article.appendChild(renderBook(book, club, ratingsPopup, averageGradePopup, averageGradeValue));
	});


}

function renderBook(book, club, gradingPopup, averageGradePopup, averageGrade) {
	console.log(`Printing book section for ${book.meta.title}`)

	const section = document.createElement("section");


	// Title
	const h2 = document.createElement("h2");
	h2.textContent = book.meta.title
	h2.id = book.meta.key
	section.appendChild(h2);

	const margin_anchor = document.createElement("p")
	section.appendChild(margin_anchor)


	const h2_subtitle = document.createElement("p");
	h2_subtitle.className = "h2subtitle";
	h2_subtitle.textContent = `by ${book.meta.authors}`;
	section.appendChild(h2_subtitle)




	// Right margin book cover 
	if (book.meta.cover_url) {

		const cover_img = document.createElement("span");
		cover_img.className = "marginnote";

		const img = document.createElement("img");
		img.src = book.meta.cover_url;
		img.alt = book.meta.title;

		cover_img.appendChild(img);
		margin_anchor.appendChild(cover_img);
	}

	// metadata in margin note

	const margin_meta = document.createElement("span");
	margin_meta.className = "marginnote";

	const metaLines = [
		metaLine("Authors", book.meta.authors),
		// metaLine("Query", book.query),
		// metaLine("Review date", book.review_date),
		// metaLine("Proposed by", book.proposer),
		metaLine("First published", book.meta.first_publish_year),
		metaLine("Edition count", book.meta.edition_count),
		metaLine("Pages", book.meta.number_of_pages_median),
		metaLine("Subjects", book.meta.subjects),
		metaLine("Places", join(book.meta.place)),
		metaLine("Time", join(book.meta.time)),
		metaLine("OpenLibrary key", `<a href=https://openlibrary.org${book.meta.key}><code>${book.meta.key.replace("/works/", "")}</code></a>`),
		metaLine(
			"Wikidata ID",
			(book.meta.id_wikidata || [])
				.map(id => `<a href="https://www.wikidata.org/wiki/${id}"><code>${id}</code></a>`)
				.join(", ")
		)

	];

	margin_meta.innerHTML = metaLines.join("");

	margin_anchor.appendChild(margin_meta);


	// first sentence epigraph
	if (book.meta.first_sentence) {
		const fs_div = document.createElement("div")
		fs_div.className = "epigraph"
		const fs_blockquote = document.createElement("blockquote")
		const fs_text = document.createElement("p")
		fs_text.textContent = book.meta.first_sentence
		// const fs_footer = document.createElement("footer")
		// fs_footer.textContent = `first sentence`
		fs_blockquote.appendChild(fs_text)
		// fs_blockquote.appendChild(fs_footer)
		fs_div.appendChild(fs_blockquote)
		section.appendChild(fs_div)
	}







	// Description (Markdown)
	if (book.meta.description) {
		const desc = document.createElement("p");
		desc.innerHTML = marked.parse(book.meta.description);
		section.appendChild(desc);
	}

	// book review announcement
	const now = new Date();
	const review_date = new Date(book["review_date"])
	const review_date_string = review_date.toLocaleDateString('en', { month: 'long', day: 'numeric', year: 'numeric' });



	const review_title = document.createElement("h3");
	review_title.textContent = "Review";
	section.appendChild(review_title);


	console.log(review_date)

	if (isNaN(review_date.getTime())) {
		const review_announcement_p = document.createElement("p")
		review_announcement_p.textContent = `A review date has not yet been set for ${book.meta.title}.`;
		section.appendChild(review_announcement_p)

		// don't print ratings yet, exit function
		return section
	}


	if (review_date > now) {
		const review_announcement_p = document.createElement("p")
		review_announcement_p.textContent = `${book.meta.title} will be reviewed on ${review_date_string}.`;
		section.appendChild(review_announcement_p)


		// don't print ratings yet, exit function
		return section
	}




	// Optional blocks. Only print ratings and review after the review date	

	if (ratings(book.ratings, book.meta.title)) {


		// section.appendChild(review_title);

		// Average rating
		const average_rating =
			Math.round(
				Object.values(book.ratings).reduce((acc, val) => acc + val, 0) /
				Object.values(book.ratings).length
			);





		// Create hover question mark
		const popupTrigger = document.createElement("span");
		popupTrigger.innerHTML = '<sup class=popup-symbol>?</sup>';
		popupTrigger.className = "popup-trigger";
		popupTrigger.style.cursor = "help";
		popupTrigger.style.marginLeft = "2pt";
		popupTrigger.style.color = 'lightgray'

		// create grade
		const grade = document.createElement("span");
		grade.innerHTML = points2grade[average_rating]
		grade.style.fontWeight = "bold"


		const margin_ratings = document.createElement("span")
		margin_ratings.className = "marginnote";
		const metalines = [];

		for (let key of Object.keys(book.ratings)) {
			metalines.push(metaLine(key, points2grade[book.ratings[key]]));
		}

		margin_ratings.innerHTML = metalines.join("");

		const rating_p = document.createElement("p");
		rating_p.appendChild(margin_ratings);
		rating_p.appendChild(document.createTextNode(`On ${review_date_string}, the ${club.name} graded`));
		rating_p.appendChild(popupTrigger);
		rating_p.appendChild(document.createTextNode(` ${book.meta.title} with a `));
		rating_p.appendChild(grade);
		rating_p.appendChild(document.createTextNode(`.`));
		section.appendChild(rating_p);


		addPopup(popupTrigger, gradingPopup);
		addPopup(grade, averageGradePopup)
	}

	if (reviews(book.reviews, book.meta.title)) {
		for (let key of Object.keys(book.reviews)) {
			if (book.reviews[key]) {
				const stripMarkdown = (text) => text
					.replace(/\*\*(.+?)\*\*/g, '$1')   // bold **
					.replace(/__(.+?)__/g, '$1')        // bold __
					.replace(/\*(.+?)\*/g, '$1')        // italic *
					.replace(/_(.+?)_/g, '$1')          // italic _
					.replace(/~~(.+?)~~/g, '$1')        // strikethrough
					.replace(/`(.+?)`/g, '$1')          // inline code
					.replace(/^#{1,6}\s+/gm, '')        // headings
					.replace(/^[-*+]\s+/gm, '')         // unordered list markers
					.replace(/^\d+\.\s+/gm, '')         // ordered list markers
					.replace(/\[(.+?)\]\(.*?\)/g, '$1') // links
					.replace(/!\[.*?\]\(.*?\)/g, '');   // images
				const review_p = document.createElement("p");
				const reviewer = document.createElement("span");
				reviewer.textContent = key;
				reviewer.style.fontWeight = "bold";
				reviewer.style.marginRight = "1em";
				review_p.append(reviewer);
				const lines = stripMarkdown(book.reviews[key].trim())
					.replace(/\n+/g, "\n")
					.split("\n");
				lines.forEach((line, i) => {
					if (i > 0) {
						review_p.append(document.createElement("br"));
						const indent = document.createElement("span");
						indent.style.display = "inline-block";
						indent.style.marginTop = "1pt";
						indent.style.textIndent = "1em";
						indent.textContent = line;
						review_p.append(indent);
					} else {
						review_p.append(document.createTextNode(line));
					}
				});
				review_p.style.fontStyle = "italic";
				section.appendChild(review_p);
			}
		}
	}





	console.log("")
	return section;
}

function addPopup(popupTrigger, popup) {
	popupTrigger.addEventListener("mouseenter", () => {
		const spacing = 6;

		// Make popup visible but hidden so size can be measured
		popup.style.visibility = "hidden";
		popup.style.display = "block";

		const rect = popupTrigger.getBoundingClientRect();
		const popupRect = popup.getBoundingClientRect();

		let top = rect.bottom + spacing + window.scrollY; // default below
		let left = rect.left + window.scrollX;

		// If popup overflows bottom of viewport, place it above
		if (top + popupRect.height > window.scrollY + window.innerHeight) {
			top = rect.top - popupRect.height - spacing + window.scrollY;
		}

		// If popup overflows right edge, shift left
		if (left + popupRect.width > window.scrollX + window.innerWidth) {
			left = window.scrollX + window.innerWidth - popupRect.width - spacing;
		}

		if (left < window.scrollX) {
			left = window.scrollX + spacing;
		}

		popup.style.top = `${top}px`;
		popup.style.left = `${left}px`;

		// Now show it properly
		popup.style.visibility = "visible";
	});


	popupTrigger.addEventListener("mouseleave", () => {
		// delay hiding to allow moving into popup
		setTimeout(() => {
			if (!popup.matches(':hover')) {
				popup.style.display = "none";
			}
		}, 100);
	});

	popup.addEventListener("mouseleave", () => {
		popup.style.display = "none";
	});
}

function metaLine(key, value) {
	return value ? `<strong>${key}:</strong> ${value}<br>` : "";
}

function join(v) {
	return Array.isArray(v) ? v.join(", ") : v;
}


function ratings(ratings, title) {
	// check for ratings object with content
	if (!ratings || Object.keys(ratings).length === 0) {
		console.warn(`No ratings found (${title}).`)
		return false; // no ratings, return null		
	}

	// only print ratings if everyone has rated the book
	for (let key of Object.keys(ratings)) {

		if (!(ratings[key])) {
			console.warn(`Not everyone has rated yet (${title}).`)
			return false
		}
		if (!(Number.isInteger(ratings[key]))) {
			console.warn(`Ratings contain non-integer values (${title}).`)
			return false
		}

	}
	return true
}

function reviews(reviews, title) {
	// check for review object with content
	if (!reviews || Object.keys(reviews).length === 0) {
		console.warn(`No reviews found (${title}).`)
		return false; // no reviews, return null		
	}


	return true
}


function sortBooksByReviewDate(books) {
	return books.slice().sort((a, b) => {
		const dateA = new Date(a.review_date);
		const dateB = new Date(b.review_date);

		const timeA = isNaN(dateA.getTime()) ? -Infinity : dateA.getTime();
		const timeB = isNaN(dateB.getTime()) ? -Infinity : dateB.getTime();

		// Sort descending: latest dates first
		if (timeA === -Infinity && timeB === -Infinity) return 0;
		if (timeA === -Infinity) return 1; // invalid dates go last
		if (timeB === -Infinity) return -1;
		return timeB - timeA;
	});
}
