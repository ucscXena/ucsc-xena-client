/*global module: false require: false */
/*eslint-env browser */
'use strict';

var Rx = require('rx');
var Rx = require('./rx.ext');
require('rx/dist/rx.time');
var React = require('react');
var ReactDOM = require('react-dom');
// XXX this introduces a datapages dependency in the heatmap page.
const session = require('ucsc-xena-datapages/session');

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

var [pushState, setState] = (function () {
	var i = 0, cache = [];
	return [function (s) {
		cache[i] = s;
		history.pushState(i, '');
		i = (i + 1) % 100;
	},
	// XXX safari issues a 'popstate' on page load, when we have no cache. The filter here
	// drops those events.
	Rx.DOM.fromEvent(window, 'popstate').filter(s => !!cache[s.state]).map(s => {
		i = s.state;
		return cache[i];
	})];
})();

var enableHistory = (enable, obs) => enable ?
	obs.do(pushState).merge(setState) : obs;

module.exports = function({
	Page,
	controller,
	persist,
	history,
	initialState,
	serverBus,
	serverCh,
	uiBus,
	uiCh,
	main,
	selector}) {

	var dom = {main};
	var updater = ac => uiCh.onNext(ac);
	var runner = controlRunner(serverBus, controller);

	// Shim sessionStorage for code using session.js.
	session.setCallback(ev => uiCh.onNext(ev));

	let stateObs = enableHistory(
			history,
			Rx.Observable.merge(serverCh, uiCh).scan(initialState, runner)).share();

	stateObs.throttleWithTimeout(0, Rx.Scheduler.requestAnimationFrame)
		.subscribe(state => ReactDOM.render(<Page callback={updater} selector={selector} state={state} />, dom.main));

	if (persist) {
		// Save state in sessionStorage on page unload.
		stateObs.sample(Rx.DOM.fromEvent(window, 'beforeunload'))
			.subscribe(state => sessionStorage.xena = JSON.stringify(state));
	}

	// Kick things off.
	uiBus.onNext(['init']);
	return dom;
};
