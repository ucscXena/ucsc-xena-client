var _ = require('./underscore_ext');

function permuteCaseArray(str, i = 0) {
	if (i === str.length) {
		return [['']];
	}
	var c = str[i],
		u = c.toLowerCase(),
		l = c.toUpperCase();

	return (u === l) ?
		_.flatmap(permuteCaseArray(str, i + 1), suffix => [[c, ...suffix]]) :
		_.flatmap(permuteCaseArray(str, i + 1), suffix => [[u, ...suffix], [l, ...suffix]]);
}

var permuteCase = str => _.map(permuteCaseArray(_.map(str.split(''))), arr => arr.join(''));

var hasCase = s => s.toLowerCase() === s.toUpperCase() ? 0 : 1;

// Number of chars in str having case ('a' has case, '5' does not, so
// "a5a" returns 2, for example)
function permuteBitCount(str) {
	return _.sum(_.map(str, hasCase));
}

// prefix of str having at most n chars with case.
var prefixBitLimit = _.curry((n, str) => {
	var counts = _.scan(str, (count, c) => hasCase(c) ? count + 1 : count, 0),
		l = _.findLastIndex(counts, c => c <= n);

	return str.slice(0, l);
});

module.exports =  {
	prefixBitLimit,
	permuteCase,
	permuteBitCount
};
