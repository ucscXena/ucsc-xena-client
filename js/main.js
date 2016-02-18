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
var {getErrorProps, logError} = require('./errors');

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

// Create a channel for messages from the server. We want to avoid out-of-order
// responses.  To do that, we have to allocate somewhere. We can manage it by
// doing using a unique tag for the type of request, and using groupBy, then
// switchLatest. groupBy is leaky, groups last forever.
var serverBus = new Rx.Subject();

// Allow a slot to be an array, in which case the groupBy key is
// the joined strings of the array, and the issued action is the
// 1st value of the array. maps ['widget-data', id] to slot
// widget-data-{id}, and issues action 'widge-data'.
var slotId = slot => _.isArray(slot) ? slot.join('-') : slot;
var actionId = slot => _.isArray(slot) ? slot : [slot];

function wrapSlotRequest([slot, req, ...args]) {
	return req.map(result => [...actionId(slot), result, ...args])
		.catch(err => Rx.Observable.return([`${slot}-error`, getErrorProps(logError(err)), ...args]))
}

// XXX Note that serverCh.onNext can push stuff that causes us to throw in
// wrapSlotRequest, etc. There's no handler. Where should we catch such
// errors & how to handle them?



// Subject of [slot, obs]. We group by slot and apply switchLatest. If slot is '$none' we just
// merge.
var serverCh = serverBus.groupBy(([slot]) => slotId(slot))
	.map(g => g.map(wrapSlotRequest).switchLatest())
	.mergeAll();

var uiBus = new Rx.Subject();
var uiCh = uiBus;

var initialState = {
	servers: {'default': defaultServers, user: defaultServers},
	zoom: {height: 300},
	columns: {},
	columnOrder: [],
	samples: []
};

if (sessionStorage && sessionStorage.xena && location.search.indexOf('?nostate') !== 0) {
	_.extend(initialState, JSON.parse(sessionStorage.xena));
}

var controller = compose(serverController, uiController);

connector({controller, initialState, serverCh, serverBus, uiCh, uiBus, main, selector});
