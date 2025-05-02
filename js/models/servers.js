import { keys } from '../underscore_ext.js';

export var userServers =
	state => keys(state.servers).filter(h => state.servers[h].user);
