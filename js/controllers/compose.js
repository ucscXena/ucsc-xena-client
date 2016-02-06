/*global module: false */
'use strict';

// might want to optimize this with for loops.
module.exports = (...controllers) => {
	const rcontrollers = controllers.slice(0).reverse();
	return {
		action: (state, ac) => rcontrollers.reduce(
						(state, c) => c.action(state, ac), state),
		postAction: (previous, current, action) => rcontrollers.forEach(
				c => c.postAction(previous, current, action))
	};
};
