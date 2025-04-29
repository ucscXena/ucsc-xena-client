import * as _ from './underscore_ext.js';
var {defaultServers, enabledServers} = require('./defaultServers');
import { getNotifications } from './notifications.js';

var defaultServerState = _.object(defaultServers,
	defaultServers.map(s => ({user: _.contains(enabledServers, s)})));

const initialState = {
	version: 5, // XXX duplicated in migrateState.js?
	spreadsheet: {
		columnOrder: [],
		columns: {},
		mode: 'heatmap',
		notifications: getNotifications(),
		servers: defaultServerState,
		showWelcome: true,
		wizardMode: true,
		zoom: {
			count: 0,
			height: 518, // 518px forces visualizations to match min height of variable select card, required to maintain consistent heights across cohort/disease and variable select during wizard mode
			index: 0
		},
	},
	wizard: {},
	import: {
		wizardPage: 0,
		wizardHistory: []
	}
};

export { initialState };
