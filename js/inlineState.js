
var Rx = require('./rx');

var addEventListenerObs = Rx.Observable.bindCallback(window.addEventListener);

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
