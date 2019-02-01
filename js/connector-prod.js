'use strict';

var _ = require('./underscore_ext');
var Rx = require('./rx');
var React = require('react');
var ReactDOM = require('react-dom');
var LZ = require('./lz-string');
var nostate = require('./nostate');
import urlParams from './urlParams';
var {compactState, expandState} = require('./compactData');
var migrateState = require('./migrateState');
var {schemaCheckThrow} = require('./schemaCheck');

function controlRunner(serverBus, controller) {
	return function (state, ac) {
		try {
			var nextState = controller.action(state, ac);
			controller.postAction(serverBus, state, nextState, ac);
			return nextState;
		} catch (e) {
			console.log('Error', e);
			return state;
		}
	};
}

// XXX The history mechanism is unusable. Should be operating ui channel, I
// suspect.
//
// From page load, push indexes for state. Store in cache slots.
// Our state is too big to push directly. This mechanism is a bit
// confusing across page loads.
//
//  0 1 2 3 4 5 6 7
//        ^
//  back: move indx to 2.
//  forward: move indx to 4
//  new state: append state & invalidate  5 - 7? The browser will
//     invalidate them.

//var [pushState, setState] = (function () {
//	var i = 0, cache = [];
//	return [function (s) {
//		cache[i] = s;
//		history.pushState(i, '');
//		i = (i + 1) % 100;
//	},
//	// XXX safari issues a 'popstate' on page load, when we have no cache. The filter here
//	// drops those events.
//	Rx.Observable.fromEvent(window, 'popstate').filter(s => !!cache[s.state]).map(s => {
//		i = s.state;
//		return cache[i];
//	})];
//})();
//
//var enableHistory = (enable, obs) => enable ?
//	obs.do(pushState).merge(setState) : obs;
//
var dropTransient = state =>
	_.assoc(state, 'wizard', {}, 'datapages', undefined, 'localStatus', undefined, 'localQueue', undefined, 'import', undefined);

// Serialization
var stringify = state => LZ.compressToUTF16(JSON.stringify(compactState(dropTransient(state))));
var parse = str => schemaCheckThrow(expandState(migrateState(JSON.parse(LZ.decompressFromUTF16(str)))));

var historyObs = Rx.Observable
	.fromEvent(window, 'popstate')
	.map(() => ['history', {path: location.pathname, params: urlParams()}]);

//
module.exports = function({
	Page,
	controller,
	persist,
	initialState,
	serverBus,
	serverCh,
	uiBus,
	uiCh,
	main,
	selector}) {

	var dom = {main},
		updater = ac => uiBus.next(ac),
		runner = controlRunner(serverBus, controller);

	delete sessionStorage.debugSession; // Free up space & don't try to share with dev
	if (persist && nostate('xena')) {
		try {
			initialState = parse(sessionStorage.xena);
		} catch (e) {
			initialState = _.assoc(initialState, 'stateError', 'session');
		}
	}

	let stateObs = Rx.Observable.merge(serverCh, uiCh, historyObs).scan(runner, initialState).share();

	stateObs.debounceTime(0, Rx.Scheduler.animationFrame)
		.subscribe(state => ReactDOM.render(<Page callback={updater} selector={selector} state={state} />, dom.main));

	if (persist) {
		// Save state in sessionStorage on page unload.
		stateObs.sample(Rx.Observable.fromEvent(window, 'beforeunload'))
			.subscribe(state => sessionStorage.xena = stringify(state));
	}

	// Kick things off.
	uiBus.next(['init', location.pathname, urlParams()]);
	return dom;
};
