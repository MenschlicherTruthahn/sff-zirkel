function starsHTML(value) {
	let html = '<span class="stars">';
	for (let i = 1; i <= 5; i++) {
		if (value >= i) {
			html += '<span class="star star-full">★</span>';
		} else if (value >= i - 0.5) {
			// Half star: a colored half overlaid on a gray base
			html += '<span class="star star-cell"><span class="star-half">★</span><span class="star-bg">★</span></span>';
		} else {
			html += '<span class="star star-empty">★</span>';
		}
	}
	html += '</span>';
	return html;
}

export const ratingSystem = {
	isValid(value) {
		return typeof value === 'number'
			&& value >= 0.5
			&& value <= 5
			&& (value * 2) % 1 === 0;
	},

	format(value) {
		return starsHTML(value);
	},

	computeAverage(ratingsObj) {
		const values = Object.values(ratingsObj);
		const avg = values.reduce((a, b) => a + b, 0) / values.length;
		return Math.round(avg * 2) / 2;
	},
};
