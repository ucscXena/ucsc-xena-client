
// Utilities for handling errors in async actions.

var Rx = require('../rx').default;
var _ = require('../underscore_ext').default;
//var {compositeError} = require('../errors');

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

	// XXX This mechanism needs work. It doesn't compose well. Operators on
	// this (e.g. zip) may cause the error to be caught in the wrong place.
	return errors ?
		Rx.Observable.of(response)
			// This is messing with the composability of the stream. If we
			// flatMap over it, the error kills the flatMap unless we also catch
			// and re-throw the error. So, dropping this for now.
			/*.concat(Rx.Observable.throw(compositeError('Composite Error', ...errors)))*/ :
		Rx.Observable.of(response);
});

module.exports = {
	reifyErrors,
	collectResults: collectResults(true),
	collectAlignedResults: collectResults(false)
};
