/*eslint-env browser */
/*global require: false, console: false */

'use strict';

require('base');
var React = require('react');
var ReactDOM = require('react-dom');
var Spreadsheet = require('./spreadsheet');
var AppControls = require('./AppControls');
//var Input = require('react-bootstrap/lib/Input');
var Grid = require('react-bootstrap/lib/Grid');
var Row = require('react-bootstrap/lib/Row');
var Col = require('react-bootstrap/lib/Col');
var Rx = require('./rx.ext');
var KmPlot = require('./kmPlot');
import JSONTree from 'react-json-tree';
//var Button = require('react-bootstrap/lib/Button');
require('rx.coincidence');
require('rx/dist/rx.aggregates');
require('rx/dist/rx.time');
require('rx-dom');
var _ = require('./underscore_ext');
var meta = require('./meta');
require('./plotDenseMatrix'); // XXX better place or name for this?
require('./plotMutationVector'); // XXX better place or name for this?
require('./models/denseMatrix'); // XXX better place or name for this?
require('./models/mutationVector'); // XXX better place or name for this?
var controllersControls = require('controllers/controls'); // XXX use npm package to simplify this import?
var controllersServer = require('controllers/server'); // XXX use npm package to simplify this import?
require('bootstrap/dist/css/bootstrap.css');
//var Perf = require('react/addons').addons.Perf;
var selector = require('appSelector');


var d = window.document;
var main = d.getElementById('main');
var defaultServers = ['https://genome-cancer.ucsc.edu:443/proj/public/xena',
		'https://local.xena.ucsc.edu:7223'];

// Create a channel for messages from the server. We
// want to avoid out-of-order responses for certain messages.
// To do that, we have to allocate somewhere. We can manage it
// by doing using a unique tag for the request, and using groupBy.
//
// Note that we can still bounce on column data requests, because they are not
// handled with switchLatest. We can't put them on their own channel, because
// that will leak memory: groupBy is leaky in keys. Maybe this leak is too small
// to worry about? Maybe we need a custom operator that won't leak? Maybe
// a takeUntil() should be applied to the groups?
var serverBus = new Rx.Subject();

var second = ([, b]) => b;

// Subject of [slot, obs]. We group by slot and apply switchLatest. If slot is '$none' we just
// merge.
var serverCh = serverBus.groupBy(([slot]) => slot)
	.map(g => g.key === '$none' ? g.map(second).mergeAll() : g.map(second).switchLatest()).mergeAll();

var initialState = {
	servers: {'default': defaultServers, user: defaultServers},
	zoom: {height: 300},
	columns: {},
	columnOrder: [],
	samples: [],
	comms: {
		server: serverBus
	}
};

if (sessionStorage && sessionStorage.xena && location.search.indexOf('?nostate') !== 0) {
	initialState = _.extend(initialState, JSON.parse(sessionStorage.xena));
}

var controlsBus = new Rx.Subject();
var controlsCh = controlsBus;

var Application = React.createClass({
	displayName: 'Application',
	getInitialState() {
		return {
			debug: false
		};
	},
	onClick: function (ev) {
		if (ev[meta.key]) {
			this.setState({debug: !this.state.debug});
		}
	},
//	onPerf: function () {
//		this.perf = !this.perf;
//		if (this.perf) {
//			console.log("Starting perf");
//			Perf.start();
//		} else {
//			console.log("Stopping perf");
//			Perf.stop();
//			Perf.printInclusive();
//			Perf.printExclusive();
//			Perf.printWasted();
//		}
//	},
	render: function() {
		let {appState: {km, ...otherState}, ...otherProps} = this.props;
		return (
			<Grid onClick={this.onClick}>
			{/*
				<Row>
					<Button onClick={this.onPerf}>Perf</Button>
				</Row>
			*/}
				<Row>
					<Col md={12}>
						<AppControls {...otherProps} appState={otherState} />
					</Col>
				</Row>
				<Spreadsheet {...otherProps} appState={otherState} />
				{_.getIn(km, ['id']) ? <KmPlot
						callback={this.props.callback}
						km={km}
						features={this.props.appState.features} /> : null}
				<Row>
					<Col md={12}>
						<JSONTree
							id='debug'
							style={{display: this.state.debug ? 'block' : 'none'}}
							data={this.props.appState} />
					</Col>
				</Row>
				<div className='chartRoot' style={{display: 'none'}} />
			</Grid>
		);
	}
});

// XXX rename controls ui, so we have ui + server.

function controlRunner(controller) {
	return function (state, ev) {
		try {
			var s = controller.event(state, ev);
			controller.postEvent(state, s, ev);
			return s;
		} catch (e) {
			console.log('Error', e); // comment this out to have hard errors.
			return state;
		}
	};
}

var serverReducer = controlRunner(controllersServer);
var controlsReducer = controlRunner(controllersControls);


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

var stateObs = Rx.Observable.merge(
					serverCh.map(ev => [serverReducer, ev]),
					controlsCh.map(ev => [controlsReducer, ev])
			   ).scan(initialState, (state, [reduceFn, ev]) => reduceFn(state, ev))
			   .do(pushState)
			   .merge(setState)
			   .share();

var updater = ev => controlsBus.onNext(ev);
//stateObs.subscribe(state => {
//	React.render(<Application callback={updater} appState={state} />, main);
//});

// XXX double check that this expression is doing what we want: don't draw faster
// than rAF.
stateObs.throttleWithTimeout(0, Rx.Scheduler.requestAnimationFrame)
	.subscribe(state => ReactDOM.render(<Application callback={updater} appState={selector(state)} />, main));


// Save state in sessionStorage on page unload.
stateObs.sample(Rx.DOM.fromEvent(window, 'beforeunload'))
	.subscribe(state => sessionStorage.xena = JSON.stringify(_.omit(state, 'comms')));

// Kick things off.
controlsBus.onNext(['init']);
