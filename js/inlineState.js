
var Rx = require('./rx').default;
import {deserialize} from './serialize';

module.exports = {
	hasInlineState: () => location.search.match(/^\?inline/) && window.opener,
	resetInlineStateLocation: () => history.replaceState({}, 'UCSC Xena',
			location.pathname + location.search.replace(/\?inline/, '')),
	parseInlineState: message => JSON.parse(message),
	fetchInlineState: () => {
		var obs = Rx.Observable.fromEvent(window, 'message')
			.filter(({data}) => data.type === 'xenaResponseState')
			.take(1)
//			.filter(({origin}) =>
//					origin.match(/^https?:\/\/(xena|genome-cancer)\.ucsc\.edu/))
			.flatMap(({data}) => deserialize(data.state));

		window.opener.postMessage({type: 'xenaRequestState'}, '*');
		return obs;
	}
};
