'use strict';

var Rx = require('./rx');
var _ = require('./underscore_ext');
var {getErrorProps, logError} = require('./errors');
var {getNotifications} = require('./notifications');
var {defaultServers, enabledServers} = require('./defaultServers');

var defaultServerState = _.object(defaultServers,
		defaultServers.map(s => ({user: _.contains(enabledServers, s)})));

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
	var errorId = slot => {
		var [action, ...args] = actionId(slot);
		return [`${action}-error`, ...args];
	};

	function wrapSlotRequest([slot, req, ...args]) {
		return req.map(result => [...actionId(slot), result, ...args])
			.catch(err => Rx.Observable.of([...errorId(slot), getErrorProps(logError(err)), ...args], Rx.Scheduler.asap));
	}

	// XXX Note that serverCh.onNext can push stuff that causes us to throw in
	// wrapSlotRequest, etc. There's no handler. Where should we catch such
	// errors & how to handle them?

	// Subject of [slot, obs]. We group by slot and apply switchLatest.
	var serverCh = serverBus.groupByNoLeak(([slot]) => slotId(slot))
		.map(g => g.switchMap(wrapSlotRequest).take(1))
		.mergeAll();

	var uiBus = new Rx.Subject();
	var uiCh = uiBus;

	var initialState = {
		version: 1,
		spreadsheet: {
			columnOrder: [],
			columns: {},
			mode: 'heatmap',
			notifications: getNotifications(),
			servers: defaultServerState,
			showWelcome: true,
			wizardMode: true,
			zoom: {height: 460} // 460px forces visualizations to match min height of variable select card, required to maintain consistent heights across cohort/disease and variable select during wizard mode
		},
		wizard: {},
		import: {
			wizardPage: 0,
			wizardHistory: []
		}
	};

	return {
		uiCh,
		uiBus,
		serverCh,
		serverBus,
		initialState
	};
};
