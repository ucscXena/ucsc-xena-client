
import * as util from './util.js';
import * as _ from './underscore_ext.js';
import {defaultServers} from './defaultServers';

function parseServer(s) {
	// XXX should throw or otherwise indicate parse error on no match
	var tokens = s.match(/^(https?:\/\/)?([^:\/]+)(:([0-9]+))?(\/(.*))?$/),
		host = tokens[2],
		defproto = 'https://',
		proto = tokens[1] || defproto,
		defport = (proto === defproto) ? 443 : '7222',
		port = tokens[4] || defport,
		path = tokens[5] || '',
		serverUrl = proto + host + (port ? ':' + port : '') + path;

	//*.xenahubs.net:443 server drop 443
	serverUrl = serverUrl.replace(/.xenahubs.net:443$/, ".xenahubs.net");
	return serverUrl;
}

var getUserServers = servers => _.keys(servers).filter(k => servers[k].user);

var getHubParams = state =>
	_.Let((hubs = getUserServers(_.getIn(state, ['spreadsheet', 'servers'], {}))) => ({
		addHub: _.difference(hubs, defaultServers),
		removeHub: _.difference(defaultServers, hubs)
	}));

const hubParams = () => _.map(util.allParameters().hub, parseServer);

// normalize: add http[s]? add port? Do standard replacements?
// What are our standard replacements?

export { hubParams, getHubParams, parseServer };
