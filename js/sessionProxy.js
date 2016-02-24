// This is a horrible workaround for session.js, hub.js, datapages.js,
// which modify state outside our state flow, storing the result in
// sessionStorage. Here we catch such changes and dispatch events.

/*eslint-env browser */
/*global module: false */
'use strict';
module.exports =  function (callback) {
	var xena = sessionStorage.xena;
	return {
		set state (s) {
			sessionStorage.state = s;
		},
		get state () {
			return sessionStorage.state;
		},
		set xena (s) {
			xena = s;
			callback(['set-state', s])
		},
		get xena () {
			return xena;
		}
	};
};
