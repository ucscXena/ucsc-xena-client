'use strict';
var _ = require('../underscore_ext');
var {make, mount} = require('./utils');

// After settings change, mark the server list dirty.
// This is used by the viz page.
var setServersChanged = state => _.assoc(state, 'serversChanged', true);

var setServersChangedIfUser = (list, state) =>
	list === 'user' ? setServersChanged(state) : state;

function setHubs(state, {hubs}) {
	return hubs ?
		hubs.reduce(
			(state, hub) =>_.assocIn(state, ['servers', hub, 'user'], true),
			state) :
		state;
}

var controls = {
	'init': (state, params) => setHubs(state, params),
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

module.exports = mount(make(controls), ['spreadsheet']);
