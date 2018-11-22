'use strict';

import {assocIn, dissoc, find, getIn, identity, initial, isEqual, last, matchKeys, updateIn} from '../underscore_ext';
import {make, compose} from './utils';

// syncs data in memory with data on server, as a function of app state.
// dataRequest is a fn of state that returns a set of paths that should be
// synced.
// fetchMethods is an object with fetch method per top-level path key.
// cachePolicy is an object with transform per top-level path key, that
// can be used to drop unused state. It is applied after merging newly
// synced data.
// mount is a top-level key under which to merge the synced data in the
// application state.
//
// returns a controller, and an imperative cache invalidation method.
export default function source(fetchMethods, dataRequest, cachePolicy, mount) {
	// To make this more general, would need to follow the path until
	// we hit a dispatch method, then pass args.
	// XXX should this inject a common 'error' value, if the query fails?
	// We would need to update some views where we currently map to empty
	// array on error.
	var fetchData = ([type, ...args]) => fetchMethods[type](...args);
	var dispatchKey = `${mount}-merge-data`;

	// XXX Local mutatable state. The effects controller is stateful wrt
	// data queries.
	var queue = [];
	var outOfDate = {};

	var clearCache = fn => (state, path, data) =>
		(cachePolicy[path[0]] || cachePolicy.default)(fn(state, path, data), path);

	var enforceValue = (path, val) => {
		if (val == null) {
			// Fetch methods must return a value besides null or undefined. Otherwise
			// this will create a request loop, where we fetch again because we can't
			// tell the data has already been fetched.
			console.error(`Received invalid response for path ${path}`);
			return {error: 'invalid value'};
		}
		return val;
	};

	function invalidatePath(state, pattern) {
		matchKeys(state, pattern).forEach(path => {
			outOfDate = assocIn(outOfDate, path, true);
		});
	}

	function validatePath(path) {
		outOfDate = updateIn(outOfDate, initial(path), p => p && dissoc(p, last(path)));
	}

	var controls = {
		[dispatchKey]: clearCache((state, path, data) =>
			assocIn(state, [mount, ...path], enforceValue(path, data))),
		[`${dispatchKey}-post!`]: (serverBus, state, newState, path) => {
			var i = queue.findIndex(p => isEqual(p, path));
			queue.splice(i, 1);
			validatePath(path);
		}
	};

	var postAction = (serverBus, state, newState) => {
		var toFetch = dataRequest(newState)
			.filter(path => (getIn(newState[mount], path) == null || getIn(outOfDate, path))
					&& !find(queue, p => isEqual(p, path)));

		toFetch.forEach(path => {
			queue.push(path);
			serverBus.next([[dispatchKey, path], fetchData(path)]);
		});
	};

	var fetchController = {
		action: identity,
		postAction: postAction
	};


	return {
		controller: compose(fetchController, make(controls)),
		invalidatePath
	};
}
