/*eslint-env browser */
/*global require: false, console: false */

'use strict';

require('base');
//var Input = require('react-bootstrap/lib/Input');
var Rx = require('./rx.ext');
//var Button = require('react-bootstrap/lib/Button');
require('rx.coincidence');
require('rx/dist/rx.aggregates');
require('rx/dist/rx.time');
require('rx-dom');
var _ = require('./underscore_ext');
require('./plotDenseMatrix'); // XXX better place or name for this?
require('./plotMutationVector'); // XXX better place or name for this?
require('./models/denseMatrix'); // XXX better place or name for this?
require('./models/mutationVector'); // XXX better place or name for this?
var controllersControls = require('./controllers/controls');
var controllersServer = require('./controllers/server');
require('bootstrap/dist/css/bootstrap.css');
var selector = require('./appSelector');
var compose = require('./controllers/compose');
const connector = require('./connector');

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

var controlsBus = new Rx.Subject();
var controlsCh = controlsBus;

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

var controller = compose(controllersServer, controllersControls);

// XXX rename controls ui, so we have ui + server.

connector({controller, initialState, serverCh, controlsCh, main, selector});

// Kick things off.
controlsBus.onNext(['init']);
