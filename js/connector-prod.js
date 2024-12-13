
var _ = require('./underscore_ext').default;
var Rx = require('./rx').default;
var React = require('react');
var ReactDOM = require('react-dom');
var LZ = require('./lz-string');
import urlParams from './urlParams';
var {compactState, expandState} = require('./compactData');
var migrateState = require('./migrateState');
var {schemaCheckThrow} = require('./schemaCheck');
var controlRunner = require('./controlRunner').default;

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
var stringify = state => LZ.compressToUTF16(
	JSON.stringify(compactState(dropTransient(state))));
var parse = str => expandState(migrateState(JSON.parse(LZ.decompressFromUTF16(str))))
	.map(schemaCheckThrow);

var historyObs = Rx.Observable
	.fromEvent(window, 'popstate')
	.map(() => ['history', _.object(['path', 'params'], urlParams())]);

//
function connect({
	savedState,
	Page,
	controller,
	persist,
	initialState,
	serverBus,
	serverCh,
	uiBus,
	uiCh,
	main}) {

	var dom = {main},
		updater = ac => uiBus.next(ac),
		runner = controlRunner(serverBus, controller);

	delete sessionStorage.debugSession; // Free up space & don't try to share with dev
	if (persist && savedState) {
		if (savedState instanceof Error) {
			initialState = _.assoc(initialState, 'stateError', 'session');
		} else {
			initialState = savedState;
		}
	}

	let stateObs = Rx.Observable.merge(serverCh, uiCh, historyObs).scan(runner, initialState).share();

	stateObs.debounceTime(0, Rx.Scheduler.animationFrame)
		.subscribe(state => ReactDOM.render(<Page callback={updater} state={state} />, dom.main));

	if (persist) {
		// Save state in sessionStorage on page unload.
		stateObs.sample(Rx.Observable.fromEvent(window, 'beforeunload'))
			.map(state => runner(state, ['page-unload']))
			.subscribe(state => sessionStorage.xena = stringify(state));
	}

	// Kick things off.
	uiBus.next(['init', ...urlParams()]);
	return dom;
};

var {Observable: {of}} = Rx;
module.exports = function(args) {
	var saved = sessionStorage.xena;

	of(saved).flatMap(s => s ? parse(s) : of(null)).subscribe(
		savedState => connect({...args, savedState}),
		savedState => connect({...args, savedState})); // pass error as state
};
