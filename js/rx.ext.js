// Extensions to rx for the cancer browser

define(['rx', 'underscore_ext'], function (Rx, _) {
	'use strict';

	var observableProto = Rx.Observable.prototype;

	observableProto.usingFirst = function (disposableFactory) {
		var observable = this;
		return Rx.Observable.create(function (observer) {
			var first = true,
				subscription = new Rx.CompositeDisposable();

			subscription.add(observable.subscribe(
				function (x) {
					if (first) {
						subscription.add(disposableFactory(x));
						first = false;
					}
					observer.onNext(x);
				},
				observer.onError.bind(observer),
				observer.onCompleted.bind(observer)
			));
			return subscription;
		});
	};


	function fmap(m, fn) {
		var x = {};
		_.each(m, function (v, k) { x[k] = fn(v); });
		return x;
	}

	observableProto.pluckPathsDistinctUntilChanged = function (paths) {
		var observable = this,
			current = fmap(paths, function () { return null; }); // mutable

		return Rx.Observable.create(function (observer) {
			return observable.subscribe(
				function (next) {
					var shouldPush = false;
					_.each(paths, function (path, key) {
						var ni = _.get_in(next, path);
						if (ni !== current[key]) {
							shouldPush = true;
							current[key] = ni;
						}
					});
					if (shouldPush) {
						observer.onNext(_.extend({}, current));
					}
				},
				observer.onError.bind(observer),
				observer.onCompleted.bind(observer)
			);
		});
	};

	observableProto.selectMemoize1 = function (selector) {
		var last;
		return this.scan(null, function (acc, val) {
			if (_.isEqual(last, val)) {
					return acc;
			}
			last = val;
			return selector(val);
		});
	};

	observableProto.pluckPaths = function (paths) {
		var observable = this,
			current = fmap(paths, function () { return null; });

		return Rx.Observable.create(function (observer) {
			return observable.subscribe(
				function (next) {
					_.each(paths, function (path, key) {
						var ni = _.get_in(next, path);
						if (ni !== current[key]) {
							current = _.assoc(current, key, ni);
						}
					});
					observer.onNext(current);
				},
				observer.onError.bind(observer),
				observer.onCompleted.bind(observer)
			);
		});
	};

	observableProto.bufferWithExactCount = function(count, skip) {
        if (arguments.length === 1) {
            skip = count;
        }
        return this.windowWithCount(count, skip).selectMany(function (x) {
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
			return observable.scan(seedOut, function (acc, value) {
				var next = selector(acc, lastValue, value);
				lastValue = value;
				return next;
			}).subscribe(observer);
		});
	};

	// Maps over an object.
	observableProto.fmap = function() {
		var observable = this,
			data = {},
			subs = {};

		return Rx.Observable.create(function (observer) {
			function push() {
				observer.onNext(_.extend({}, data));
			}

			function onResp(rid, resp) {
				data[rid] = resp;
				push();
			}

			function onNext(obj) {
				var req = _.keys(obj),
					creq = _.keys(subs),
					nreq = _.difference(req, creq),
					oreq = _.difference(creq, req);

				_.each(oreq, function (rid) {
					subs[rid].dispose();
					delete subs[rid];
					delete data[rid];
				});
				_.each(nreq, function (rid) {
					var sub = obj[rid]
						.subscribe(_.partial(onResp, rid), observer.onError.bind(observer));
					subs[rid] = sub;
				});
	//            if (oreq.length) { // XXX probably don't need this
	//                push();
	//            }
			}

			function onCompleted() {
				_.each(subs, function (sub) {
					sub.dispose();
				});
				observer.onCompleted();
			}

			return new Rx.CompositeDisposable(
				observable.subscribe(onNext, observer.onError.bind(observer), onCompleted),
				new Rx.Disposable(function () { onCompleted(); })
			);
		});
	};

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

	return Rx;
});
