/*eslint-env browser */
/*global require: false, console: false */

'use strict';

require('base');
var React = require('react');
var Spreadsheet = require('./spreadsheet');
var AppControls = require('./AppControls');
var Input = require('react-bootstrap/lib/Input');
var Grid = require('react-bootstrap/lib/Grid');
var Row = require('react-bootstrap/lib/Row');
var Col = require('react-bootstrap/lib/Col');
var Rx = require('./rx.ext');
require('rx.coincidence');
require('rx/dist/rx.aggregates');
require('rx/dist/rx.time');
require('rx-dom');
var _ = require('./underscore_ext');
var meta = require('./meta');
require('./plotDenseMatrix'); // XXX better place or name for this?
var controllersControls = require('controllers/controls'); // XXX use npm package to simplify this import?
var controllersServer = require('controllers/server'); // XXX use npm package to simplify this import?
require('bootstrap/dist/css/bootstrap.css');


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
	comms: {
		server: serverBus
	}
};

if (sessionStorage && sessionStorage.xena) {
	initialState = _.extend(initialState, JSON.parse(sessionStorage.xena));
}

var controlsBus = new Rx.Subject();
var controlsCh = controlsBus;

function formatState(state) {
	return JSON.stringify(_.omit(state, ['comms']), null, 4);
}

var Application = React.createClass({
	displayName: 'Application',
	getInitialState() {
		return {
			debug: false,
			debugText: formatState(this.props.appState) // initial state of text area.
		};
	},
	componentWillReceiveProps ({appState}) {
		this.setState({debugText: formatState(appState)});
	},
	handleChange: function (ev) {
		this.setState({debugText: ev.target.value});
	},
	onClick: function (ev) {
		if (ev[meta.key]) {
			this.setState({debug: !this.state.debug});
		}
	},
	onKeyDown: function (ev) {
		if (ev.key === 'Enter' && ev.ctrlKey) {
			try {
				this.props.callback(['set-debug-state', JSON.parse(this.state.debugText)]);
			} catch (e) {
				if (console) {
					console.log(e);
				}
			}
			ev.preventDefault();
		}
	},
	render: function() {
		return (
			<Grid onClick={this.onClick}>
				<Row>
					<Col md={12}>
						<AppControls {...this.props} />
					</Col>
				</Row>
				<Spreadsheet {...this.props} />
				<Row>
					<Col md={12}>
						<Input
							type='textarea'
							id='debug'
							rows='20'
							cols='130'
							style={{display: this.state.debug ? 'block' : 'none'}}
							onChange={this.handleChange}
							onKeyDown={this.onKeyDown}
							value={this.state.debugText} />
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
		var s = controller.event(state, ev);
		controller.postEvent(state, s, ev);
		return s;
	};
}

var serverReducer = controlRunner(controllersServer);
var controlsReducer = controlRunner(controllersControls);

var stateObs = Rx.Observable.merge(
					serverCh.map(ev => [serverReducer, ev]),
					controlsCh.map(ev => [controlsReducer, ev])
			   ).scan(initialState, (state, [reduceFn, ev]) => reduceFn(state, ev))
			   .share();

stateObs.throttleWithTimeout(0, Rx.Scheduler.requestAnimationFrame)
	.subscribe(state => React.render(<Application callback={ev => controlsBus.onNext(ev)} appState={state} />, main));

// Save state in sessionStorage on page unload.
stateObs.sample(Rx.DOM.fromEvent(window, 'beforeunload'))
	.subscribe(state => sessionStorage.xena = JSON.stringify(_.omit(state, 'comms')));

//stateObs.subscribe(s => console.log('state', s));

// Kick things off.
controlsBus.onNext(['init']);
