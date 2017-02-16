'use strict';
var _ = require('../underscore_ext');

// After settings change, mark the server list dirty.
// This is used by the viz page.
var setServersChanged = state => _.assoc(state, 'serversChanged', true);

var setServersChangedIfUser = (list, state) =>
	list === 'user' ? setServersChanged(state) : state;

var controls = {
	'add-host': (state, host) =>
		setServersChanged(_.assocIn(state, ['servers', host], {user: true})),
	'remove-host': (state, host) =>
		setServersChanged(_.updateIn(state, ['servers'], s => _.dissoc(s, host))),
	'enable-host': (state, host, list) =>
		setServersChangedIfUser(list, _.assocIn(state, ['servers', host, list], true)),
	'disable-host': (state, host, list) =>
		setServersChangedIfUser(list, _.assocIn(state, ['servers', host, list], false)),
	 cohort: (state, cohort) => _.assoc(state, 'cohortPending', [{name: cohort}])
};

var identity = x => x;

module.exports = {
	action: (state, [tag, ...args]) => (controls[tag] || identity)(state, ...args),
	postAction: (serverBus, state, [tag, ...args]) => (controls[tag + '-post!'] || identity)(serverBus, state, ...args)
};

