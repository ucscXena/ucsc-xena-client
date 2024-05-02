import {compose, make} from './utils';
import {nextAuth, resetAuthRequired, setAuthError,
	setAuthPending, setAuthRequired} from '../models/auth';
var {assocIn, pick} = require('../underscore_ext').default;
var Rx = require('../rx').default;
var {ajax} = Rx.Observable;
var {encodeObject} = require('../util.js').default;

var mergeError = /.*-merge-data-error$/;
var is403 = ([, err]) => err.status === 403;

var is403Controller = {
	action: (state, ac) => {
		var [tag, ...args] = ac;
		if (mergeError.exec(tag) && is403(args)) {
			var [path, {location, origin}, prefix] = args;

			return setAuthRequired(state, origin, [prefix, ...path], location);
		}
		return state;
	},
	postAction: () => {}
};

var updateAuthPending = (state, params) =>
	params.code ? setAuthPending(state, nextAuth(state)[0]) : state;

var authControls = {
	init: (state, url, params = {}) => updateAuthPending(state, params),
	'init-post!': (serverBus, state, newState, url, params = {}) => {
		if (params.code) {
			var [origin] = nextAuth(state),
				p = pick(params, ['code', 'state']);
			serverBus.next(['auth',
				ajax({
					url: `${origin}/code?${encodeObject(p)}`,
					headers: {'X-Redirect-To': location.origin + location.pathname},
					method: 'GET',
					withCredentials: true,
					crossDomain: true
				}), origin]);
		}
	},
	// XXX could be a race here if the user clicks another auth link, for a
	// second hub?
	'auth': (state, resp, origin) => resetAuthRequired(state, origin),
	'auth-error': (state, err, origin) =>
		setAuthError(state, origin, 'Authentication Error'),
	'auth-cancel': (state, origin) =>
		assocIn(
			resetAuthRequired(state, origin),
			['spreadsheet', 'servers', origin, 'user'], false)
};

export default compose(is403Controller, make(authControls));
