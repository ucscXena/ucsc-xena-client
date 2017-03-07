'use strict';

// Utilities for handling errors in async actions.

var Rx = require('../rx');
var _ = require('../underscore_ext');
var {compositeError} = require('../errors');

// Put error object on stream, extending with context.
function reifyErrors(obs, context) {
	return obs.catch(err => Rx.Observable.of(_.extend(err, {context})));
}

// From an array of values, some of them errors, combine the successes into a
// single event, combine the errors and re-throw. This is a flatmap function.
var collectResults = _.curry((filter, arr, selector) => {
	var groups = _.groupBy(arr, r => r instanceof Error),
		response = selector(filter ? (groups.false || []) : arr),
		errors = groups.true;

	return errors ?
		Rx.Observable.of(response)
			.concat(Rx.Observable.throw(compositeError('Composite Error', ...errors))) :
		Rx.Observable.of(response);
});

module.exports = {
	reifyErrors,
	collectResults: collectResults(true),
	collectAlignedResults: collectResults(false)
};
