'use strict';

import Rx from '../rx';
import {Let, get, getIn, isEqual} from '../underscore_ext';
import {servers} from '../defaultServers';
import {testStatus} from '../xenaQuery';

var {localHub} = servers;
var {interval, never, of} = Rx.Observable;

var backoffInterval = (low, high, multiple) =>
	Rx.Observable.of(low).expand(t => Rx.Observable.of(Math.min(multiple * t, high)).delay(t));

var oneSecond = 1000,
	twentySeconds = 20 * oneSecond,
	tenMinutes = 10 * 60 * oneSecond;

var contactTimeout = 200;

var nextState = (state, {status}) =>
	status !== 'down' ? status :
	state === 'up' ? 'lost' :
	state;

export default bus => {
	var needHub = new Rx.Subject(),
		uiActive = Rx.Observable.fromEvent(document.body, 'mousemove').startWith(true)
			.switchMap(() => of(false).delay(2000).startWith(true));

	var status = needHub.combineLatest(uiActive, (needHub, uiActive) => ({needHub, uiActive})).distinctUntilChanged(isEqual)
			.switchMap(({needHub, uiActive}) =>
				// probably more involved than we need. ping at some base rate that's high when
				// we explicitly need a hub, and low when we don't. If user stops interacting
				// with the page, back off exponentially to a slow ping rate. 1.2 == 20% each interval.
				Let((base = needHub ? oneSecond : twentySeconds) =>
					(uiActive ? interval(base) :
						interval(base).take(60).concat(
							backoffInterval(base, tenMinutes, 1.2))).startWith(true)))
			.switchMapTo(testStatus(localHub, contactTimeout))
			.scan(nextState, 'down')
			.distinctUntilChanged().share();

	status.subscribe(status => {
		bus.next(['localStatus', status]);
	});

	status.switchMap(status =>
			// Trying to distinguish websocket closed due to shut-down, vs. socket timeout:
			// retry the connection every second, unless the http port goes down.
			status === 'up' ?
				Rx.Observable.webSocket("wss://local.xena.ucsc.edu:7223/load-events")
					.retryWhen(errors => errors.delay(oneSecond)) :
				never())
		.subscribe(resp => bus.next(['localQueue', resp.queue]));

	return {
		action: state => state,
		postAction: (serverBus, state, newState) => {
			// Other pages? /heatmap/? /hub/?
			// Watch more closely for localHub on
			// a) hub page, if localHub selected
			// b) import page,
			// c) datapages, if on a localHub-specific page, e.g. hub or dataset
			if (newState.page === 'hub' && getIn(newState, ['spreadsheet', 'servers', localHub, 'user']) ||
				newState.page === 'import' ||
				newState.page === 'datapages' &&
					(newState.params.host === localHub || get(newState.params.hub, 0) === localHub)) {
				needHub.next(true);
			} else {
				needHub.next(false);
			}
		}
	};
};
