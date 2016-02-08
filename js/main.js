/*eslint-env browser */
/*global require: false, console: false, module: false */

'use strict';

require('base');
var Rx = require('./rx.ext');
require('rx.coincidence');
require('rx/dist/rx.aggregates');
require('rx/dist/rx.time');
require('rx-dom');
var _ = require('./underscore_ext');
require('./plotDenseMatrix'); // XXX better place or name for this?
require('./plotMutationVector'); // XXX better place or name for this?
require('./models/denseMatrix'); // XXX better place or name for this?
require('./models/mutationVector'); // XXX better place or name for this?
var uiController = require('./controllers/ui');
var serverController = require('./controllers/server');
require('bootstrap/dist/css/bootstrap.css');
var selector = require('./appSelector');
var compose = require('./controllers/compose');
const connector = require('./connector');

// Hot load controllers. Note that hot loading won't work if one of the methods
// is captured in a closure or variable which we can't access.  References to
// the controller methods should only happen by dereferencing the module. That's
// currently true of the controllers/compose method, so we are able to hot
// load by overwritting the methods, here. However it's not true of devtools.
// If we had a single controller (i.e. no call to compose), passing a single
// controller to devtools would defeat the hot loading. Sol'n would be to
// update devtools to always dereference the controller, rather than keeping
// methods in closures.

if (module.hot) {
	module.hot.accept('./controllers/ui', () => {
		var newModule = require('./controllers/ui');
		_.extend(uiController, newModule);
	});
	module.hot.accept('./controllers/server', () => {
		var newModule = require('./controllers/server');
		_.extend(serverController, newModule);
	});
	// XXX Note that hot-loading these won't cause a re-render.
	module.hot.accept('./models/mutationVector', () => {});
	module.hot.accept('./models/denseMatrix', () => {});
}

var defaultServers = ['https://genome-cancer.ucsc.edu:443/proj/public/xena',
		'https://local.xena.ucsc.edu:7223'];
var main = window.document.getElementById('main');

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

var uiBus = new Rx.Subject();
var uiCh = uiBus;

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
	_.extend(initialState, JSON.parse(sessionStorage.xena));
}

var controller = compose(serverController, uiController);

connector({controller, initialState, serverCh, uiCh, main, selector});

// Kick things off.
uiBus.onNext(['init']);
