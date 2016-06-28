/*global module: false, require: false */
/*eslint-env browser */

'use strict';

var Rx = require('rx.async');

var addEventListenerObs = Rx.Observable.fromCallback(window.addEventListener);

module.exports = {
	hasInlineState: () => location.search.match(/^\?inline/) && window.opener,
	resetInlineStateLocation: () => history.replaceState({}, 'UCSC Xena',
			location.pathname + location.search.replace(/\?inline/, '')),
	parseInlineState: message => JSON.parse(message),
	fetchInlineState: () => {
		var obs = addEventListenerObs('message')
//			.filter(({origin}) =>
//					origin.match(/^https?:\/\/(xena|genome-cancer)\.ucsc\.edu/))
			.map(({data}) => data);

		window.opener.postMessage({type: 'xenaRequestState'}, '*');
		return obs;
	}
};
