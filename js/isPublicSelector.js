import * as _ from './underscore_ext.js';
import { createSelectorCreator, defaultMemoize } from 'reselect';
import {publicServers} from './defaultServers';

var createSelector = createSelectorCreator(defaultMemoize, _.isEqual);

export default createSelector(
		state => _.pluck(state.columns, 'dsID'),
		state => state.hasPrivateSamples,
		(dsIDs, hasPrivateSamples) =>
			_.Let((pub = new Set(publicServers)) =>
				!hasPrivateSamples &&
					_.every(dsIDs, dsID => !dsID || pub.has(JSON.parse(dsID).host))));
