var {assocIn, dissoc, get, getIn, merge, Let, updateIn}
	= require('../underscore_ext').default;
// auth required for state path

// {_authRequired: {
//   [host]: {location, error, path: [], pending}
// }}

var aR = '_authRequired';

// note that this can record the same path multiple times. Currently the only
// side effect of this is that we invalidate paths multiple times, which is a
// noop.
export var setAuthRequired = (state, origin, path, location) =>
	Let((paths = getIn(state, [aR, origin, 'paths'], [])
					.concat([path])) =>
			updateIn(state, [aR, origin], a => merge(a, {location, paths})));

export var resetAuthRequired = (state, origin) =>
	updateIn(state, [aR], ar => dissoc(ar, origin));

export var nextAuth = state =>
	Let((aRkey = Object.keys(get(state, aR, {}))[0]) =>
		aRkey && [aRkey, getIn(state, [aR, aRkey])]);

export var setAuthError = (state, origin, error) =>
	assocIn(state, [aR, origin, 'error'], error,
		[aR, origin, 'pending'], false);

export var setAuthPending = (state, origin) =>
	assocIn(state, [aR, origin, 'pending'], true);

export var isAuthPending = state =>
	Let(([origin] = nextAuth(state) || []) =>
		origin && getIn(state, [aR, origin, 'pending']));
