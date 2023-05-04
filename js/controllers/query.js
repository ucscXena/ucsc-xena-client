var {assocIn, dissoc, find, findIndexDefault, getIn, identity, isArray, isEqual, last, Let, matchKeys, matchPath, updateIn} = require('../underscore_ext').default;
import {make, compose} from './utils';
import Rx from '../rx';

var {of} = Rx.Observable;
var {asap} = Rx.Scheduler;

var splitPath = path =>
	Let((i = findIndexDefault(path, isArray, path.length)) =>
		[path.slice(0, i), path.slice(i)]);

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

	var clearCache = (state, path) =>
		(cachePolicy[path[0]] || cachePolicy.default)(state, path);

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

	var invalidatePath = (state, pattern) =>
		Let((matches = matchKeys(state[mount] || {}, pattern)) =>
			updateIn(state, [mount, '_outOfDate'], state =>
				matches.reduce((state, path) => assocIn(state, path, true), state)));

	var validatePath = (state, path) =>
		updateIn(state, [mount, '_outOfDate', ...path.slice(0, path.length - 1)],
			p => p && dissoc(p, last(path)));

	// Set watch on new state
	var setWatch = (state, path, refs) =>
		updateIn(state, [mount, '_watch'], w => (w || []).concat(refs.map(ref => [path, ref])));

	// Drop watch on things we've cleared from cache
	// XXX If cache immediately removes it on insertion, we retain the watch?
	// Looks like a leak. Maybe just assert the value? We don't put them in
	// watch until we have a value, so if there's no value there should be
	// no watch? Can we use that to simplify this whole thing?
	var clearWatch = (state, newState, [key0]) =>
		updateIn(newState, [mount, '_watch'], watch =>
			(watch || []).filter(([[key], ref]) =>
				key0 !== key ||
				getIn(state, [mount, ...ref]) === getIn(newState, [mount, ...ref])));


	var controls = {
		[dispatchKey]:
		(state, path, data, refs) =>
			clearWatch(state,
				clearCache(setWatch(assocIn(validatePath(state, path),
					[mount, ...path], enforceValue(path, data)), path, refs), path), path),
		[`${dispatchKey}-post!`]: (serverBus, state, newState, path) => {
			var i = queue.findIndex(([p]) => isEqual(p, path));
			queue.splice(i, 1);
		},
		[`${mount}-invalidate`]: (state, _, path) => invalidatePath(state, path),
		[`${mount}-invalidate-post!`]: (serverBus, state, newState, _, path) => {
			queue = queue.filter(([p]) => !matchPath(path, p));
		}
	};

	// 'count' is a horrible hack to work around a) needing to invalidate
	// state from postAction, b) the serverBus de-duping requests by key.
	// We dispatch an actions on the serverBus from a postAction in order
	// to invalidate state, but have to make each key unique to avoid it
	// being dropped by de-dup.
	var count = 0;
	function dispatchInvalidate(serverBus, path) {
		serverBus.next([[`${mount}-invalidate`, count++], of(path, asap)]);
	}
	var postAction = (serverBus, state, newState) => {
		getIn(newState, [mount, '_watch'], []).forEach(([path, ref]) => {
			if (!isEqual(getIn(newState, ref), getIn(state, ref))) {
				dispatchInvalidate(serverBus, path);
			}
		});
		queue.forEach(([path, refs]) => {
			if (refs.find(ref => !isEqual(getIn(newState, ref), getIn(state, ref)))) {
				dispatchInvalidate(serverBus, path);
			}
		});

		var toFetch = dataRequest(newState)
			.map(splitPath)
			.filter(([path]) =>
				(getIn(newState[mount], path) == null ||
					getIn(newState[mount]._outOfDate, path))
				&& !find(queue, ([p]) => isEqual(p, path)));

		toFetch.forEach(fetch => {
			queue.push(fetch);
			var [path, refs] = fetch;
			serverBus.next([[dispatchKey, path],
				fetchData(path.concat(refs.map(path => getIn(newState, path)))), refs]);
		});
	};

	var fetchController = {
		action: identity,
		postAction: postAction
	};


	return {
		controller: compose(fetchController, make(controls)),
		invalidatePath: dispatchInvalidate
	};
}
