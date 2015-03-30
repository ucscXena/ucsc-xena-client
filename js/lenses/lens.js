/*global define: false */
define([], function () {
    // Core utilities for haskell-like lenses.
	function lens(getter, setter) {
		return function (inj) {
			return function (a) {
				return inj(getter(a)).fmap(b => setter(a, b));
			};
		};
	}

	function constant(c) {
		return {
			fmap: f => constant(c),
			value: c
		};
	}

	function id(c) {
		return {
			fmap: f => id(f(c)),
			value: c
		};
	}

    // Given a lens and current state x, return the value of
    // the lens in the state.
	function view(lens, x) {
		return lens(constant)(x).value;
	}

    // Given a lens and current state x, return a new state
    // with lens updated to value v.
	function set(lens, x, v) {
		return lens(y => id(v))(x).value;
	}

    // Given a lens and current state x, return a new state
    // with lens updated via f.
	function over(lens, f, x) {
		return lens(y => id(f(y)))(x).value;
	}

	return {
		lens: lens,
		view: view,
		set: set,
		over: over
	};
});
