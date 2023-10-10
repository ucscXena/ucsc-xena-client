var jStat = require('jStat').jStat;

function valCounts(arr) {
	var counts = new Map();
	var arrlen = arr.length;
	for (var i = 0; i < arrlen; ++i) {
		var v = arr[i];
		var c = counts.get(v) || 0;
		counts.set(v, c + 1);
	}
	return counts;
}

function ascNum(a, b) {
	return a - b;
}
// override jStat rank, which is very slow.
jStat.rank = function (arr) {
	var arrlen = arr.length;
	var counts = valCounts(arr);
	var keys = Array.from(counts.keys()).sort(ascNum);
	var keyslen = keys.length;
	var tally = 0;
	for (var i = 0; i < keyslen; ++i) {
		var c = counts.get(keys[i]);
		counts.set(keys[i], 1 + (tally + tally + c - 1) / 2);
		tally += c;
	}
	var ranks = new Array(arrlen);
	for (var j = 0; j < arrlen; ++j) {
		ranks[j] = counts.get(arr[j]);
	}

	return ranks;
};

module.exports = jStat;
