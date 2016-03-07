/*eslint-env browser */
/*global require: false, module: false */

'use strict';

var Rx = require('./rx.ext');
require('rx.coincidence');
var _ = require('./underscore_ext');
var {getErrorProps, logError} = require('./errors');
var {getNotifications} = require('./notifications');

var defaultServers = [
	'https://local.xena.ucsc.edu:7223',
  'https://genome-cancer.ucsc.edu:443/proj/public/xena'
];

module.exports = function () {
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
		mode: 'heatmap',
		zoom: {height: 300},
		columns: {},
		columnOrder: [],
		samples: [],
		notifications: getNotifications()
	};

	if (sessionStorage && sessionStorage.xena && location.search.indexOf('?nostate') !== 0) {
		_.extend(initialState, JSON.parse(sessionStorage.xena));
	}

	return {
		uiCh,
		uiBus,
		serverCh,
		serverBus,
		initialState
	};
};
