/*eslint-disable */
/*global define: false */
define(['underscore_ext',
		'uuid',
		'rx',
		'partition',
		'rx.binding'
		], function (_,
					 uuid,
					 rx,
					 partition) {
	'use strict';

//	function normalize_column(c) {
//		if (!_.has(c, 'uuid')) {
//			return _.assoc(c, 'uuid', uuid());
//		}
//		return c;
//	}

	// XXX No longer need this, but leaving it in case we need
	// an example of normalizing an array.

	// Use this reduce instead of map to avoid creating a
	// new array when there are no changes.
	function normalize_model(state) {
		return state; // XXX short-circuited, as above
//		var cols = _.reduce(
//			_.range(state.column_rendering.length),
//			function (arr, i) {
//				return _.assoc(arr, i, normalize_column(arr[i]));
//			},
//			state.column_rendering
//		);
//		return _.assoc(state, 'column_rendering', cols);
	}

	return function() {
		// column rendering settings
		var updaters = new rx.ReplaySubject(),
			state = updaters
			.mergeAll()
			.scan({}, function (currstate, mut) {
					return normalize_model(mut(currstate));
				})
			.share();

		function addStream (mutfns) {
			updaters.onNext(mutfns);
		}

		return {
			state: state,
			addStream: addStream,
		};
	};
});
