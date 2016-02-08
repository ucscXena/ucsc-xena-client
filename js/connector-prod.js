/*global module: false require: false */
/*eslint-env browser */
'use strict';

var _ = require('./underscore_ext');
var Rx = require('rx');
var React = require('react');
var ReactDOM = require('react-dom');
var Application = require('./Application');

function controlRunner(controller) {
	return function (state, ac) {
		try {
			var s = controller.action(state, ac);
			controller.postAction(state, ac);
			return s;
		} catch (e) {
			console.log('Error', e);
			return state;
		}
	};
}

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
	Rx.DOM.fromEvent(window, 'popstate').map(s => {
		i = s.state;
		return cache[i];
	})];
})();

module.exports = function({
	controller,
	initialState,
	serverCh,
	uiCh,
	main,
	selector}) {

	var updater = ac => uiCh.onNext(ac);
	var runner = controlRunner(controller);

	let stateObs = Rx.Observable.merge(serverCh, uiCh)
				   .scan(initialState, runner)
				   .do(pushState)
				   .merge(setState)
				   .share();

	stateObs.throttleWithTimeout(0, Rx.Scheduler.requestAnimationFrame)
		.subscribe(state => ReactDOM.render(<Application callback={updater} selector={selector} state={state} />, main));

	// Save state in sessionStorage on page unload.
	stateObs.sample(Rx.DOM.fromEvent(window, 'beforeunload'))
		.subscribe(state => sessionStorage.xena = JSON.stringify(_.omit(state, 'comms')));
};
