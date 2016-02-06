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
	controlsCh,
	main,
	selector}) {

	var updater = ac => controlsCh.onNext(ac);

	let devCh = new Rx.Subject();

	let DevTools = createDevTools(
		<DockMonitor toggleVisibilityKey='ctrl-h' changePositionKey='ctrl-q'>
			<LogMonitor preserveScrollTop={false}/>
		</DockMonitor>
	);

	let devReducer = DevTools.instrument(controller, initialState);

	let devStateObs = Rx.Observable.merge(serverCh, controlsCh).map(ac => ({type: 'PERFORM_ACTION', action: ac}))
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
						<DevTools dispatch={devCh.onNext.bind(devCh)} {...devState} />
					</div>,
			main));
};
