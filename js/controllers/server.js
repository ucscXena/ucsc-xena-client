
/*eslint-env browser */
/*global require: false, module: false */

'use strict';

var _ = require('../underscore_ext');
var paths = require('./paths');
var {sortSamples} = require('./utils');

var identity = x => x;

function resetZoom(state) {
	let count = _.getIn(state, paths.samples).length;
	return _.updateIn(state, paths.zoom,
					 z => _.merge(z, {count: count, index: 0}));
}

//function cases(c, [tag, ...data]) {
//	return (c[tag] || identity)(...data);
//}

// XXX check circle-ci. Is 'state' the 1st arg to the controllers?
// If not, how does the default method work (should return unmodified state).

var serverController = {
	'cohorts': (state, cohorts) => _.assocIn(state, paths.cohorts, cohorts),
	'datasets': (state, datasets) => _.assocIn(state, paths.datasets, datasets),
	'samples': (state, samples) =>
		sortSamples(resetZoom(_.assocIn(state, paths.samples, samples))),
	'widget-data': (state, data, id) =>
		sortSamples(_.assocIn(state, [...paths.data, id], data)),
	'columnEdit-features': (state, list) => _.assocIn(state, [...paths.columnEdit, 'features'], list),
	'columnEdit-examples': (state, list) => _.assocIn(state, [...paths.columnEdit, 'examples'], list)
};

module.exports = {
	event: (state, [tag, ...args]) => (serverController[tag] || identity)(state, ...args),
	postEvent: (previous, current, [tag, ...args]) => (serverController[tag + '-post!'] || identity)(previous, current, ...args)
};
