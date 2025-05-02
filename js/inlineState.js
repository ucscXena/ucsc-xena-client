
import Rx from './rx';
import {deserialize} from './serialize';

const hasInlineState = () => location.search.match(/^\?inline/) && window.opener;

const resetInlineStateLocation = () => history.replaceState({}, 'UCSC Xena',
        location.pathname + location.search.replace(/\?inline/, ''));

const parseInlineState = message => JSON.parse(message);

const fetchInlineState = () => {
    var obs = Rx.Observable.fromEvent(window, 'message')
        .filter(({data}) => data.type === 'xenaResponseState')
        .take(1)
//			.filter(({origin}) =>
//					origin.match(/^https?:\/\/(xena|genome-cancer)\.ucsc\.edu/))
        .flatMap(({data}) => deserialize(data.state));

    window.opener.postMessage({type: 'xenaRequestState'}, '*');
    return obs;
};

export { hasInlineState, resetInlineStateLocation, parseInlineState, fetchInlineState };
