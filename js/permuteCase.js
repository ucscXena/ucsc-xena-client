'use strict';
var _ = require('./underscore_ext');

function permuteCaseArray(str, i = 0) {
	if (i === str.length) {
		return [''];
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

function permuteBitCount(str) {
	return _.sum(_.map(str, hasCase));
}

module.exports =  {
	permuteCase,
	permuteBitCount
};
