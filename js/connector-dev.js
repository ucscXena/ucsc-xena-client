
import * as _ from './underscore_ext.js';
import Rx from './rx';
var React = require('react');
var ReactDOM = require('react-dom');
import { createDevTools } from './controllers/devtools.js';
import LogMonitor from 'redux-devtools-log-monitor';
import DockMonitor from 'redux-devtools-dock-monitor';
import urlParams from './urlParams';
import LZ from './lz-string';
import { compactState, expandState } from './compactData.js';
import migrateState from './migrateState.js';
import { schemaCheckThrow } from './schemaCheck.js';
import { fetchInlineState, hasInlineState } from './inlineState.js';

function logError(err) {
	if (typeof window === 'object' && typeof window.chrome !== 'undefined') {
		// In Chrome, rethrowing provides better source map support
		setTimeout(() => { throw err; });
	} else {
		console.error(err.stack || err);
	}
}

var dropTransient = state =>
	_.assoc(state, 'wizard', {}, 'datapages', undefined, 'localStatus', undefined, 'localQueue', undefined,  'import', undefined);


// serialization
function stringify(state) {
	return LZ.compressToUTF16(JSON.stringify({
		..._.omit(state, 'computedStates', 'committedState'),
		   committedState: compactState(dropTransient(state.committedState))
	}));
}
function parse(str) {
	var state = JSON.parse(LZ.decompressFromUTF16(str));
	return expandState(migrateState(state.committedState)).map(cstate => ({
		...state,
		committedState: schemaCheckThrow(cstate)
	}));
}

//
var unwrapDevState = state => _.last(state.computedStates).state;

var historyObs = Rx.Observable
	.fromEvent(window, 'popstate')
	.map(() => ['history', _.object(['path', 'params'], urlParams())]);

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
		devBus = new Rx.Subject(),
		devCh = devBus,
		devtoolsVisible = false; // Change this to turn on the debug window at start.

	delete sessionStorage.xena; // Free up space & don't try to share with prod.

	var DevTools = createDevTools(
		<DockMonitor defaultIsVisible={devtoolsVisible}
				toggleVisibilityKey='ctrl-h' changePositionKey='ctrl-q'>
			<LogMonitor select={x => x} preserveScrollTop={false} expandStateRoot={false}/>
		</DockMonitor>),

		devReducer = DevTools.instrument(controller, initialState),
		// Here we need not just the initial state, but to know if we have a
		// saved state. The initial state is used in devtools as the 'reset'
		// target. So, we can't replace initial state with saved state.
		devInitialState = devReducer(null, persist && savedState ?
			{type: 'IMPORT_STATE', nextLiftedState: savedState} : {});


	// Side-effects (e.g. async) happen here. Ideally we wouldn't call this
	// from 'scan', since 'scan' should be side-effect free. However we've lost
	// the action by the time scan is complete, so we do it in the scan.
	var inEffectsReducer = false;
	var effectsReducer = (state, ac) => {
		if (inEffectsReducer) {
			throw new Error("Reentry in reducer. Reducers must not invoke actions.");
		}
		inEffectsReducer = true;
		var nextState = devReducer(state, ac);
		if (ac.type === 'PERFORM_ACTION') {
			try {
				controller.postAction(serverBus, unwrapDevState(state),
						unwrapDevState(nextState), ac.action);
			} catch(err) {
				logError(err);
			}
		}
		// We have an implicit async action on page load: 'init'. redux-devtools
		// 'RESET' command will return us to the initial state, but never
		// re-issues async actions (which would break the devtools functionality).
		// This leaves our app in an unusable state after RESET: initial state w/o any
		// way of issuing the 'init' action. The effect is the cohort list never
		// loads. Here we intercept the devtools actions & re-issue 'init' on
		// RESET.
		if (ac.type === 'RESET') {
			setTimeout(() => uiBus.next(['init', ...urlParams()]), 0);
		}

		inEffectsReducer = false;
		return nextState;
	};

	var devStateObs = Rx.Observable.merge(serverCh, uiCh, historyObs)
					.map(ac => ({type: 'PERFORM_ACTION', action: ac}))
					.merge(devCh)
					.scan(effectsReducer, devInitialState) // XXX side effects!
					.share();


	// XXX double check that this expression is doing what we want: don't draw faster
	// than rAF.

	devStateObs.debounceTime(0, Rx.Scheduler.animationFrame)
		.subscribe(devState => {
			return ReactDOM.render(
				<div>
					<Page callback={updater} state={unwrapDevState(devState)} />
					<DevTools dispatch={devBus.next.bind(devBus)} {...devState} />
				</div>,
				dom.main);
		}, err => console.log('err', err));

	if (persist) {
		// Save state in sessionStorage on page unload.
		devStateObs.sample(Rx.Observable.fromEvent(window, 'beforeunload'))
			.map(state => effectsReducer(state,
				{type: 'PERFORM_ACTION', action: ['page-unload']}))
			.map(state => sessionStorage.saveDevState ? state :
					effectsReducer(state, {type: 'COMMIT'}))
			.subscribe(state => sessionStorage.debugSession = stringify(state));
	}

	// This causes us to always load cohorts on page load. This is important after
	// setting hubs, for example.
	uiBus.next(['init', ...urlParams()]);
	return dom;
}

var {Observable: {of}} = Rx;
export default function(args) {
	var onError = err => {
		console.warn("Unable to load saved debug session", err);
		connect({...args, savedState: null});
	};

	if (hasInlineState()) {
		fetchInlineState().subscribe(
			initialState => connect({...args, savedState: null, initialState}),
			onError);
	} else {
		of(sessionStorage.debugSession).flatMap(s => s ? parse(s) : of(null))
		.subscribe(
			savedState => connect({...args, savedState}),
			onError);
	}
}
