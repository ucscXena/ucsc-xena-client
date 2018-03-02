'use strict';
/*global cy: false, beforeEach: false, Cypress: false, before: false, after: false */


var sha = require('js-sha1');

function setXHRProp(xhr, key, value) {
	Object.defineProperty(xhr, key, {writable: true});
	xhr[key] = value;
}

// This works around https://github.com/cypress-io/cypress/issues/76
// Large responses can't be stubbed in cypress, due to misdesign. Shim
// the response handler, here.
var shimResponse = p => xhr => {
	var orsc = xhr.xhr.onreadystatechange;
	xhr.xhr.onreadystatechange = function() {
		var args = arguments;
		if (this.readyState === 4) {
			p.then(({response, status}) => {
				setXHRProp(this, 'response', response);

				if (xhr.xhr.responseType === 'text' || xhr.xhr.responseType === '') {
					setXHRProp(this, 'responseText', response);
				}

				setXHRProp(this, 'status', status);

				// Populate the proxy after setting response & responseText.
				xhr._setResponseBody();
				orsc.apply(this, args);
			});
		} else {
			orsc.apply(this, args);
		}
	};
};

var ignoreLocalHub = () => {
	// Ignore local hubs that are missing.  Would like to return a
	// connection refused, but I don't think cy.route() will do that.
	// Might be able to use a sinon mock.
	cy.route({
		method: 'POST',
		url: 'https://local.xena.ucsc.edu:7223/*',
		status: 500,
		response: ''
	});
};

var cacheDir = 'cypress/xhr-cache';

var playback = timeout => xhr => {
	var {url, method, request: {body}} = xhr,
		hash = sha.hex(JSON.stringify([url, method, body]));
	var p = Cypress.backend("read:file", `${cacheDir}/${hash}`, 'utf8')
		.then(r => {
			return JSON.parse(r.contents);
		}).catch(() => {
			// XXX Could there be a race between writing the file & reading it
			// on the next request?


			// This pattern is used in cypress 'request' method. I don't
			// understand how the timeouts work. I just copied the pattern.
			//  //# need to remove the current timeout
			//  //# because we're handling timeouts ourselves
			cy.clearTimeout("http:request");
			return Cypress.backend('http:request', {
					gzip: true,
					followRedirect: true,
					method, url, body})
				.timeout(timeout)
				.then(cyResp => {
				// cy.request will interpret the response content-type,
				// parsing the result if the type is json. This doesn't help
				// us, because browsers parse based on the requestType
				// property. The uninterpreted response is in allRequestResponses.
				var response = cyResp.allRequestResponses[0]['Response Body'],
					{status} = cyResp;

				if (xhr.xhr.responseType === 'json') {
					response = JSON.parse(response);
				}
				return {response, status};
			}).catch(() => {
				// timeout, connection-refused, etc. cy.request will throw on
				// these.
				return {response: null, status: 0};
			}).then(respStat => {
				var {response, status} = respStat;

				Cypress.backend(
					'write:file',
					`${cacheDir}/${hash}`,
					JSON.stringify({response, status}),
					'utf8');
				return respStat;
			});
		});

	shimResponse(p)(xhr);
};

var defaultRequestTimeout = Cypress.config('responseTimeout');

// exclude test harness traffic
var matchXhrs = /^(?!.*(hot-update.json|sockjs-node))/;

function setupPlayback(timeout = defaultRequestTimeout) {
	beforeEach(function() {
		cy.server();
		cy.route({url: matchXhrs, method: 'POST', onRequest: playback(timeout), response: 'placeholder'});
		cy.route({url: matchXhrs, method: 'GET', onRequest: playback(timeout), response: 'placeholder'});
		ignoreLocalHub();
	});
}

module.exports = {
	setupPlayback,
	shimResponse
};
