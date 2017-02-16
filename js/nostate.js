'use strict';

module.exports = storageKey => {
	var reset = location.hash === '#nostate',
		hasStorage = sessionStorage && sessionStorage[storageKey];

	// Note we hit this twice in development, because store.js always looks for
	// key 'xena', while connector-dev looks for key 'debugSession'. Should move
	// 'xena' check to connector-prod to make this less confusing.
	if (hasStorage && reset) {
		location.hash = '#';
		// XXX Workaround for datapages/hubs out-of-band state management.
		delete sessionStorage.state;
	}
	return hasStorage && !reset;
};
