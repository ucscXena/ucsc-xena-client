
var _  = require('./underscore_ext').default;

// Ad hoc polymorphism, a bit like clojure's multimethods: a way to dispatch
// based on any criteria (instead of just on 'this').
//
// e.g. dispatching on the 2nd parameter:
//
// scribble = multi(function(name, val) { return val; })
// scribble.add('crayon', function(name, val) { crayon('name'); })
//
// Set fn.dflt if a default is required.
// The dispatch function may be modified by calling fn.dispatchfn.
// If arity is specified, the function wlil be curried.
function multi(dispatchfn, arity) {
	var methods = {},
		getmethod = function() {
			var dispatch = dispatchfn.apply(this, arguments),
				method = methods[dispatch] || fn.dflt; //eslint-disable-line no-use-before-define

			if (typeof method !== 'function') {
				throw new Error('No method for ' + dispatch);
			}
			return method;
		},
		fn = function () {
			var method = getmethod.apply(this, arguments);

			return method.apply(this, arguments);
		};

	if (arguments.length > 1) {
		fn = _.curryN(arity, fn);
	}
	fn.dispatchfn = fn => dispatchfn = fn;
	fn.add = function (dispatch, fn) {
		methods[dispatch] = fn;
	};

	return fn;
}

module.exports = multi;
