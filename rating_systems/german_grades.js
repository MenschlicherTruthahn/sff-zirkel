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
	0: "6",
};

export const ratingSystem = {
	isValid(value) {
		return Number.isInteger(value) && value >= 0 && value <= 15;
	},

	format(value) {
		return points2grade[value] ?? String(value);
	},

	computeAverage(ratingsObj) {
		const values = Object.values(ratingsObj);
		return Math.round(values.reduce((a, b) => a + b, 0) / values.length);
	},
};
