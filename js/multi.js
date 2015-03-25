/*global define: false */
define([], function () {
	'use strict';
	// Ad hoc polymorphism, a bit like clojure's multimethods: a way to dispatch
	// based on any criteria (instead of just on 'this').
	//
	// e.g. dispatching on the 2nd parameter:
	//
	// scribble = multi(function(name, val) { return val; })
	// scribble.add('crayon', function(name, val) { crayon('name'); })
	//
	// Set fn.dflt if a default is required.
	// The dispatch function may be modified by setting fn.dispatchfn.
	function multi(dispatchfn) {
		var methods = {},
			fn = function () {
				var method = fn.getmethod.apply(this, arguments);

				return method.apply(this, arguments);
			};

		fn.getmethod = function() {
			var dispatch = fn.dispatchfn.apply(this, arguments),
				method = methods[dispatch] || fn.dflt;

			if (typeof method !== 'function') {
				throw new Error('No method for ' + dispatch);
			}
			return method;
		};
		fn.dispatchfn = dispatchfn;
		fn.add = function (dispatch, fn) {
			methods[dispatch] = fn;
		};

		return fn;
	}

	return multi;
});
