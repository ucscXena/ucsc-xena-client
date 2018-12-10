'use strict';
var _ = require('./underscore_ext');

var Rx = {
	Observable: require('rxjs/Observable').Observable,
	Subject: require('rxjs/Subject').Subject,
	Scheduler: Object.assign(
			{},
			require('rxjs/scheduler/async'),
			require('rxjs/scheduler/asap'),
			require('rxjs/scheduler/animationFrame')),
	Subscription: require('rxjs/Subscription').Subscription
};

require('rxjs/add/observable/bindCallback');
require('rxjs/add/observable/defer');
require('rxjs/add/observable/dom/ajax');
require('rxjs/add/observable/dom/webSocket');
require('rxjs/add/observable/empty');
require('rxjs/add/observable/from');
require('rxjs/add/observable/fromEvent');
require('rxjs/add/observable/interval');
require('rxjs/add/observable/merge');
require('rxjs/add/observable/never');
require('rxjs/add/observable/of');
require('rxjs/add/observable/throw');
require('rxjs/add/observable/zip');
require('rxjs/add/operator/bufferCount');
require('rxjs/add/operator/catch');
require('rxjs/add/operator/combineLatest');
require('rxjs/add/operator/concat');
require('rxjs/add/operator/concatMap');
require('rxjs/add/operator/debounceTime');
require('rxjs/add/operator/delay');
require('rxjs/add/operator/distinctUntilChanged');
require('rxjs/add/operator/do');
require('rxjs/add/operator/expand');
require('rxjs/add/operator/filter');
require('rxjs/add/operator/finally');
require('rxjs/add/operator/find');
require('rxjs/add/operator/first');
require('rxjs/add/operator/groupBy');
require('rxjs/add/operator/last');
require('rxjs/add/operator/map');
require('rxjs/add/operator/mapTo');
require('rxjs/add/operator/merge');
require('rxjs/add/operator/mergeAll');
require('rxjs/add/operator/mergeMap');
require('rxjs/add/operator/publishReplay');
require('rxjs/add/operator/reduce');
require('rxjs/add/operator/retry');
require('rxjs/add/operator/retryWhen');
require('rxjs/add/operator/sample');
require('rxjs/add/operator/scan');
require('rxjs/add/operator/share');
require('rxjs/add/operator/shareReplay');
require('rxjs/add/operator/startWith');
require('rxjs/add/operator/switchMap');
require('rxjs/add/operator/switchMapTo');
require('rxjs/add/operator/take');
require('rxjs/add/operator/takeUntil');
require('rxjs/add/operator/takeWhile');
require('rxjs/add/operator/timeoutWith');
require('rxjs/add/operator/toArray');
require('rxjs/add/operator/windowCount');
require('rxjs/add/operator/withLatestFrom');

var observableProto = Rx.Observable.prototype;

function log() {
	if (console) {
		console.log.apply(console, arguments);
	}
}

observableProto.spy = function (msg) {
	var observable = this;
	return Rx.Observable.create(function (observer) {
		log(msg, "subscribed");
		var inner = observable.subscribe(
			function (next) {
				log(msg, "sending", next);
				observer.next(next);
			},
			function (err) {
				log(msg, "error", err);
				observer.error(err);
			},
			function () {
				log(msg, "complete");
				observer.complete();
			}
		);
		return new Rx.Subscription(function () {
			inner.unsubscribe();
			log(msg, "disposed");
		});
	});
};

// rxjs groupBy leaks observables. If using a duration selector,
// it still leaks keys, which is bad for long-running processes where
// the key space drifts. This version shouldn't leak so long as the
// caller disposes of the group (e.g. with take()).
observableProto.groupByNoLeak = function (keyFn) {
	var observable = this,
		groups = {},
		sobs = observable.share();
	return sobs.flatMap(x => {
		var key = keyFn(x);
		return groups[key] ? Rx.Observable.empty() :
			Rx.Observable.of(
				groups[key] = sobs.startWith(x).filter(y => keyFn(y) === key)
					.finally(() => delete groups[key]));
	});
};

// zip operator that handles length 0
function zipArray(obs) {
	return obs.length ? Rx.Observable.zip(...obs, (...arr) => arr) :
		Rx.Observable.of([], Rx.Scheduler.asap);
}

Rx.Observable.zipArray = (...obs) =>
	_.isArray(obs[0]) ? zipArray(obs[0]) : zipArray(obs);

module.exports = Rx;
