var {keys} = require('../underscore_ext').default;

export var userServers =
	state => keys(state.servers).filter(h => state.servers[h].user);
