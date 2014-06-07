
// I won't claim these are actually proper cursors, or lenses. They
// provide an update view to a subset of a nested data structure.

define(['underscore_ext'], function (_) {
	'use strict';
	var slice = Array.prototype.slice;

	function cursor(setOrUpdater, newpaths) {
		var updater, paths;

		if (setOrUpdater.paths) {
			paths = {};
			_.each(newpaths, function (path, key) {
				paths[key] = setOrUpdater.paths[path[0]].concat(path.slice(1));
			});
		} else {
			paths = newpaths;
		}

		if (setOrUpdater.set) {
			updater = Object.create(Object.getPrototypeOf(setOrUpdater));
		} else {
			updater = Object.create({
				set: function (fn) {
					var udr = this;
					setOrUpdater(function (s) {
						var methods = {
							assoc: function (t) {
								var kvs;
								for (kvs = slice.call(arguments, 1);
									 kvs.length;
									 kvs = kvs.slice(2)) {

									t = _.assoc_in(t, udr.paths[kvs[0]], kvs[1]);
								}
								return t;
							},
							assoc_in: function(t, ks, v) {
								return _.assoc_in(t, udr.paths[ks[0]].concat(ks.slice(1)), v);
							},
							update_in: function(t, ks, fn) {
								return _.update_in(t, udr.paths[ks[0]].concat(ks.slice(1)), fn);
							},
							get_in: function(t, ks) {
								return _.get_in(t, udr.paths[ks[0]].concat(ks.slice(1)));
							}
						}
						return fn(methods, s);
					});
				},
				derive: function (paths) {
					return cursor(this, paths);
				}
			});
		}
		updater.paths = paths;
		return updater;
	}

	return cursor;
});
