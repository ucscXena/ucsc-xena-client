/*global module: false require: false */
/*eslint-env browser */
'use strict';

var _ = require('./underscore_ext');
var Rx = require('rx');
var React = require('react');
var ReactDOM = require('react-dom');
var Application = require('./Application');
let {createDevTools} = require('./controllers/devtools');
import LogMonitor from 'redux-devtools-log-monitor';
import DockMonitor from 'redux-devtools-dock-monitor';


module.exports = function({
	controller,
	initialState,
	serverCh,
	uiCh,
	main,
	selector}) {

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

	let devReducer = DevTools.instrument(controller, initialState);

	let devStateObs = Rx.Observable.merge(serverCh, uiCh).map(ac => ({type: 'PERFORM_ACTION', action: ac}))
					.merge(devCh)
					.scan(null, devReducer)
					.share();


	// XXX double check that this expression is doing what we want: don't draw faster
	// than rAF.

	// pass the selector into Application, so we catch errors while rendering & can display an error message.
	devStateObs.throttleWithTimeout(0, Rx.Scheduler.requestAnimationFrame)
		.subscribe(devState => ReactDOM.render(
					<div>
						<Application callback={updater} selector={selector} state={_.last(devState.computedStates).state} />
						<DevTools dispatch={devBus.onNext.bind(devBus)} {...devState} />
					</div>,
			main));
};
