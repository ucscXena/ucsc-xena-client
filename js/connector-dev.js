/*global module: false require: false */
/*eslint-env browser */
'use strict';

var _ = require('./underscore_ext');
var Rx = require('./rx.ext');
require('rx/dist/rx.time');
var React = require('react');
var ReactDOM = require('react-dom');
var compactJSON = require('./compactJSON');
let {createDevTools} = require('./controllers/devtools');
import LogMonitor from 'redux-devtools-log-monitor';
import DockMonitor from 'redux-devtools-dock-monitor';
const session = require('ucsc-xena-datapages/session');

function logError(err) {
	if (typeof window === 'object' && typeof window.chrome !== 'undefined') {
		// In Chrome, rethrowing provides better source map support
		setTimeout(() => { throw err; });
	} else {
		console.error(err.stack || err);
	}
}

var unwrapDevState = state => _.last(state.computedStates).state;

module.exports = function({
	Page,
	controller,
	initialState,
	serverBus,
	serverCh,
	uiBus,
	uiCh,
	main,
	selector}) {

	// Change this assignment to JSON to use the browser JSON methods.
	let {stringify, parse} = compactJSON;

	var updater = ac => uiCh.onNext(ac);
	let devBus = new Rx.Subject();

	// We have an implicit async action on page load ('init'). redux-devtools
	// 'RESET' command will return us to the initial state, but never
	// re-issues async actions (which would break the devtools functionality).
	// This leaves our app in an unusable state after RESET: initial state w/o any
	// way of issuing the 'init' action. The effect is the cohort list never
	// loads. Here we intercept the devtools actions & re-issue 'init' on
	// RESET.
	let init = () => setTimeout(() => uiCh.onNext(['init']), 0);
	let devCh = devBus.do(ac => {
		if (ac.type === 'RESET') {
			init();
		}
	});

	let DevTools = createDevTools(
		<DockMonitor toggleVisibilityKey='ctrl-h' changePositionKey='ctrl-q'>
			<LogMonitor preserveScrollTop={false}/>
		</DockMonitor>
	);

	var sessionLoaded = false; // XXX Ugh. Sorry about this.
	function getSavedState() {
		if (sessionStorage.debugSession) {
			try {
				let devState = parse(sessionStorage.debugSession);
				sessionLoaded = true;
				return devState;
			} catch(err) {
				console.log("Unable to load saved debug session", err);
			}
		}
		return null;
	}

	let devReducer = DevTools.instrument(controller, initialState);
	let devInitialState = getSavedState() || devReducer(null, {});

	// Shim sessionStorage for code using session.js.
	session.setCallback(ev => uiCh.onNext(ev));

	// Side-effects (e.g. async) happen here. Ideally we wouldn't call this from 'scan', since 'scan' should
	// be side-effect free. However we've lost the action by the time scan is complete, so we do it in the scan.
	var inEffectsReducer = false;
	let effectsReducer = (state, ac) => {
		if (inEffectsReducer) {
			throw new Error("Reentry in reducer. Reducers must not invoke actions.");
		}
		inEffectsReducer = true;
		var nextState = devReducer(state, ac);
		if (ac.type === 'PERFORM_ACTION') {
			try {
				controller.postAction(serverBus, unwrapDevState(state), unwrapDevState(nextState), ac.action);
			} catch(err) {
				logError(err);
			}
		}
		inEffectsReducer = false;
		return nextState;
	};

	function prependState(stateObs) {
		return sessionLoaded ? stateObs.startWith(devInitialState) : stateObs;
	}
	let devStateObs = Rx.Observable.merge(serverCh, uiCh).map(ac => ({type: 'PERFORM_ACTION', action: ac}))
					.merge(devCh)
					.scan(devInitialState, effectsReducer) // XXX side effects!
					.share();


	// XXX double check that this expression is doing what we want: don't draw faster
	// than rAF.

	// pass the selector into Page, so we catch errors while rendering & can display an error message.
	prependState(devStateObs).throttleWithTimeout(0, Rx.Scheduler.requestAnimationFrame)
		.subscribe(devState => ReactDOM.render(
					<div>
						<Page callback={updater} selector={selector} state={unwrapDevState(devState)} />
						<DevTools dispatch={devBus.onNext.bind(devBus)} {...devState} />
					</div>,
			main));

	// Save state in sessionStorage on page unload.
	devStateObs.sample(Rx.DOM.fromEvent(window, 'beforeunload'))
		.subscribe(state => sessionStorage.debugSession = stringify(state));

	// This causes us to always load cohorts on page load. This is important after
	// setting hubs, for example.
	uiBus.onNext(['init']);
};
