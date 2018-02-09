'use strict';

// Desired behavior:
// When we change the state structure, add a migration.
// Sources of state:
//   sessionStorage
//   bookmarks
//   initial state
//
//

var version = 1;

var {assoc, get, Let, isString, flatten} = require('./underscore_ext');

var setVersion = state => assoc(state, 'version', version);
var getVersion = state =>
	Let((s = get(state, 'version', 0)) => isString(s) ? 0 : s);

//var noComposite = state => assoc(state,
//		'cohort', state.cohort[0],
//		'cohortSamples', state.cohortSamples[0]);

// This must be sorted, with later versions appearing last.
var migrations = [
	[/*noComposite*/]
];

function apply(state) {
	var v = getVersion(state),
		toDo = flatten(migrations.slice(v));

	return setVersion(toDo.reduce((prev, fn) => fn(prev), state));
}

module.exports = apply;
