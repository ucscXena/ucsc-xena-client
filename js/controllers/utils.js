var {identity, updateIn, getIn} = require('../underscore_ext').default;

var make = controls => ({
	action: (state, [tag, ...args]) => (controls[tag] || identity)(state, ...args),
	postAction: (serverBus, state, newState, [tag, ...args]) => (controls[tag + '-post!'] || identity)(serverBus, state, newState, ...args)
});

var mount = (controller, path) => ({
	action: (state, ac) => updateIn(state, path, subtree => controller.action(subtree, ac)),
	postAction: (serverBus, state, newState, ac) => controller.postAction(serverBus, getIn(state, path), getIn(newState, path), ac)
});

// might want to optimize this with for loops.
var compose = (...controllers) => {
	const rcontrollers = controllers.slice(0).reverse();
	return {
		action: (state, ac) => rcontrollers.reduce(
						(state, c) => c.action(state, ac), state),
		postAction: (bus, state, nextState, action) => rcontrollers.forEach(
				c => c.postAction(bus, state, nextState, action))
	};
};

export {make, mount, compose};
