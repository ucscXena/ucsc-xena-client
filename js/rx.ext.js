// Extensions to rx for the cancer browser

'use strict';
var Rx = {
	Observable: require('rxjs/Observable').Observable,
//	Subject: require('rxjs/Subject').Subject,
	Scheduler: require('rxjs/Scheduler').Scheduler,
	Subscription: require('rxjs/Subscription').Subscription
};
var _ = require( './underscore_ext');

var observableProto = Rx.Observable.prototype;

observableProto.usingFirst = function (disposableFactory) {
	var observable = this;
	return Rx.Observable.create(function (observer) {
		var first = true,
			subscription = new Rx.Subscription();

		subscription.add(observable.subscribe(
			function (x) {
				if (first) {
					subscription.add(disposableFactory(x));
					first = false;
				}
				observer.next(x);
			},
			observer.error.bind(observer),
			observer.complete.bind(observer)
		));
		return subscription;
	});
};

function log() {
	if (console) {
		console.log.apply(console, arguments);
	}
}

function fmap(m, fn) {
	var x = {};
	_.each(m, function (v, k) { x[k] = fn(v); });
	return x;
}

// This uses a mutable cache object to avoid building a new
// plucked object on every event. Quite possibly this is a waste
// of time. Should do some profiling.
//
// Accepts object of keys -> path arrays, or array of keys, or
// key arguments, to select what should be plucked from the stream.
//
// {width: ['column', 'width']}   ->  pluck column.width into key 'width'
// ['width', 'height'] -> pluck width & height into keys of same name.
// 'width', 'height'  -> pluck width & height into keys of same name.
observableProto.pluckPathsDistinctUntilChanged = function (paths) {
	var observable = this,
		current;

	paths = _.isString(paths) ? _.toArray(arguments) : paths;
	paths = _.isArray(paths) ? _.objectFn(paths, _.array) : paths;

	current = fmap(paths, function () { return null; }); // mutable

	return Rx.Observable.create(function (observer) {
		return observable.subscribe(
			function (next) {
				var shouldPush = false;
				_.each(paths, function (path, key) {
					var ni = _.getIn(next, path);
					/*
					if (ni !== current[key] && _.isEqual(ni, current[key])) {
						console.log("isEqual not ===", ni);
					}
					*/
					if (!_.isEqual(ni, current[key])) {
						shouldPush = true;
					}
					if (ni !== current[key]) {
						// This is separate from isEqual so that we update
						// current[key] even when _.isEqual is true, so
						// future compares will exit on === instead of
						// having to do a full deep compare.
						current[key] = ni;
					}
				});
				if (shouldPush) {
					observer.next(_.extend({}, current));
				}
			},
			observer.error.bind(observer),
			observer.complete.bind(observer)
		);
	});
};

observableProto.refine = observableProto.pluckPathsDistinctUntilChanged;

observableProto.selectMemoize1 = function (selector) {
	var last;
	return this.scan(function (acc, val) {
		if (_.isEqual(last, val)) {
				return acc;
		}
		last = val;
		return selector(val);
	}, null);
};

observableProto.pluckPaths = function (paths) {
	var observable = this,
		current = fmap(paths, function () { return null; });

	return Rx.Observable.create(function (observer) {
		return observable.subscribe(
			function (next) {
				_.each(paths, function (path, key) {
					var ni = _.getIn(next, path);
					if (ni !== current[key]) {
						current = _.assoc(current, key, ni);
					}
				});
				observer.next(current);
			},
			observer.error.bind(observer),
			observer.complete.bind(observer)
		);
	});
};

observableProto.bufferWithExactCount = function(count, skip) {
	if (arguments.length === 1) {
		skip = count;
	}
	return this.windowCount(count, skip).flatMap(function (x) {
		return x.toArray();
	}).where(function (x) {
		return x.length >= count;
	});
};

// Like scan only also passes the previous input value,
// e.g. selector(acc, lastValue, value).
// Requires a second seed value, for the initial value of
// lastValue.
observableProto.scanPrevious = function (seedOut, seedIn, selector) {
	var observable = this,
		lastValue = seedIn;
	return Rx.Observable.create(function (observer) {
		return observable.scan(function (acc, value) {
			var next = selector(acc, lastValue, value);
			lastValue = value;
			return next;
		}, seedOut).subscribe(observer);
	});
};

// Maps over an object.
//observableProto.fmap = function() {
//	var observable = this,
//		data = {},
//		subs = {};
//
//	return Rx.Observable.create(function (observer) {
//		function push() {
//			observer.next(_.extend({}, data));
//		}
//
//		function onResp(rid, resp) {
//			data[rid] = resp;
//			push();
//		}
//
//		function onNext(obj) {
//			var req = _.keys(obj),
//				creq = _.keys(subs),
//				nreq = _.difference(req, creq),
//				oreq = _.difference(creq, req);
//
//			_.each(oreq, function (rid) {
//				subs[rid].unsubscribe();
//				delete subs[rid];
//				delete data[rid];
//			});
//			_.each(nreq, function (rid) {
//				var sub = obj[rid]
//					.subscribe(_.partial(onResp, rid), observer.error.bind(observer));
//				subs[rid] = sub;
//			});
////            if (oreq.length) { // XXX probably don't need this
////                push();
////            }
//		}
//
//		function onCompleted() {
//			_.each(subs, function (sub) {
//				sub.unsubscribe();
//			});
//			observer.complete();
//		}
//
//		return new Rx.Subscription(
//			observable.subscribe(onNext, observer.error.bind(observer), onCompleted),
//			new Rx.Disposable(function () { onCompleted(); })
//		);
//	});
//};

// XXX map over a set of underscore.ext fns and add them here, instead of
// just assoc.
// Not actually using this right now.
observableProto.assoc = function (key, second) {
	var observable = this;
	return Rx.Observable.defer(function () {
		return observable.zip(second, function (v1, v2) {
			return _.assoc(v1, key, v2);
		});
	});
};

/*
 * Sample the observable sequence at the time of each event on a different
 * observable.
 *
 * Like sample(), except it doesn't wait for a new value on
 * the sampled observable. Every event on sampler returns the current
 * value of the sampled observable.
 */
observableProto.sampleAll = function (sampler, selector) {
	selector = selector || _.identity;

	return this.join(sampler,
					_.constant(this),
					_.partial(Rx.Observable.empty, null),
					selector);
};

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

observableProto.getIn = function (keys) {
	return this.map(s => _.getIn(s, keys));
};

function zipArray(obs) {
	return obs.length ? Rx.Observable.zip(...obs, (...arr) => arr) :
		Rx.Observable.of([], Rx.Scheduler.asap);
}

Rx.Observable.zipArray = (...obs) =>
	_.isArray(obs[0]) ? zipArray(obs[0]) : zipArray(obs);
