'use strict';
/*global cy: false, beforeEach: false, Cypress: false, before: false, after: false */

var merge = (...args) => Object.assign({}, ...args);
var {memoize, isArray, findIndex, pick, identity} = Cypress._;

// This works around https://github.com/cypress-io/cypress/issues/76
// Large responses can't be stubbed in cypress, due to misdesign. Shim
// the response handler, here.
var shimResponse = (response, status) => xhr => {
	var orsc = xhr.xhr.onreadystatechange;
	xhr.xhr.onreadystatechange = function() {
		if (this.readyState === 4) {
			Object.defineProperty(this, 'response', {
				writable: true
			});
			this.response = response;
			Object.defineProperty(this, 'status', {
				writable: true
			});
			this.status = status;
		}
		orsc.apply(this, arguments);
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

function saveFile(file, data) {
	return cy.writeFile(`${cacheDir}/${file}.json`, JSON.stringify(data));
}

function readFile(file) {
	return cy.readFile(`${cacheDir}/${file}.json`);
}

var playback = (jsonStringify, responses) => xhr => {
	if (xhr.url.match(/sockjs-node/)) {
		return;
	}
	// I think what's happening here is that for responseType 'json'
	// the browser will parse the response before it reaches the app,
	// so we should also provide a 'parsed' response to the app. For
	// other responseTypes, the browser will not parse it for the app,
	// so we should provide an 'unparsed' stringified response.
	var stringify = xhr.xhr.responseType === 'json' ? identity : jsonStringify,
		i = findIndex(responses, entry =>
			entry.body === xhr.request.body && entry.url === xhr.url);
	if (i === -1) {
		console.error('Missing response for request', xhr);
	}
	shimResponse(stringify(responses[i].response), responses[i].status)(xhr);
};

var titleToFile = str => str.replace(/ /g, '-');
function setupPlayback(sources) {
	var responses;
	sources = isArray(sources) ? sources : [sources];
	before(function() {
		responses = [];
		sources.forEach(title => {
			readFile(titleToFile(title)).then(q => responses.push(...q));
		});
	});
	beforeEach(function() {
		var stringify = memoize(JSON.stringify);
		cy.server();
		cy.route({url: '*://**', method: 'POST', onRequest: playback(stringify, responses), response: 'placeholder'});
		cy.route({url: '*://**', method: 'GET', onRequest: playback(stringify, responses), response: 'placeholder'});
		ignoreLocalHub();
	});
}

// promise that resolves when all xhrs after a certain time (mark) are complete.
// Call onRequest(xhr) for every xhr request. Call onResponse(xhr), onAbort(xhr) for every xhr response or abort.
// Call mark(), and .then() the promise to wait for all currently outstanding requests to finish.
function xhrWaitPromise() {
	var xhrs = new Map(),
		done,
		p = new Cypress.Promise(resolve => done = resolve),
		onComplete = xhr => {
			xhrs.set(xhr, true);
			if ([...xhrs.values()].every(x => x)) {
				done();
			}
		};

	xhrs.set('mark', false);
	p.onRequest = xhr => xhrs.set(xhr, false);
	p.onResponse = onComplete;
	p.onAbort = onComplete;
	p.mark = () => onComplete('mark');

	return p;
}

function setupRecord(title) {
	before(function() {
		this.promise = xhrWaitPromise();
		this.cache = [];
		this.record = xhr => {
			this.promise.onResponse(xhr);
			this.cache.push(merge(
				pick(xhr, 'url', 'method', 'status'), {body: xhr.request.body, response: xhr.response.body}));
		};
	});
	after(function() {
		this.promise.mark();
		cy.wrap(this.promise).then(() => {
			// XXX make unique here
			saveFile(titleToFile(title), this.cache);
		});
	});
	beforeEach(function() {
		var {onRequest, onAbort} = this.promise;
		cy.server();
		cy.route({url: '*://**', method: 'POST', onResponse: this.record, onAbort,  onRequest});
		cy.route({url: '*://**', method: 'GET', onResponse: this.record, onAbort, onRequest});
		ignoreLocalHub();
	});
}

module.exports = {
	setupPlayback,
	setupRecord,
	shimResponse
};
