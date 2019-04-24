'use strict';
var _ = require('./underscore_ext');
var {createSelectorCreator, defaultMemoize} = require('reselect');
var {publicServers} = require('./defaultServers');

var createSelector = createSelectorCreator(defaultMemoize, _.isEqual);

module.exports = createSelector(
		state => _.pluck(state.columns, 'dsID'),
		state => state.hasPrivateSamples,
		(dsIDs, hasPrivateSamples) =>
			_.Let((pub = new Set(publicServers)) =>
				!hasPrivateSamples &&
					_.every(dsIDs, dsID => !dsID || pub.has(JSON.parse(dsID).host))));
