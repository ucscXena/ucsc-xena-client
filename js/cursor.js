/*eslint strict: [2, "function"] */
/*global define: false */

// I won't claim these are actually proper cursors. They
// provide an update view to a subset of a nested data structure.
//
// An update function is a function that takes a value and returns
// a new value. Ex:
//
// function add_one(x) { return x + 1; }
// add_one(5) // -> 6
//
// We are generally working with nested structures so an update function
// looks more like this:
//
// function add_one_a(obj) { return {a: obj.a + 1}; }
// add_one_a({a: 5}) // -> {a: 6}
//
// Update functions do *not* modify their arguments:
//
// function add_one_a(obj) { obj.a++; return obj; } // WRONG
//
// Use immutable methods to ease updating just part of an object:
//
// function add_one_a(obj) { return _.assoc(obj, 'a', obj.a + 1); }
// add_one_a({a:5, b: 12}) // -> {a:6, b: 12}
//
// cursor(updater, paths) returns an object with a update(updatefn) method that
// will apply an update function to a subset of an object, defined by paths.
// updater is a function to update the underlying object. paths is a map of
// keys to key paths, e.g. if
//
// var foo = {a: 1, b: {c: 2}}
//
// then
//
// { one: ['a'], two: ['b', c'] }
//
// defines a cursor {one: 1, two: 2} when applied to foo. An update function applied
// to the cursor will be passed this value.

define(['underscore_ext'], function (_) {
	'use strict';

	function pathsOrKeys(args) {
		var paths = _.isString(args[0]) ? _.toArray(args) : args[0];
		return _.isArray(paths) ? _.objectFn(paths, _.array) : paths;
	}

	function splicePaths(oldpaths, newpaths) {
		return _.fmap(newpaths, function (path) {
			return oldpaths[path[0]].concat(path.slice(1));
		});
	}

	function cursor(updater) {
		var paths = pathsOrKeys(Array.prototype.slice.call(arguments, 1));
		return {
			update: function (fn) {
				updater(function (root) {
					var val = _.fmap(paths, function (path) {
							return _.getIn(root, path);
						}),
						newval = fn(val);
					return _.reduce(_.pairs(newval), function (newroot, pv) {
						var p = pv[0], v = pv[1];
						return _.assocIn(newroot, paths[p], v);
					}, root);
				});
			},
			refine: function () {
				var newpaths = pathsOrKeys(arguments);
				return cursor(updater, splicePaths(paths, newpaths));
			}
		};
	}

	return cursor;
});
