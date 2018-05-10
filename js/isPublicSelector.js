'use strict';
var _ = require('./underscore_ext');
var {createSelectorCreator, defaultMemoize} = require('reselect');
var {publicServers} = require('./defaultServers');
var {parseDsID} = require('./xenaQuery');

var createSelector = createSelectorCreator(defaultMemoize, _.isEqual);

module.exports = createSelector(
		state => _.pluck(state.columns, 'fieldSpecs'),
		state => state.hasPrivateSamples,
		(allSpecs, hasPrivateSamples) =>
			!hasPrivateSamples &&
			!_.any(allSpecs,
					  colSpecs => _.any(colSpecs,
										({fetchType, dsID}) =>
										fetchType === 'xena' && !_.contains(publicServers, parseDsID(dsID)[0]))));
